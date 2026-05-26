import express from "express";
import {
  createScopeAdmin,
  getRbacAudit,
  getSuperAdminCommandCenter,
  patchScopeAdmin,
  updateRbacPolicy,
} from "../controllers/super-admin.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";

export const superAdminRouter = express.Router();

superAdminRouter.use(authMiddleware);

superAdminRouter.get("/command-center", asyncHandler(getSuperAdminCommandCenter));
superAdminRouter.post("/scope-admins", asyncHandler(createScopeAdmin));
superAdminRouter.patch("/scope-admins/:id", asyncHandler(patchScopeAdmin));
superAdminRouter.get("/rbac-audit", asyncHandler(getRbacAudit));
superAdminRouter.patch("/rbac-policy", asyncHandler(updateRbacPolicy));
