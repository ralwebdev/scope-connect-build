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

async function resetCollections() {
  await Promise.all([
    AnalyticsEvent.deleteMany({}),
    Application.deleteMany({}),
    CrmVisit.deleteMany({}),
    FileAsset.deleteMany({}),
    LaunchChecklist.deleteMany({}),
    Notification.deleteMany({}),
    PortfolioLink.deleteMany({}),
    Project.deleteMany({}),
    Profile.deleteMany({}),
    Session.deleteMany({}),
    User.deleteMany({}),
    Institution.deleteMany({}),
  ]);
}

async function createUser(input, index) {
  const user = await User.create({
    email: input.email,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
    name: input.name,
    role: input.role,
    roleVariant: input.roleVariant,
    institution: input.institution?._id ?? null,
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
    institution: input.institution?._id,
    primaryDomain: input.primaryDomain,
    specialization: input.specialization,
    website: input.website,
    githubUrl: input.githubUrl,
    linkedinUrl: input.linkedinUrl,
    portfolioWebsite: input.portfolioWebsite,
    xp: input.xp,
    level: input.level,
    streakDays: input.streakDays,
    emailVerifiedAt: new Date(),
    institutionVerified: Boolean(input.institution),
    trustScore: input.trustScore,
  });

  return user;
}

async function main() {
  await connectDatabase();
  await resetCollections();

  const [iitBombay, iitDelhi, bitsPilani] = await Institution.insertMany([
    {
      name: "IIT Bombay",
      slug: "iit-bombay",
      type: "University",
      board: "UGC",
      city: "Mumbai",
      state: "Maharashtra",
      country: "IN",
      domain: "iitb.ac.in",
      verified: true,
      mouStatus: "signed",
      contactPerson: "Dr. S. Mehta",
      designation: "Dean Student Affairs",
      phone: "+91 98300 11122",
      email: "dean@iitb.ac.in",
      priority: 5,
      potentialValue: 250000,
      pipelineStage: "Live Chapter",
      notes: "Flagship chapter with high student activity.",
    },
    {
      name: "IIT Delhi",
      slug: "iit-delhi",
      type: "University",
      board: "UGC",
      city: "New Delhi",
      state: "Delhi",
      country: "IN",
      domain: "iitd.ac.in",
      verified: true,
      mouStatus: "in_discussion",
      contactPerson: "Prof. R. Kapoor",
      designation: "Dean Innovation",
      phone: "+91 98311 44455",
      email: "dean@iitd.ac.in",
      priority: 4,
      potentialValue: 220000,
      pipelineStage: "Negotiation",
      notes: "Legal team reviewing chapter proposal.",
    },
    {
      name: "BITS Pilani",
      slug: "bits-pilani",
      type: "University",
      board: "UGC",
      city: "Pilani",
      state: "Rajasthan",
      country: "IN",
      domain: "pilani.bits-pilani.ac.in",
      verified: true,
      mouStatus: "signed",
      contactPerson: "Dr. M. Patro",
      designation: "Innovation Cell Lead",
      phone: "+91 98432 22211",
      email: "innovation@pilani.bits-pilani.ac.in",
      priority: 4,
      potentialValue: 180000,
      pipelineStage: "MoU Signed",
      notes: "Awaiting launch calendar confirmation.",
    },
  ]);

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
    createUser({
      email: "meera@iitb.ac.in",
      name: "Dr. Meera Iyer",
      handle: "meera-iyer",
      role: "faculty",
      roleVariant: "faculty_coordinator",
      headline: "Faculty coordinator, innovation lab",
      bio: "Mentoring student teams in applied AI and product research.",
      skills: ["Research", "Mentoring", "AI"],
      interests: ["AI", "Healthcare", "Research"],
      availability: "Open to collab",
      location: "Mumbai",
      institution: iitBombay,
      primaryDomain: "research",
      specialization: "applied-ai",
      xp: 4400,
      level: 8,
      streakDays: 12,
      trustScore: 86,
    }, 2),
    createUser({
      email: "admin@iitd.ac.in",
      name: "Arjun Rao",
      handle: "arjun-iitd",
      role: "institution_admin",
      roleVariant: "institutional_admin",
      headline: "Institution admin for IIT Delhi",
      bio: "Coordinating members, projects, and analytics for the campus.",
      skills: ["Program management", "Partnerships", "Data"],
      interests: ["Institution analytics", "Events", "Student success"],
      availability: "Building solo",
      location: "New Delhi",
      institution: iitDelhi,
      primaryDomain: "management",
      specialization: "campus-programs",
      xp: 5100,
      level: 9,
      streakDays: 16,
      trustScore: 88,
    }, 3),
    createUser({
      email: "alice@iitb.ac.in",
      name: "Alice Sharma",
      handle: "alice-sharma",
      role: "student",
      roleVariant: "student",
      headline: "Frontend engineer and AI builder",
      bio: "Shipping polished tools for student founders.",
      skills: ["React", "TypeScript", "UI Engineering"],
      interests: ["AI", "Startup", "Design"],
      availability: "Open to collab",
      location: "Mumbai",
      institution: iitBombay,
      primaryDomain: "software",
      specialization: "frontend",
      website: "https://alice.dev",
      githubUrl: "https://github.com/alicesharma",
      linkedinUrl: "https://linkedin.com/in/alicesharma",
      portfolioWebsite: "https://alice.dev/work",
      xp: 1240,
      level: 4,
      streakDays: 7,
      trustScore: 72,
    }, 4),
    createUser({
      email: "dev@pilani.bits-pilani.ac.in",
      name: "Dev Patel",
      handle: "dev-patel",
      role: "student",
      roleVariant: "student",
      headline: "Full-stack builder focused on climate tech",
      bio: "Currently prototyping sensor dashboards and community tools.",
      skills: ["Node.js", "MongoDB", "IoT"],
      interests: ["Climate", "Hardware", "Open Source"],
      availability: "Looking for internship",
      location: "Pilani",
      institution: bitsPilani,
      primaryDomain: "software",
      specialization: "backend",
      githubUrl: "https://github.com/devpatel",
      xp: 980,
      level: 3,
      streakDays: 5,
      trustScore: 68,
    }, 5),
  ]);

  const [founder, scopeAdmin, faculty, institutionAdmin, alice, dev] = users;

  await Institution.updateMany(
    { _id: { $in: [iitBombay._id, iitDelhi._id, bitsPilani._id] } },
    { owner: scopeAdmin._id },
  );

  const [heritageSchool, easternTech, royalAcademy, bengalPolytechnic, techValley] = await Institution.insertMany([
    {
      name: "Heritage Public School",
      slug: "heritage-public-school",
      type: "School",
      board: "CBSE",
      city: "Kolkata",
      state: "West Bengal",
      country: "IN",
      contactPerson: "Ms. N. Bose",
      designation: "Principal",
      phone: "+91 98302 77788",
      email: "office@heritageps.in",
      owner: scopeAdmin._id,
      priority: 3,
      potentialValue: 90000,
      pipelineStage: "Proposal Sent",
      mouStatus: "in_discussion",
      notes: "Sent pricing deck v2.",
    },
    {
      name: "Eastern Institute of Tech",
      slug: "eastern-institute-of-tech",
      type: "Engineering College",
      board: "AICTE",
      city: "Kolkata",
      state: "West Bengal",
      country: "IN",
      contactPerson: "Dr. K. Iyer",
      designation: "Director",
      phone: "+91 98304 22233",
      email: "director@eit.ac.in",
      owner: scopeAdmin._id,
      priority: 4,
      potentialValue: 200000,
      pipelineStage: "Live Chapter",
      mouStatus: "signed",
      verified: true,
      notes: "Chapter live since September.",
    },
    {
      name: "Royal CBSE Academy",
      slug: "royal-cbse-academy",
      type: "School",
      board: "CBSE",
      city: "Siliguri",
      state: "West Bengal",
      country: "IN",
      contactPerson: "Ms. P. Roy",
      designation: "Principal",
      phone: "+91 98309 11200",
      email: "p@royalcbse.in",
      owner: scopeAdmin._id,
      priority: 4,
      potentialValue: 110000,
      pipelineStage: "MoU Draft Shared",
      mouStatus: "in_discussion",
      notes: "Legal review in progress.",
    },
    {
      name: "Bengal Polytechnic",
      slug: "bengal-polytechnic",
      type: "Polytechnic",
      board: "WBSCTE",
      city: "Asansol",
      state: "West Bengal",
      country: "IN",
      contactPerson: "Mr. T. Saha",
      designation: "Coordinator",
      phone: "+91 98307 99900",
      email: "coord@bp.edu.in",
      owner: scopeAdmin._id,
      priority: 2,
      potentialValue: 70000,
      pipelineStage: "Prospect",
      notes: "Cold outreach pending.",
    },
    {
      name: "Tech Valley Institute",
      slug: "tech-valley-institute",
      type: "Engineering College",
      board: "AICTE",
      city: "Bhubaneswar",
      state: "Odisha",
      country: "IN",
      contactPerson: "Dr. M. Patro",
      designation: "Dean",
      phone: "+91 98432 22211",
      email: "dean@tvi.ac.in",
      owner: scopeAdmin._id,
      priority: 3,
      potentialValue: 160000,
      pipelineStage: "Meeting Completed",
      notes: "Decision expected in two weeks.",
    },
  ]);

  await CrmVisit.insertMany([
    { institution: iitDelhi._id, owner: scopeAdmin._id, date: new Date().toISOString().slice(0, 10), time: "11:00", status: "scheduled" },
    { institution: heritageSchool._id, owner: scopeAdmin._id, date: new Date().toISOString().slice(0, 10), time: "15:30", status: "scheduled" },
    { institution: bengalPolytechnic._id, owner: scopeAdmin._id, date: new Date(Date.now() + 864e5).toISOString().slice(0, 10), time: "10:00", status: "scheduled" },
  ]);

  await LaunchChecklist.insertMany([
    {
      institution: bitsPilani._id,
      facultyAssigned: true,
      leaderShortlisted: true,
      launchScheduled: true,
      registrationsStarted: false,
      pageLive: false,
      challengeActivated: false,
    },
    {
      institution: easternTech._id,
      facultyAssigned: true,
      leaderShortlisted: true,
      launchScheduled: true,
      registrationsStarted: true,
      pageLive: true,
      challengeActivated: true,
    },
  ]);

  await PortfolioLink.insertMany([
    { user: alice._id, key: "github", label: "GitHub", url: "https://github.com/alicesharma", category: "universal", position: 0 },
    { user: alice._id, key: "leetcode", label: "LeetCode", url: "https://leetcode.com/alicesharma", category: "domain", position: 1 },
    { user: dev._id, key: "github", label: "GitHub", url: "https://github.com/devpatel", category: "universal", position: 0 },
    { user: dev._id, key: "custom:climate-dashboard", label: "Climate Dashboard", url: "https://devpatel.dev/climate", category: "custom", position: 1 },
  ]);

  const [trustLayer, campusOps, climateSensors] = await Project.insertMany([
    {
      createdBy: faculty._id,
      institution: iitBombay._id,
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
    },
    {
      createdBy: institutionAdmin._id,
      institution: iitDelhi._id,
      title: "Campus Chapter Analytics",
      summary: "Dashboards for chapter health, events, and member activation.",
      description: "Create analytics views for institution admins and campus leaders.",
      domain: "data",
      tags: ["analytics", "mongodb", "dashboard"],
      status: "in_progress",
      capacity: 3,
      startsOn: new Date("2026-05-15"),
      endsOn: new Date("2026-07-15"),
      visibility: "institution",
    },
    {
      createdBy: dev._id,
      institution: bitsPilani._id,
      title: "Climate Sensor Network",
      summary: "Low-cost campus sensor network for local climate readings.",
      description: "Prototype a data ingestion API and public dashboard for environmental sensor data.",
      domain: "hardware",
      tags: ["iot", "node", "climate"],
      status: "open",
      capacity: 5,
      startsOn: new Date("2026-06-10"),
      endsOn: new Date("2026-09-01"),
      visibility: "public",
    },
  ]);

  const [aliceApplication, devApplication] = await Application.insertMany([
    {
      project: trustLayer._id,
      user: alice._id,
      message: "I can own the frontend workflow and profile verification UI.",
      status: "shortlisted",
      reviewedBy: faculty._id,
      reviewedAt: new Date(),
    },
    {
      project: trustLayer._id,
      user: dev._id,
      message: "I would like to build the API and scoring job.",
      status: "pending",
    },
  ]);

  await Notification.insertMany([
    {
      user: alice._id,
      kind: "application_status_changed",
      title: "Application shortlisted",
      body: "Your application for Build the Scope Trust Layer was shortlisted.",
      link: `/projects/${trustLayer._id}`,
      dedupeKey: `app:${aliceApplication._id}:status:shortlisted`,
    },
    {
      user: faculty._id,
      kind: "application_received",
      title: "New project application",
      body: "Dev Patel applied to Build the Scope Trust Layer.",
      link: `/projects/${trustLayer._id}`,
      dedupeKey: `app:${devApplication._id}:received`,
    },
    {
      user: scopeAdmin._id,
      kind: "system",
      title: "Demo workspace seeded",
      body: "Scope Connect demo data is ready for API testing.",
      link: "/dashboard",
      dedupeKey: "demo-seeded",
    },
    {
      user: founder._id,
      kind: "admin_action",
      title: "Seed completed",
      body: "Demo institutions, users, projects, and analytics were created.",
      link: "/scope-super-admin",
      dedupeKey: "demo-seed-admin",
    },
  ]);

  const now = Date.now();
  const analyticsDocs = [];
  for (let day = 0; day < 14; day += 1) {
    for (const user of users.slice(1)) {
      analyticsDocs.push({
        user: user._id,
        event: "session_start",
        props: { source: "seed" },
        occurredAt: new Date(now - day * 24 * 60 * 60 * 1000),
      });
      analyticsDocs.push({
        user: user._id,
        event: day % 2 === 0 ? "project_view" : "page_view",
        props: { project_id: day % 2 === 0 ? String(climateSensors._id) : String(campusOps._id) },
        occurredAt: new Date(now - day * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      });
    }
  }
  await AnalyticsEvent.insertMany(analyticsDocs);

  console.log("Seed complete.");
  console.log(`Demo password for all users: ${DEMO_PASSWORD}`);
  console.log("Demo emails:");
  for (const user of users) console.log(`- ${user.email}`);

  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
