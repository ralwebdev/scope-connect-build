// Static route inventory used by the RBAC audit dashboard and build
// diagnostics panel. Keep entries shallow + serializable so they can be
// rendered, sorted, and filtered without any runtime route resolution.
import type { PermissionKey } from "@/lib/rbac";

export type RouteEntry = {
  path: string;
  file: string;
  /** Permission gate enforced inside the route component (if any). */
  permission?: PermissionKey;
  /** Higher-level grouping for diagnostics views. */
  group: "public" | "workspace" | "institution" | "scope" | "super" | "dev" | "auth" | "legal";
  /** Component expression style — lets the diagnostics panel flag risky shapes. */
  componentExpression: "FunctionDeclaration" | "ArrowFunction" | "MemberExpression" | "WrapperFunction";
  description: string;
};

export const ROUTE_INVENTORY: RouteEntry[] = [
  // Public
  { path: "/", file: "src/routes/index.tsx", group: "public", componentExpression: "FunctionDeclaration", description: "Landing page" },
  { path: "/about", file: "src/routes/about.tsx", group: "public", componentExpression: "FunctionDeclaration", description: "About Scope Connect" },
  { path: "/contact", file: "src/routes/contact.tsx", group: "public", componentExpression: "FunctionDeclaration", description: "Contact form" },
  { path: "/auth", file: "src/routes/auth.tsx", group: "auth", componentExpression: "FunctionDeclaration", description: "Login / signup" },
  { path: "/waitlist", file: "src/routes/waitlist.tsx", group: "public", componentExpression: "FunctionDeclaration", description: "Waitlist capture" },
  { path: "/unauthorized", file: "src/routes/unauthorized.tsx", group: "public", componentExpression: "FunctionDeclaration", description: "Access denied page" },

  // Legal
  { path: "/privacy", file: "src/routes/privacy.tsx", group: "legal", componentExpression: "FunctionDeclaration", description: "Privacy policy" },
  { path: "/terms", file: "src/routes/terms.tsx", group: "legal", componentExpression: "FunctionDeclaration", description: "Terms of use" },
  { path: "/community-guidelines", file: "src/routes/community-guidelines.tsx", group: "legal", componentExpression: "FunctionDeclaration", description: "Community rules" },

  // Workspace
  { path: "/dashboard", file: "src/routes/dashboard.tsx", permission: "view_dashboard", group: "workspace", componentExpression: "FunctionDeclaration", description: "Member dashboard" },
  { path: "/projects", file: "src/routes/projects.tsx", permission: "view_projects", group: "workspace", componentExpression: "FunctionDeclaration", description: "Projects list" },
  { path: "/feed", file: "src/routes/feed.tsx", permission: "view_feed", group: "workspace", componentExpression: "FunctionDeclaration", description: "Activity feed" },
  { path: "/events", file: "src/routes/events.tsx", permission: "view_events", group: "workspace", componentExpression: "FunctionDeclaration", description: "Events" },
  { path: "/portfolio", file: "src/routes/portfolio.tsx", permission: "view_portfolio", group: "workspace", componentExpression: "FunctionDeclaration", description: "Portfolio" },
  { path: "/profile", file: "src/routes/profile.tsx", permission: "manage_profile", group: "workspace", componentExpression: "FunctionDeclaration", description: "User profile" },
  { path: "/campus", file: "src/routes/campus.tsx", permission: "manage_campus", group: "workspace", componentExpression: "FunctionDeclaration", description: "Campus hub" },
  { path: "/leaderboards", file: "src/routes/leaderboards.tsx", permission: "view_dashboard", group: "workspace", componentExpression: "FunctionDeclaration", description: "Leaderboards" },
  { path: "/notifications", file: "src/routes/notifications.tsx", permission: "view_dashboard", group: "workspace", componentExpression: "FunctionDeclaration", description: "Notifications" },
  { path: "/settings", file: "src/routes/settings.tsx", permission: "manage_profile", group: "workspace", componentExpression: "FunctionDeclaration", description: "Account settings" },

  // Institution
  { path: "/institution-admin", file: "src/routes/institution-admin.tsx", permission: "manage_institution", group: "institution", componentExpression: "FunctionDeclaration", description: "Institution Hub" },
  { path: "/institution-admin/members", file: "src/routes/institution-admin.members.tsx", permission: "manage_members", group: "institution", componentExpression: "WrapperFunction", description: "Member management" },
  { path: "/institution-admin/analytics", file: "src/routes/institution-admin.analytics.tsx", permission: "view_institution_analytics", group: "institution", componentExpression: "WrapperFunction", description: "Institution analytics" },
  { path: "/institution-admin/communications", file: "src/routes/institution-admin.communications.tsx", permission: "manage_content", group: "institution", componentExpression: "WrapperFunction", description: "Broadcasts" },

  // Scope Admin
  { path: "/scope-admin", file: "src/routes/scope-admin.tsx", permission: "manage_partnerships", group: "scope", componentExpression: "FunctionDeclaration", description: "Territory CRM" },
  { path: "/admin", file: "src/routes/admin.tsx", permission: "view_admin", group: "scope", componentExpression: "FunctionDeclaration", description: "Admin console" },
  { path: "/admin/config", file: "src/routes/admin.config.tsx", permission: "manage_features", group: "scope", componentExpression: "FunctionDeclaration", description: "Feature config" },
  { path: "/admin/campuses/new", file: "src/routes/admin.campuses.new.tsx", permission: "manage_campuses", group: "scope", componentExpression: "FunctionDeclaration", description: "Add campus" },

  // Super Admin
  { path: "/scope-super-admin", file: "src/routes/scope-super-admin.tsx", permission: "view_national_analytics", group: "super", componentExpression: "FunctionDeclaration", description: "Command Center" },
  { path: "/scope-super-admin/rbac-audit", file: "src/routes/scope-super-admin.rbac-audit.tsx", permission: "manage_roles", group: "super", componentExpression: "FunctionDeclaration", description: "RBAC audit dashboard" },
  { path: "/ops", file: "src/routes/ops.tsx", permission: "view_admin", group: "super", componentExpression: "FunctionDeclaration", description: "Ops console" },

  // Dev
  { path: "/dev/build-diagnostics", file: "src/routes/dev.build-diagnostics.tsx", permission: "full_system_access", group: "dev", componentExpression: "FunctionDeclaration", description: "Route + build diagnostics" },
];
