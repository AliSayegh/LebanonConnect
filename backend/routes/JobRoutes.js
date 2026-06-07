const router = require("express").Router();
const mongoose = require("mongoose");
const Job = require("../Models/Job");
const ProviderProfile = require("../Models/ProviderProfile");
const CustomerProfile = require("../Models/CustomerProfile");
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
    const role = req.user.role;

    const q = role === "admin" ? {} : { $or: [{ customerId: uid }, { providerId: uid }] };
    if (status) q.status = status;

    let [items, total] = await Promise.all([
      Job.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate("providerId", "email role")
        .populate("customerId", "email role")
        .lean(),
      Job.countDocuments(q)
    ]);

    const userIds = new Set();
    items.forEach(job => {
      if (job.customerId?._id) userIds.add(job.customerId._id.toString());
      if (job.providerId?._id) userIds.add(job.providerId._id.toString());
    });

    const userIdsArray = Array.from(userIds);

    const [customers, providers] = await Promise.all([
      CustomerProfile.find({ userId: { $in: userIdsArray } }).select("userId fullName city").lean(),
      ProviderProfile.find({ userId: { $in: userIdsArray } }).select("userId displayName city").lean()
    ]);

    const nameMap = {};
    const cityMap = {};
    customers.forEach(c => { 
      nameMap[c.userId.toString()] = c.fullName; 
      cityMap[c.userId.toString()] = c.city; 
    });
    providers.forEach(p => { 
      nameMap[p.userId.toString()] = p.displayName; 
      cityMap[p.userId.toString()] = p.city; 
    });

    items = items.map(job => {
      if (job.customerId) {
        job.customerId.name = nameMap[job.customerId._id.toString()] || null;
        job.customerId.city = cityMap[job.customerId._id.toString()] || null;
      }
      if (job.providerId) {
        job.providerId.name = nameMap[job.providerId._id.toString()] || null;
        job.providerId.city = cityMap[job.providerId._id.toString()] || null;
      }
      return job;
    });

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
    if (providerExists.deleted) {
        return res.status(400).json({ message: "This provider has been removed" });
    }
    if (providerExists.status === "suspended") {
        return res.status(400).json({ message: "This provider has been banned" });
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
  job.pricing.finalPrice = price;

  const pct = job.commission?.percentage ?? 10;
  job.commission.amount = Math.round(price * (pct / 100));

  await job.save();

  // ✅ Increment provider's completed jobs count on confirmed completion (not acceptance)
  await ProviderProfile.findOneAndUpdate(
    { userId: job.providerId },
    { $inc: { completedJobsCount: 1 } }
  );

  res.json({ message: "Job confirmed ✅", job });
});

module.exports = router;
