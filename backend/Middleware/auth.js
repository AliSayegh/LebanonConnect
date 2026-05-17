const jwt = require("jsonwebtoken");

const UserAuth = require("../Models/UserAuth");

async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists/active
    const user = await UserAuth.findById(decoded.id);
    if (!user) {
        return res.status(401).json({ message: "User not found" });
    }

    if (user.deleted) {
        return res.status(403).json({ message: "This account has been deleted" });
    }
    
    if (user.status === "suspended") {
        return res.status(403).json({ message: "Your account has been banned" });
    }

    if (user.status !== "active") {
        return res.status(401).json({ message: "User is inactive" });
    }

    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

module.exports = { requireAuth, requireRole };
