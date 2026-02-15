const mongoose = require("mongoose");

const userAuthSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    role: { type: String, enum: ["customer", "provider", "admin"], required: true, default: "customer" },
    status: { type: String, enum: ["active", "suspended", "deleted"], default: "active" },

    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);


// Admin filtering
userAuthSchema.index({ role: 1, status: 1 });

module.exports = mongoose.model("UserAuth", userAuthSchema);
