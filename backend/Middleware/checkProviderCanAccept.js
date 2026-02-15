const Job = require("../Models/Job");
const ProviderProfile = require("../Models/ProviderProfile");

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

module.exports = async function checkProviderCanAccept(req, res, next) {
  const providerId = req.user.id;

  const profile = await ProviderProfile.findOne({ userId: providerId });
  if (!profile) return res.status(404).json({ message: "Provider profile not found" });

  const plan = profile.subscription?.plan || "free";
  const expiresAt = profile.subscription?.expiresAt;

  // basic/pro must be active (not expired)
  if (plan !== "free") {
    if (!expiresAt || expiresAt < new Date()) {
      return res.status(403).json({ message: "Subscription expired. Renew to accept jobs." });
    }
    return next();
  }

  // FREE plan limit: 3 accepts/month
  const { start, end } = monthRange();
  const count = await Job.countDocuments({
    providerId,
    status: { $in: ["accepted", "completed", "confirmed"] },
    acceptedAt: { $gte: start, $lt: end }
  });

  if (count >= 3) {
    return res.status(403).json({ message: "Free plan limit reached (3/month). Upgrade to accept more jobs." });
  }

  next();
};
