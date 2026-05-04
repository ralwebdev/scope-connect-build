import express from "express";
import { z } from "zod";
import { Institution } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { serializeInstitution } from "../utils/serializers.js";

export const institutionsRouter = express.Router();

const institutionSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  country: z.string().max(2).optional(),
  domain: z.string().max(160).optional(),
  verified: z.boolean().optional(),
  logo_url: z.string().url().regex(/^https?:\/\//).optional(),
  mou_status: z.enum(["none", "in_discussion", "signed"]).optional(),
});

institutionsRouter.use(authMiddleware);

institutionsRouter.get("/", asyncHandler(async (_req, res) => {
  const institutions = await Institution.find().sort({ name: 1 });
  sendSuccess(res, { items: institutions.map(serializeInstitution), next_cursor: null, has_more: false });
}));

institutionsRouter.get("/:id", asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.params.id);
  if (!institution) throw notFound("Institution not found");
  sendSuccess(res, { institution: serializeInstitution(institution) });
}));

institutionsRouter.post("/", requirePermission("manage_partnerships"), validate(institutionSchema), asyncHandler(async (req, res) => {
  const institution = await Institution.create({
    name: req.body.name,
    slug: req.body.slug,
    city: req.body.city,
    state: req.body.state,
    country: req.body.country,
    domain: req.body.domain,
    verified: req.body.verified,
    logoUrl: req.body.logo_url,
    mouStatus: req.body.mou_status,
  });
  sendSuccess(res, { institution: serializeInstitution(institution) }, "Institution created", 201);
}));

institutionsRouter.patch("/:id", validate(institutionSchema.partial()), asyncHandler(async (req, res) => {
  if (req.user.role !== "super_admin" && !["scope_admin", "institution_admin"].includes(req.user.role)) {
    throw forbidden();
  }
  const institution = await Institution.findByIdAndUpdate(
    req.params.id,
    {
      ...(req.body.name !== undefined && { name: req.body.name }),
      ...(req.body.slug !== undefined && { slug: req.body.slug }),
      ...(req.body.city !== undefined && { city: req.body.city }),
      ...(req.body.state !== undefined && { state: req.body.state }),
      ...(req.body.country !== undefined && { country: req.body.country }),
      ...(req.body.domain !== undefined && { domain: req.body.domain }),
      ...(req.body.verified !== undefined && { verified: req.body.verified }),
      ...(req.body.logo_url !== undefined && { logoUrl: req.body.logo_url }),
      ...(req.body.mou_status !== undefined && { mouStatus: req.body.mou_status }),
    },
    { new: true },
  );
  if (!institution) throw notFound("Institution not found");
  sendSuccess(res, { institution: serializeInstitution(institution) });
}));

institutionsRouter.delete("/:id", requirePermission("full_system_access"), asyncHandler(async (req, res) => {
  const institution = await Institution.findByIdAndDelete(req.params.id);
  if (!institution) throw notFound("Institution not found");
  sendSuccess(res, null);
}));

