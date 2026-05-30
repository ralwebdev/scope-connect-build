import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { startNotificationWorker } from "./workers/notification-worker.js";

async function main() {
  await connectDatabase();
  const notificationWorker = await startNotificationWorker();
  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`Scope Connect API listening on http://localhost:${env.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`[server] Received ${signal}. Shutting down...`);
    server.close(async () => {
      if (notificationWorker?.close) {
        await notificationWorker.close().catch((error) => {
          console.error("[server] failed to close notification worker:", error?.message || error);
        });
      }
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("Failed to start server.");
  console.error(error?.message || error);
  if (error?.code) console.error(`code=${error.code}`);
  if (error?.hostname) console.error(`hostname=${error.hostname}`);
  process.exit(1);
});

