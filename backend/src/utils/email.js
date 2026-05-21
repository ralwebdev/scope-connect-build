import fs from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

function canUseSmtp() {
  return Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass);
}

function getTransporter() {
  if (transporter) return transporter;
  if (!canUseSmtp()) return null;

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  return transporter;
}

async function sendSimulatedEmail({ to, subject, body, attachments = [] }) {
  const normalizedTo = Array.isArray(to) ? to.join(", ") : to;
  const attachmentsList = attachments
    .map((item) => item.filename || item.name || "attachment")
    .join(", ");

  const logDir = path.join(process.cwd(), "logs");
  const logFile = path.join(logDir, "email-sim.log");

  const logEntry = `
[EMAIL SENT]
Timestamp: ${new Date().toISOString()}
To: ${normalizedTo}
Subject: ${subject}
Body: ${body}
Attachments: ${attachmentsList}
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

export async function sendEmail({ to, subject, body, html, attachments = [] }) {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    return sendSimulatedEmail({
      to,
      subject,
      body: body || html || "",
      attachments,
    });
  }

  const info = await activeTransporter.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    text: body || "",
    html: html || undefined,
    attachments,
  });

  return { success: true, messageId: info.messageId };
}
