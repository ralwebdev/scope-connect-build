// Role-first sidebar blueprints. Each role gets a structurally different
// mental model of the app — Scope Connect is six operating systems inside
// one platform, not one app with role filters.
//
// Permissions act as a SECONDARY filter to hide individual items the user
// cannot access. Items map to EXISTING routes; spec labels are preserved
// (e.g. "Live Projects" → /projects, "Approvals" → /institution-admin/members).
//
// Logout is intentionally NOT in the sidebar — it lives in the navbar
// avatar dropdown to avoid duplication and accidental sign-outs.

import {
  LayoutDashboard, FolderKanban, Newspaper, Calendar, Award, User,
  Building2, Users, BarChart3, Brain, Shield, Settings, Megaphone,
  Sparkles, IndianRupee, ShieldCheck, Wrench, Target, MapPin, Handshake,
  GraduationCap, ClipboardList, TrendingUp, LifeBuoy, Briefcase, FileText,
  Network, Lock, Trophy, Rocket, Compass, MessageSquare, Layers,
  History, Database, ToggleRight, BadgeCheck, Send,
} from "lucide-react";
import type { PermissionKey, RoleId } from "@/lib/rbac";

export type SidebarItem = {
  to: string;
  label: string;
  permission: PermissionKey;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

export type SidebarGroup = {
  id: string;
  label: string;
  items: SidebarItem[];
};

export type SidebarBlueprint = {
  layout: string;
  groups: SidebarGroup[];
};

/* ════════════════════════════════════════════════════════════════════════
 * STUDENT OS — participation, growth, visibility (gamified)
 * ════════════════════════════════════════════════════════════════════════ */
const STUDENT_BLUEPRINT: SidebarBlueprint = {
  layout: "student_os",
  groups: [
    {
      id: "build",
      label: "Build",
      items: [
        { to: "/dashboard", label: "Dashboard", permission: "view_dashboard", icon: LayoutDashboard },
        { to: "/projects", label: "Live Projects", permission: "view_projects", icon: Rocket },
        { to: "/challenges", label: "Open Projects", permission: "view_projects", icon: Target },
        { to: "/portfolio", label: "Portfolio", permission: "view_portfolio", icon: Award },
      ],
    },
    {
      id: "community",
      label: "Community",
      items: [
        { to: "/feed", label: "Feed", permission: "view_feed", icon: Newspaper },
        { to: "/leaderboards", label: "Leaderboards", permission: "view_dashboard", icon: Trophy },
        { to: "/events", label: "Events", permission: "view_events", icon: Calendar },
      ],
    },
    {
      id: "me",
      label: "Me",
      items: [
        { to: "/notifications", label: "My Applications", permission: "view_dashboard", icon: Briefcase },
        { to: "/profile", label: "Profile", permission: "manage_profile", icon: User },
        { to: "/settings", label: "Settings", permission: "view_dashboard", icon: Settings },
      ],
    },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
 * CAMPUS LEADER OS — build chapter, manage people
 * ════════════════════════════════════════════════════════════════════════ */
const CAMPUS_LEADER_BLUEPRINT: SidebarBlueprint = {
  layout: "campus_leader_os",
  groups: [
    {
      id: "chapter",
      label: "Chapter",
      items: [
        { to: "/campus-leader", label: "Campus Dashboard", permission: "view_dashboard", icon: LayoutDashboard },
        { to: "/campus", label: "Members", permission: "manage_members", icon: Users },
        { to: "/institution-admin/members", label: "Approvals", permission: "approve_students", icon: BadgeCheck },
      ],
    },
    {
      id: "execution",
      label: "Execution",
      items: [
        { to: "/projects", label: "Campus Projects", permission: "view_projects", icon: FolderKanban },
        { to: "/events", label: "Events", permission: "view_events", icon: Calendar },
        { to: "/announcements", label: "Announcements", permission: "view_feed", icon: Megaphone },
      ],
    },
    {
      id: "intel",
      label: "Intel",
      items: [
        { to: "/institution/reports", label: "Reports", permission: "view_institution_analytics", icon: FileText },
        { to: "/leaderboards", label: "Leaderboard", permission: "view_dashboard", icon: Trophy },
      ],
    },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
 * FACULTY OS — trust, oversight, governance
 * ════════════════════════════════════════════════════════════════════════ */
const FACULTY_BLUEPRINT: SidebarBlueprint = {
  layout: "faculty_os",
  groups: [
    {
      id: "oversight",
      label: "Oversight",
      items: [
        { to: "/faculty", label: "Overview", permission: "view_dashboard", icon: LayoutDashboard },
        { to: "/institution-admin/members", label: "Student Roster", permission: "manage_members", icon: GraduationCap },
        { to: "/institution-admin/members", label: "Approvals", permission: "approve_students", icon: BadgeCheck },
      ],
    },
    {
      id: "academics",
      label: "Academics",
      items: [
        { to: "/projects", label: "Projects", permission: "view_projects", icon: FolderKanban },
        { to: "/institution/reports", label: "Reports", permission: "view_institution_analytics", icon: FileText },
        { to: "/institution-admin/communications", label: "Messages", permission: "manage_content", icon: MessageSquare },
      ],
    },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
 * INSTITUTIONAL ADMIN OS — growth, branding, ROI
 * ════════════════════════════════════════════════════════════════════════ */
const INSTITUTIONAL_ADMIN_BLUEPRINT: SidebarBlueprint = {
  layout: "institutional_admin_os",
  groups: [
    {
      id: "institution",
      label: "Institution",
      items: [
        { to: "/institution-admin", label: "Institution Dashboard", permission: "manage_institution", icon: Building2 },
        { to: "/institution-admin/departments", label: "Departments", permission: "manage_members", icon: Layers },
      ],
    },
    {
      id: "growth",
      label: "Growth",
      items: [
        { to: "/projects", label: "Projects", permission: "view_projects", icon: FolderKanban },
        { to: "/institution-admin/analytics", label: "Analytics", permission: "view_institution_analytics", icon: BarChart3 },
        { to: "/institution/reports", label: "Reports", permission: "view_institution_analytics", icon: FileText },
        { to: "/institution-admin", label: "Branding", permission: "edit_brand", icon: Sparkles },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      items: [
        { to: "/support", label: "Support", permission: "view_dashboard", icon: LifeBuoy },
      ],
    },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
 * SCOPE ADMIN OS — sales, field execution, expansion
 * ════════════════════════════════════════════════════════════════════════ */
const SCOPE_ADMIN_BLUEPRINT: SidebarBlueprint = {
  layout: "scope_admin_os",
  groups: [
    {
      id: "crm",
      label: "CRM",
      items: [
        { to: "/scope-admin?tab=crm", label: "CRM Dashboard", permission: "manage_partnerships", icon: LayoutDashboard },
        // { to: "/scope-admin/institutions", label: "Institutions", permission: "manage_institution", icon: Building2 },
      ],
    },
    {
      id: "field",
      label: "Field Ops",
      items: [
        { to: "/scope-admin?tab=visits", label: "Meetings", permission: "manage_partnerships", icon: Calendar },
        // { to: "/scope-admin/dashboard", label: "Tasks", permission: "manage_partnerships", icon: ClipboardList },
        // { to: "/scope-admin/reports", label: "Documents", permission: "export_data", icon: FileText },
      ],
    },
    {
      id: "intel",
      label: "Intel",
      items: [
        { to: "/scope-admin?tab=performance", label: "Analytics", permission: "view_institution_analytics", icon: BarChart3 },
      ],
    },
    {
      id: "Projects",
      label: "Projects",
      items: [
        { to: "/scope-admin?tab=projects", label: "Projects", permission: "manage_projects", icon: Briefcase },
      ],
    },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
 * SCOPE SUPER ADMIN OS — command center, national intelligence
 * ════════════════════════════════════════════════════════════════════════ */
const SUPER_ADMIN_BLUEPRINT: SidebarBlueprint = {
  layout: "super_admin_os",
  groups: [
    {
      id: "command",
      label: "Command",
      items: [
        { to: "/scope-super-admin", label: "Command Center", permission: "view_national_analytics", icon: Brain },
        { to: "/institution-admin", label: "All Institutions", permission: "manage_institution", icon: Network },
        { to: "/scope-super-admin/rbac-audit", label: "All Admins", permission: "manage_scope_admins", icon: Users },
      ],
    },
    {
      id: "control",
      label: "Control",
      items: [
        { to: "/scope-super-admin/rbac-audit", label: "Permissions", permission: "manage_roles", icon: Lock },
        { to: "/admin/config", label: "Feature Toggles", permission: "manage_feature_flags", icon: ToggleRight },
        { to: "/scope-super-admin", label: "Revenue", permission: "view_finance", icon: IndianRupee },
        { to: "/scope-super-admin", label: "Analytics", permission: "view_national_analytics", icon: BarChart3 },
      ],
    },
    {
      id: "trust",
      label: "Trust & Safety",
      items: [
        { to: "/feed", label: "Moderation", permission: "manage_moderation", icon: Shield },
        { to: "/scope-super-admin/rbac-audit", label: "Audit Logs", permission: "manage_roles", icon: History },
      ],
    },
    {
      id: "platform",
      label: "Platform",
      items: [
        { to: "/dev/build-diagnostics", label: "Deployments", permission: "full_system_access", icon: Wrench },
        { to: "/admin/config", label: "Backups", permission: "full_system_access", icon: Database },
        { to: "/settings", label: "Settings", permission: "view_dashboard", icon: Settings },
      ],
    },
  ],
};

/* ════════════════════════════════════════════════════════════════════════
 * GENERIC ADMIN — regional/campus/content/growth/support fallback
 * ════════════════════════════════════════════════════════════════════════ */
const GENERIC_ADMIN_BLUEPRINT: SidebarBlueprint = {
  layout: "generic_admin",
  groups: [
    {
      id: "workspace",
      label: "Workspace",
      items: [
        { to: "/dashboard", label: "Dashboard", permission: "view_dashboard", icon: LayoutDashboard },
        { to: "/admin", label: "Admin Console", permission: "view_admin", icon: Shield },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      items: [
        { to: "/admin/campuses/new", label: "Campuses", permission: "manage_campuses", icon: Building2 },
        { to: "/projects", label: "Projects", permission: "manage_projects", icon: FolderKanban },
        { to: "/feed", label: "Feed", permission: "manage_feed", icon: Newspaper },
        { to: "/events", label: "Events", permission: "manage_events", icon: Calendar },
        { to: "/institution-admin/communications", label: "Content", permission: "manage_content", icon: FileText },
      ],
    },
    {
      id: "insights",
      label: "Insights",
      items: [
        { to: "/institution-admin/analytics", label: "Analytics", permission: "view_analytics", icon: BarChart3 },
      ],
    },
    {
      id: "support",
      label: "Support",
      items: [
        { to: "/support", label: "Support Queue", permission: "manage_support", icon: LifeBuoy },
      ],
    },
  ],
};

export const ROLE_BLUEPRINTS: Partial<Record<RoleId, SidebarBlueprint>> = {
  super_admin: SUPER_ADMIN_BLUEPRINT,
  scope_super_admin: SUPER_ADMIN_BLUEPRINT,
  scope_admin: SCOPE_ADMIN_BLUEPRINT,
  institutional_admin: INSTITUTIONAL_ADMIN_BLUEPRINT,
  faculty_coordinator: FACULTY_BLUEPRINT,
  campus_leader: CAMPUS_LEADER_BLUEPRINT,
  student: STUDENT_BLUEPRINT,
  viewer: STUDENT_BLUEPRINT,
  regional_admin: GENERIC_ADMIN_BLUEPRINT,
  campus_admin: GENERIC_ADMIN_BLUEPRINT,
  content_admin: GENERIC_ADMIN_BLUEPRINT,
  growth_admin: GENERIC_ADMIN_BLUEPRINT,
  support_admin: GENERIC_ADMIN_BLUEPRINT,
};

export const FALLBACK_BLUEPRINT: SidebarBlueprint = {
  layout: "fallback",
  groups: [
    {
      id: "workspace",
      label: "Workspace",
      items: [
        { to: "/dashboard", label: "Dashboard", permission: "view_dashboard", icon: LayoutDashboard },
      ],
    },
  ],
};

export function blueprintForRole(role: RoleId): SidebarBlueprint {
  return ROLE_BLUEPRINTS[role] ?? FALLBACK_BLUEPRINT;
}
