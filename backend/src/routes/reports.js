import express from "express";
import { z } from "zod";
import {
  Institution,
  User,
  Project,
  AnalyticsEvent,
  Application,
  Event,
  DailyReport,
  ReportRecoveryRequest,
  Profile,
} from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AppError, forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { serializeUser } from "../utils/serializers.js";
import { hasPermission } from "../utils/roles.js";
import { validate } from "../utils/validate.js";
import { XP_CONSTANTS } from "../utils/xp-constants.js";
import { dispatchNotification } from "../services/notification-dispatcher.js";

export const reportsRouter = express.Router();

reportsRouter.use(authMiddleware);

const reportSchema = z.object({
  project_id: z.string().optional().nullable(),
  assignment_id: z.string().max(120).optional(),
  day_key: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tasks_done: z.string().min(3).max(5000).optional(),
  today_work: z.string().min(3).max(5000).optional(),
  deliverables: z.array(z.string().max(500)).max(30).optional().default([]),
  hours_spent: z.number().min(0).max(24).optional().default(0),
  blockers: z.string().max(2000).optional().default(""),
  tomorrow_plan: z.string().max(3000).optional().default(""),
}).refine((body) => Boolean(body.tasks_done || body.today_work), {
  path: ["today_work"],
  message: "today_work is required",
});

const recoverySchema = z.object({
  project_id: z.string().optional().nullable(),
  day_key: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(10).max(3000),
});

const recoveryPatchSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewer_note: z.string().max(2000).optional().default(""),
});

function istDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function serializeDailyReport(report) {
  return {
    id: report.id,
    user_id: report.user?._id?.toString?.() || report.user?.toString?.(),
    user_name: report.user?.name || null,
    institution_id: report.institution?._id?.toString?.() || report.institution?.toString?.() || null,
    project_id: report.project?._id?.toString?.() || report.project?.toString?.() || null,
    project_title: report.project?.title || null,
    assignment_id: report.assignmentKey,
    day_key: report.dayKey,
    content: {
      tasks_done: report.tasksDone,
      today_work: report.tasksDone,
      deliverables: report.deliverables || [],
      hours_spent: report.hoursSpent,
      blockers: report.blockers || "",
      tomorrow_plan: report.tomorrowPlan || "",
    },
    submitted_at: report.submittedAt,
    created_at: report.createdAt,
  };
}

function serializeRecovery(item) {
  return {
    id: item.id,
    user_id: item.user?._id?.toString?.() || item.user?.toString?.(),
    user_name: item.user?.name || null,
    institution_id: item.institution?._id?.toString?.() || item.institution?.toString?.() || null,
    project_id: item.project?._id?.toString?.() || item.project?.toString?.() || null,
    project_title: item.project?.title || null,
    day_key: item.dayKey,
    reason: item.reason,
    status: item.status,
    reviewer_id: item.reviewer?.toString?.() || null,
    reviewer_note: item.reviewerNote || "",
    reviewed_at: item.reviewedAt,
    created_at: item.createdAt,
  };
}

function canAccessInstitutionReports(req, institutionId) {
  const isSuperAdmin = req.user.role === "super_admin" || req.user.role === "scope_admin";
  const isMyInstitution = req.user.institution?.toString() === institutionId;
  return isSuperAdmin || isMyInstitution;
}

function isFacultyCoordinator(user) {
  return user?.role === "faculty" || user?.roleVariant === "faculty_coordinator";
}

async function activeAssignmentsFor(userId) {
  const applications = await Application.find({
    user: userId,
    status: "accepted",
  }).populate("project").sort({ updatedAt: -1 }).limit(100);

  return applications
    .filter((application) => application.project)
    .map((application) => ({
      id: `project:${application.project.id}`,
      project_id: application.project.id,
      title: application.project.title,
      status: application.project.status,
      daily_reporting_required: application.project.dailyReportingRequired || false,
      starts_on: application.project.startsOn || null,
      ends_on: application.project.endsOn || null,
    }));
}

async function missedReportingStatus(userId, assignments, today) {
  const statuses = [];
  for (const assignment of assignments.filter((item) => item.daily_reporting_required)) {
    const latest = await DailyReport.findOne({ user: userId, assignmentKey: assignment.id }).sort({ dayKey: -1 }).select("dayKey");
    const missed = !latest || latest.dayKey !== today;
    statuses.push({
      assignment_id: assignment.id,
      project_id: assignment.project_id,
      missed,
      action: missed ? "warning" : "clear",
      penalty: false,
      warning_days: XP_CONSTANTS.INACTIVITY_WARNING_DAYS,
    });
  }
  return statuses;
}

reportsRouter.get("/my", asyncHandler(async (req, res) => {
  const today = istDayKey();
  const assignments = await activeAssignmentsFor(req.user._id);
  const reports = await DailyReport.find({ user: req.user._id })
    .populate("project")
    .sort({ dayKey: -1, submittedAt: -1 })
    .limit(30);
  const recoveries = await ReportRecoveryRequest.find({ user: req.user._id })
    .populate("project")
    .sort({ createdAt: -1 })
    .limit(20);

  const missed_reporting = await missedReportingStatus(req.user._id, assignments, today);

  sendSuccess(res, {
    today,
    assignments,
    reports: reports.map(serializeDailyReport),
    recoveries: recoveries.map(serializeRecovery),
    missed_reporting,
    can_submit: !reports.some((report) => report.dayKey === today),
  });
}));

reportsRouter.post("/", validate(reportSchema), asyncHandler(async (req, res) => {
  const today = istDayKey();
  const dayKey = req.body.day_key || today;
  if (dayKey !== today) {
    throw new AppError(400, "INVALID_DAY_KEY", "Daily reports must use the current IST day key");
  }

  const projectId = req.body.project_id || null;
  if (projectId) {
    const project = await Project.findById(projectId).select("_id");
    if (!project) throw notFound("Project not found");
  }

  const assignmentKey = req.body.assignment_id || (projectId ? `project:${projectId}` : "general");
  try {
    const report = await DailyReport.create({
      user: req.user._id,
      institution: req.user.institution || null,
      project: projectId,
      assignmentKey,
      dayKey,
      tasksDone: req.body.today_work || req.body.tasks_done,
      deliverables: req.body.deliverables || [],
      hoursSpent: req.body.hours_spent,
      blockers: req.body.blockers || "",
      tomorrowPlan: req.body.tomorrow_plan || "",
      submittedAt: new Date(),
    });

    await Profile.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: { lastActiveDate: new Date() },
        $inc: { streakDays: 1, trustScore: 1 },
      },
    ).catch(() => null);

    sendSuccess(res, { report: serializeDailyReport(report) }, "Daily report submitted", 201);
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(409, "REPORT_ALREADY_SUBMITTED", "You have already submitted this report for today");
    }
    throw error;
  }
}));

reportsRouter.get("/team", asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, "review_application") && !hasPermission(req.user, "view_institution_analytics")) {
    throw forbidden("You do not have permission to review reports");
  }

  const filter = {};
  if (req.user.role !== "scope_admin" && req.user.role !== "super_admin") {
    filter.institution = req.user.institution || null;
  }

  const [reports, recoveries] = await Promise.all([
    DailyReport.find(filter).populate("user", "name email").populate("project").sort({ submittedAt: -1 }).limit(100),
    ReportRecoveryRequest.find({ ...filter, status: "pending" })
      .populate("user", "name email")
      .populate("project")
      .sort({ createdAt: -1 })
      .limit(100),
  ]);

  sendSuccess(res, {
    reports: reports.map(serializeDailyReport),
    recoveries: recoveries.map(serializeRecovery),
  });
}));

reportsRouter.post("/recover", validate(recoverySchema), asyncHandler(async (req, res) => {
  const projectId = req.body.project_id || null;
  if (projectId) {
    const project = await Project.findById(projectId).select("_id");
    if (!project) throw notFound("Project not found");
  }

  try {
    const recovery = await ReportRecoveryRequest.create({
      user: req.user._id,
      institution: req.user.institution || null,
      project: projectId,
      dayKey: req.body.day_key,
      reason: req.body.reason,
    });
    sendSuccess(res, { recovery: serializeRecovery(recovery) }, "Recovery request submitted", 201);
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(409, "RECOVERY_ALREADY_SUBMITTED", "A recovery request already exists for this day");
    }
    throw error;
  }
}));

reportsRouter.patch("/recover/:id", validate(recoveryPatchSchema), asyncHandler(async (req, res) => {
  if (!hasPermission(req.user, "review_application") && !hasPermission(req.user, "view_institution_analytics")) {
    throw forbidden("You do not have permission to review recovery requests");
  }

  const recovery = await ReportRecoveryRequest.findById(req.params.id);
  if (!recovery) throw notFound("Recovery request not found");
  if (
    req.user.role !== "scope_admin" &&
    req.user.role !== "super_admin" &&
    String(recovery.institution || "") !== String(req.user.institution || "")
  ) {
    throw forbidden();
  }

  recovery.status = req.body.status;
  recovery.reviewer = req.user._id;
  recovery.reviewedAt = new Date();
  recovery.reviewerNote = req.body.reviewer_note || "";
  await recovery.save();

  if (recovery.status === "approved") {
    await Profile.findOneAndUpdate({ user: recovery.user }, { $inc: { trustScore: 2 } }).catch(() => null);
  }

  await dispatchNotification({
    user: recovery.user,
    kind: "system",
    title: "Report recovery reviewed",
    body: `Your recovery request for ${recovery.dayKey} was ${recovery.status}.`,
    link: "/profile",
    dedupeKey: `report-recovery:${recovery.id}:${recovery.status}`,
  }, {
    source: "report_recovery_reviewed",
    requestId: res.locals.requestId,
  }).catch(() => null);

  sendSuccess(res, { recovery: serializeRecovery(recovery) });
}));

reportsRouter.get("/institution/:id", asyncHandler(async (req, res) => {
  const institutionId = req.params.id;
  
  // RBAC: Only Institutional Admin of THIS institution or Scope Admins can view
  if (!canAccessInstitutionReports(req, institutionId)) {
    throw forbidden("You do not have permission to view reports for this institution.");
  }

  const institution = await Institution.findById(institutionId);
  if (!institution) throw notFound("Institution not found");

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // 1. Student Metrics & Growth Trend
  const users = await User.find({ institution: institutionId, disabledAt: null, role: "student" }).populate("profile");
  
  const growthTrend = [];
  for (let i = 0; i < 6; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const count = await User.countDocuments({ 
      institution: institutionId, 
      role: "student",
      createdAt: { $lte: monthEnd } 
    });
    growthTrend.unshift({
      month: monthStart.toLocaleString('default', { month: 'short' }),
      students: count
    });
  }

  // 2. Skill Distribution (Primary Domain)
  const skillDistribution = await User.aggregate([
    { $match: { institution: institution._id, disabledAt: null, role: "student" } },
    { $lookup: { from: "profiles", localField: "_id", foreignField: "user", as: "profile" } },
    { $unwind: "$profile" },
    { $group: { _id: "$profile.primaryDomain", value: { $sum: 1 } } },
    { $project: { name: { $ifNull: ["$_id", "Other"] }, value: 1, _id: 0 } },
    { $sort: { value: -1 } }
  ]);

  // 3. Project Metrics
  const projects = await Project.find({ institution: institutionId });
  const projectMetrics = {
    total: projects.length,
    open: projects.filter(p => p.status === "open").length,
    inProgress: projects.filter(p => p.status === "in_progress").length,
    completed: projects.filter(p => p.status === "completed").length,
  };

  // 4. Top Performers
  const topPerformers = await Promise.all(
    users
      .sort((a, b) => (b.profile?.xp ?? 0) - (a.profile?.xp ?? 0))
      .slice(0, 10)
      .map(u => serializeUser(u, { includePrivate: false }))
  );

  const dau = await AnalyticsEvent.countDocuments({ 
    event: "session_start", 
    occurredAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
  });

  const campusRank = await Institution.countDocuments({
    totalStudentXp: { $gt: institution.totalStudentXp || 0 }
  }) + 1;

  sendSuccess(res, {
    institution: {
      id: institution.id,
      name: institution.name
    },
    metrics: {
      totalStudents: users.length,
      activeStudents: users.filter(u => u.studentStatus === "active").length,
      verifiedStudents: users.filter(u => u.studentStatus === "active").length,
      completionRate: users.length > 0 ? Math.round((users.filter(u => u.studentStatus === "active").length / users.length) * 100) : 0,
      totalCampusXp: users.reduce((sum, u) => sum + (u.profile?.xp ?? 0), 0),
      campusRank: campusRank,
    },
    growthTrend,
    skillDistribution,
    projectMetrics,
    topPerformers
  });
}));

reportsRouter.get("/faculty/:id", asyncHandler(async (req, res) => {
  const institutionId = req.params.id;

  if (!canAccessInstitutionReports(req, institutionId) || !hasPermission(req.user, "approve_students")) {
    throw forbidden("You do not have permission to view faculty reports for this institution.");
  }

  const institution = await Institution.findById(institutionId);
  if (!institution) throw notFound("Institution not found");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const studentFilter = {
    institution: institutionId,
    disabledAt: null,
    role: "student",
  };
  if (isFacultyCoordinator(req.user)) {
    if (!req.user.department) {
      throw forbidden("Faculty account is not linked to a department.");
    }
    studentFilter.department = req.user.department;
  }

  const [students, projects, events] = await Promise.all([
    User.find(studentFilter).populate("department", "name").sort({ createdAt: -1 }),
    Project.find({ institution: institutionId }).sort({ updatedAt: -1, createdAt: -1 }),
    Event.find({
      $or: [
        { institution: institutionId },
        { institution: null },
      ],
    }).sort({ createdAt: -1 }).limit(8),
  ]);

  const studentIds = students.map((student) => student._id);
  const [reviewsDue, activeStudentsThisMonth] = await Promise.all([
    studentIds.length
      ? Application.countDocuments({
          user: { $in: studentIds },
          submissionReviewStatus: { $in: ["submitted", "needs_changes"] },
        })
      : 0,
    studentIds.length
      ? AnalyticsEvent.distinct("user", {
          user: { $in: studentIds },
          event: "session_start",
          occurredAt: { $gte: startOfMonth },
        }).then((rows) => rows.length)
      : 0,
  ]);

  const pendingStudents = students.filter((student) => student.studentStatus === "pending_verification");
  const verifiedMembers = students.filter((student) => student.studentStatus === "active").length;
  const monthlyActivity = students.length === 0
    ? 0
    : Math.min(100, Math.round((activeStudentsThisMonth / students.length) * 100));

  sendSuccess(res, {
    metrics: {
      verifiedMembers,
      pendingApprovals: pendingStudents.length,
      reviewsDue,
      monthlyActivity,
    },
    studentsToReview: pendingStudents.slice(0, 8).map((student) => ({
      id: student.id,
      name: student.name,
      reason: [
        "Awaiting institution verification",
        student.department?.name || null,
        student.institutionMemberId ? `Roll No: ${student.institutionMemberId}` : null,
      ].filter(Boolean).join(" - "),
      when: student.studentVerificationRequestedAt || student.updatedAt || student.createdAt,
    })),
    projectChecks: projects.slice(0, 6).map((project) => {
      const needsReview = project.status === "in_review" || project.status === "draft";
      const quality = project.status === "completed"
        ? 100
        : project.status === "in_progress"
          ? 80
          : project.status === "open"
            ? 70
            : needsReview
              ? 45
              : 60;

      return {
        id: project.id,
        title: project.title,
        quality,
        status: needsReview ? "review" : "ok",
      };
    }),
    events: events.slice(0, 6).map((event) => ({
      id: event.id,
      title: event.title,
      status: event.type,
      ok: true,
    })),
  });
}));

reportsRouter.get("/global/leaderboard", asyncHandler(async (req, res) => {
  const topInstitutions = await Institution.find({})
    .sort({ totalStudentXp: -1 })
    .limit(10);
    
  sendSuccess(res, {
    items: topInstitutions.map((inst) => ({
      id: inst.id,
      name: inst.name,
      xp: inst.totalStudentXp || 0,
      logo: inst.logoUrl || "🏫",
    })),
  });
}));
