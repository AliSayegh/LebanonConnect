const mongoose = require("mongoose");

const strikeSchema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, index: true },
    reason: { type: String, required: true, trim: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Strike", strikeSchema);
