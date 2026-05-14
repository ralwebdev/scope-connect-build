export const roles = ["student", "faculty", "institution_admin", "scope_admin", "super_admin"];

export const roleVariants = [
  "student",
  "viewer",
  "campus_leader",
  "faculty_coordinator",
  "institutional_admin",
  "scope_admin",
  "scope_super_admin",
  "super_admin",
  "regional_admin",
  "campus_admin",
  "content_admin",
  "growth_admin",
  "support_admin",
];

export const permissionsByRole = {
  student: [
    "view_dashboard",
    "view_projects",
    "view_feed",
    "view_events",
    "view_portfolio",
    "manage_profile",
    "apply_to_project",
  ],
  faculty: [
    "view_dashboard",
    "view_projects",
    "view_feed",
    "view_events",
    "view_portfolio",
    "manage_profile",
    "create_project",
    "manage_projects",
    "review_application",
    "approve_students",
    "manage_members",
    "view_institution_analytics",
    "manage_events",
  ],
  institution_admin: [
    "view_dashboard",
    "view_projects",
    "view_feed",
    "view_events",
    "view_portfolio",
    "manage_profile",
    "create_project",
    "manage_projects",
    "review_application",
    "approve_students",
    "manage_members",
    "view_institution_analytics",
    "manage_institution",
    "manage_events",
  ],
  scope_admin: [
    "view_dashboard",
    "view_projects",
    "view_feed",
    "view_events",
    "view_portfolio",
    "manage_profile",
    "create_project",
    "manage_projects",
    "review_application",
    "approve_students",
    "manage_members",
    "view_institution_analytics",
    "manage_institution",
    "manage_partnerships",
    "manage_campuses",
    "manage_events",
    "view_national_analytics",
  ],
  super_admin: ["*"],
};

export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  const permissions = permissionsByRole[user.role] || [];
  return permissions.includes("*") || permissions.includes(permission);
}

export function deriveRoleFromEmail(email, requestedRole) {
  const normalized = String(email || "").toLowerCase();
  if (requestedRole && ["student", "scope_admin", "super_admin"].includes(requestedRole)) {
    return {
      role: requestedRole,
      roleVariant: requestedRole === "super_admin" ? "scope_super_admin" : requestedRole,
      founder: normalized.startsWith("founder@") && requestedRole === "super_admin",
    };
  }
  if (normalized.endsWith("@scope.in")) {
    return {
      role: "super_admin",
      roleVariant: "scope_super_admin",
      founder: normalized.startsWith("founder@"),
    };
  }
  if (normalized.endsWith("@scopeconnect.in")) {
    return { role: "scope_admin", roleVariant: "scope_admin", founder: false };
  }
  return { role: "student", roleVariant: "student", founder: false };
}
