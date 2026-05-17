const router = require("express").Router();
const { requireAuth, requireRole } = require("../Middleware/auth");
const Job = require("../Models/Job");
const ProviderProfile = require("../Models/ProviderProfile");
const checkProviderCanAccept = require("../Middleware/checkProviderCanAccept");
const UserAuth = require("../Models/UserAuth");
const Strike = require("../Models/Strike");
const Message = require("../Models/Message");



router.get("/stats", requireAuth, requireRole("admin"), async (req, res) => {
  const Category = require("../Models/Category");

  const [usersTotal, providersTotal, servicesTotal, jobsTotal, completedJobsTotal, confirmed, revenueAgg, subsAgg] = await Promise.all([
    UserAuth.countDocuments({ status: "active", deleted: { $ne: true } }),
    ProviderProfile.countDocuments({}),
    Category.countDocuments({ isActive: true }),
    Job.countDocuments({}),
    Job.countDocuments({ status: { $in: ["completed", "confirmed"] } }),
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
    totalUsers: usersTotal,
    totalProviders: providersTotal,
    totalServices: servicesTotal,
    jobsTotal,
    completedJobsTotal,
    confirmedJobs: confirmed,
    revenue: revenueAgg[0]?.revenue || 0,
    subscriptions: subsAgg
  });
});

router.get("/providers", requireAuth, requireRole("admin"), async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;
  const showBanned = req.query.showBanned === "true";

  const query = showBanned 
    ? { strike: { $gte: 3 }, deleted: { $ne: true } } 
    : { $or: [{ strike: { $lt: 3 } }, { strike: { $exists: false } }], deleted: { $ne: true } };

  const [total, items] = await Promise.all([
    ProviderProfile.countDocuments(query),
    ProviderProfile.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
  ]);

  res.json({ page, limit, total, pages: Math.ceil(total / limit), items });
});

// Delete provider

router.delete("/provider/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const provider = await ProviderProfile.findOne({ userId: req.params.id });
    if (!provider) return res.status(404).json({ message: "Provider not found" });

    // Soft delete: mark as inactive instead of removing from DB
    provider.isActive = false;
    provider.isVerified = false;
    provider.deleted = true;
    await provider.save();

    const user = await UserAuth.findById(req.params.id);
    if (user) {
      user.deleted = true;
      user.status = "deleted";
      await user.save();
    }

    res.json({ message: "Provider and user account soft-deleted successfully" });
  } catch (err) {
    console.error("Soft delete provider error:", err);
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
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: "Reason is required" });

    const updatedProvider = await ProviderProfile.findOneAndUpdate(
      { userId: req.params.id, strike: { $lt: 3 } },
      { $inc: { strike: 1 } },
      { returnDocument: "after" }
    );

    if (!updatedProvider) {
      return res.status(404).json({ message: "Provider not found or max strikes reached" });
    }

    // Save Strike
    await Strike.create({
      providerId: req.params.id,
      reason,
      adminId: req.user.id
    });

    // Support Chat Injection
    let supportJob = await Job.findOne({
      customerId: req.user.id,
      providerId: req.params.id,
      status: "support"
    });

    if (!supportJob) {
      supportJob = await Job.create({
        customerId: req.user.id,
        providerId: req.params.id,
        title: "Admin Support",
        description: "Official support and moderation channel.",
        city: updatedProvider.city || "System",
        status: "support",
        pricing: { type: "fixed", amount: 0, currency: "USD" },
      });
    }

    await Message.create({
      jobId: supportJob._id,
      senderId: req.user.id,
      content: `[SYSTEM: STRIKE ISSUED]\nReason: ${reason}`,
      isBlocked: false
    });

    // ✅ Automatically ban if strike reaches 3
    if (updatedProvider.strike >= 3) {
      updatedProvider.isVerified = false;
      updatedProvider.isActive = false;
      await updatedProvider.save();

      await UserAuth.findByIdAndUpdate(req.params.id, { status: "suspended" });
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
      { returnDocument: "after" }
    );

    if (!updatedProvider) {
      return res.status(404).json({ message: "Provider not found or no strikes to remove" });
    }

    // Automatically UNBAN if strike count drops below 3
    if (updatedProvider.strike < 3) {
      updatedProvider.isActive = true;
      // We do not auto-verify, they stay unverified, but they are active again
      await updatedProvider.save();

      await UserAuth.findByIdAndUpdate(req.params.id, { status: "active" });
    }

    res.json(updatedProvider);
  } catch (err) {
    console.error("Remove strike error:", err);
    res.status(500).json({ message: "Server error removing strike" });
  }
});



// Start or fetch Support Chat
router.post("/provider/:id/chat", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const providerId = req.params.id;
    const provider = await ProviderProfile.findOne({ userId: providerId });
    if (!provider) return res.status(404).json({ message: "Provider not found" });

    let supportJob = await Job.findOne({
      customerId: req.user.id,
      providerId: providerId,
      status: "support"
    });

    if (!supportJob) {
      supportJob = await Job.create({
        customerId: req.user.id,
        providerId: providerId,
        title: "Admin Support",
        description: "Official support and moderation channel.",
        city: provider.city || "System",
        status: "support",
        pricing: { type: "fixed", amount: 0, currency: "USD" },
      });
    }

    res.json({ jobId: supportJob._id });
  } catch (err) {
    console.error("Support chat error:", err);
    res.status(500).json({ message: "Server error creating support chat" });
  }
});

module.exports = router;
