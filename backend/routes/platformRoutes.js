const express = require("express");
const router = express.Router();

const UserAuth = require("../Models/UserAuth");
const ProviderProfile = require("../Models/ProviderProfile");
const Job = require("../Models/Job");
const Review = require("../Models/Review");
const Category = require("../Models/Category");

/**
 * GET /api/platform/stats
 * Public endpoint — returns aggregated platform statistics.
 * All queries run in parallel for performance.
 */
router.get("/stats", async (req, res) => {
  try {
    const [
      totalUsers,
      totalProviders,
      completedJobs,
      ratingResult,
      totalReviews,
      totalCategories
    ] = await Promise.all([
      UserAuth.countDocuments({ status: "active" }),
      ProviderProfile.countDocuments({ isActive: true }),
      Job.countDocuments({ status: "completed" }),
      Review.aggregate([
        { $group: { _id: null, avg: { $avg: "$rating" } } }
      ]),
      Review.countDocuments({}),
      Category.countDocuments({ isActive: true })
    ]);

    const averageRating = ratingResult.length > 0
      ? Math.round(ratingResult[0].avg * 10) / 10
      : 0;

    res.json({
      totalUsers,
      totalProviders,
      completedJobs,
      averageRating,
      totalReviews,
      totalCategories
    });
  } catch (err) {
    console.error("Platform stats error:", err.message);
    res.status(500).json({ message: "Failed to load platform statistics" });
  }
});

module.exports = router;
