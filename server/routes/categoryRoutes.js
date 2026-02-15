const router = require("express").Router();
const Category = require("../Models/Category");

// Public list
router.get("/", async (req, res) => {
  const items = await Category.find({ isActive: true })
    .sort({ name: 1 })
    .select("_id name slug")
    .lean();
  res.json({ items });
});

module.exports = router;
