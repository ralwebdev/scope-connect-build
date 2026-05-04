// Scope Connect — Role-Based Access Control engine.
// No backend: roles are derived from the signed-in user's email pattern,
// with an optional override stored in localStorage (set by /admin/config).
//
// Permission keys are flat strings. "*" grants everything.

export type RoleId =
  | "super_admin"
  | "scope_super_admin"
  | "scope_admin"
  | "institutional_admin"
  | "faculty_coordinator"
  | "campus_leader"
  | "student"
  | "regional_admin"
  | "campus_admin"
  | "content_admin"
  | "growth_admin"
  | "support_admin"
  | "viewer";

export type PermissionKey =
  | "view_dashboard"
  | "view_admin"
  | "view_projects"
  | "view_feed"
  | "view_events"
  | "view_portfolio"
  | "manage_profile"
  | "edit_brand"
  | "edit_contact"
  | "manage_features"
  | "manage_campuses"
  | "manage_campus"
  | "manage_institution"
  | "manage_members"
  | "view_institution_analytics"
  | "approve_students"
  | "approve_leaders"
  | "manage_projects"
  | "manage_events"
  | "manage_feed"
  | "manage_content"
  | "manage_partnerships"
  | "view_finance"
  | "view_analytics"
  | "view_national_analytics"
  | "manage_scope_admins"
  | "manage_roles"
  | "manage_feature_flags"
  | "manage_moderation"
  | "export_data"
  | "export_config"
  | "import_config"
  | "manage_users"
  | "manage_support"
  | "full_system_access";

export const ALL_ROLES: RoleId[] = [
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

export const ALL_PERMISSIONS: PermissionKey[] = [
  "view_dashboard","view_admin","view_projects","view_feed","view_events","view_portfolio",
  "manage_profile","edit_brand","edit_contact","manage_features","manage_campuses","manage_campus",
  "manage_institution","manage_members","view_institution_analytics","approve_students","approve_leaders",
  "manage_projects","manage_events","manage_feed","manage_content","manage_partnerships",
  "view_finance","view_analytics","view_national_analytics","manage_scope_admins","manage_roles",
  "manage_feature_flags","manage_moderation","export_data","export_config","import_config",
  "manage_users","manage_support","full_system_access",
];

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleId, PermissionKey[] | ["*"]> = {
  super_admin: ["*"],
  scope_super_admin: ["*"],
  scope_admin: [
    "view_dashboard","view_admin","manage_partnerships","manage_institution",
    "manage_events","view_institution_analytics","export_data","manage_campuses",
  ],
  institutional_admin: [
    "view_dashboard","manage_institution","manage_members","view_institution_analytics",
    "approve_students","approve_leaders","manage_events","manage_projects","manage_content","export_data",
    "view_projects","view_feed","view_events",
  ],
  faculty_coordinator: [
    "view_dashboard","manage_members","manage_campus","approve_students","approve_leaders",
    "view_institution_analytics","view_projects","view_feed","view_events",
  ],
  campus_leader: [
    "view_dashboard","view_projects","view_feed","view_events","manage_members","manage_campus","approve_students",
  ],
  student: [
    "view_dashboard","view_projects","view_feed","view_events","view_portfolio","manage_profile",
  ],
  regional_admin: [
    "view_dashboard","view_admin","manage_campuses","view_analytics","manage_events","export_config",
  ],
  campus_admin: ["view_dashboard","manage_campuses","manage_feed"],
  content_admin: ["view_dashboard","manage_projects","manage_feed","manage_content"],
  growth_admin: ["view_dashboard","view_analytics","manage_events"],
  support_admin: ["view_dashboard","manage_support"],
  viewer: ["view_dashboard"],
};

export const ROLE_LABELS: Record<RoleId, string> = {
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

const RBAC_OVERRIDE_KEY = "sc_permissions";
const ROLE_OVERRIDE_KEY = "sc_role_override";

type PermissionMap = Record<RoleId, PermissionKey[] | ["*"]>;

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

/** Map a role to its preferred landing route after login. */
export function landingRouteForRole(role: RoleId): string {
  switch (role) {
    case "scope_super_admin": return "/scope-super-admin";
    case "scope_admin": return "/scope-admin";
    case "institutional_admin": return "/institution-admin";
    case "faculty_coordinator": return "/faculty";
    case "campus_leader": return "/campus-leader";
    case "regional_admin":
    case "campus_admin":
    case "content_admin":
    case "growth_admin":
    case "support_admin":
      return "/admin";
    case "student":
    case "viewer":
    default:
      return "/dashboard";
  }
}

/** Resolve role from email pattern. Demo-grade: deterministic + obvious. */
export function roleFromEmail(email: string | undefined | null): RoleId {
  if (!email) return "viewer";
  const e = email.toLowerCase();
  // Manual override beats heuristics.
  const override = safeRead<Record<string, RoleId>>(ROLE_OVERRIDE_KEY, {});
  if (override[e]) return override[e];

  if (e.includes("super") || (e.endsWith("@scope.in") && e.startsWith("founder"))) return "scope_super_admin";
  if (e.includes("scope-admin") || e.includes("scopeadmin")) return "scope_admin";
  if (e.includes("institution-admin") || e.includes("institutionaladmin") || e.includes("instadmin")) return "institutional_admin";
  if (e.includes("faculty")) return "faculty_coordinator";
  if (e.includes("leader") || e.includes("president")) return "campus_leader";
  if (e.startsWith("admin@")) return "scope_admin";
  if (e.includes("admin")) return "scope_admin";
  if (e.includes("regional")) return "regional_admin";
  if (e.includes("campus")) return "campus_admin";
  if (e.includes("content") || e.includes("editor")) return "content_admin";
  if (e.includes("growth") || e.includes("marketing")) return "growth_admin";
  if (e.includes("support") || e.includes("help")) return "support_admin";
  if (e.includes("student") || e.includes("builder")) return "student";
  return "student";
}

export const rbac = {
  permissions(): PermissionMap {
    return safeRead<PermissionMap>(RBAC_OVERRIDE_KEY, DEFAULT_ROLE_PERMISSIONS);
  },
  setPermissions(map: PermissionMap) {
    safeWrite(RBAC_OVERRIDE_KEY, map);
    bump();
  },
  resetPermissions() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(RBAC_OVERRIDE_KEY);
    } catch {
      /* noop */
    }
    bump();
  },
  roleOverrides(): Record<string, RoleId> {
    return safeRead<Record<string, RoleId>>(ROLE_OVERRIDE_KEY, {});
  },
  setRoleOverride(email: string, role: RoleId) {
    const map = rbac.roleOverrides();
    map[email.toLowerCase()] = role;
    safeWrite(ROLE_OVERRIDE_KEY, map);
    bump();
  },
  clearRoleOverride(email: string) {
    const map = rbac.roleOverrides();
    delete map[email.toLowerCase()];
    safeWrite(ROLE_OVERRIDE_KEY, map);
    bump();
  },
  hasPermission(role: RoleId, permission: PermissionKey): boolean {
    const map = rbac.permissions();
    const perms = map[role] ?? [];
    if ((perms as string[]).includes("*")) return true;
    if ((perms as string[]).includes("full_system_access")) return true;
    return (perms as string[]).includes(permission);
  },
  permissionsFor(role: RoleId): PermissionKey[] {
    const map = rbac.permissions();
    const perms = map[role] ?? [];
    if ((perms as string[]).includes("*")) return ALL_PERMISSIONS;
    return perms as PermissionKey[];
  },
};

function bump() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("scope:store-change", { detail: { keys: [RBAC_OVERRIDE_KEY, ROLE_OVERRIDE_KEY] } }));
  } catch {
    /* noop */
  }
}
