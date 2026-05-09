const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, index: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: "UserAuth", required: true, index: true },

    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },

    city: { type: String, required: true, trim: true, index: true },
    addressArea: { type: String, default: "", trim: true },

    status: {
      type: String,
      enum: ["open", "accepted", "in_progress", "completed","confirmed", "cancelled", "support"],
      default: "open",
      index: true
    },
    acceptedAt: Date,
    completedAt: Date,
    confirmedAt: Date,
    pricing: {
      type: {
        type: String,
        enum: ["fixed", "hourly", "quote"],
        default: "quote"
      },
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      quotedPrice: { type: Number, default: 0 },     // optional
      finalPrice: { type: Number, default: 0 },  
    },
    commission: {
      percentage: { type: Number, default: 10 },
      amount: { type: Number, default: 0 },
      paid: { type: Boolean, default: false }
    }
    
  },
  { timestamps: true }
);

// Dashboards
jobSchema.index({ customerId: 1, createdAt: -1 });
jobSchema.index({ providerId: 1, createdAt: -1 });
// Admin feeds
jobSchema.index({ status: 1, createdAt: -1 });
// Search jobs by category + city
jobSchema.index({ categoryId: 1, city: 1, createdAt: -1 });

module.exports = mongoose.model("Job", jobSchema);
