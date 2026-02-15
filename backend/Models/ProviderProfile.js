const mongoose = require("mongoose");

const providerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, unique: true },

    displayName: { type: String, required: true, trim: true },
    bio: { type: String, default: "", trim: true },

    city: { type: String, required: true, trim: true },
    addressArea: { type: String, default: "", trim: true },

    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true }],

    pricingType: { type: String, enum: ["fixed", "hourly", "quote"], default: "quote" },
    basePrice: { type: Number, default: 0 },

    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // cached ratings for fast sorting
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    completedJobsCount: { type: Number, default: 0 },
    subscription: {
      plan: { type: String, enum: ["free", "basic", "pro"], default: "free", index:true },
      expiresAt: { type: Date, default: null, index: true },
      trialUsed: { type: Boolean, default: false }
    },
    onboardingComplete: { type: Boolean, default: false, index: true },



  },
  
  { timestamps: true }
);

// Provider discovery queries
providerProfileSchema.index({ city: 1, isActive: 1, isVerified: 1, ratingAvg: -1 });
providerProfileSchema.index({ categoryIds: 1, city: 1, isActive: 1 });
providerProfileSchema.index({ isVerified: 1, completedJobsCount: -1 });


module.exports = mongoose.model("ProviderProfile", providerProfileSchema);
