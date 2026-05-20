import express from "express";
import mongoose from "mongoose";
import { AnalyticsEvent, User, Institution, Project, Application } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { hasPermission } from "../utils/roles.js";

export const analyticsRouter = express.Router();

function requireAnalytics(req) {
  if (!hasPermission(req.user, "view_national_analytics") && !hasPermission(req.user, "view_institution_analytics")) {
    throw forbidden("Missing analytics permission");
  }
}

function canAccessInstitution(req, institutionId) {
  const isSuperAdmin = req.user.role === "super_admin" || req.user.role === "scope_admin";
  const isMyInstitution = req.user.institution?.toString() === institutionId;
  return isSuperAdmin || isMyInstitution;
}

analyticsRouter.use(authMiddleware);

// ─── Global endpoints (scope admins / super admins) ───────────────────────────

analyticsRouter.get("/dau", asyncHandler(async (req, res) => {
  requireAnalytics(req);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const series = await AnalyticsEvent.aggregate([
    { $match: { event: "session_start", occurredAt: { $gte: since } } },
    { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } }, user: "$user" } } },
    { $group: { _id: "$_id.date", value: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", value: 1 } },
  ]);

  // Fill in days with zero for a continuous 30-day series
  const filled = [];
  for (let d = 0; d < 30; d++) {
    const date = new Date(since.getTime() + d * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().slice(0, 10);
    const found = series.find((s) => s.date === dateStr);
    filled.push({ date: dateStr, value: found ? found.value : 0 });
  }

  sendSuccess(res, { series: filled, total_unique: filled.reduce((sum, item) => sum + item.value, 0) });
}));

analyticsRouter.get("/wau", asyncHandler(async (req, res) => {
  requireAnalytics(req);
  const since = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);
  const series = await AnalyticsEvent.aggregate([
    { $match: { event: "session_start", occurredAt: { $gte: since } } },
    { $group: { _id: { week: { $dateToString: { format: "%G-W%V", date: "$occurredAt" } }, user: "$user" } } },
    { $group: { _id: "$_id.week", value: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", value: 1 } },
  ]);

  // Fill in weeks with zero for a continuous 12-week series
  const filled = [];
  for (let w = 0; w < 12; w++) {
    const d = new Date(since.getTime() + w * 7 * 24 * 60 * 60 * 1000);
    // Get ISO week string (simplified for filling)
    // Note: This matches the format %G-W%V used in aggregate
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const weekStr = `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
    
    const found = series.find((s) => s.date === weekStr);
    filled.push({ date: weekStr, value: found ? found.value : 0 });
  }

  sendSuccess(res, { series: filled, total_unique: filled.reduce((sum, item) => sum + item.value, 0) });
}));

analyticsRouter.get("/engagement", asyncHandler(async (req, res) => {
  requireAnalytics(req);
  
  const ADMIN_ROLES = ["institution_admin", "super_admin", "scope_admin"];
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [topEvents, dauCount, wauCount, memberCount, studentFacultyCount] = await Promise.all([
    // Platform-wide top events
    AnalyticsEvent.aggregate([
      { $group: { _id: "$event", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, event: "$_id", count: 1 } },
    ]),
    // Global DAU: distinct users with a session in last 24 h
    AnalyticsEvent.distinct("user", {
      event: "session_start",
      occurredAt: { $gte: since24h },
    }).then((r) => r.length),
    // Global WAU: distinct users with a session in last 7 days
    AnalyticsEvent.distinct("user", {
      event: "session_start",
      occurredAt: { $gte: since7d },
    }).then((r) => r.length),
    // Global registered users count
    User.countDocuments({ disabledAt: null }),
    // Global student/faculty count (engagement pool)
    User.countDocuments({ disabledAt: null, role: { $nin: ADMIN_ROLES } }),
  ]);

  const activity_rate_pct = studentFacultyCount > 0 ? Math.round((wauCount / studentFacultyCount) * 100) : 0;

  sendSuccess(res, {
    dau: dauCount,
    wau: wauCount,
    member_count: memberCount,
    student_faculty_count: studentFacultyCount,
    activity_rate_pct,
    top_events: topEvents,
  });
}));

analyticsRouter.get("/global-summary", asyncHandler(async (req, res) => {
  requireAnalytics(req);

  const now = new Date();
  
  const [projectStats, applicationCount, growthTrend, topInstitutions] = await Promise.all([
    // 1. Project Stats
    Project.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).then(rows => {
      const stats = { total: 0, open: 0, in_progress: 0, completed: 0 };
      rows.forEach(r => {
        stats.total += r.count;
        if (r._id === "open") stats.open = r.count;
        if (r._id === "in_progress") stats.in_progress = r.count;
        if (r._id === "completed") stats.completed = r.count;
      });
      return stats;
    }),
    // 2. Total Applications
    Application.countDocuments(),
    // 3. Global Growth Trend (last 6 months)
    (async () => {
      const trend = [];
      for (let i = 0; i < 6; i++) {
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const count = await User.countDocuments({ 
          role: "student",
          createdAt: { $lte: monthEnd } 
        });
        trend.unshift({
          date: new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleString('default', { month: 'short' }),
          value: count
        });
      }
      return trend;
    })(),
    // 4. Top Institutions by XP
    Institution.find({ totalStudentXp: { $gt: 0 } })
      .sort({ totalStudentXp: -1 })
      .limit(5)
      .select("name totalStudentXp logoUrl slug")
      .lean()
      .then(rows => rows.map(r => ({
        id: r._id,
        name: r.name,
        xp: r.totalStudentXp || 0,
        logo: r.logoUrl || "🏫",
        slug: r.slug
      }))),
  ]);

  sendSuccess(res, {
    projects: projectStats,
    applications: applicationCount,
    growth_trend: growthTrend,
    top_institutions: topInstitutions
  });
}));

// ─── Institution-scoped analytics ─────────────────────────────────────────────

/** Resolve institution member user IDs (all roles, non-disabled). */
async function getInstitutionUserIds(institutionId) {
  const users = await User.find(
    { institution: new mongoose.Types.ObjectId(institutionId), disabledAt: null },
    { _id: 1 },
  ).lean();
  return users.map((u) => u._id);
}

/**
 * IDs of institution members who are students or faculty ONLY.
 * Used for activity/engagement metrics — excludes admins so
 * admin logins and admin-triggered events don't inflate the numbers.
 */
async function getEngagementUserIds(institutionId) {
  const ADMIN_ROLES = ["institution_admin", "super_admin", "scope_admin"];
  const users = await User.find(
    {
      institution: new mongoose.Types.ObjectId(institutionId),
      disabledAt: null,
      role: { $nin: ADMIN_ROLES },
    },
    { _id: 1 },
  ).lean();
  return users.map((u) => u._id);
}

// Admin-generated event types that should NOT appear in student engagement breakdown
const ADMIN_EVENTS = ["credential_created", "student_verification", "admin_login"];

/**
 * GET /api/v1/analytics/institution/:id/dau
 * Daily active users for members of an institution (last 30 days).
 * Only counts students + faculty sessions — admin logins are excluded.
 */
analyticsRouter.get("/institution/:id/dau", asyncHandler(async (req, res) => {
  const institutionId = req.params.id;
  if (!canAccessInstitution(req, institutionId)) throw forbidden("No access to this institution's analytics");

  const [allUserIds, engagementIds] = await Promise.all([
    getInstitutionUserIds(institutionId),
    getEngagementUserIds(institutionId),
  ]);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const series = await AnalyticsEvent.aggregate([
    { $match: { event: "session_start", user: { $in: engagementIds }, occurredAt: { $gte: since } } },
    { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } }, user: "$user" } } },
    { $group: { _id: "$_id.date", value: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", value: 1 } },
  ]);

  // Fill in days with zero for a continuous 30-day series
  const filled = [];
  for (let d = 0; d < 30; d++) {
    const date = new Date(since.getTime() + d * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().slice(0, 10);
    const found = series.find((s) => s.date === dateStr);
    filled.push({ date: dateStr, value: found ? found.value : 0 });
  }

  sendSuccess(res, {
    series: filled,
    total_unique: allUserIds.length,
    engagement_count: engagementIds.length,
  });
}));

/**
 * GET /api/v1/analytics/institution/:id/wau
 * Weekly active users for members of an institution (last 12 weeks).
 * Only counts students + faculty sessions.
 */
analyticsRouter.get("/institution/:id/wau", asyncHandler(async (req, res) => {
  const institutionId = req.params.id;
  if (!canAccessInstitution(req, institutionId)) throw forbidden("No access to this institution's analytics");

  const [allUserIds, engagementIds] = await Promise.all([
    getInstitutionUserIds(institutionId),
    getEngagementUserIds(institutionId),
  ]);

  const since = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);

  const series = await AnalyticsEvent.aggregate([
    { $match: { event: "session_start", user: { $in: engagementIds }, occurredAt: { $gte: since } } },
    { $group: { _id: { week: { $dateToString: { format: "%G-W%V", date: "$occurredAt" } }, user: "$user" } } },
    { $group: { _id: "$_id.week", value: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", value: 1 } },
  ]);

  const totalActive = series.reduce((sum, s) => sum + s.value, 0);
  sendSuccess(res, {
    series,
    total_unique: totalActive,
    member_count: allUserIds.length,
    engagement_count: engagementIds.length,
  });
}));

/**
 * GET /api/v1/analytics/institution/:id/engagement
 * Engagement breakdown scoped to students + faculty only.
 * Admin-generated events (credential_created, student_verification, etc.)
 * are excluded from the activity breakdown.
 */
analyticsRouter.get("/institution/:id/engagement", asyncHandler(async (req, res) => {
  const institutionId = req.params.id;
  if (!canAccessInstitution(req, institutionId)) throw forbidden("No access to this institution's analytics");

  const [allUserIds, engagementIds] = await Promise.all([
    getInstitutionUserIds(institutionId),
    getEngagementUserIds(institutionId),
  ]);

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [topEvents, dauCount, wauCount] = await Promise.all([
    // Activity breakdown: only student/faculty events, exclude admin-only event types
    AnalyticsEvent.aggregate([
      {
        $match: {
          user: { $in: engagementIds },
          event: { $nin: ADMIN_EVENTS },
        },
      },
      { $group: { _id: "$event", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, event: "$_id", count: 1 } },
    ]),
    // DAU: distinct students/faculty with a session in last 24 h
    AnalyticsEvent.distinct("user", {
      user: { $in: engagementIds },
      event: "session_start",
      occurredAt: { $gte: since24h },
    }).then((r) => r.length),
    // WAU: distinct students/faculty with a session in last 7 days
    AnalyticsEvent.distinct("user", {
      user: { $in: engagementIds },
      event: "session_start",
      occurredAt: { $gte: since7d },
    }).then((r) => r.length),
  ]);

  const dau_wau_ratio = wauCount > 0 ? Math.round((dauCount / wauCount) * 100) / 100 : 0;

  sendSuccess(res, {
    dau_wau_ratio,
    dau: dauCount,
    wau: wauCount,
    member_count: allUserIds.length,          // total members incl. admin
    engagement_count: engagementIds.length,   // students + faculty only
    activity_rate_pct: engagementIds.length > 0 ? Math.round((wauCount / engagementIds.length) * 100) : 0,
    top_events: topEvents,
  });
}));

