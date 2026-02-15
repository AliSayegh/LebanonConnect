const router = require("express").Router();
const Review = require("../Models/Review");
const Job = require("../Models/Job");
const ProviderProfile = require("../Models/ProviderProfile");
const { requireAuth, requireRole } = require("../Middleware/auth");

router.post("/", requireAuth, requireRole("customer"), async (req, res) => {
  try {
    const { jobId, rating, text } = req.body;

    // Validate input
    if (!jobId) return res.status(400).json({ message: "jobId is required" });

    const r = Number(rating);
    if (!r || r < 1 || r > 5)
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });

    // Find job
    const job = await Job.findById(jobId);

    if (!job) return res.status(404).json({ message: "Job not found" });

    // Check ownership
    if (job.customerId.toString() !== req.user.id)
      return res
        .status(403)
        .json({ message: "You can only review your own jobs" });

    // Check status
    if (job.status !== "confirmed")
      return res.status(400).json({
        message: "You can only review jobs after they are confirmed",
      });

    // Prevent duplicate review
    const existing = await Review.findOne({ jobId });

    if (existing)
      return res.status(400).json({
        message: "You already reviewed this job",
      });

    // Create review
    const review = await Review.create({
      jobId,
      providerId: job.providerId,
      customerId: job.customerId,
      rating: r,
      text: String(text || "").trim(),
    });

    // Update provider rating stats
    const providerProfile = await ProviderProfile.findOne({
      userId: job.providerId,
    });

    if (providerProfile) {
      const oldCount = providerProfile.ratingCount || 0;
      const oldAvg = providerProfile.ratingAvg || 0;

      const newCount = oldCount + 1;

      const newAvg = (oldAvg * oldCount + r) / newCount;

      providerProfile.ratingCount = newCount;
      providerProfile.ratingAvg = Number(newAvg.toFixed(2));

      await providerProfile.save();
    }

    // Mark job as reviewed
    job.reviewId = review._id;
    await job.save();

    return res.json({
      success: true,
      message: "Review added successfully",
      review: {
        id: review._id,
        rating: review.rating,
        text: review.text,
      },
    });
  } catch (err) {
    console.error("Review error:", err);

    // Duplicate key safety
    if (err.code === 11000) {
      return res.status(400).json({
        message: "This job already has a review",
      });
    }

    return res.status(500).json({
      message: "Server error while creating review",
    });
  }
});
// ✅ Public: Get provider reviews with pagination
// GET /api/reviews/provider/:providerId?page=1&limit=6
router.get("/provider/:providerId", async (req, res) => {
  try {
    const { providerId } = req.params;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit || "6", 10)),
    );
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      Review.countDocuments({ providerId }),
      Review.find({ providerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("rating text createdAt jobId customerId")
        .lean(),
    ]);

    return res.json({
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      items,
    });
  } catch (err) {
    console.error("Provider reviews error:", err);
    return res.status(500).json({ message: "server error loading reviews" });
  }
});
module.exports = router;
