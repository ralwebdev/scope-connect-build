import mongoose from "mongoose";
import { Event } from "../models/index.js";

const MONGO_URI = "mongodb+srv://Auth:hs9MofCPaymr0g8M@cluster0.fmtt8p1.mongodb.net/scopeConnect";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected successfully!");

  const events = await Event.find({});
  console.log("Total events in database:", events.length);
  for (const e of events) {
    console.log(`- Event: ${e.title}`);
    console.log(`  speakerName: "${e.speakerName}"`);
    console.log(`  speakerDesignation: "${e.speakerDesignation}"`);
    console.log(`  speakerCompany: "${e.speakerCompany}"`);
    console.log(`  speakerQualification: "${e.speakerQualification}"`);
    console.log(`  aboutEvent: "${e.aboutEvent}"`);
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
