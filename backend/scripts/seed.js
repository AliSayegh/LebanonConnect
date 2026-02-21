require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserAuth = require("../Models/UserAuth");
const ProviderProfile = require("../Models/ProviderProfile");
const CustomerProfile = require("../Models/CustomerProfile");
const Category = require("../Models/Category");
const Job = require("../Models/Job");
const Message = require("../Models/Message");

async function upsertCategory({ name, slug }) {
  return Category.findOneAndUpdate(
    { slug },
    { name, slug, isActive: true },
    { upsert: true, new: true }
  );
}

async function createUser({ email, password, role }) {
  const existing = await UserAuth.findOne({ email });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(password, 10);
  return UserAuth.create({ email, passwordHash, role, status: "active" });
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing in .env");

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  // 1) Categories
  const categoriesSeed = [
    { name: "Electrician", slug: "electrician" },
    { name: "Plumber", slug: "plumber" },
    { name: "Air Conditioner", slug: "air-conditioner" },
    { name: "Carpenter", slug: "carpenter" },
    { name: "Painter", slug: "painter" }
  ];

  const categories = [];
  for (const c of categoriesSeed) {
    categories.push(await upsertCategory(c));
  }

  console.log("✅ Categories ready:", categories.map(c => c.slug).join(", "));

  // 2) Create users
  const admin = await createUser({
    email: "admin@servicehub.test",
    password: "Admin123!",
    role: "admin"
  });

  const provider1 = await createUser({
    email: "provider1@servicehub.test",
    password: "Test1234!",
    role: "provider"
  });

  const provider2 = await createUser({
    email: "provider2@servicehub.test",
    password: "Test1234!",
    role: "provider"
  });

  const customer1 = await createUser({
    email: "customer1@servicehub.test",
    password: "Test1234!",
    role: "customer"
  });

  const customer2 = await createUser({
    email: "customer2@servicehub.test",
    password: "Test1234!",
    role: "customer"
  });

  console.log("✅ Users created/exists");

  // 3) Profiles (upsert)
  await ProviderProfile.findOneAndUpdate(
    { userId: provider1._id },
    {
      userId: provider1._id,
      displayName: "Ali Electric",
      bio: "Fast & safe electrical repairs",
      city: "Beirut",
      addressArea: "Dahye",
      categoryIds: [categories[0]._id],
      pricingType: "quote",
      basePrice: 0,
      isVerified: true,
      isActive: true,
      onboardingComplete: true,
      ratingAvg: 4.8,
      ratingCount: 51,
      completedJobsCount: 120
    },
    { upsert: true, new: true }
  );

  await ProviderProfile.findOneAndUpdate(
    { userId: provider2._id },
    {
      userId: provider2._id,
      displayName: "Dana Plumbing",
      bio: "Emergency plumbing & maintenance",
      city: "Mount Lebanon",
      addressArea: "Jnah",
      categoryIds: [categories[1]._id],
      pricingType: "hourly",
      basePrice: 15,
      isVerified: true,
      isActive: true,
      onboardingComplete: true,
      ratingAvg: 4.6,
      ratingCount: 33,
      completedJobsCount: 78
    },
    { upsert: true, new: true }
  );

  await CustomerProfile.findOneAndUpdate(
    { userId: customer1._id },
    {
      userId: customer1._id,
      fullName: "Customer One",
      city: "Beirut",
      addressArea: "Hamra"
    },
    { upsert: true, new: true }
  );

  await CustomerProfile.findOneAndUpdate(
    { userId: customer2._id },
    {
      userId: customer2._id,
      fullName: "Customer Two",
      city: "Mount Lebanon",
      addressArea: "Jnah"
    },
    { upsert: true, new: true }
  );

  console.log("✅ Profiles ready");

  // 4) Create 2 Jobs (if not already)
  const existingJobs = await Job.find({
    title: { $in: ["Fix home electricity", "Kitchen sink leak"] }
  });

  const jobTitles = new Set(existingJobs.map(j => j.title));

  let jobA = null;
  let jobB = null;

  if (!jobTitles.has("Fix home electricity")) {
    jobA = await Job.create({
      customerId: customer1._id,
      providerId: provider1._id,
      categoryId: categories[0]._id,
      title: "Fix home electricity",
      description: "Power goes off when turning on AC.",
      city: "Beirut",
      addressArea: "Hamra",
      status: "pending",
      pricing: { type: "quote", amount: 0, currency: "USD" }
    });
  } else {
    jobA = await Job.findOne({ title: "Fix home electricity" });
  }

  if (!jobTitles.has("Kitchen sink leak")) {
    jobB = await Job.create({
      customerId: customer2._id,
      providerId: provider2._id,
      categoryId: categories[1]._id,
      title: "Kitchen sink leak",
      description: "Leak under the sink, needs repair.",
      city: "Mount Lebanon",
      addressArea: "Jnah",
      status: "accepted",
      pricing: { type: "hourly", amount: 15, currency: "USD" }
    });
  } else {
    jobB = await Job.findOne({ title: "Kitchen sink leak" });
  }

  console.log("✅ Jobs ready:", jobA._id.toString(), jobB._id.toString());

  // 5) Add sample messages if none
  const countA = await Message.countDocuments({ jobId: jobA._id });
  if (countA === 0) {
    await Message.create([
      { jobId: jobA._id, senderId: customer1._id, content: "Hi, can you come today?" },
      { jobId: jobA._id, senderId: provider1._id, content: "Yes, what time works for you?" }
    ]);
  }

  const countB = await Message.countDocuments({ jobId: jobB._id });
  if (countB === 0) {
    await Message.create([
      { jobId: jobB._id, senderId: customer2._id, content: "Hello, sink is leaking badly." },
      { jobId: jobB._id, senderId: provider2._id, content: "I can come in 1 hour." }
    ]);
  }

  console.log("✅ Messages seeded");

  console.log("\n=== TEST ACCOUNTS ===");
  console.log("Admin:", "admin@servicehub.test", "Admin123!");
  console.log("Provider1:", "provider1@servicehub.test", "Test1234!");
  console.log("Provider2:", "provider2@servicehub.test", "Test1234!");
  console.log("Customer1:", "customer1@servicehub.test", "Test1234!");
  console.log("Customer2:", "customer2@servicehub.test", "Test1234!");
  console.log("=====================\n");

  await mongoose.disconnect();
  console.log("✅ Done.");
}

main().catch(async (e) => {
  console.error("❌ Seed failed:", e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
