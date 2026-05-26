import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  AnalyticsEvent,
  CrmVisit,
  Institution,
  LaunchChecklist,
  Profile,
  RbacPolicy,
  ScopeAdminProfile,
  User,
} from "../models/index.js";
import { AppError, forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { serializeCrmVisit, serializeInstitution, serializeLaunchChecklist, serializeUser } from "../utils/serializers.js";

const ALL_ROLES = [
  "super_admin",
  "scope_super_admin",
  "scope_admin",
  "institutional_admin",
  "faculty_coordinator",
  "campus_leader",
  "student",
  "regional_admin",
  "campus_admin",
  "content_admin",
  "growth_admin",
  "support_admin",
  "viewer",
];

const ROLE_LABELS = {
  super_admin: "Super Admin",
  scope_super_admin: "Scope Super Admin",
  scope_admin: "Scope Admin",
  institutional_admin: "Institutional Admin",
  faculty_coordinator: "Faculty Coordinator",
  campus_leader: "Campus Leader",
  student: "Student / Builder",
  regional_admin: "Regional Admin",
  campus_admin: "Campus Admin",
  content_admin: "Content Admin",
  growth_admin: "Growth Admin",
  support_admin: "Support Admin",
  viewer: "Viewer",
};

const ALL_PERMISSIONS = [
  "view_dashboard", "view_admin", "view_projects", "view_feed", "view_events", "view_portfolio",
  "manage_profile", "edit_brand", "edit_contact", "manage_features", "manage_campuses", "manage_campus",
  "manage_institution", "manage_members", "view_institution_analytics", "approve_students", "approve_leaders",
  "manage_projects", "manage_events", "manage_feed", "manage_content", "manage_partnerships",
  "view_finance", "view_analytics", "view_national_analytics", "manage_scope_admins", "manage_roles",
  "manage_feature_flags", "manage_moderation", "export_data", "export_config", "import_config",
  "manage_users", "manage_support", "verify_students", "full_system_access",
];

const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: ["*"],
  scope_super_admin: ["*"],
  scope_admin: [
    "view_dashboard", "view_admin", "manage_partnerships", "manage_institution",
    "manage_events", "view_institution_analytics", "export_data", "manage_campuses", "manage_projects",
    "verify_students",
  ],
  institutional_admin: [
    "view_dashboard", "manage_institution", "manage_members", "view_institution_analytics",
    "approve_students", "approve_leaders", "manage_events", "manage_projects", "manage_content", "export_data",
    "view_projects", "view_feed", "view_events",
  ],
  faculty_coordinator: [
    "view_dashboard", "manage_members", "manage_campus", "approve_students", "approve_leaders",
    "view_institution_analytics", "view_projects", "view_feed", "view_events",
  ],
  campus_leader: [
    "view_dashboard", "view_projects", "view_feed", "view_events", "manage_members", "manage_campus", "approve_students",
  ],
  student: ["view_dashboard", "view_projects", "view_feed", "view_events", "view_portfolio", "manage_profile"],
  regional_admin: ["view_dashboard", "view_admin", "manage_campuses", "view_analytics", "manage_events", "export_config"],
  campus_admin: ["view_dashboard", "manage_campuses", "manage_feed"],
  content_admin: ["view_dashboard", "manage_projects", "manage_feed", "manage_content"],
  growth_admin: ["view_dashboard", "view_analytics", "manage_events"],
  support_admin: ["view_dashboard", "manage_support"],
  viewer: ["view_dashboard"],
};

const ROUTE_INVENTORY = [
  { path: "/", file: "src/routes/index.tsx", group: "public", description: "Landing page", permission: null },
  { path: "/about", file: "src/routes/about.tsx", group: "public", description: "About Scope Connect", permission: null },
  { path: "/contact", file: "src/routes/contact.tsx", group: "public", description: "Contact form", permission: null },
  { path: "/auth", file: "src/routes/auth.tsx", group: "auth", description: "Login / signup", permission: null },
  { path: "/waitlist", file: "src/routes/waitlist.tsx", group: "public", description: "Waitlist capture", permission: null },
  { path: "/unauthorized", file: "src/routes/unauthorized.tsx", group: "public", description: "Access denied page", permission: null },
  { path: "/privacy", file: "src/routes/privacy.tsx", group: "legal", description: "Privacy policy", permission: null },
  { path: "/terms", file: "src/routes/terms.tsx", group: "legal", description: "Terms of use", permission: null },
  { path: "/community-guidelines", file: "src/routes/community-guidelines.tsx", group: "legal", description: "Community rules", permission: null },
  { path: "/dashboard", file: "src/routes/dashboard.tsx", group: "workspace", description: "Member dashboard", permission: "view_dashboard" },
  { path: "/projects", file: "src/routes/projects.tsx", group: "workspace", description: "Projects list", permission: "view_projects" },
  { path: "/feed", file: "src/routes/feed.tsx", group: "workspace", description: "Activity feed", permission: "view_feed" },
  { path: "/events", file: "src/routes/events.tsx", group: "workspace", description: "Events", permission: "view_events" },
  { path: "/portfolio", file: "src/routes/portfolio.tsx", group: "workspace", description: "Portfolio", permission: "view_portfolio" },
  { path: "/profile", file: "src/routes/profile.tsx", group: "workspace", description: "User profile", permission: "manage_profile" },
  { path: "/campus", file: "src/routes/campus.tsx", group: "workspace", description: "Campus hub", permission: "manage_campus" },
  { path: "/leaderboards", file: "src/routes/leaderboards.tsx", group: "workspace", description: "Leaderboards", permission: "view_dashboard" },
  { path: "/notifications", file: "src/routes/notifications.tsx", group: "workspace", description: "Notifications", permission: "view_dashboard" },
  { path: "/settings", file: "src/routes/settings.tsx", group: "workspace", description: "Account settings", permission: "manage_profile" },
  { path: "/institution-admin", file: "src/routes/institution-admin.tsx", group: "institution", description: "Institution Hub", permission: "manage_institution" },
  { path: "/institution-admin/members", file: "src/routes/institution-admin.members.tsx", group: "institution", description: "Member management", permission: "manage_members" },
  { path: "/institution-admin/analytics", file: "src/routes/institution-admin.analytics.tsx", group: "institution", description: "Institution analytics", permission: "view_institution_analytics" },
  { path: "/institution-admin/communications", file: "src/routes/institution-admin.communications.tsx", group: "institution", description: "Broadcasts", permission: "manage_content" },
  { path: "/scope-admin", file: "src/routes/scope-admin.tsx", group: "scope", description: "Territory CRM", permission: "manage_partnerships" },
  { path: "/admin", file: "src/routes/admin.tsx", group: "scope", description: "Admin console", permission: "view_admin" },
  { path: "/admin/config", file: "src/routes/admin.config.tsx", group: "scope", description: "Feature config", permission: "manage_features" },
  { path: "/admin/campuses/new", file: "src/routes/admin.campuses.new.tsx", group: "scope", description: "Add campus", permission: "manage_campuses" },
  { path: "/scope-super-admin", file: "src/routes/scope-super-admin.tsx", group: "super", description: "Command Center", permission: "view_national_analytics" },
  { path: "/scope-super-admin/rbac-audit", file: "src/routes/scope-super-admin.rbac-audit.tsx", group: "super", description: "RBAC audit dashboard", permission: "manage_roles" },
  { path: "/ops", file: "src/routes/ops.tsx", group: "super", description: "Ops console", permission: "view_admin" },
  { path: "/dev/build-diagnostics", file: "src/routes/dev.build-diagnostics.tsx", group: "dev", description: "Route + build diagnostics", permission: "full_system_access" },
];

const createScopeAdminSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  region: z.string().max(120).optional(),
  focus: z.string().max(160).optional(),
  target: z.number().int().min(0).max(100).optional(),
});

const patchScopeAdminSchema = z.object({
  status: z.enum(["active", "suspended"]).optional(),
  region: z.string().max(120).optional(),
  focus: z.string().max(160).optional(),
  target: z.number().int().min(0).max(100).optional(),
});

const updateRbacPolicySchema = z.object({
  role_permissions: z.record(z.array(z.string().min(1))),
});

function isSuperAdmin(req) {
  return req.user?.role === "super_admin" || req.user?.roleVariant === "scope_super_admin";
}

function ensureSuperAdmin(req) {
  if (!isSuperAdmin(req)) throw forbidden("HQ-only area");
}

function handleFromEmail(email) {
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function uniqueHandle(email) {
  const base = handleFromEmail(email) || `user-${Date.now().toString(36)}`;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (!(await Profile.exists({ handle: candidate }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function hasRolePermission(rolePermissions, role, permission) {
  const perms = rolePermissions?.[role] || [];
  if (!permission) return true;
  return perms.includes("*") || perms.includes("full_system_access") || perms.includes(permission);
}

async function ensureRbacPolicy() {
  let policy = await RbacPolicy.findOne({ key: "default" });
  if (!policy) {
    policy = await RbacPolicy.create({
      key: "default",
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
      updatedBy: null,
    });
  }
  return policy;
}

async function buildCrmStylePayload() {
  const [institutions, visits, launches, scopeAdmins, adminProfiles] = await Promise.all([
    Institution.find().sort({ updatedAt: -1, name: 1 }),
    CrmVisit.find().sort({ date: 1, time: 1 }),
    LaunchChecklist.find(),
    User.find({ role: "scope_admin" }).sort({ name: 1 }),
    ScopeAdminProfile.find().sort({ updatedAt: -1 }),
  ]);

  const profileByUserId = new Map(adminProfiles.map((item) => [String(item.user), item]));
  const institutionRows = institutions.map(serializeInstitution);
  const visitRows = visits.map(serializeCrmVisit);

  const admins = scopeAdmins.map((admin) => {
    const profile = profileByUserId.get(String(admin._id));
    const meetings = visitRows.filter((visit) => visit.owner_id === admin.id).length;
    const closures = institutionRows.filter(
      (institution) => institution.owner_id === admin.id
        && ["MoU Signed", "Launch Pending", "Live Chapter"].includes(institution.pipeline_stage),
    ).length;

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      region: profile?.region || "Assigned Territory",
      focus: profile?.focus || "Partnerships",
      meetings,
      closures,
      last_active: admin.updatedAt || admin.createdAt,
      status: admin.disabledAt ? "suspended" : "active",
      target: profile?.target ?? 6,
    };
  });

  return {
    institutions: institutionRows,
    visits: visitRows,
    launches: launches.map(serializeLaunchChecklist),
    admins,
  };
}

export async function getSuperAdminCommandCenter(req, res) {
  ensureSuperAdmin(req);
  sendSuccess(res, await buildCrmStylePayload());
}

export async function createScopeAdmin(req, res) {
  ensureSuperAdmin(req);
  const body = createScopeAdminSchema.parse(req.body);
  const email = body.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw new AppError(409, "EMAIL_TAKEN", "Email is already registered");

  const user = await User.create({
    email,
    name: body.name,
    passwordHash: await bcrypt.hash(body.password, 12),
    role: "scope_admin",
    roleVariant: "scope_admin",
  });

  try {
    await Profile.create({
      user: user._id,
      handle: await uniqueHandle(email),
      institution: null,
      institutionVerified: false,
      availability: "Open to collab",
      avatarColor: "#00D1FF",
    });
    await ScopeAdminProfile.create({
      user: user._id,
      region: body.region || "Assigned Territory",
      focus: body.focus || "Partnerships",
      target: body.target ?? 6,
    });
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    await Profile.deleteOne({ user: user._id }).catch(() => null);
    throw error;
  }

  await AnalyticsEvent.create({
    user: req.user._id,
    event: "scope_admin_created",
    props: { target_user_id: user.id, actor_role: req.user.role },
  }).catch(() => null);

  sendSuccess(res, {
    user: await serializeUser(await User.findById(user._id).populate("profile"), { includePrivate: true }),
  }, "Scope admin created", 201);
}

export async function patchScopeAdmin(req, res) {
  ensureSuperAdmin(req);
  const body = patchScopeAdminSchema.parse(req.body);
  const user = await User.findById(req.params.id).populate("profile");
  if (!user || user.role !== "scope_admin") throw notFound("Scope admin not found");

  if (body.status) {
    user.disabledAt = body.status === "suspended" ? new Date() : null;
  }
  await user.save();

  if (body.region !== undefined || body.focus !== undefined || body.target !== undefined) {
    const existingProfile = await ScopeAdminProfile.findOne({ user: user._id });
    if (existingProfile) {
      if (body.region !== undefined) existingProfile.region = body.region;
      if (body.focus !== undefined) existingProfile.focus = body.focus;
      if (body.target !== undefined) existingProfile.target = body.target;
      await existingProfile.save();
    } else {
      await ScopeAdminProfile.create({
        user: user._id,
        region: body.region || "Assigned Territory",
        focus: body.focus || "Partnerships",
        target: body.target ?? 6,
      });
    }
  }

  sendSuccess(res, { user: await serializeUser(user, { includePrivate: true }) }, "Scope admin updated");
}

export async function getRbacAudit(req, res) {
  ensureSuperAdmin(req);
  const policy = await ensureRbacPolicy();
  const rolePermissions = policy.rolePermissions || DEFAULT_ROLE_PERMISSIONS;

  const rows = [];
  for (const role of ALL_ROLES) {
    for (const route of ROUTE_INVENTORY) {
      const permission = route.permission || null;
      const status = permission
        ? (hasRolePermission(rolePermissions, role, permission) ? "granted" : "denied")
        : "open";

      let flag = "ok";
      if (status === "granted" && route.group === "super" && role === "viewer") flag = "overprivileged_role";
      if (status === "open" && !["public", "auth", "legal"].includes(route.group) && !hasRolePermission(rolePermissions, role, "view_dashboard")) {
        flag = "conflicting_permission";
      }
      if (status === "denied" && route.group === "workspace" && (role === "student" || role === "campus_leader")) {
        flag = "missing_permission";
      }

      rows.push({
        role,
        path: route.path,
        file: route.file,
        action: route.description,
        permission,
        status,
        flag,
      });
    }
  }

  const counts = {
    total: rows.length,
    flagged: rows.filter((item) => item.flag !== "ok").length,
    missing: rows.filter((item) => item.flag === "missing_permission").length,
    conflicting: rows.filter((item) => item.flag === "conflicting_permission").length,
    over: rows.filter((item) => item.flag === "overprivileged_role").length,
  };

  sendSuccess(res, {
    rows,
    counts,
    roles: ALL_ROLES,
    role_labels: ROLE_LABELS,
    all_permissions: ALL_PERMISSIONS,
    role_permissions: rolePermissions,
    route_inventory: ROUTE_INVENTORY,
  });
}

export async function updateRbacPolicy(req, res) {
  ensureSuperAdmin(req);
  const body = updateRbacPolicySchema.parse(req.body);

  const normalized = {};
  for (const role of Object.keys(body.role_permissions)) {
    if (!ALL_ROLES.includes(role)) {
      throw new AppError(400, "INVALID_ROLE", `Unsupported role: ${role}`);
    }
    const perms = body.role_permissions[role] || [];
    for (const permission of perms) {
      if (permission !== "*" && !ALL_PERMISSIONS.includes(permission)) {
        throw new AppError(400, "INVALID_PERMISSION", `Unsupported permission: ${permission}`);
      }
    }
    normalized[role] = [...new Set(perms)];
  }

  for (const role of ALL_ROLES) {
    if (!normalized[role]) normalized[role] = DEFAULT_ROLE_PERMISSIONS[role] || [];
  }

  const policy = await RbacPolicy.findOneAndUpdate(
    { key: "default" },
    { rolePermissions: normalized, updatedBy: req.user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  sendSuccess(res, { policy });
}
