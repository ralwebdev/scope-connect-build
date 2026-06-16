import mongoose from "mongoose";
import { Event } from "../models/index.js";

const MONGO_URI = "mongodb+srv://Auth:hs9MofCPaymr0g8M@cluster0.fmtt8p1.mongodb.net/scopeConnect";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected successfully!");

  // Update "Open AI" event
  const openAiResult = await Event.updateOne(
    { title: "Open AI" },
    {
      $set: {
        speakerDesignation: "CEO",
        speakerCompany: "OpenAI",
        speakerQualification: "Stanford Dropout",
        aboutEvent: "A roundtable discussion with Sam Altman about the future of artificial general intelligence and startup scaling."
      }
    }
  );
  console.log("Updated Open AI event:", openAiResult);

  // Update "Awesome" event
  const awesomeResult = await Event.updateOne(
    { title: "Awesome" },
    {
      $set: {
        speakerDesignation: "Lead Developer",
        speakerCompany: "Google",
        speakerQualification: "M.Tech IIT Bombay",
        aboutEvent: "Validate your startup ideas and get direct feedback on product-market fit from industry veterans."
      }
    }
  );
  console.log("Updated Awesome event:", awesomeResult);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
