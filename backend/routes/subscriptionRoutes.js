const router = require("express").Router();
const ProviderProfile = require("../Models/ProviderProfile");
const { requireAuth, requireRole } = require("../Middleware/auth");

const PRICES = {
  basic: 30, // days
  pro: 30
};

router.get("/me", requireAuth, requireRole("provider"), async (req, res) => {
  const p = await ProviderProfile.findOne({ userId: req.user.id });
  res.json({ subscription: p?.subscription || { plan: "free" } });
});

// Start/renew plan (for now: mock activation)
router.post("/start", requireAuth, requireRole("provider"), async (req, res) => {
  const { plan } = req.body; // "basic" | "pro"
  if (!["basic", "pro"].includes(plan)) return res.status(400).json({ message: "Invalid plan" });

  const p = await ProviderProfile.findOne({ userId: req.user.id });
  if (!p) return res.status(404).json({ message: "Provider profile not found" });

  const days = PRICES[plan];
  const now = new Date();
  const base = p.subscription?.expiresAt && p.subscription.expiresAt > now ? p.subscription.expiresAt : now;
  const expiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  p.subscription.plan = plan;
  p.subscription.expiresAt = expiresAt;
  p.subscription.trialUsed = true;
  await p.save();

  res.json({ message: "Subscription activated ✅", subscription: p.subscription });
});

module.exports = router;
