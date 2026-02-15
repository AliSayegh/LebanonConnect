const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, index: true },

    content: { type: String, required: true, trim: true },
    isBlocked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Chat history fetch
messageSchema.index({ jobId: 1, createdAt: 1 });
// Moderation/audit
messageSchema.index({ senderId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
