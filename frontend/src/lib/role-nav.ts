// 🧭 Per-role navigation config — single source of truth used by both
// the desktop NavbarShell (primary nav rail) and the MobileDock (bottom
// dock + quick-actions panel). Defining this once guarantees the spec's
// "no irrelevant nav" rule is enforced everywhere.
import type { ComponentType } from "react";
import {
  Home, Briefcase, Compass, User as UserIcon, Bell, Settings as SettingsIcon,
  HelpCircle, LogOut, BarChart3, Users, FileBarChart, Building2, Handshake,
  MapPin, Shield, Activity, Megaphone, Trophy, FolderKanban, Sparkles,
  ClipboardCheck, Globe,
} from "lucide-react";
import type { RoleId } from "@/lib/rbac";

export type NavItem = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
  /** Action sentinel for non-route items (e.g. logout). */
  action?: "logout" | "notifications";
};

export type RoleNavConfig = {
  primary: NavItem[];   // up to 5 — shown in dock & desktop center rail (overflow → more)
  secondary: NavItem[]; // shown in profile menu / quick actions
};

// ---- atoms ----
const HOME = (to: string): NavItem => ({ key: "home", label: "Home", icon: Home, to });
const PROFILE: NavItem = { key: "profile", label: "Profile", icon: UserIcon, to: "/profile" };
const NOTIF: NavItem = { key: "notifications", label: "Inbox", icon: Bell, to: "/notifications" };
const SETTINGS: NavItem = { key: "settings", label: "Settings", icon: SettingsIcon, to: "/settings" };
const HELP: NavItem = { key: "help", label: "Help", icon: HelpCircle, to: "/support" };
const LOGOUT: NavItem = { key: "logout", label: "Sign out", icon: LogOut, to: "/auth", action: "logout" };

// ---- per-role configs ----
const STUDENT: RoleNavConfig = {
  primary: [
    HOME("/dashboard"),
    { key: "projects", label: "Projects", icon: Briefcase, to: "/projects" },
    { key: "portfolio", label: "Portfolio", icon: FolderKanban, to: "/portfolio" },
    { key: "opps", label: "Opportunities", icon: Compass, to: "/opportunities" },
    PROFILE,
  ],
  secondary: [NOTIF, SETTINGS, HELP, LOGOUT],
};

const INSTITUTION: RoleNavConfig = {
  primary: [
    HOME("/institution-admin"),
    { key: "students", label: "Students", icon: Users, to: "/institution-admin/members" },
    { key: "projects", label: "Projects", icon: Briefcase, to: "/projects" },
    { key: "reports", label: "Reports", icon: FileBarChart, to: "/institution-admin/analytics" },
    PROFILE,
  ],
  secondary: [SETTINGS, NOTIF, HELP, LOGOUT],
};

const FACULTY: RoleNavConfig = {
  primary: [
    HOME("/faculty"),
    { key: "students", label: "Students", icon: Users, to: "/institution-admin/members" },
    { key: "projects", label: "Projects", icon: Briefcase, to: "/projects" },
    { key: "approvals", label: "Approvals", icon: ClipboardCheck, to: "/faculty" },
    PROFILE,
  ],
  secondary: [NOTIF, HELP, LOGOUT],
};

const CAMPUS_LEADER: RoleNavConfig = {
  primary: [
    HOME("/campus-leader"),
    { key: "campus", label: "Campus", icon: Building2, to: "/campus" },
    { key: "projects", label: "Projects", icon: Briefcase, to: "/projects" },
    { key: "events", label: "Events", icon: Sparkles, to: "/events" },
    PROFILE,
  ],
  secondary: [NOTIF, SETTINGS, HELP, LOGOUT],
};

const SCOPE_ADMIN: RoleNavConfig = {
  primary: [
    HOME("/scope-admin"),
    { key: "institutions", label: "Institutions", icon: Building2, to: "/scope-admin" },
    { key: "mou", label: "MoU Pipeline", icon: Handshake, to: "/scope-admin" },
    { key: "visits", label: "Visits", icon: MapPin, to: "/scope-admin" },
    PROFILE,
  ],
  secondary: [
    { key: "reports", label: "Reports", icon: FileBarChart, to: "/scope-admin" },
    NOTIF, HELP, LOGOUT,
  ],
};

const SUPER_ADMIN: RoleNavConfig = {
  primary: [
    HOME("/scope-super-admin"),
    { key: "analytics", label: "Analytics", icon: BarChart3, to: "/scope-super-admin" },
    { key: "institutions", label: "Institutions", icon: Building2, to: "/scope-super-admin" },
    { key: "projects", label: "Projects", icon: Briefcase, to: "/projects" },
    PROFILE,
  ],
  secondary: [
    { key: "system", label: "System Control", icon: Shield, to: "/admin/config" },
    { key: "moderation", label: "Moderation", icon: Activity, to: "/scope-super-admin/rbac-audit" },
    { key: "logs", label: "Admin Logs", icon: FileBarChart, to: "/scope-super-admin/rbac-audit" },
    LOGOUT,
  ],
};

// Founder is mapped to scope_super_admin per product decision, but presents
// a vision-first nav. Reserved for future RoleId. Not in registry yet.

const GENERIC_ADMIN: RoleNavConfig = {
  primary: [
    HOME("/admin"),
    { key: "campuses", label: "Campuses", icon: Building2, to: "/admin" },
    { key: "feed", label: "Feed", icon: Megaphone, to: "/feed" },
    { key: "events", label: "Events", icon: Sparkles, to: "/events" },
    PROFILE,
  ],
  secondary: [NOTIF, SETTINGS, HELP, LOGOUT],
};

const VIEWER: RoleNavConfig = {
  primary: [
    HOME("/"),
    { key: "explore", label: "Explore", icon: Compass, to: "/feed" },
    { key: "events", label: "Events", icon: Sparkles, to: "/events" },
    { key: "about", label: "About", icon: Globe, to: "/about" },
    { key: "join", label: "Join", icon: Trophy, to: "/auth" },
  ],
  secondary: [],
};

const REGISTRY: Record<RoleId, RoleNavConfig> = {
  student: STUDENT,
  viewer: VIEWER,
  campus_leader: CAMPUS_LEADER,
  faculty_coordinator: FACULTY,
  institutional_admin: INSTITUTION,
  scope_admin: SCOPE_ADMIN,
  scope_super_admin: SUPER_ADMIN,
  super_admin: SUPER_ADMIN,
  regional_admin: GENERIC_ADMIN,
  campus_admin: GENERIC_ADMIN,
  content_admin: GENERIC_ADMIN,
  growth_admin: GENERIC_ADMIN,
  support_admin: GENERIC_ADMIN,
};

export function navConfigForRole(role: RoleId): RoleNavConfig {
  return REGISTRY[role] ?? VIEWER;
}
