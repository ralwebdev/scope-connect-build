import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Profile, Institution } from "../models/index.js";

const MONGO_URI = "mongodb+srv://Auth:hs9MofCPaymr0g8M@cluster0.fmtt8p1.mongodb.net/scopeConnect";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected successfully!");

  const usersCount = await User.countDocuments();
  console.log(`Total users in database: ${usersCount}`);

  const alice = await User.findOne({ email: "alice@iitb.ac.in" });
  if (alice) {
    console.log("Alice found!", alice);
    // Let's reset her password to Password123! to be absolutely sure
    alice.passwordHash = await bcrypt.hash("Password123!", 12);
    await alice.save();
    console.log("Alice password reset to Password123!");
  } else {
    console.log("Alice not found! Creating Alice...");
    
    // Find or create an institution for IITB
    let iitb = await Institution.findOne({ domain: "iitb.ac.in" });
    if (!iitb) {
      iitb = await Institution.create({
        name: "IIT Bombay",
        slug: "iit-bombay",
        domain: "iitb.ac.in",
        verified: true,
      });
      console.log("Created Institution IIT Bombay");
    }

    const newAlice = await User.create({
      email: "alice@iitb.ac.in",
      passwordHash: await bcrypt.hash("Password123!", 12),
      name: "Alice Smith",
      role: "student",
      roleVariant: "student",
      institution: iitb._id,
      studentStatus: "active",
    });

    await Profile.create({
      user: newAlice._id,
      handle: "alice-smith",
      headline: "Student Builder",
      bio: "Sophomore interested in web dev.",
      availability: "Open to collab",
      avatarColor: "#E63946",
      institution: iitb._id,
      institutionVerified: true,
      xp: 150,
      level: 1,
      streakDays: 1,
      achievements: ["early_adopter"],
    });

    console.log("Alice created successfully!");
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

run().catch(err => {
  console.error("Error running script:", err);
  process.exit(1);
});
