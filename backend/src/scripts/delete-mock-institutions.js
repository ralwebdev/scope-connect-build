import { Institution } from "../models/index.js";
import { connectDatabase } from "../config/db.js";

const MOCK_NAMES = [
  "IIT Bombay",
  "IIT Delhi",
  "BITS Pilani",
  "Heritage Public School",
  "Eastern Institute of Tech",
  "Royal CBSE Academy",
  "Bengal Polytechnic",
  "Tech Valley Institute"
];

async function main() {
  await connectDatabase();
  const deleted = await Institution.deleteMany({
    name: { $in: MOCK_NAMES }
  });
  console.log(`Successfully deleted ${deleted.deletedCount} mock institutions.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Delete failed", error);
  process.exit(1);
});
