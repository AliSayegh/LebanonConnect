const router = require("express").Router();
const mongoose = require("mongoose");
const ProviderProfile = require("../Models/ProviderProfile");
const Category = require("../Models/Category");
const { requireAuth, requireRole } = require("../Middleware/auth");
const Strike = require("../Models/Strike");
const { isValidLebanonCity } = require("../utils/lebanonCities");
const { getDistrictByCity } = require("../utils/locations");

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
      q: searchQ,
      city,
      categoryId,
      serviceSlug,
      verified,
      active,
      sort = "rating",
      page = 1,
      limit = 12,
    } = req.query;

    const q = {};

    // Optional free-text search:
    // - Provider name (displayName)
    // - Service title/category (Category name/slug) via categoryIds
    if (searchQ && String(searchQ).trim()) {
      const raw = String(searchQ).trim();
      const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(escaped, "i");

      const matchedCats = await Category.find({
        isActive: true,
        $or: [{ name: rx }, { slug: rx }],
      })
        .select("_id")
        .lean();
      const catIds = matchedCats.map((c) => c._id);

      q.$or = [{ displayName: rx }];
      if (catIds.length) q.$or.push({ categoryIds: { $in: catIds } });
    }

    // ✅ Handle serviceSlug if provided (case-insensitive matching)
    if (serviceSlug) {
      const slugRegex = new RegExp(`^${serviceSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const cat = await Category.findOne({ slug: slugRegex, isActive: true });
      if (cat) {
        q.categoryIds = { $in: [cat._id] };
      } else {
        // If slug requested but not found, return empty results early
        return res.json({
          page: Math.max(parseInt(page, 10) || 1, 1),
          limit: Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50),
          total: 0,
          pages: 0,
          items: [],
        });
      }
    }

    // ✅ default active=true
    if (active !== undefined) q.isActive = active === "true";
    else q.isActive = true;

    // ✅ IMPORTANT: show only completed providers
    q.onboardingComplete = true;

    // ✅ Exclude banned and deleted providers
    q.strike = { $lt: 3 };
    q.deleted = { $ne: true };

    // Only set default category query if not already filtering by slug/id
    if (!q.categoryIds) {
      q.categoryIds = { $exists: true, $not: { $size: 0 } };
    }

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
  "userId displayName bio city addressArea categoryIds pricingType basePrice isVerified isActive ratingAvg ratingCount completedJobsCount createdAt strike"
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

/**
 * GET /api/providers/featured
 * Returns the top 6 featured providers based on ratingAvg.
 */
router.get("/featured", async (req, res) => {
  try {
    const featured = await ProviderProfile.find({
      isActive: true,
      onboardingComplete: true,
      deleted: { $ne: true },
      strike: { $lt: 3 },
    })
      .sort({ ratingAvg: -1, ratingCount: -1, completedJobsCount: -1 })
      .limit(6)
      .select(
        "userId displayName bio city addressArea categoryIds pricingType basePrice isVerified isActive ratingAvg ratingCount completedJobsCount"
      )
      .lean();

    res.json(featured);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ✅ Get my provider profile
router.get("/me", requireAuth, requireRole("provider"), async (req, res) => {
  const p = await ProviderProfile.findOne({ userId: req.user.id }).lean();
  res.json({ provider: p || null });
});

// ✅ Get unread strikes
router.get("/me/strikes", requireAuth, requireRole("provider"), async (req, res) => {
  try {
    const strikes = await Strike.find({ providerId: req.user.id, isRead: false });
    
    if (strikes.length > 0) {
      await Strike.updateMany(
        { _id: { $in: strikes.map(s => s._id) } },
        { $set: { isRead: true } }
      );
    }
    
    res.json({ strikes });
  } catch (err) {
    console.error("Fetch strikes error:", err);
    res.status(500).json({ message: "Server error fetching strikes" });
  }
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
    if (!isValidLebanonCity(city)) return res.status(400).json({ message: "City is required (select a valid Lebanese city)." });
    if (!addressArea?.trim()) return res.status(400).json({ message: "Area is required" });
    if (!displayName?.trim()) return res.status(400).json({ message: "Display name is required" });

    const bioStr = String(bio || "").trim();
    if (bioStr.length > 500) return res.status(400).json({ message: "Bio must be 500 characters or less" });

    const pt = pricingType || "quote";
    if (!["fixed", "starting", "quote", "hourly"].includes(pt)) {
      return res.status(400).json({ message: "Invalid pricing type" });
    }

    const priceNum = Number(basePrice || 0);
    if (pt === "fixed" || pt === "starting") {
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return res.status(400).json({ message: "Price must be a number (min 0)" });
      }
    }

    const update = {
      displayName: displayName.trim(),
      bio: bioStr,
      city: city.trim(),
      district: getDistrictByCity(city),
      addressArea: addressArea.trim(),
      categoryIds: categoryIds.map((x) => new mongoose.Types.ObjectId(x)),
      pricingType: pt,
      basePrice: pt === "quote" ? 0 : priceNum,
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

// ✅ Get provider profile by ID (Public/Admin)
router.get("/:id", async (req, res) => {
  try {
    const p = await ProviderProfile.findOne({ userId: req.params.id }).lean();
    if (!p) {
      return res.status(404).json({ message: "Provider not found" });
    }
    res.json(p);
  } catch (err) {
    console.error("Fetch provider by ID error:", err);
    res.status(500).json({ message: "Server error fetching provider" });
  }
});

module.exports = router;
