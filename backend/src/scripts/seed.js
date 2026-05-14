import bcrypt from "bcryptjs";
import {
  AnalyticsEvent,
  Application,
  CrmVisit,
  FileAsset,
  Institution,
  LaunchChecklist,
  Notification,
  PortfolioLink,
  Profile,
  Project,
  Session,
  User,
} from "../models/index.js";
import { connectDatabase } from "../config/db.js";

const DEMO_PASSWORD = "Password123!";

const avatarColors = ["#00D1FF", "#E63946", "#34D399", "#A78BFA", "#FB923C", "#F472B6"];

async function createUser(input, index) {
  const user = await User.create({
    email: input.email,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
    name: input.name,
    role: input.role,
    roleVariant: input.roleVariant,
    institution: null,
    founder: input.founder || false,
  });

  await Profile.create({
    user: user._id,
    handle: input.handle,
    headline: input.headline,
    bio: input.bio,
    skills: input.skills,
    interests: input.interests,
    availability: input.availability,
    avatarColor: avatarColors[index % avatarColors.length],
    location: input.location,
    primaryDomain: input.primaryDomain,
    specialization: input.specialization,
    xp: input.xp,
    level: input.level,
    streakDays: input.streakDays,
    emailVerifiedAt: new Date(),
    institutionVerified: false,
    trustScore: input.trustScore,
  });

  return user;
}

async function main() {
  await connectDatabase();
  
  // We do NOT resetCollections here to avoid deleting the user's manual data
  // Only use resetCollections if you want a complete wipe.

  const users = await Promise.all([
    createUser({
      email: "founder@scope.in",
      name: "Riya Sen",
      handle: "riya-founder",
      role: "super_admin",
      roleVariant: "scope_super_admin",
      founder: true,
      headline: "Founder, Scope Connect",
      bio: "Building India's campus innovation graph.",
      skills: ["Strategy", "Partnerships", "Product"],
      interests: ["Campus innovation", "AI", "Hiring"],
      availability: "Hiring teammates",
      location: "Bengaluru",
      primaryDomain: "startup",
      specialization: "ecosystem",
      xp: 9800,
      level: 14,
      streakDays: 42,
      trustScore: 98,
    }, 0),
    createUser({
      email: "ops@scopeconnect.in",
      name: "Kabir Malhotra",
      handle: "kabir-ops",
      role: "scope_admin",
      roleVariant: "scope_admin",
      headline: "Partnerships and campus operations",
      bio: "Helping chapters launch faster with clean playbooks.",
      skills: ["Operations", "Community", "Analytics"],
      interests: ["Partnerships", "Events", "Growth"],
      availability: "Open to collab",
      location: "Delhi",
      primaryDomain: "management",
      specialization: "operations",
      xp: 6200,
      level: 10,
      streakDays: 18,
      trustScore: 91,
    }, 1),
  ]);

  const [founder] = users;

  await Project.create({
    createdBy: founder._id,
    title: "Build the Scope Trust Layer",
    summary: "A verification and credibility layer for student portfolios.",
    description: "Design and implement trust scoring signals for profiles, projects, and institution verification.",
    domain: "software",
    tags: ["react", "node", "trust"],
    status: "open",
    capacity: 4,
    startsOn: new Date("2026-06-01"),
    endsOn: new Date("2026-08-31"),
    visibility: "public",
  });

  console.log("Seed complete. Only admin accounts created.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
