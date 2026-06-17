// Role-aware notification seeds + classification helpers.
// Single source of truth for what each role sees in the bell + activity center.
// Notifications never leak across roles: a Super Admin will never see XP/streak
// alerts; a student will never see CRM lead alerts.
//
// Each seed has:
//   - category : "action" | "milestone" | "system" | "info"
//   - priority : "critical" | "high" | "normal" | "low"
//   - icon     : matches the small icon set already used in the bell
//   - href?    : route to open when the notification is clicked
//   - dedupKey : stable per-role+kind so reseeds don't duplicate
//
// To add a new alert: append a template to the role array. The seeder will
// pick it up on next ensureSeeded() run (i.e. next login or first nav render).
import type { RoleId } from "@/lib/rbac";

export type NotificationCategory = "action" | "milestone" | "system" | "info";
export type NotificationPriority = "critical" | "high" | "normal" | "low";
export type NotificationIcon = "trophy" | "spark" | "zap" | "users" | "heart";

export type NotificationSeed = {
  text: string;
  icon: NotificationIcon;
  category: NotificationCategory;
  priority: NotificationPriority;
  href?: string;
  /** Minutes ago — used to give a believable timeline on first render. */
  ago: number;
  /** Stable dedup key (role:kind:slug). Required so reseeds never dupe. */
  kind: string;
};

const STUDENT: NotificationSeed[] = [
  { kind: "profile_completion", text: "Your profile is 80% complete — finish to unlock matches.", icon: "spark", category: "action", priority: "high", href: "/profile", ago: 5 },
  { kind: "new_open_project", text: "New Open Project available in Design category.", icon: "spark", category: "info", priority: "normal", href: "/challenges", ago: 22 },
  { kind: "rank_climb", text: "You moved to Rank #12 this week. Keep shipping.", icon: "trophy", category: "milestone", priority: "normal", href: "/leaderboards", ago: 60 },
  { kind: "application_accepted", text: "Application accepted for Campus Project.", icon: "trophy", category: "milestone", priority: "high", href: "/applications", ago: 90 },
  { kind: "streak", text: "Login streak: 5 days 🔥 Keep it alive.", icon: "zap", category: "milestone", priority: "low", ago: 180 },
  { kind: "certificate", text: "Certificate available for download.", icon: "trophy", category: "action", priority: "normal", href: "/portfolio", ago: 300 },
];

const CAMPUS_LEADER: NotificationSeed[] = [
  { kind: "new_applicants", text: "12 new students applied to join your campus chapter.", icon: "users", category: "action", priority: "high", href: "/campus", ago: 8 },
  { kind: "campus_rank", text: "Your campus moved to National Rank #7.", icon: "trophy", category: "milestone", priority: "normal", href: "/leaderboards", ago: 45 },
  { kind: "event_reminder", text: "Upcoming campus event starts tomorrow.", icon: "spark", category: "action", priority: "high", href: "/events", ago: 120 },
  { kind: "pending_approvals", text: "Pending approvals: 5 members awaiting review.", icon: "users", category: "action", priority: "high", href: "/campus", ago: 200 },
  { kind: "engagement_up", text: "Campus engagement increased 18% this week.", icon: "trophy", category: "milestone", priority: "normal", ago: 360 },
  { kind: "project_allocated", text: "New project allocated to your institution.", icon: "spark", category: "info", priority: "normal", href: "/projects", ago: 720 },
];

const FACULTY: NotificationSeed[] = [
  { kind: "verifications_pending", text: "8 student requests pending verification.", icon: "users", category: "action", priority: "high", href: "/institution-admin/members", ago: 12 },
  { kind: "monthly_report", text: "Monthly activity report ready.", icon: "spark", category: "info", priority: "normal", href: "/institution-admin/analytics", ago: 60 },
  { kind: "attendance_uploaded", text: "Campus event attendance uploaded.", icon: "spark", category: "system", priority: "low", href: "/events", ago: 180 },
  { kind: "projects_review", text: "2 projects need faculty review.", icon: "spark", category: "action", priority: "high", href: "/projects", ago: 240 },
  { kind: "low_engagement", text: "Low engagement alert for 2 departments.", icon: "heart", category: "info", priority: "normal", href: "/institution-admin/analytics", ago: 480 },
];

const INSTITUTION: NotificationSeed[] = [
  { kind: "rank_improved", text: "Institution rank improved to #14 nationally.", icon: "trophy", category: "milestone", priority: "normal", href: "/institution-admin/analytics", ago: 30 },
  { kind: "active_users", text: "482 active users this month.", icon: "users", category: "info", priority: "normal", href: "/institution-admin", ago: 90 },
  { kind: "chapter_request", text: "New chapter request submitted.", icon: "spark", category: "action", priority: "high", href: "/institution-admin/members", ago: 150 },
  { kind: "billing_invoice", text: "Billing invoice generated for this cycle.", icon: "zap", category: "system", priority: "normal", href: "/institution-admin", ago: 360 },
  { kind: "brand_views", text: "Brand page viewed 1,200 times.", icon: "heart", category: "milestone", priority: "low", href: "/institution-admin", ago: 600 },
  { kind: "leader_reassign", text: "Campus Leader role reassignment pending.", icon: "users", category: "action", priority: "high", href: "/institution-admin/members", ago: 900 },
];

const SCOPE_ADMIN: NotificationSeed[] = [
  { kind: "lead_followup", text: "Lead follow-up due: ABC College.", icon: "spark", category: "action", priority: "critical", href: "/scope-admin", ago: 5 },
  { kind: "meeting_tomorrow", text: "Meeting scheduled tomorrow with XYZ University.", icon: "spark", category: "action", priority: "high", href: "/scope-admin", ago: 60 },
  { kind: "mou_signed", text: "MoU signed with 1 new institution.", icon: "trophy", category: "milestone", priority: "high", href: "/scope-admin", ago: 180 },
  { kind: "target_pct", text: "Target achievement at 63%.", icon: "zap", category: "info", priority: "normal", href: "/scope-admin", ago: 240 },
  { kind: "dormant_leads", text: "3 dormant leads need reactivation.", icon: "users", category: "action", priority: "high", href: "/scope-admin", ago: 360 },
  { kind: "inbound_inquiry", text: "New inbound institution inquiry received.", icon: "spark", category: "action", priority: "high", href: "/scope-admin", ago: 480 },
];

const SUPER_ADMIN: NotificationSeed[] = [
  { kind: "national_ranking", text: "National ranking updated: Kolkata now #2 city.", icon: "trophy", category: "milestone", priority: "high", href: "/scope-super-admin", ago: 6 },
  { kind: "dau_threshold", text: "DAU crossed 5,000 users today.", icon: "zap", category: "milestone", priority: "high", href: "/scope-super-admin", ago: 30 },
  { kind: "moderation_alert", text: "Critical moderation alert in Campus Feed.", icon: "heart", category: "action", priority: "critical", href: "/feed", ago: 12 },
  { kind: "revenue_milestone", text: "Revenue milestone reached this month.", icon: "trophy", category: "milestone", priority: "high", href: "/scope-super-admin", ago: 90 },
  { kind: "admins_inactive", text: "2 admins inactive for 14 days.", icon: "users", category: "action", priority: "high", href: "/scope-super-admin/rbac-audit", ago: 200 },
  { kind: "feature_toggle", text: "Feature toggle changed in production.", icon: "spark", category: "system", priority: "normal", href: "/admin/config", ago: 300 },
  { kind: "uptime_warn", text: "System uptime dropped below threshold.", icon: "zap", category: "system", priority: "critical", href: "/dev/build-diagnostics", ago: 18 },
];

const GENERIC_ADMIN: NotificationSeed[] = [
  { kind: "tasks_open", text: "8 operational tasks open today.", icon: "spark", category: "action", priority: "high", href: "/admin", ago: 15 },
  { kind: "events_week", text: "3 events scheduled this week.", icon: "spark", category: "info", priority: "normal", href: "/events", ago: 120 },
  { kind: "trend_up", text: "Weekly trend up 5% across your scope.", icon: "trophy", category: "milestone", priority: "normal", href: "/institution-admin/analytics", ago: 360 },
  { kind: "no_alerts", text: "No critical alerts in the last 24 hours.", icon: "heart", category: "system", priority: "low", ago: 720 },
];

const VIEWER: NotificationSeed[] = [
  { kind: "welcome", text: "Welcome to Scope. Sign up to unlock your feed.", icon: "spark", category: "info", priority: "normal", href: "/auth", ago: 1 },
];

export const ROLE_NOTIFICATION_SEEDS: Record<RoleId, NotificationSeed[]> = {
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

export function seedsForRole(role: RoleId): NotificationSeed[] {
  return ROLE_NOTIFICATION_SEEDS[role] ?? VIEWER;
}

/** Priority ordering for sort (higher = shown first). */
export const PRIORITY_RANK: Record<NotificationPriority, number> = {
  critical: 4, high: 3, normal: 2, low: 1,
};
