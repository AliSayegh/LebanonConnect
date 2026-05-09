require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserAuth        = require("../Models/UserAuth");
const AdminProfile    = require("../Models/Adminprofile");
const CustomerProfile = require("../Models/CustomerProfile");
const ProviderProfile = require("../Models/ProviderProfile");
const Category        = require("../Models/Category");
const Job             = require("../Models/Job");
const Message         = require("../Models/Message");
const Review          = require("../Models/Review");
const Subscription    = require("../Models/Subscription");
const Transaction     = require("../Models/Transaction");
const Report          = require("../Models/Report");

// ─── Helpers ────────────────────────────────────────────────────────────────

async function upsertCategory({ name, slug }) {
  return Category.findOneAndUpdate(
    { slug },
    { name, slug, isActive: true },
    { upsert: true, new: true }
  );
}

/** Returns existing user or creates a new one. */
async function upsertUser({ email, password, role }) {
  const existing = await UserAuth.findOne({ email: email.toLowerCase().trim() });
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(password, 10);
  return UserAuth.create({ email: email.toLowerCase().trim(), passwordHash, role, status: "active" });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing in .env");

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB\n");

  // ─── 1. Categories ───────────────────────────────────────────────────────
  const categoriesSeed = [
    { name: "Electrician",     slug: "electrician" },
    { name: "Plumber",         slug: "plumber" },
    { name: "Air Conditioner", slug: "air-conditioner" },
    { name: "Carpenter",       slug: "carpenter" },
    { name: "Painter",         slug: "painter" },
    { name: "Cleaner",         slug: "cleaner" },
    { name: "Mover",           slug: "mover" },
  ];

  const categories = [];
  for (const c of categoriesSeed) {
    categories.push(await upsertCategory(c));
  }
  console.log("✅ Categories:", categories.map(c => c.slug).join(", "));

  // ─── 2. Users ────────────────────────────────────────────────────────────
  // Admin
  const admin = await upsertUser({ email: "admin@lebaconnect.test",     password: "Admin123!",  role: "admin" });

  // Providers
  const provider1 = await upsertUser({ email: "provider1@lebaconnect.test", password: "Test1234!", role: "provider" });
  const provider2 = await upsertUser({ email: "provider2@lebaconnect.test", password: "Test1234!", role: "provider" });
  const provider3 = await upsertUser({ email: "provider3@lebaconnect.test", password: "Test1234!", role: "provider" });

  // Customers
  const customer1 = await upsertUser({ email: "customer1@lebaconnect.test", password: "Test1234!", role: "customer" });
  const customer2 = await upsertUser({ email: "customer2@lebaconnect.test", password: "Test1234!", role: "customer" });
  const customer3 = await upsertUser({ email: "customer3@lebaconnect.test", password: "Test1234!", role: "customer" });

  console.log("✅ Users ready (admin + 3 providers + 3 customers)");

  // ─── 3. Admin Profile ────────────────────────────────────────────────────
  await AdminProfile.findOneAndUpdate(
    { userId: admin._id },
    {
      userId: admin._id,
      permissions: ["manage_users", "manage_jobs", "manage_reports", "manage_subscriptions", "view_stats"]
    },
    { upsert: true, new: true }
  );
  console.log("✅ AdminProfile ready");

  // ─── 4. Provider Profiles ────────────────────────────────────────────────
  await ProviderProfile.findOneAndUpdate(
    { userId: provider1._id },
    {
      userId: provider1._id,
      displayName:          "Ali Electric",
      bio:                  "Fast & safe electrical repairs. 10+ years experience in Beirut.",
      city:                 "Beirut",
      addressArea:          "Dahye",
      categoryIds:          [categories[0]._id],          // Electrician
      pricingType:          "quote",
      basePrice:            0,
      isVerified:           true,
      isActive:             true,
      onboardingComplete:   true,
      ratingAvg:            4.8,
      ratingCount:          51,
      completedJobsCount:   120,
      subscription: { plan: "pro",   expiresAt: new Date(Date.now() + 30 * 86400_000), trialUsed: true },
      strike:               0,
    },
    { upsert: true, new: true }
  );

  await ProviderProfile.findOneAndUpdate(
    { userId: provider2._id },
    {
      userId: provider2._id,
      displayName:          "Dana Plumbing",
      bio:                  "Emergency plumbing & maintenance. Available 24/7.",
      city:                 "Mount Lebanon",
      addressArea:          "Jnah",
      categoryIds:          [categories[1]._id],          // Plumber
      pricingType:          "hourly",
      basePrice:            15,
      isVerified:           true,
      isActive:             true,
      onboardingComplete:   true,
      ratingAvg:            4.6,
      ratingCount:          33,
      completedJobsCount:   78,
      subscription: { plan: "basic", expiresAt: new Date(Date.now() + 15 * 86400_000), trialUsed: true },
      strike:               0,
    },
    { upsert: true, new: true }
  );

  await ProviderProfile.findOneAndUpdate(
    { userId: provider3._id },
    {
      userId: provider3._id,
      displayName:          "Rami AC Fix",
      bio:                  "Expert AC installation, servicing and repair all over Lebanon.",
      city:                 "Tripoli",
      addressArea:          "El Mina",
      categoryIds:          [categories[2]._id],          // Air Conditioner
      pricingType:          "fixed",
      basePrice:            50,
      isVerified:           false,
      isActive:             true,
      onboardingComplete:   true,
      ratingAvg:            4.2,
      ratingCount:          10,
      completedJobsCount:   25,
      subscription: { plan: "free", expiresAt: null, trialUsed: false },
      strike:               1,
    },
    { upsert: true, new: true }
  );

  console.log("✅ Provider profiles ready");

  // ─── 5. Customer Profiles ────────────────────────────────────────────────
  const customerData = [
    { userId: customer1._id, fullName: "Lara Haddad",  city: "Beirut",         addressArea: "Hamra" },
    { userId: customer2._id, fullName: "Omar Khalil",  city: "Mount Lebanon",  addressArea: "Jnah" },
    { userId: customer3._id, fullName: "Maya Nassar",  city: "Tripoli",        addressArea: "El Mina" },
  ];

  for (const cd of customerData) {
    await CustomerProfile.findOneAndUpdate(
      { userId: cd.userId },
      cd,
      { upsert: true, new: true }
    );
  }
  console.log("✅ Customer profiles ready");

  // ─── 6. Jobs ─────────────────────────────────────────────────────────────
  // Helper: find or create a job by title (idempotent)
  async function upsertJob(title, data) {
    const existing = await Job.findOne({ title });
    if (existing) return existing;
    return Job.create({ title, ...data });
  }

  // Job A – open (customer1 → provider1)
  const jobA = await upsertJob("Fix home electricity", {
    customerId:  customer1._id,
    providerId:  provider1._id,
    categoryId:  categories[0]._id,
    description: "Power trips when turning on AC in the living room.",
    city:        "Beirut",
    addressArea: "Hamra",
    status:      "open",              // ✅ valid enum value
    pricing:     { type: "quote", amount: 0, currency: "USD" },
    commission:  { percentage: 10, amount: 0, paid: false }
  });

  // Job B – accepted (customer2 → provider2)
  const jobB = await upsertJob("Kitchen sink leak", {
    customerId:  customer2._id,
    providerId:  provider2._id,
    categoryId:  categories[1]._id,
    description: "Leak under the kitchen sink, spreading to cabinet.",
    city:        "Mount Lebanon",
    addressArea: "Jnah",
    status:      "accepted",
    acceptedAt:  new Date(Date.now() - 2 * 86400_000),
    pricing:     { type: "hourly", amount: 15, currency: "USD" },
    commission:  { percentage: 10, amount: 0, paid: false }
  });

  // Job C – in_progress (customer3 → provider3)
  const jobC = await upsertJob("AC not cooling properly", {
    customerId:  customer3._id,
    providerId:  provider3._id,
    categoryId:  categories[2]._id,
    description: "Bedroom AC runs but does not cool below 28°C.",
    city:        "Tripoli",
    addressArea: "El Mina",
    status:      "in_progress",
    acceptedAt:  new Date(Date.now() - 3 * 86400_000),
    pricing:     { type: "fixed", amount: 50, currency: "USD" },
    commission:  { percentage: 10, amount: 5, paid: false }
  });

  // Job D – confirmed (customer1 → provider2) → will have review + transaction
  const jobD = await upsertJob("Fix bathroom pipes", {
    customerId:  customer1._id,
    providerId:  provider2._id,
    categoryId:  categories[1]._id,
    description: "Old pipes leaking behind the bathroom wall.",
    city:        "Beirut",
    addressArea: "Hamra",
    status:      "confirmed",
    acceptedAt:  new Date(Date.now() - 10 * 86400_000),
    completedAt: new Date(Date.now() - 8 * 86400_000),
    confirmedAt: new Date(Date.now() - 7 * 86400_000),
    pricing:     { type: "hourly", amount: 15, finalPrice: 60, currency: "USD" },
    commission:  { percentage: 10, amount: 6, paid: true }
  });

  // Job E – completed (customer2 → provider1) → will have review + transaction
  const jobE = await upsertJob("Install new light switches", {
    customerId:  customer2._id,
    providerId:  provider1._id,
    categoryId:  categories[0]._id,
    description: "Replace old switches throughout the apartment.",
    city:        "Mount Lebanon",
    addressArea: "Jnah",
    status:      "completed",
    acceptedAt:  new Date(Date.now() - 15 * 86400_000),
    completedAt: new Date(Date.now() - 13 * 86400_000),
    pricing:     { type: "fixed", amount: 80, finalPrice: 80, currency: "USD" },
    commission:  { percentage: 10, amount: 8, paid: false }
  });

  // Job F – cancelled (customer3 → provider1)
  const jobF = await upsertJob("Fix outdoor lighting", {
    customerId:  customer3._id,
    providerId:  provider1._id,
    categoryId:  categories[0]._id,
    description: "Outdoor garden lights stopped working after rain.",
    city:        "Tripoli",
    addressArea: "El Mina",
    status:      "cancelled",
    pricing:     { type: "quote", amount: 0, currency: "USD" },
    commission:  { percentage: 10, amount: 0, paid: false }
  });

  console.log("✅ Jobs ready:", [jobA, jobB, jobC, jobD, jobE, jobF].map(j => j.title).join(" | "));

  // ─── 7. Messages ─────────────────────────────────────────────────────────
  async function seedMessages(jobId, pairs) {
    const count = await Message.countDocuments({ jobId });
    if (count === 0) await Message.create(pairs.map(p => ({ jobId, ...p })));
  }

  await seedMessages(jobA._id, [
    { senderId: customer1._id, content: "Hi, can you come today?" },
    { senderId: provider1._id, content: "Yes, what time works for you?" },
    { senderId: customer1._id, content: "Around 3 PM?" },
    { senderId: provider1._id, content: "Perfect, see you then." },
  ]);

  await seedMessages(jobB._id, [
    { senderId: customer2._id, content: "Hello, the sink is leaking badly." },
    { senderId: provider2._id, content: "I can arrive in about an hour." },
    { senderId: customer2._id, content: "Great, the door is on the left." },
  ]);

  await seedMessages(jobC._id, [
    { senderId: customer3._id, content: "The AC is running but it is too hot." },
    { senderId: provider3._id, content: "I am on my way, should take 20 mins." },
  ]);

  await seedMessages(jobD._id, [
    { senderId: customer1._id, content: "Great work on the pipes, thank you!" },
    { senderId: provider2._id, content: "Happy to help, enjoy the dry walls!" },
  ]);

  console.log("✅ Messages seeded");

  // ─── 8. Reviews ──────────────────────────────────────────────────────────
  // Reviews only on confirmed/completed jobs, one per job
  async function upsertReview(jobId, customerId, providerId, rating, text) {
    const existing = await Review.findOne({ jobId });
    if (existing) return existing;
    return Review.create({ jobId, customerId, providerId, rating, text });
  }

  await upsertReview(jobD._id, customer1._id, provider2._id, 5, "Excellent work, very professional and clean. Highly recommended!");
  await upsertReview(jobE._id, customer2._id, provider1._id, 4, "Good job, on time and tidy. Will use again.");

  console.log("✅ Reviews seeded");

  // ─── 9. Subscriptions ────────────────────────────────────────────────────
  async function upsertSubscription(providerId, data) {
    const existing = await Subscription.findOne({ providerId, status: data.status });
    if (existing) return existing;
    return Subscription.create({ providerId, ...data });
  }

  // provider1 – active pro plan
  await upsertSubscription(provider1._id, {
    plan:              "pro",
    status:            "active",
    trialEndsAt:       null,
    currentPeriodEnd:  new Date(Date.now() + 30 * 86400_000),
    price:             29.99,
    currency:          "USD",
    visibilityBoost:   true
  });

  // provider2 – active basic plan
  await upsertSubscription(provider2._id, {
    plan:              "basic",
    status:            "active",
    trialEndsAt:       null,
    currentPeriodEnd:  new Date(Date.now() + 15 * 86400_000),
    price:             9.99,
    currency:          "USD",
    visibilityBoost:   false
  });

  // provider3 – on free trial
  await upsertSubscription(provider3._id, {
    plan:              "free",
    status:            "trial",
    trialEndsAt:       new Date(Date.now() + 7 * 86400_000),
    currentPeriodEnd:  null,
    price:             0,
    currency:          "USD",
    visibilityBoost:   false
  });

  console.log("✅ Subscriptions seeded");

  // ─── 10. Transactions ─────────────────────────────────────────────────────
  // Only for confirmed jobs (commission.paid = true)
  async function upsertTransaction(jobId, providerId, customerId, data) {
    const existing = await Transaction.findOne({ jobId });
    if (existing) return existing;
    return Transaction.create({ jobId, providerId, customerId, ...data });
  }

  // jobD confirmed + paid
  await upsertTransaction(jobD._id, provider2._id, customer1._id, {
    jobAmount:        60,
    commissionRate:   0.10,
    commissionAmount: 6,
    status:           "paid"
  });

  // jobE completed but commission not yet paid
  await upsertTransaction(jobE._id, provider1._id, customer2._id, {
    jobAmount:        80,
    commissionRate:   0.10,
    commissionAmount: 8,
    status:           "pending"
  });

  console.log("✅ Transactions seeded");

  // ─── 11. Reports ──────────────────────────────────────────────────────────
  async function seedReport(reporterId, reportedUserId, jobId, type, details, status) {
    const existing = await Report.findOne({ reporterId, reportedUserId, type });
    if (existing) return existing;
    return Report.create({ reporterId, reportedUserId, jobId, type, details, status });
  }

  // customer1 reports provider3 for trying to share phone number
  await seedReport(
    customer1._id,
    provider3._id,
    null,
    "phone_share",
    "Provider tried to share his personal phone number via chat.",
    "open"
  );

  // customer2 reports provider3 for potential scam behaviour
  await seedReport(
    customer2._id,
    provider3._id,
    jobC._id,
    "scam",
    "Provider asked for full payment upfront and disappeared.",
    "reviewing"
  );

  console.log("✅ Reports seeded");

  // ─── 12. Featured providers (10 extra) ───────────────────────────────────
  const featuredProviders = [
    { name: "Top Star Pro",     rating: 5.0, jobs: 150, city: "Beirut",        catIdx: 0 },
    { name: "Expert Repair",    rating: 4.9, jobs: 90,  city: "Tripoli",       catIdx: 1 },
    { name: "Master Handyman",  rating: 4.8, jobs: 200, city: "Sidon",         catIdx: 2 },
    { name: "Quality Fix",      rating: 4.7, jobs: 45,  city: "Byblos",        catIdx: 3 },
    { name: "Reliable Service", rating: 4.6, jobs: 120, city: "Beirut",        catIdx: 4 },
    { name: "Service King",     rating: 4.5, jobs: 30,  city: "Zahle",         catIdx: 5 },
    { name: "Home Helper",      rating: 4.4, jobs: 60,  city: "Beirut",        catIdx: 6 },
    { name: "Quick Response",   rating: 4.3, jobs: 15,  city: "Jounieh",       catIdx: 0 },
    { name: "Pro Maintenance",  rating: 4.2, jobs: 80,  city: "Beirut",        catIdx: 1 },
    { name: "Budget Fix",       rating: 4.1, jobs: 10,  city: "Tripoli",       catIdx: 2 },
  ];

  const pwHash = await bcrypt.hash("Test1234!", 10);

  for (let i = 0; i < featuredProviders.length; i++) {
    const fp   = featuredProviders[i];
    const email = `featured_prov${i}@lebaconnect.test`;

    let user = await UserAuth.findOne({ email });
    if (!user) {
      user = await UserAuth.create({ email, passwordHash: pwHash, role: "provider", status: "active" });
    }

    await ProviderProfile.findOneAndUpdate(
      { userId: user._id },
      {
        userId:             user._id,
        displayName:        fp.name,
        bio:                `Top-rated professional in ${fp.city}. Specialising in quality home maintenance.`,
        city:               fp.city,
        addressArea:        "Central District",
        categoryIds:        [categories[fp.catIdx]._id],
        pricingType:        "quote",
        basePrice:          0,
        isVerified:         true,
        isActive:           true,
        onboardingComplete: true,
        ratingAvg:          fp.rating,
        ratingCount:        Math.round(fp.rating * 10),
        completedJobsCount: fp.jobs,
        subscription: {
          plan:      "pro",
          expiresAt: new Date(Date.now() + 30 * 86400_000),
          trialUsed: true
        },
        strike: 0,
      },
      { upsert: true, new: true }
    );
  }

  console.log("✅ 10 featured providers seeded");

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║              🔐 TEST CREDENTIALS                    ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║  ROLE       EMAIL                       PASSWORD    ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║  admin      admin@lebaconnect.test      Admin123!   ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║  provider   provider1@lebaconnect.test  Test1234!   ║");
  console.log("║  provider   provider2@lebaconnect.test  Test1234!   ║");
  console.log("║  provider   provider3@lebaconnect.test  Test1234!   ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║  customer   customer1@lebaconnect.test  Test1234!   ║");
  console.log("║  customer   customer2@lebaconnect.test  Test1234!   ║");
  console.log("║  customer   customer3@lebaconnect.test  Test1234!   ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  await mongoose.disconnect();
  console.log("✅ Seeding complete. Database is fully populated.");
}

main().catch(async (err) => {
  console.error("\n❌ Seed failed:", err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
