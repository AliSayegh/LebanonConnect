const mongoose = require("mongoose");
require("dotenv").config();
const UserAuth = require("../Models/UserAuth");
const Report = require("../Models/Report");
const CustomerProfile = require("../Models/CustomerProfile");
const ProviderProfile = require("../Models/ProviderProfile");
const AdminProfile = require("../Models/Adminprofile");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const testId = "69ff30fb78557e0593f29f28"; // Ali Electric
  console.log("Simulating GET /api/reports/provider/" + testId);
  
  let reports = await Report.find({ reportedUserId: testId })
    .populate("reporterId", "email")
    .populate("jobId")
    .populate("closedBy", "email")
    .sort({ createdAt: -1 })
    .lean();
  
  console.log("Query returned:", reports.length, "reports");
  
  const userIds = new Set();
  reports.forEach(r => {
    if (r.reporterId?._id) userIds.add(r.reporterId._id.toString());
    if (r.closedBy?._id) userIds.add(r.closedBy._id.toString());
  });
  
  const userIdsArray = Array.from(userIds);
  console.log("User IDs for name lookup:", userIdsArray);
  
  const [customers, providers, admins] = await Promise.all([
    CustomerProfile.find({ userId: { $in: userIdsArray } }).select("userId fullName").lean(),
    ProviderProfile.find({ userId: { $in: userIdsArray } }).select("userId displayName").lean(),
    AdminProfile.find({ userId: { $in: userIdsArray } }).select("userId").lean()
  ]);
  
  console.log("Customers found:", customers.length);
  console.log("Providers found:", providers.length);
  console.log("Admins found:", admins.length);
  
  const nameMap = {};
  customers.forEach(c => { nameMap[c.userId.toString()] = c.fullName; });
  providers.forEach(p => { nameMap[p.userId.toString()] = p.displayName; });
  console.log("Name map:", nameMap);
  
  reports = reports.map(r => {
    if (r.reporterId) r.reporterId.name = nameMap[r.reporterId._id.toString()] || null;
    if (r.closedBy) r.closedBy.name = nameMap[r.closedBy._id.toString()] || r.closedBy.email;
    return r;
  });
  
  console.log("\nFinal reports:");
  reports.forEach(r => {
    console.log("  ID:", r._id.toString());
    console.log("  Reporter:", r.reporterId?.name || r.reporterId?.email);
    console.log("  Status:", r.status);
    console.log("  Type:", r.type);
    console.log();
  });
  
  await mongoose.disconnect();
}

run().catch(e => { console.error("ERROR:", e); process.exit(1); });
