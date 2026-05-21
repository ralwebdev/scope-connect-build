import mongoose from "mongoose";
import { env } from "./env.js";

const RETRYABLE_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "EAI_AGAIN",
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function maskMongoUri(uri) {
  if (!uri) return "<empty>";
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}

function formatMongoError(error) {
  const code = error?.code || "UNKNOWN";
  const hostname = error?.hostname ? ` host=${error.hostname}` : "";
  const base = `MongoDB connection failed (${code})${hostname}`;
  if (code === "ECONNREFUSED" && String(error?.hostname || "").startsWith("_mongodb._tcp.")) {
    return `${base}. DNS SRV lookup was refused. Try switching DNS to 8.8.8.8/1.1.1.1 or use a non-SRV mongodb:// URI.`;
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return `${base}. DNS resolution failed. Verify internet/DNS and Atlas hostname.`;
  }
  return `${base}.`;
}

export async function connectDatabase() {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is missing. Set it in your .env file.");
  }

  mongoose.set("strictQuery", true);
  const maxAttempts = env.mongoConnectMaxAttempts;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs,
      });
      return;
    } catch (error) {
      lastError = error;
      const retryable = RETRYABLE_CODES.has(error?.code);
      const attemptsLeft = maxAttempts - attempt;
      console.error(`[db] ${formatMongoError(error)} Attempt ${attempt}/${maxAttempts}. uri=${maskMongoUri(env.mongoUri)}`);

      if (!retryable || attemptsLeft <= 0) break;
      const delayMs = env.mongoRetryDelayMs * attempt;
      console.warn(`[db] Retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

