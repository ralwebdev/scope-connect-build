import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { User } from "../models/User.js";

const DEMO_PASSWORD = "Password123!";

const adminUsers = [
  {
    email: "founder@scope.in",
    name: "Riya Sen",
    role: "super_admin",
    roleVariant: "scope_super_admin",
    institution: null,
    studentStatus: "active",
    founder: true,
    disabledAt: null,
    createdAt: new Date("2026-05-12T06:26:36.842Z"),
    updatedAt: new Date("2026-05-12T06:26:36.842Z"),
  },
  {
    email: "ops@scopeconnect.in",
    name: "Kabir Malhotra",
    role: "scope_admin",
    roleVariant: "scope_admin",
    institution: null,
    studentStatus: "active",
    founder: false,
    disabledAt: null,
    createdAt: new Date("2026-05-12T06:26:36.844Z"),
    updatedAt: new Date("2026-05-12T06:26:36.844Z"),
  },
];

async function main() {
  await connectDatabase();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const operations = adminUsers.map((user) => ({
    updateOne: {
      filter: { email: user.email.toLowerCase() },
      update: {
        $set: {
          email: user.email.toLowerCase(),
          passwordHash,
          name: user.name,
          role: user.role,
          roleVariant: user.roleVariant,
          institution: user.institution,
          studentStatus: user.studentStatus,
          founder: user.founder,
          disabledAt: user.disabledAt,
          updatedAt: user.updatedAt,
        },
        $setOnInsert: {
          createdAt: user.createdAt,
          __v: 0,
        },
      },
      upsert: true,
    },
  }));

  const result = await User.collection.bulkWrite(operations, { ordered: true });

  console.log("Scope admin seed complete.");
  console.log(`Password for both accounts: ${DEMO_PASSWORD}`);
  console.log(
    JSON.stringify(
      {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Scope admin seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
