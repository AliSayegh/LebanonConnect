const router = require("express").Router();
const mongoose = require("mongoose");
const Message = require("../Models/Message");
const Job = require("../Models/Job");
const { requireAuth } = require("../Middleware/auth");

/**
 * GET /api/messages/job/:jobId
 * Query:
 *  - limit (default 30, max 100)
 *  - before (ISO date string) => get older messages than "before"
 *
 * Uses index: { jobId: 1, createdAt: 1 }
 */
router.get("/job/:jobId", requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Invalid jobId" });
    }

    const job = await Job.findById(jobId).select("customerId providerId");
    if (!job) return res.status(404).json({ message: "Job not found" });

    const uid = req.user.id;
    const allowed =
      job.customerId.toString() === uid || job.providerId.toString() === uid;

    if (!allowed) return res.status(403).json({ message: "Forbidden" });

    const lim = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);

    const q = { jobId };

    // Cursor: load messages older than "before"
    if (req.query.before) {
      const beforeDate = new Date(req.query.before);
      if (isNaN(beforeDate.getTime())) {
        return res.status(400).json({ message: "Invalid before date" });
      }
      q.createdAt = { $lt: beforeDate };
    }

    // Fetch newest first then reverse for UI
    const msgs = await Message.find(q)
      .sort({ createdAt: -1 })
      .limit(lim)
      .select("jobId senderId content isBlocked createdAt");

    res.json(msgs.reverse());
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;