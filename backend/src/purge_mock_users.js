import mongoose from "mongoose";
import { User } from "./models/User.js";
import { Profile } from "./models/Profile.js";
import { connectDatabase } from "./config/db.js";

async function purge() {
  await connectDatabase();
  console.log("Connected to database. Starting purge...");

  const mockEmails = ["student@example.com", "alice@example.com", "dev@example.com", "mock@example.com", "test@test.com"];
  const mockPatterns = [/@example\.com$/, /@test\.com$/, /^student/];
  const mockNames = ["Alice Sharma", "Dev Patel", "Student User", "Mock Student"];

  const usersToDelete = await User.find({
    $or: [
      { email: { $in: mockEmails } },
      { email: { $regex: mockPatterns[0] } },
      { email: { $regex: mockPatterns[1] } },
      { name: { $in: mockNames } }
    ],
    role: "student"
  });

  console.log(`Found ${usersToDelete.length} mock students to delete.`);

  for (const user of usersToDelete) {
    console.log(`Deleting ${user.name} (${user.email})...`);
    await Profile.deleteMany({ user: user._id });
    await User.findByIdAndDelete(user._id);
  }

  console.log("Purge complete.");
  process.exit(0);
}

purge().catch(err => {
  console.error("Purge failed:", err);
  process.exit(1);
});
