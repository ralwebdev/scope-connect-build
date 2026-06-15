import mongoose from "mongoose";
import { env } from "./config/env.js";
import { User, Profile, Institution } from "./models/index.js";

async function run() {
  console.log("Connecting to:", "mongodb+srv://Auth:***@cluster0.fmtt8p1.mongodb.net/scopeConnect");
  await mongoose.connect("mongodb+srv://Auth:hs9MofCPaymr0g8M@cluster0.fmtt8p1.mongodb.net/scopeConnect");
  console.log("Connected successfully!");

  const usersCount = await User.countDocuments();
  const profilesCount = await Profile.countDocuments();
  const institutionsCount = await Institution.countDocuments();

  console.log("Database Stats:");
  console.log("Users Count:", usersCount);
  console.log("Profiles Count:", profilesCount);
  console.log("Institutions Count:", institutionsCount);

  // Chapters query check
  const rowsChapters = await Profile.aggregate([
    { $match: { institution: { $ne: null } } },
    { $group: { _id: "$institution", totalXp: { $sum: { $ifNull: ["$xp", 0] } }, members: { $sum: 1 } } },
    { $lookup: { from: "institutions", localField: "_id", foreignField: "_id", as: "institution" } },
    { $unwind: "$institution" },
  ]);
  console.log("Chapters query returned:", rowsChapters.length, "rows");

  // Builders query check
  const rowsBuilders = await Profile.aggregate([
    { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "userDetails" } },
    { $unwind: "$userDetails" },
    { $match: { "userDetails.role": "student", "userDetails.disabledAt": null } },
  ]);
  console.log("Builders query returned:", rowsBuilders.length, "rows");

  // Campuses query check
  const rowsCampuses = await User.aggregate([
    { $match: { role: "student", disabledAt: null, institution: { $ne: null } } },
    { $group: { _id: "$institution", members: { $sum: 1 } } },
  ]);
  console.log("Campuses query returned:", rowsCampuses.length, "rows");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("DB test error:", err);
  process.exit(1);
});
