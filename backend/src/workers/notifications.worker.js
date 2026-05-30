import { connectDatabase } from "../config/db.js";
import { startNotificationWorker } from "./notification-worker.js";

async function main() {
  await connectDatabase();
  const handle = await startNotificationWorker();
  if (!handle) {
    console.warn("[notifications] dedicated worker did not start.");
  }
}

main().catch((error) => {
  console.error("[notifications] worker startup failed.");
  console.error(error?.message || error);
  process.exit(1);
});
