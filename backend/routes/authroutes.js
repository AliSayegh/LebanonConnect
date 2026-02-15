const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserAuth = require("../Models/UserAuth");
const CustomerProfile = require("../Models/CustomerProfile");
const ProviderProfile = require("../Models/ProviderProfile");

// REGISTER (same page with role selection)
router.post("/register", async (req, res) => {
  try {
    const { email, password, role, fullName, displayName, city } = req.body;

    if (!email || !password) return res.status(400).json({ message: "Missing email/password" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 chars" });

    const finalRole = ["customer", "provider"].includes(role) ? role : "customer";

    const exists = await UserAuth.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: "Email already used" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await UserAuth.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      role: finalRole,
      status: "active"
    });

    // Create profile based on role
    if (finalRole === "customer") {
      await CustomerProfile.create({
        userId: user._id,
        fullName: fullName || "Customer",
        city: city || ""
      });
    } else {
      await ProviderProfile.create({
        userId: user._id,
        displayName: displayName || "Provider",
        city: city || "Lebanon",
        categoryIds: [],
        isVerified: false,
        isActive: true
      });
    }

    return res.status(201).json({ message: "Registered", userId: user._id });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserAuth.findOne({ email: email.toLowerCase().trim(), status: "active" });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET missing in .env" });
    }

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    user.lastLoginAt = new Date();
    await user.save();

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role
      }
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

module.exports = router;
