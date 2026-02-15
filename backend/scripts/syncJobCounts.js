require("dotenv").config();
const mongoose = require("mongoose");
const Job = require("../Models/Job");
const ProviderProfile = require("../Models/ProviderProfile");

async function sync() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI missing");

    await mongoose.connect(uri);
    console.log("Connected to MongoDB ✅");

    const providers = await ProviderProfile.find({});
    console.log(`Checking ${providers.length} providers...`);

    for (const p of providers) {
      const count = await Job.countDocuments({
        providerId: p.userId,
        status: "confirmed"
      });

      if (p.completedJobsCount !== count) {
        p.completedJobsCount = count;
        await p.save();
        console.log(`Updated ${p.displayName}: job count = ${count}`);
      }
    }

    console.log("Sync complete! 🚀");
    process.exit(0);
  } catch (err) {
    console.error("Sync failed:", err);
    process.exit(1);
  }
}

sync();
