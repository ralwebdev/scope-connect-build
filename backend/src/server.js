import { createServer } from "node:http";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { startNotificationWorker } from "./workers/notification-worker.js";

async function main() {
  await connectDatabase();
  const notificationWorker = await startNotificationWorker();
  const app = createApp();
  let server;

  try {
    server = await new Promise((resolve, reject) => {
      const listener = createServer(app);
      listener.once("listening", () => resolve(listener));
      listener.once("error", reject);
      listener.listen(env.port);
    });
  } catch (error) {
    if (error?.code === "EADDRINUSE") {
      console.warn(`[server] Port ${env.port} is already in use. Another backend instance is likely already running.`);
    } else {
      console.error("[server] Unhandled server listen error:", error?.message || error);
    }

    if (notificationWorker?.close) {
      await notificationWorker.close().catch((closeError) => {
        console.error("[server] failed to close notification worker:", closeError?.message || closeError);
      });
    }

    process.exit(error?.code === "EADDRINUSE" ? 0 : 1);
    return;
  }

  console.log(`Scope Connect API listening on http://localhost:${env.port}`);

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

