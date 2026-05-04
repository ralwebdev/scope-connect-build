import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

async function main() {
  await connectDatabase();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Scope Connect API listening on http://localhost:${env.port}`);
  });
}

main().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

