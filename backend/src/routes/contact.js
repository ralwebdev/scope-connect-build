import express from "express";
import { z } from "zod";
import { submitContact } from "../controllers/contact.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validate } from "../utils/validate.js";

export const contactRouter = express.Router();

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  reason: z.string().min(1).max(100),
  message: z.string().min(1).max(5000),
});

contactRouter.post("/", validate(contactSchema), asyncHandler(submitContact));
