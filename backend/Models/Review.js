const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, index: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, index: true },

    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, default: "" }
  },
  { timestamps: true }
);

reviewSchema.index({ unique: true });
reviewSchema.index({ providerId: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
