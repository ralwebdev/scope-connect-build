import { CrmVisit } from "../models/index.js";
import { connectDatabase } from "../config/db.js";

async function main() {
  await connectDatabase();
  const deleted = await CrmVisit.deleteMany({});
  console.log(`Successfully deleted ${deleted.deletedCount} visits.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Delete failed", error);
  process.exit(1);
});
