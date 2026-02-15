const router = require("express").Router();
const mongoose = require("mongoose");
const ProviderProfile = require("../Models/ProviderProfile");
const Category = require("../Models/Category");
const { requireAuth, requireRole } = require("../Middleware/auth");

/**
 * GET /api/providers/search
 * Query:
 *  - city (string)
 *  - categoryId (ObjectId string)
 *  - verified ("true"|"false")  (if not provided => no filter)
 *  - active ("true"|"false") default true
 *  - sort ("rating"|"jobs"|"recent") default rating
 *  - page (number) default 1
 *  - limit (number) default 12 (max 50)
 */
router.get("/search", async (req, res) => {
  try {
    const {
      city,
      categoryId,
      verified,
      active,
      sort = "rating",
      page = 1,
      limit = 12,
    } = req.query;

    const q = {};

    // ✅ default active=true
    if (active !== undefined) q.isActive = active === "true";
    else q.isActive = true;

    // ✅ IMPORTANT: show only completed providers (and not empty categories)
    q.onboardingComplete = true;
    q.categoryIds = { $exists: true, $not: { $size: 0 } };

    if (city) q.city = city.trim();

    // ✅ only filter if param exists
    if (verified !== undefined) q.isVerified = verified === "true";

    if (categoryId) {
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({ message: "Invalid categoryId" });
      }
      // ✅ provider has categoryId in array
      q.categoryIds = { $in: [new mongoose.Types.ObjectId(categoryId)] };
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
    const skip = (pageNum - 1) * lim;

    // Sort aligned with indexes
    let sortObj = { ratingAvg: -1, ratingCount: -1, completedJobsCount: -1 };
    if (sort === "jobs") sortObj = { completedJobsCount: -1, ratingAvg: -1 };
    if (sort === "recent") sortObj = { createdAt: -1 };

    const [items, total] = await Promise.all([
      ProviderProfile.find(q)
        .sort(sortObj)
        .skip(skip)
        .limit(lim)
        .select(
          "userId displayName bio city addressArea categoryIds pricingType basePrice isVerified isActive ratingAvg ratingCount completedJobsCount createdAt"
        )
        .lean(),
      ProviderProfile.countDocuments(q),
    ]);

    res.json({
      page: pageNum,
      limit: lim,
      total,
      pages: Math.ceil(total / lim),
      items,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ✅ Get my provider profile
router.get("/me", requireAuth, requireRole("provider"), async (req, res) => {
  const p = await ProviderProfile.findOne({ userId: req.user.id }).lean();
  res.json({ provider: p || null });
});

// ✅ Update/complete my provider profile
router.patch("/me", requireAuth, requireRole("provider"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName, bio, city, addressArea, categoryIds, pricingType, basePrice } = req.body;

    // Validate categories
    if (!Array.isArray(categoryIds) || categoryIds.length < 1) {
      return res.status(400).json({ message: "Select at least 1 category" });
    }

    // Validate category IDs format
    for (const id of categoryIds) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid category id in categoryIds" });
      }
    }

    const count = await Category.countDocuments({
      _id: { $in: categoryIds },
      isActive: true,
    });

    if (count !== categoryIds.length) {
      return res.status(400).json({ message: "Some categories are invalid" });
    }

    // Validate required fields
    if (!city?.trim()) return res.status(400).json({ message: "City is required" });
    if (!addressArea?.trim()) return res.status(400).json({ message: "Area is required" });
    if (!displayName?.trim()) return res.status(400).json({ message: "Display name is required" });

    const update = {
      displayName: displayName.trim(),
      bio: String(bio || "").trim(),
      city: city.trim(),
      addressArea: addressArea.trim(),
      categoryIds: categoryIds.map((x) => new mongoose.Types.ObjectId(x)),
      pricingType: pricingType || "quote",
      basePrice: Number(basePrice || 0),
      isActive: true,
      onboardingComplete: true,
    };

    const p = await ProviderProfile.findOneAndUpdate({ userId }, update, {
      new: true,
      upsert: true,
    }).lean();

    res.json({ success: true, provider: p });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
