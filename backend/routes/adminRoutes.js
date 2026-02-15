const router = require("express").Router();
const { requireAuth, requireRole } = require("../Middleware/auth");
const Job = require("../Models/Job");
const ProviderProfile = require("../Models/ProviderProfile");
const checkProviderCanAccept = require("../Middleware/checkProviderCanAccept");


router.get("/stats", requireAuth, requireRole("admin"), async (req, res) => {
  const [jobsTotal, confirmed, revenueAgg, subsAgg] = await Promise.all([
    Job.countDocuments({}),
    Job.countDocuments({ status: "confirmed" }),
    Job.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: null, revenue: { $sum: "$commission.amount" } } }
    ]),
    ProviderProfile.aggregate([
      { $group: { _id: "$subscription.plan", count: { $sum: 1 } } }
    ])
  ]);

  res.json({
    jobsTotal,
    confirmedJobs: confirmed,
    revenue: revenueAgg[0]?.revenue || 0,
    subscriptions: subsAgg
  });
});

router.get("/providers", requireAuth, requireRole("admin"), async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    ProviderProfile.countDocuments({}),
    ProviderProfile.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit)
  ]);

  res.json({ page, limit, total, pages: Math.ceil(total / limit), items });
});

module.exports = router;
