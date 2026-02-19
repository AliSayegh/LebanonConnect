require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const UserAuth = require("../Models/UserAuth");
const ProviderProfile = require("../Models/ProviderProfile");
const Category = require("../Models/Category");

async function seedFeatured() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing in .env");

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  const categories = await Category.find({ isActive: true });
  if (categories.length === 0) {
    console.error("❌ No categories found. Run 'node scripts/seed.js' first.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash("Test1234!", 10);

  // Generate 10 providers with different ratings
  const providersData = [
    { name: "Top Star Pro", rating: 5.0, jobs: 150, city: "Beirut" },
    { name: "Expert Repair", rating: 4.9, jobs: 90, city: "Tripoli" },
    { name: "Master Handyman", rating: 4.8, jobs: 200, city: "Sidon" },
    { name: "Quality Fix", rating: 4.7, jobs: 45, city: "Byblos" },
    { name: "Reliable Service", rating: 4.6, jobs: 120, city: "Beirut" },
    { name: "Service King", rating: 4.5, jobs: 30, city: "Zahle" },
    { name: "Home Helper", rating: 4.4, jobs: 60, city: "Beirut" },
    { name: "Quick Response", rating: 4.3, jobs: 15, city: "Jounieh" },
    { name: "Pro Maintenance", rating: 4.2, jobs: 80, city: "Beirut" },
    { name: "Budget Fix", rating: 4.1, jobs: 10, city: "Tripoli" },
  ];

  console.log("🌱 Seeding 10 providers...");

  for (let i = 0; i < providersData.length; i++) {
    const data = providersData[i];
    const email = `featured_prov${i}@servicehub.test`;
    
    // Create UserAuth
    let user = await UserAuth.findOne({ email });
    if (!user) {
      user = await UserAuth.create({
        email,
        passwordHash,
        role: "provider",
        status: "active"
      });
    }

    // Create/Update ProviderProfile
    await ProviderProfile.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        displayName: data.name,
        bio: `Dedicated professional in ${data.city}. Specializing in high-quality home maintenance and repairs.`,
        city: data.city,
        addressArea: "Central District",
        categoryIds: [categories[i % categories.length]._id],
        pricingType: "quote",
        basePrice: 0,
        isVerified: true,
        isActive: true,
        onboardingComplete: true,
        ratingAvg: data.rating,
        ratingCount: Math.floor(data.rating * 10),
        completedJobsCount: data.jobs
      },
      { upsert: true, new: true }
    );
  }

  console.log("✅ Seed complete! You now have at least 10 active providers with varying ratings.");
  await mongoose.disconnect();
}

seedFeatured().catch(err => {
  console.error(err);
  process.exit(1);
});
