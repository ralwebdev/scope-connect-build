import express from "express";
import { z } from "zod";
import { CrmVisit, Institution, LaunchChecklist, User } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/async-handler.js";
import { forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { validate } from "../utils/validate.js";
import { serializeCrmVisit, serializeInstitution, serializeLaunchChecklist } from "../utils/serializers.js";

export const institutionsRouter = express.Router();

const pipelineStages = [
  "Prospect",
  "Contacted",
  "Meeting Scheduled",
  "Meeting Completed",
  "Proposal Sent",
  "Negotiation",
  "MoU Draft Shared",
  "MoU Signed",
  "Launch Pending",
  "Live Chapter",
  "Dormant",
];

const institutionSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  type: z.enum(["University", "Engineering College", "School", "Polytechnic", "Other"]).optional(),
  board: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  country: z.string().max(2).optional(),
  domain: z.string().max(160).optional(),
  verified: z.boolean().optional(),
  logo_url: z.string().url().regex(/^https?:\/\//).optional(),
  mou_status: z.enum(["none", "in_discussion", "signed"]).optional(),
  contact_person: z.string().max(160).optional(),
  designation: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional(),
  owner_id: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(5).optional(),
  potential_value: z.number().min(0).optional(),
  pipeline_stage: z.enum(pipelineStages).optional(),
  notes: z.string().max(10000).optional(),
});

institutionsRouter.use(authMiddleware);

const visitSchema = z.object({
  institution_id: z.string().min(1),
  owner_id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(5000).optional(),
});

const visitStatusSchema = z.object({
  status: z.enum(["scheduled", "checked_in", "completed", "cancelled"]),
  notes: z.string().max(5000).optional(),
});

const launchSchema = z.object({
  key: z.enum(["facultyAssigned", "leaderShortlisted", "launchScheduled", "registrationsStarted", "pageLive", "challengeActivated"]),
  value: z.boolean().optional(),
});

function canManageCrm(req) {
  return req.user.role === "super_admin" || req.user.role === "scope_admin";
}

function slugFromName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100) || `institution-${Date.now().toString(36)}`;
}

async function uniqueSlug(name) {
  const base = slugFromName(name);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (!(await Institution.exists({ slug: candidate }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function institutionUpdateFromBody(body) {
  return {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.slug !== undefined && { slug: body.slug }),
    ...(body.type !== undefined && { type: body.type }),
    ...(body.board !== undefined && { board: body.board }),
    ...(body.city !== undefined && { city: body.city }),
    ...(body.state !== undefined && { state: body.state }),
    ...(body.country !== undefined && { country: body.country }),
    ...(body.domain !== undefined && { domain: body.domain }),
    ...(body.verified !== undefined && { verified: body.verified }),
    ...(body.logo_url !== undefined && { logoUrl: body.logo_url }),
    ...(body.mou_status !== undefined && { mouStatus: body.mou_status }),
    ...(body.contact_person !== undefined && { contactPerson: body.contact_person }),
    ...(body.designation !== undefined && { designation: body.designation }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.email !== undefined && { email: body.email }),
    ...(body.owner_id !== undefined && { owner: body.owner_id }),
    ...(body.priority !== undefined && { priority: body.priority }),
    ...(body.potential_value !== undefined && { potentialValue: body.potential_value }),
    ...(body.pipeline_stage !== undefined && { pipelineStage: body.pipeline_stage }),
    ...(body.notes !== undefined && { notes: body.notes }),
  };
}

async function crmPayload() {
  const [institutions, visits, launches, admins] = await Promise.all([
    Institution.find().sort({ updatedAt: -1, name: 1 }),
    CrmVisit.find().sort({ date: 1, time: 1 }),
    LaunchChecklist.find(),
    User.find({ role: "scope_admin" }).sort({ name: 1 }),
  ]);

  return {
    institutions: institutions.map(serializeInstitution),
    visits: visits.map(serializeCrmVisit),
    launches: launches.map(serializeLaunchChecklist),
    admins: admins.map((admin) => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      region: "Assigned Territory",
      focus: "Partnerships",
      meetings: visits.filter((visit) => visit.owner?.toString() === admin.id).length,
      closures: institutions.filter((institution) =>
        institution.owner?.toString() === admin.id && ["MoU Signed", "Launch Pending", "Live Chapter"].includes(institution.pipelineStage),
      ).length,
      last_active: admin.updatedAt || admin.createdAt,
      status: admin.disabledAt ? "suspended" : "active",
      target: 6,
    })),
  };
}

institutionsRouter.get("/crm", requirePermission("manage_partnerships"), asyncHandler(async (_req, res) => {
  sendSuccess(res, await crmPayload());
}));

institutionsRouter.post("/crm/institutions", requirePermission("manage_partnerships"), validate(institutionSchema.omit({ slug: true }).extend({
  slug: institutionSchema.shape.slug.optional(),
})), asyncHandler(async (req, res) => {
  const institution = await Institution.create({
    ...institutionUpdateFromBody(req.body),
    slug: req.body.slug || await uniqueSlug(req.body.name),
    owner: req.body.owner_id || req.user._id,
  });
  sendSuccess(res, { institution: serializeInstitution(institution) }, "Institution lead created", 201);
}));

institutionsRouter.patch("/crm/institutions/:id", requirePermission("manage_partnerships"), validate(institutionSchema.partial()), asyncHandler(async (req, res) => {
  const institution = await Institution.findByIdAndUpdate(req.params.id, institutionUpdateFromBody(req.body), { new: true });
  if (!institution) throw notFound("Institution not found");
  sendSuccess(res, { institution: serializeInstitution(institution) });
}));

institutionsRouter.post("/crm/visits", requirePermission("manage_partnerships"), validate(visitSchema), asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.body.institution_id);
  if (!institution) throw notFound("Institution not found");
  const visit = await CrmVisit.create({
    institution: req.body.institution_id,
    owner: req.body.owner_id || req.user._id,
    date: req.body.date,
    time: req.body.time,
    notes: req.body.notes,
  });
  sendSuccess(res, { visit: serializeCrmVisit(visit) }, "Visit scheduled", 201);
}));

institutionsRouter.patch("/crm/visits/:id", requirePermission("manage_partnerships"), validate(visitStatusSchema), asyncHandler(async (req, res) => {
  const visit = await CrmVisit.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status, ...(req.body.notes !== undefined && { notes: req.body.notes }) },
    { new: true },
  );
  if (!visit) throw notFound("Visit not found");
  sendSuccess(res, { visit: serializeCrmVisit(visit) });
}));

institutionsRouter.patch("/crm/launches/:institutionId", requirePermission("manage_partnerships"), validate(launchSchema), asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.params.institutionId);
  if (!institution) throw notFound("Institution not found");
  const current = await LaunchChecklist.findOne({ institution: institution._id });
  const nextValue = req.body.value ?? !current?.[req.body.key];
  const checklist = await LaunchChecklist.findOneAndUpdate(
    { institution: institution._id },
    { [req.body.key]: nextValue },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  sendSuccess(res, { launch: serializeLaunchChecklist(checklist) });
}));

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
    ...institutionUpdateFromBody(req.body),
    slug: req.body.slug,
  });
  sendSuccess(res, { institution: serializeInstitution(institution) }, "Institution created", 201);
}));

institutionsRouter.patch("/:id", validate(institutionSchema.partial()), asyncHandler(async (req, res) => {
  if (!canManageCrm(req) && req.user.role !== "institution_admin") {
    throw forbidden();
  }
  const institution = await Institution.findByIdAndUpdate(
    req.params.id,
    institutionUpdateFromBody(req.body),
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
