require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const reportRoutes = require("./routes/reportRoutes");
const authRoutes = require("./routes/authroutes");
const jobRoutes = require("./routes/jobRoutes");
const messageRoutes = require("./routes/messageRoutes");
const providerRoutes = require("./routes/providerRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

const app = express();

// Build allowed origins from env or fallback to localhost for dev
const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:5174"]
  : ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/subscriptions", require("./routes/subscriptionRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/platform", require("./routes/platformRoutes"));
app.use("/api/reports", reportRoutes); 

// Global Error Handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[ERROR] ${status} - ${err.message}`);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }
  res.status(status).json({
    message: status === 500 ? "Internal Server Error" : err.message,
  });
});



const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const jwt = require("jsonwebtoken");
const Job = require("./Models/Job");
const Message = require("./Models/Message");
const { containsBlockedContact } = require("./utils/blockContact");

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Security Fix: Verify user still exists and is active
    const UserAuth = require("./Models/UserAuth");
    UserAuth.findById(decoded.id).then(user => {
      if (!user) return next(new Error("User not found"));
      if (user.deleted) return next(new Error("Account deleted"));
      if (user.status === "suspended") return next(new Error("Account banned"));
      if (user.status !== "active") return next(new Error("Account inactive"));
      
      socket.user = decoded; // { id, role }
      next();
    }).catch(err => {
      next(new Error("Authentication error"));
    });
  } catch (e) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {


  // ✅ Join room = jobId (only participants)
  socket.on("joinJobRoom", async ({ jobId }) => {
    try {
      if (!jobId) return socket.emit("errorMessage", { message: "jobId missing" });

      const job = await Job.findById(jobId).select("customerId providerId");
      if (!job) return socket.emit("errorMessage", { message: "Job not found" });

      const uid = socket.user.id;
      const allowed =
        job.customerId.toString() === uid || job.providerId.toString() === uid;

      if (!allowed) {
        return socket.emit("errorMessage", { message: "Not allowed in this chat" });
      }

      socket.join(jobId);
      socket.emit("joinedRoom", { jobId });


      // ✅ Send last 50 msgs (fast via index jobId+createdAt)
      const history = await Message.find({ jobId })
        .sort({ createdAt: 1 })
        .limit(50)
        .select("senderId content createdAt isBlocked");

      socket.emit("chatHistory", history);
      socket.emit("joinedRoom", { roomId: jobId });
    } catch (e) {
      socket.emit("errorMessage", { message: "Join failed" });
    }
  });

  // ✅ Send message (blocked content denied + saved in DB)
  socket.on("sendJobMessage", async ({ jobId, content }) => {
    try {
      if (!jobId || !content?.trim()) return;

      // Block sharing contacts
      if (containsBlockedContact(content)) {
        return socket.emit("blockedMessage", {
          message: "Sharing phone/email/links/WhatsApp is not allowed."
        });
      }

      const job = await Job.findById(jobId).select("customerId providerId");
      if (!job) return socket.emit("errorMessage", { message: "Job not found" });

      const uid = socket.user.id;
      const allowed =
        job.customerId.toString() === uid || job.providerId.toString() === uid;

      if (!allowed) {
        return socket.emit("errorMessage", { message: "Not allowed" });
      }

      const msg = await Message.create({
        jobId,
        senderId: uid,
        content: content.trim(),
        isBlocked: false
      });

      io.to(jobId).emit("receiveJobMessage", {
        _id: msg._id,
        jobId: msg.jobId,
        senderId: msg.senderId,
        content: msg.content,
        createdAt: msg.createdAt
      });
    } catch (e) {
      socket.emit("errorMessage", { message: "Send failed" });
    }
  });

  socket.on("disconnect", () => {
    // Socket disconnected
  });
});


app.get("/", (req, res) => {
  res.send("ServiceHub API is running ✅");
});

async function start() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI missing in environment variables");
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing in environment variables");

    await mongoose.connect(uri);
    console.log("MongoDB connected");

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log("Server running on", PORT));
  } catch (err) {
    console.error("Mongo connection error:", err.message);
    process.exit(1);
  }
}

start();
