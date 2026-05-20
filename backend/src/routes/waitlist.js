import express from "express";
import { z } from "zod";
import { joinWaitlist } from "../controllers/waitlist.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validate } from "../utils/validate.js";

export const waitlistRouter = express.Router();

const waitlistSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
  campus: z.string().max(200).optional(),
  interests: z.array(z.string().max(100)).optional(),
});

waitlistRouter.post("/", validate(waitlistSchema), asyncHandler(joinWaitlist));
