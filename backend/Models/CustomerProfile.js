const mongoose = require("mongoose");

const customerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, unique: true },

    fullName: { type: String, required: true, trim: true },
    city: { type: String, default: "", trim: true },
    district: { type: String, default: "", trim: true, index: true },
    addressArea: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

customerProfileSchema.index({ city: 1 });

module.exports = mongoose.model("CustomerProfile", customerProfileSchema);
