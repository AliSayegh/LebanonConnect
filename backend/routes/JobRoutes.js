const router = require("express").Router();
const mongoose = require("mongoose");
const Job = require("../Models/Job");
const ProviderProfile = require("../Models/ProviderProfile");
const { requireAuth, requireRole } = require("../Middleware/auth");
const checkProviderCanAccept = require("../Middleware/checkProviderCanAccept");
// ✅ GET /api/jobs/mine (dashboard)
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const skip = (pageNum - 1) * lim;

    const uid = req.user.id;

    const q = { $or: [{ customerId: uid }, { providerId: uid }] };
    if (status) q.status = status;

    const [items, total] = await Promise.all([
      Job.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      Job.countDocuments(q)
    ]);

    return res.json({
      page: pageNum,
      limit: lim,
      total,
      pages: Math.ceil(total / lim),
      items
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// ✅ POST /api/jobs (customer creates job)
router.post("/", requireAuth, requireRole("customer"), async (req, res) => {
  try {
    const { providerId, categoryId, title, description, city, addressArea } = req.body;
    
    // Validate IDs format
    if (!mongoose.isValidObjectId(providerId)) return res.status(400).json({ message: "Invalid providerId" });
    if (!mongoose.isValidObjectId(categoryId)) return res.status(400).json({ message: "Invalid categoryId" });

    // Validate existence
    const providerExists = await mongoose.model("UserAuth").findById(providerId);
    if (!providerExists || providerExists.role !== "provider") {
        return res.status(404).json({ message: "Provider not found" });
    }

    const categoryExists = await mongoose.model("Category").findById(categoryId);
    if (!categoryExists) {
        return res.status(404).json({ message: "Category not found" });
    }

    if (!providerId || !categoryId || !title || !city) {
      return res.status(400).json({
        message: "Missing required fields",
        missing: {
          providerId: !providerId,
          categoryId: !categoryId,
          title: !title,
          city: !city
        }
      });
    }

    const job = await Job.create({
      customerId: req.user.id,
      providerId,
      categoryId,
      title,
      description: description || "",
      city,
      addressArea: addressArea || "",
      status: "open",
      pricing: { type: "quote", amount: 0, currency: "USD" },
      createdAt: new Date(),
    });

    return res.status(201).json(job);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// ✅ GET /api/jobs/:jobId (only participants)
router.get("/:jobId", requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Invalid jobId" });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const uid = req.user.id;
    if (job.customerId.toString() !== uid && job.providerId.toString() !== uid) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json(job);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});
router.patch("/:jobId/accept", requireAuth, requireRole("provider"), checkProviderCanAccept, async (req, res) => {
  const { jobId } = req.params;
  if (!mongoose.isValidObjectId(jobId)) return res.status(400).json({ message: "Invalid jobId" });

  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });
  if (job.providerId.toString() !== req.user.id) return res.status(403).json({ message: "Not your job" });
  if (job.status !== "open") return res.status(400).json({ message: "Job not open" });

  job.status = "accepted";
  job.acceptedAt = new Date();
  await job.save();

  // ✅ Increment provider's completed jobs count immediately on acceptance
  await ProviderProfile.findOneAndUpdate(
    { userId: job.providerId },
    { $inc: { completedJobsCount: 1 } }
  );

  res.json({ message: "Job accepted ✅", job });
});

// Provider marks completed
router.patch("/:jobId/complete", requireAuth, requireRole("provider"), async (req, res) => {
  const { jobId } = req.params;
  if (!mongoose.isValidObjectId(jobId)) return res.status(400).json({ message: "Invalid jobId" });

  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });
  if (job.providerId.toString() !== req.user.id) return res.status(403).json({ message: "Not your job" });
  if (job.status !== "accepted") return res.status(400).json({ message: "Job must be accepted first" });

  job.status = "completed";
  job.completedAt = new Date();
  await job.save();

  res.json({ message: "Job marked completed ✅", job });
});

// Customer confirms completion + commission computed
router.patch("/:jobId/confirm", requireAuth, requireRole("customer"), async (req, res) => {
  const { jobId } = req.params;
  if (!mongoose.isValidObjectId(jobId)) return res.status(400).json({ message: "Invalid jobId" });
  const { finalPrice } = req.body; // number

  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });
  if (job.customerId.toString() !== req.user.id) return res.status(403).json({ message: "Not your job" });
  if (job.status !== "completed") return res.status(400).json({ message: "Job must be completed first" });

  const price = Number(finalPrice || 0);
  if (!price || price <= 0) return res.status(400).json({ message: "finalPrice is required" });

  job.status = "confirmed";
  job.confirmedAt = new Date();
  job.finalPrice = price;

  const pct = job.commission?.percentage ?? 10;
  job.commission.amount = Math.round(price * (pct / 100));

  await job.save();

  res.json({ message: "Job confirmed ✅", job });
});

module.exports = router;
