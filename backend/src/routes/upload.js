import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import multer from "multer";
import { FileAsset } from "../models/index.js";
import { env } from "../config/env.js";
import { authMiddleware } from "../middleware/auth.js";
import { uploadRateLimit } from "../middleware/rate-limit.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AppError, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";

export const uploadRouter = express.Router();
export const filesRouter = express.Router();

const allowedMime = {
  avatar: ["image/jpeg", "image/png", "image/webp"],
  cover: ["image/jpeg", "image/png", "image/webp"],
  resume: ["application/pdf"],
  document: ["application/pdf"],
};

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(env.uploadDir, { recursive: true });
      cb(null, env.uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
});

uploadRouter.post("/", authMiddleware, uploadRateLimit, upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "VALIDATION_ERROR", "file is required");
  const kind = req.body.kind || "document";
  if (!allowedMime[kind]) throw new AppError(400, "VALIDATION_ERROR", "Invalid file kind");
  if (!allowedMime[kind].includes(req.file.mimetype)) {
    await fs.unlink(req.file.path).catch(() => null);
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "File type is not allowed for this kind");
  }

  const buffer = await fs.readFile(req.file.path);
  const file = await FileAsset.create({
    owner: req.user._id,
    kind,
    mimeType: req.file.mimetype,
    byteSize: req.file.size,
    storageKey: req.file.filename,
    public: req.body.public !== "false",
    checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  });

  sendSuccess(res, {
    file: {
      id: file.id,
      url: `/api/files/${file.id}`,
      mime_type: file.mimeType,
      byte_size: file.byteSize,
      kind: file.kind,
    },
  }, "File uploaded", 201);
}));

filesRouter.get("/:id", asyncHandler(async (req, res, next) => {
  const file = await FileAsset.findById(req.params.id);
  if (!file) throw notFound("File not found");

  if (!file.public) {
    await authMiddleware(req, res, (error) => {
      if (error) next(error);
    });
    if (!req.user) return;
    if (file.owner.toString() !== req.user.id && req.user.role !== "super_admin") {
      throw new AppError(403, "FORBIDDEN", "Forbidden");
    }
  }

  res.setHeader("Content-Type", file.mimeType);
  if (file.public) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(path.resolve(env.uploadDir, file.storageKey));
}));

