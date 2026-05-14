import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

/**
 * Simulates sending an email by logging it to the console and a local log file.
 */
export async function sendEmail({ to, subject, body, attachments = [] }) {
  const logDir = path.join(process.cwd(), "logs");
  const logFile = path.join(logDir, "email-sim.log");

  const logEntry = `
[EMAIL SENT]
Timestamp: ${new Date().toISOString()}
To: ${to}
Subject: ${subject}
Body: ${body}
Attachments: ${attachments.map(a => a.name).join(", ")}
--------------------------------------------------
`;

  console.log(logEntry);

  try {
    await fs.mkdir(logDir, { recursive: true });
    await fs.appendFile(logFile, logEntry, "utf8");
  } catch (error) {
    console.error("Failed to log email simulation:", error);
  }

  return { success: true, messageId: `sim-${Date.now()}` };
}
