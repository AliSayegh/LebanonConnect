const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, unique: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, index: true },

    jobAmount: { type: Number, required: true },
    commissionRate: { type: Number, required: true }, // e.g. 0.10
    commissionAmount: { type: Number, required: true },

    status: { type: String, enum: ["pending", "paid", "refunded"], default: "pending", index: true }
  },
  { timestamps: true }
);

transactionSchema.index({ jobId: 1 }, { unique: true });
transactionSchema.index({ providerId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
