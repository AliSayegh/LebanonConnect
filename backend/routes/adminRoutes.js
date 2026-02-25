const router = require("express").Router();
const { requireAuth, requireRole } = require("../Middleware/auth");
const Job = require("../Models/Job");
const ProviderProfile = require("../Models/ProviderProfile");
const checkProviderCanAccept = require("../Middleware/checkProviderCanAccept");
const UserAuth = require("../Models/UserAuth");



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

// Delete provider

router.delete("/provider/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const provider = await ProviderProfile.findOne({ userId: req.params.id });
    if (!provider) return res.status(404).json({ message: "Provider not found" });

    await provider.deleteOne(); // safer than remove()

    const user = await UserAuth.findById(req.params.id);
    if (user) {
      await user.deleteOne();
    }

    res.json({ message: "Provider and user account deleted successfully" });
    res.json({ message: "Provider profile deleted successfully" });
  } catch (err) {
    console.error("Delete provider error:", err);
    res.status(500).json({ message: "Server error deleting provider" });
  }
});
//Verify provider

router.patch("/provider/:id/verify", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const provider = await ProviderProfile.findOneAndUpdate(
      { userId: req.params.id },
      { isVerified: true },
      { new: true }
    );

    if (!provider) return res.status(404).json({ message: "Provider not found" });

    res.json(provider);
  } catch (err) {
    console.error("Verify provider error:", err);
    res.status(500).json({ message: "Server error verifying provider" });
  }
});

// Remove verification

router.patch("/provider/:id/unverify", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const provider = await ProviderProfile.findOneAndUpdate(
      { userId: req.params.id },
      { isVerified: false },
      { new: true }
    );

    if (!provider) return res.status(404).json({ message: "Provider not found" });

    res.json(provider);
  } catch (err) {
    console.error("Unverify provider error:", err);
    res.status(500).json({ message: "Server error removing verification" });
  }
});
//Add Strike

router.patch("/provider/:id/strike/add", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const updatedProvider = await ProviderProfile.findOneAndUpdate(
  { userId: req.params.id, strike: { $lt: 3 } },
  { $inc: { strike: 1 } },
  {  returnDocument: "after" } // <-- makes sure the returned doc is updated
);

    if (!updatedProvider) {
      return res.status(404).json({ message: "Provider not found or max strikes reached" });
    }
     // ✅ Automatically unverify if strike reaches 3
    if (updatedProvider.strike >= 3 && updatedProvider.isVerified) {
      updatedProvider.isVerified = false;
      await updatedProvider.save();
    }

    res.json(updatedProvider);
  } catch (err) {
    console.error("Add strike error:", err);
    res.status(500).json({ message: "Server error adding strike" });
  }
});

// Remove Strike

router.patch("/provider/:id/strike/remove", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const updatedProvider = await ProviderProfile.findOneAndUpdate(
      { userId: req.params.id, strike: { $gt: 0 } },
      { $inc: { strike: -1 } },
      { returnDocument: "after" } // <-- updated doc
    );

    if (!updatedProvider) {
      return res.status(404).json({ message: "Provider not found or no strikes to remove" });
    }

    res.json(updatedProvider);
  } catch (err) {
    console.error("Remove strike error:", err);
    res.status(500).json({ message: "Server error removing strike" });
  }
});



module.exports = router;
