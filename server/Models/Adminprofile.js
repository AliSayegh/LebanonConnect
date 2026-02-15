const mongoose = require("mongoose");

const adminProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, unique: true },
    permissions: [{ type: String, default: [] }]
  },
  { timestamps: true }
);

adminProfileSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model("AdminProfile", adminProfileSchema);
