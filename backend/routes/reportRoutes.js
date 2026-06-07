// routes/reportRoutes.js
const express = require("express");
const router = express.Router();
const Report = require("../Models/Report");
const { requireAuth } = require("../Middleware/auth");

// creat report
router.post("/", requireAuth, async (req, res) => {
  try {
    const { reportedUserId, jobId, type, details } = req.body;

    if (!reportedUserId || !type) {
      return res.status(400).json({
        message: "reportedUserId and type are required",
      });
    }

    const report = await Report.create({
      reporterId: req.user.id, // from JWT
      reportedUserId,
      jobId: jobId || null,
      type,
      details,
    });

    res.status(201).json({
      message: "Report submitted successfully",
      report,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to create report",
      error: err.message,
    });
  }
});

const CustomerProfile = require("../Models/CustomerProfile");
const ProviderProfile = require("../Models/ProviderProfile");

// get all reports
router.get("/", requireAuth, async (req, res) => {
  try {
    let reports = await Report.find()
      .populate("reporterId", "email")
      .populate("reportedUserId", "email")
      .populate("jobId")
      .sort({ createdAt: -1 })
      .lean();

    const userIds = new Set();
    reports.forEach(r => {
      if (r.reporterId?._id) userIds.add(r.reporterId._id.toString());
      if (r.reportedUserId?._id) userIds.add(r.reportedUserId._id.toString());
    });

    const userIdsArray = Array.from(userIds);

    const [customers, providers] = await Promise.all([
      CustomerProfile.find({ userId: { $in: userIdsArray } }).select("userId fullName").lean(),
      ProviderProfile.find({ userId: { $in: userIdsArray } }).select("userId displayName").lean()
    ]);

    const nameMap = {};
    customers.forEach(c => { nameMap[c.userId.toString()] = c.fullName; });
    providers.forEach(p => { nameMap[p.userId.toString()] = p.displayName; });

    reports = reports.map(r => {
      if (r.reporterId) {
        r.reporterId.name = nameMap[r.reporterId._id.toString()] || null;
      }
      if (r.reportedUserId) {
        r.reportedUserId.name = nameMap[r.reportedUserId._id.toString()] || null;
      }
      return r;
    });

    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to fetch reports",
    });
  }
});

// update report
router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["open", "reviewing", "closed"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        message: "Report not found",
      });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({
      message: "Failed to update report",
    });
  }
});

module.exports = router;