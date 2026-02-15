const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, index: true },

    plan: { type: String, enum: ["free", "basic", "pro"], default: "free" },
    status: { type: String, enum: ["trial", "active", "past_due", "expired", "canceled"], default: "trial", index: true },

    trialEndsAt: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },

    price: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },

    visibilityBoost: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Fast “is subscribed?” checks
subscriptionSchema.index({ providerId: 1, status: 1 });
// Renewal jobs
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
