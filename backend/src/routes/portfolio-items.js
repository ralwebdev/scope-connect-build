import express from "express";
import { z } from "zod";
import { portfolioItemTypes } from "../models/PortfolioItem.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { validate } from "../utils/validate.js";
import {
  listMyPortfolioItems,
  createPortfolioItem,
  updatePortfolioItem,
  removePortfolioItem,
} from "../controllers/portfolio-items.controller.js";

export const portfolioItemsRouter = express.Router();

const schema = z.object({
  type: z.enum(portfolioItemTypes),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  skills: z.array(z.string().max(80)).max(30).optional().default([]),
  link: z.string().url().optional().or(z.literal("")),
  cover: z.string().min(1).max(20),
});

portfolioItemsRouter.use(authMiddleware);

portfolioItemsRouter.get("/me", asyncHandler(listMyPortfolioItems));
portfolioItemsRouter.post("/", validate(schema), asyncHandler(createPortfolioItem));
portfolioItemsRouter.patch("/:id", validate(schema.partial()), asyncHandler(updatePortfolioItem));
portfolioItemsRouter.delete("/:id", asyncHandler(removePortfolioItem));
