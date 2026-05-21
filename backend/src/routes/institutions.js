import express from "express";
import { z } from "zod";
import { CrmVisit, Institution, LaunchChecklist, Project, User } from "../models/index.js";
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
  logo_url: z.string().url().regex(/^https?:\/\//).or(z.literal("")).optional().transform(v => v === "" ? undefined : v),
  mou_status: z.enum(["none", "in_discussion", "signed"]).or(z.literal("")).optional().transform(v => v === "" ? undefined : v),
  contact_person: z.string().max(160).optional(),
  designation: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().or(z.literal("")).optional().transform(v => v === "" ? undefined : v),
  owner_id: z.string().optional().nullable().transform(v => v === "" ? undefined : v),
  priority: z.number().int().min(1).max(5).optional(),
  potential_value: z.number().min(0).optional(),
  pipeline_stage: z.enum(pipelineStages).or(z.literal("")).optional().transform(v => v === "" ? undefined : v),
  notes: z.string().max(10000).optional(),
  logo_text: z.string().max(40).optional(),
  description: z.string().max(5000).optional(),
  top_skills: z.array(z.string().max(100)).optional(),
  departments: z.array(z.string().max(100)).optional(),
});

institutionsRouter.get("/public", asyncHandler(async (_req, res) => {
  const institutions = await Institution.find().sort({ name: 1 });
  sendSuccess(res, { items: institutions.map(serializeInstitution), next_cursor: null, has_more: false });
}));

institutionsRouter.use(authMiddleware);

institutionsRouter.get("/me/campus-summary", asyncHandler(async (req, res) => {
  if (!req.user.institution) {
    sendSuccess(res, {
      campus_name: null,
      city: null,
      active_members: 0,
      leaders: 0,
      projects_shipped: 0,
      weekly_growth_pct: 0,
    });
    return;
  }

  const institution = await Institution.findById(req.user.institution);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

  const [activeMembers, leaders, projectsShipped, newThisWeek, newPrevWeek] = await Promise.all([
    User.countDocuments({ institution: req.user.institution, studentStatus: "active", disabledAt: null }),
    User.countDocuments({ institution: req.user.institution, roleVariant: { $in: ["campus_leader", "faculty_coordinator", "institutional_admin"] }, disabledAt: null }),
    Project.countDocuments({ institution: req.user.institution, status: { $in: ["completed", "in_progress", "in_review"] } }),
    User.countDocuments({ institution: req.user.institution, createdAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ institution: req.user.institution, createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }),
  ]);

  const weeklyGrowthPct = newPrevWeek > 0 ? Math.round(((newThisWeek - newPrevWeek) / newPrevWeek) * 100) : (newThisWeek > 0 ? 100 : 0);

  sendSuccess(res, {
    campus_name: institution?.name || null,
    city: institution?.city || null,
    active_members: activeMembers,
    leaders,
    projects_shipped: projectsShipped,
    weekly_growth_pct: weeklyGrowthPct,
  });
}));

institutionsRouter.get("/me", asyncHandler(async (req, res) => {
  if (!req.user.institution) {
    throw notFound("Institution not linked to this user");
  }
  const institution = await Institution.findById(req.user.institution);
  if (!institution) throw notFound("Institution not found");
  sendSuccess(res, { institution: serializeInstitution(institution) });
}));


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
    ...(body.logo_text !== undefined && { logoText: body.logo_text }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.top_skills !== undefined && { topSkills: body.top_skills }),
    ...(body.departments !== undefined && { departments: body.departments }),
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

institutionsRouter.delete("/crm/visits/:id", requirePermission("manage_partnerships"), asyncHandler(async (req, res) => {
  const visit = await CrmVisit.findByIdAndDelete(req.params.id);
  if (!visit) throw notFound("Visit not found");
  sendSuccess(res, null, "Visit deleted");
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
  sendSuccess(res, serializeLaunchChecklist(checklist));
}));

const sendDocSchema = z.object({
  kind: z.enum(["brochure", "proposal", "pricing", "mou", "document"]),
  file_id: z.string().min(1),
  file_name: z.string().min(1),
  file_url: z.string().min(1),
});

institutionsRouter.post("/:id/documents", requirePermission("manage_crm"), validate(sendDocSchema), asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.params.id);
  if (!institution) throw notFound("Institution not found");

  const doc = {
    kind: req.body.kind,
    fileId: req.body.file_id,
    fileName: req.body.file_name,
    fileUrl: req.body.file_url,
    sentAt: new Date(),
  };

  institution.documents.push(doc);
  await institution.save();

  // Notify via Email (Simulated)
  if (institution.email) {
    const { sendEmail } = await import("../utils/email.js");
    await sendEmail({
      to: institution.email,
      subject: `New Document from Scope Connect: ${doc.fileName}`,
      body: `Hello ${institution.contactPerson || "there"},\n\nA new ${doc.kind} has been shared with ${institution.name} via Scope Connect.\n\nFile: ${doc.fileName}\nView here: ${doc.fileUrl}\n\nBest regards,\nScope Connect Admin`,
      attachments: [{ name: doc.fileName, url: doc.fileUrl }]
    }).catch(err => console.error("Email simulation failed", err));
  }

  // Notify Institutional Admin if mapped
  const admin = await User.findOne({ institution: institution._id, role: "institutional_admin" });
  if (admin) {
    const { Notification } = await import("../models/index.js");
    await Notification.create({
      user: admin._id,
      kind: "system",
      title: "New Document Received",
      body: `Scope Admin has sent a new ${doc.kind}: ${doc.fileName}`,
      link: "/institution-admin",
    });
  }

  sendSuccess(res, serializeInstitution(institution), "Document sent to institution");
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
  if (req.user.role === "institution_admin" && String(req.user.institution) !== req.params.id) {
    throw forbidden("You can only manage your own institution");
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
