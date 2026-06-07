const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, index: true },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null, index: true },

    type: { type: String, enum: ["phone_share", "scam", "abuse", "spam"], required: true },
    details: { type: String, default: "", trim: true },

    status: { type: String, enum: ["open", "reviewing", "closed"], default: "open", index: true },

    resolutionNote: { type: String, default: "", trim: true },
    closedAt: { type: Date, default: null },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", default: null }
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportedUserId: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
