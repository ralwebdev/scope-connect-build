// Role → navbar theme map. Drives the floating glass capsule's accent glow,
// role-badge color, label, and emoji marker. Same structure across roles —
// only the color/label changes, so role leakage is impossible by construction.
import type { RoleId } from "@/lib/rbac";

export type RoleTheme = {
  /** CSS color used for glow halos, badge background, and accent borders. */
  glow: string;
  /** Foreground color for text on top of the glow surface. */
  fg: string;
  /** Short label for the role badge chip. */
  label: string;
  /** Emoji dot used in the badge (per spec). */
  dot: string;
};

const STUDENT: RoleTheme = { glow: "#00D1FF", fg: "#00131a", label: "Student", dot: "🟢" };
const CAMPUS_LEADER: RoleTheme = { glow: "#34D399", fg: "#04261b", label: "Campus Leader", dot: "🔵" };
const FACULTY: RoleTheme = { glow: "#A8B2C8", fg: "#0d1424", label: "Faculty", dot: "🟡" };
const INSTITUTION: RoleTheme = { glow: "#7C9CFF", fg: "#06122e", label: "Institution Admin", dot: "🟣" };
const SCOPE_ADMIN: RoleTheme = { glow: "#A78BFA", fg: "#190a36", label: "Scope Admin", dot: "🟠" };
const SUPER_ADMIN: RoleTheme = { glow: "#E63946", fg: "#1a0205", label: "Super Admin", dot: "🔴" };
const VIEWER: RoleTheme = { glow: "#94a3b8", fg: "#0a1020", label: "Viewer", dot: "⚪" };

const MAP: Record<RoleId, RoleTheme> = {
  student: STUDENT,
  viewer: VIEWER,
  campus_leader: CAMPUS_LEADER,
  faculty_coordinator: FACULTY,
  institutional_admin: INSTITUTION,
  scope_admin: SCOPE_ADMIN,
  regional_admin: SCOPE_ADMIN,
  campus_admin: SCOPE_ADMIN,
  content_admin: SCOPE_ADMIN,
  growth_admin: SCOPE_ADMIN,
  support_admin: SCOPE_ADMIN,
  scope_super_admin: SUPER_ADMIN,
  super_admin: SUPER_ADMIN,
};

export function themeForRole(role: RoleId): RoleTheme {
  return MAP[role] ?? VIEWER;
}
