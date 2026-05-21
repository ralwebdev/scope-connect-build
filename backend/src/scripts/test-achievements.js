import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Profile, Project, Notification, ProfileActivity } from "../models/index.js";
import { unlockAchievement } from "../utils/achievement-engine.js";

const MONGO_URI = "mongodb+srv://Auth:hs9MofCPaymr0g8M@cluster0.fmtt8p1.mongodb.net/scopeConnect";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected successfully!");

  // 1. Setup Alice's Profile for Test
  console.log("\n--- Setting up Alice's profile for test ---");
  const alice = await User.findOne({ email: "alice@iitb.ac.in" });
  if (!alice) {
    throw new Error("Alice user not found! Please run check-users-db.js first.");
  }

  const profile = await Profile.findOne({ user: alice._id });
  if (!profile) {
    throw new Error("Alice profile not found!");
  }

  // Reset achievements, XP, level
  profile.achievements = ["early_adopter"];
  profile.xp = 100;
  profile.level = 1;
  await profile.save();
  console.log("Alice profile reset. Current achievements:", profile.achievements);

  // Clean up existing projects and votes created/voted by Alice for clean run
  await Project.deleteMany({ createdBy: alice._id });
  await Project.updateMany({}, { $pull: { votedBy: alice._id } });
  
  // Clean up notifications and activities
  await Notification.deleteMany({ user: alice._id });
  await ProfileActivity.deleteMany({ user: alice._id });

  // 2. Test: First Project Unlock
  console.log("\n--- Testing 'first_project' achievement unlock ---");
  const project = await Project.create({
    createdBy: alice._id,
    title: "Alice's Awesome Test Project",
    summary: "Testing the achievements engine",
    description: "Full description of Alice's test project",
    domain: "software",
    tags: ["test", "achievements"],
    status: "open",
    capacity: 2,
    startsOn: new Date(),
    endsOn: new Date(Date.now() + 10 * 86400000),
    visibility: "public",
  });
  console.log("Project created!");

  // Manually invoke achievement unlock like the router does
  await unlockAchievement(alice._id, "first_project");

  // Re-fetch profile and assert
  let updatedProfile = await Profile.findOne({ user: alice._id });
  console.log("Alice current achievements:", updatedProfile.achievements);
  if (!updatedProfile.achievements.includes("first_project")) {
    throw new Error("FAIL: 'first_project' achievement was not unlocked!");
  }
  console.log("PASS: 'first_project' unlocked successfully!");

  // 3. Test: Team Player (5 unique project votes)
  console.log("\n--- Testing 'team_player' achievement unlock (5 votes) ---");
  
  // Find another admin/user to create projects to vote on
  const riya = await User.findOne({ email: "founder@scope.in" });
  if (!riya) {
    throw new Error("Founder user not found!");
  }

  // Create 5 mock projects
  const mockProjects = [];
  for (let i = 1; i <= 5; i++) {
    const p = await Project.create({
      createdBy: riya._id,
      title: `Mock Project ${i} for Upvoting`,
      summary: `Supporting team player testing ${i}`,
      status: "open",
      visibility: "public",
    });
    mockProjects.push(p);
  }
  console.log("Created 5 mock projects.");

  // Vote on projects 1 to 4 (should NOT unlock team_player yet)
  for (let i = 0; i < 4; i++) {
    const p = mockProjects[i];
    p.votedBy = [alice._id];
    p.votes = 1;
    await p.save();
    
    const count = await Project.countDocuments({ votedBy: alice._id });
    console.log(`Voted on project ${i + 1}. Current distinct votes count: ${count}`);
    if (count >= 5) {
      await unlockAchievement(alice._id, "team_player");
    }
  }

  updatedProfile = await Profile.findOne({ user: alice._id });
  console.log("Achievements after 4 votes:", updatedProfile.achievements);
  if (updatedProfile.achievements.includes("team_player")) {
    throw new Error("FAIL: 'team_player' was unlocked prematurely after only 4 votes!");
  }

  // Vote on the 5th project (should trigger unlock)
  const fifthProj = mockProjects[4];
  fifthProj.votedBy = [alice._id];
  fifthProj.votes = 1;
  await fifthProj.save();

  const count = await Project.countDocuments({ votedBy: alice._id });
  console.log(`Voted on project 5. Current distinct votes count: ${count}`);
  if (count >= 5) {
    await unlockAchievement(alice._id, "team_player");
  }

  updatedProfile = await Profile.findOne({ user: alice._id });
  console.log("Achievements after 5 votes:", updatedProfile.achievements);
  if (!updatedProfile.achievements.includes("team_player")) {
    throw new Error("FAIL: 'team_player' achievement was not unlocked after 5 votes!");
  }
  console.log("PASS: 'team_player' unlocked successfully!");

  // 4. Test: Account Verification ("verified_builder")
  console.log("\n--- Testing 'verified_builder' achievement unlock ---");
  // Simulate account activation
  await unlockAchievement(alice._id, "verified_builder");

  updatedProfile = await Profile.findOne({ user: alice._id });
  console.log("Final Achievements list:", updatedProfile.achievements);
  if (!updatedProfile.achievements.includes("verified_builder")) {
    throw new Error("FAIL: 'verified_builder' was not unlocked!");
  }
  console.log("PASS: 'verified_builder' unlocked successfully!");

  // 5. Verify XP Ledger & Notifications
  console.log("\n--- Verifying notifications and XP points ---");
  const notifications = await Notification.find({ user: alice._id });
  console.log(`Found ${notifications.length} notifications:`);
  for (const n of notifications) {
    console.log(`- [${n.kind}] ${n.title}: ${n.body}`);
  }

  const activities = await ProfileActivity.find({ user: alice._id });
  console.log(`\nFound ${activities.length} activity ledger entries:`);
  for (const act of activities) {
    console.log(`- [${act.kind}] ${act.text}`);
  }

  console.log(`\nFinal user XP: ${updatedProfile.xp} (Level: ${updatedProfile.level})`);

  // Clean up mock data created in the test
  console.log("\n--- Cleaning up mock test data ---");
  await Project.deleteMany({ createdBy: alice._id });
  for (const p of mockProjects) {
    await Project.deleteOne({ _id: p._id });
  }
  console.log("Mock data cleaned up successfully!");

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB. All tests passed!");
}

run().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
