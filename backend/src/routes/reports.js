import express from "express";
import { Institution, User, Project, AnalyticsEvent } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { forbidden, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/response.js";
import { serializeUser } from "../utils/serializers.js";

export const reportsRouter = express.Router();

reportsRouter.use(authMiddleware);

reportsRouter.get("/institution/:id", asyncHandler(async (req, res) => {
  const institutionId = req.params.id;
  
  // RBAC: Only Institutional Admin of THIS institution or Scope Admins can view
  const isSuperAdmin = req.user.role === "super_admin" || req.user.role === "scope_admin";
  const isMyInstitution = req.user.institution?.toString() === institutionId;
  
  if (!isSuperAdmin && !isMyInstitution) {
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
