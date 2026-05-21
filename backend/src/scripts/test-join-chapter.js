import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Profile, Institution, Notification, ProfileActivity } from "../models/index.js";
import { env } from "../config/env.js";

const MONGO_URI = "mongodb+srv://Auth:hs9MofCPaymr0g8M@cluster0.fmtt8p1.mongodb.net/scopeConnect";
const BASE_URL = process.env.API_BASE_URL || `http://localhost:${env.port || 5050}`;

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    const message = json?.error?.message || res.statusText;
    throw new Error(`${options.method || "GET"} ${path} failed: ${res.status} ${message}`);
  }
  return json.data;
}

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected successfully!");

  // Find or create test institutions
  let instA = await Institution.findOne({ slug: "test-university-a" });
  if (!instA) {
    instA = await Institution.create({
      name: "Test University A",
      slug: "test-university-a",
      domain: "testa.edu",
      verified: true,
    });
    console.log("Created Test University A");
  }

  let instB = await Institution.findOne({ slug: "test-university-b" });
  if (!instB) {
    instB = await Institution.create({
      name: "Test University B",
      slug: "test-university-b",
      domain: "testb.edu",
      verified: true,
    });
    console.log("Created Test University B");
  }

  // 1. Setup Alice user in a state without Test University A/B
  console.log("\n--- Resetting Alice user state ---");
  const alice = await User.findOne({ email: "alice@iitb.ac.in" });
  if (!alice) {
    throw new Error("Alice user not found! Please run check-users-db.js first.");
  }

  alice.institution = null;
  alice.studentStatus = "active";
  await alice.save();

  const profile = await Profile.findOne({ user: alice._id });
  if (profile) {
    profile.institution = null;
    profile.institutionVerified = false;
    // Reset XP for clean validation of increment
    profile.xp = 100;
    profile.level = 1;
    await profile.save();
  }

  // Clean up notifications and activities for the test institution to prevent duplicates/clutter
  await Notification.deleteMany({ user: alice._id, title: /Joined Test/ });
  await ProfileActivity.deleteMany({ user: alice._id, text: /Joined Test/ });

  console.log("Alice reset successfully with institution = null and XP = 100");

  // 2. Perform HTTP login to obtain Auth headers
  console.log("\n--- Logging in via HTTP ---");
  const loginResult = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "alice@iitb.ac.in", password: "Password123!" }),
  });
  const authHeaders = { Authorization: `Bearer ${loginResult.access_token}` };
  console.log("Login successful! Alice token obtained.");

  // 3. Test Join Chapter: Joining Test University A
  console.log("\n--- Testing Join Chapter API for Test University A ---");
  const joinResultA = await request("/api/v1/users/join-chapter", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ institution_id: instA._id.toString() }),
  });

  console.log("API response received:", joinResultA);

  // Validate backend response and database state
  const updatedUserA = await User.findById(alice._id);
  const updatedProfileA = await Profile.findOne({ user: alice._id });

  console.log("\nVerifying DB state for Test University A:");
  console.log(`User Institution linked: ${updatedUserA.institution?.toString() === instA._id.toString()} (${updatedUserA.institution})`);
  console.log(`User Student Status: ${updatedUserA.studentStatus} (expected: pending_verification)`);
  console.log(`Profile Institution linked: ${updatedProfileA.institution?.toString() === instA._id.toString()} (${updatedProfileA.institution})`);
  console.log(`Profile Institution Verified: ${updatedProfileA.institutionVerified} (expected: false)`);
  console.log(`Profile XP: ${updatedProfileA.xp} (expected: 140 due to +40 XP award)`);

  if (updatedUserA.institution?.toString() !== instA._id.toString()) throw new Error("User institution mismatch");
  if (updatedUserA.studentStatus !== "pending_verification") throw new Error("User student status not pending_verification");
  if (updatedProfileA.institution?.toString() !== instA._id.toString()) throw new Error("Profile institution mismatch");
  if (updatedProfileA.institutionVerified !== false) throw new Error("Profile institutionVerified is not false");
  if (updatedProfileA.xp !== 140) throw new Error(`Expected XP to be 140, but found ${updatedProfileA.xp}`);

  console.log("PASS: Join Chapter Test University A verified successfully!");

  // 4. Test Idempotency / Join Second Time: Joining Test University B
  console.log("\n--- Testing Join Chapter API for Test University B (changing chapters) ---");
  const joinResultB = await request("/api/v1/users/join-chapter", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ institution_id: instB._id.toString() }),
  });

  const updatedUserB = await User.findById(alice._id);
  const updatedProfileB = await Profile.findOne({ user: alice._id });

  console.log("\nVerifying DB state for Test University B:");
  console.log(`User Institution linked: ${updatedUserB.institution?.toString() === instB._id.toString()} (${updatedUserB.institution})`);
  console.log(`User Student Status: ${updatedUserB.studentStatus} (expected: pending_verification)`);
  console.log(`Profile Institution linked: ${updatedProfileB.institution?.toString() === instB._id.toString()} (${updatedProfileB.institution})`);
  console.log(`Profile Institution Verified: ${updatedProfileB.institutionVerified} (expected: false)`);
  console.log(`Profile XP: ${updatedProfileB.xp} (expected: 180 due to +40 XP award)`);

  if (updatedUserB.institution?.toString() !== instB._id.toString()) throw new Error("User institution mismatch for B");
  if (updatedUserB.studentStatus !== "pending_verification") throw new Error("User student status B not pending_verification");
  if (updatedProfileB.institution?.toString() !== instB._id.toString()) throw new Error("Profile institution mismatch for B");
  if (updatedProfileB.institutionVerified !== false) throw new Error("Profile institutionVerified B is not false");
  if (updatedProfileB.xp !== 180) throw new Error(`Expected XP to be 180, but found ${updatedProfileB.xp}`);

  console.log("PASS: Join Chapter Test University B verified successfully!");

  // 5. Verify system welcome notification is created
  const welcomeNotification = await Notification.findOne({
    user: alice._id,
    title: `Joined ${instB.name}!`,
  });
  console.log("\nVerifying Welcome Notification:");
  if (!welcomeNotification) {
    throw new Error("FAIL: Welcome notification not found in database!");
  }
  console.log(`Notification Title: "${welcomeNotification.title}"`);
  console.log(`Notification Body: "${welcomeNotification.body}"`);
  console.log("PASS: Welcome notification verified successfully!");

  // Clean up mock institutions created
  await Institution.deleteOne({ _id: instA._id });
  await Institution.deleteOne({ _id: instB._id });
  console.log("\nCleaned up Test University A and B from database.");

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB. All tests passed!");
}

run().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
