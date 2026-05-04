import express from "express";
import { sendSuccess } from "../utils/response.js";

export const healthRouter = express.Router();

healthRouter.get("/", (_req, res) => {
  sendSuccess(res, { status: "ok", uptime: process.uptime() });
});

