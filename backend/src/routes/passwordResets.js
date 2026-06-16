import express from "express";
import bcrypt from "bcryptjs";
import { PasswordResetRequest, User, Session } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendSuccess } from "../utils/response.js";
import { forbidden, notFound, badRequest } from "../utils/errors.js";

export const passwordResetsRouter = express.Router();

passwordResetsRouter.use(authMiddleware);

// Helper check
function isAllowed(user, targetInstitutionId) {
  if (user.role === "super_admin" || user.role === "scope_admin") return true;
  if (
    (user.role === "institution_admin" || user.role === "faculty") &&
    user.institution?.toString() === targetInstitutionId?.toString()
  ) {
    return true;
  }
  return false;
}

// GET all password reset requests
passwordResetsRouter.get("/", asyncHandler(async (req, res) => {
  const institutionId = req.query.institutionId || req.user.institution;

  let query = {};
  if (institutionId) {
    if (!isAllowed(req.user, institutionId)) {
      throw forbidden("You don't have access to this institution's requests");
    }
    query.institution = institutionId;
  } else {
    if (req.user.role !== "scope_admin" && req.user.role !== "super_admin") {
      throw forbidden("Institution ID is required for your role");
    }
    // scope_admin or super_admin gets all requests
  }

  const requests = await PasswordResetRequest.find(query)
    .populate("user", "name email role primary_domain department_name student_status")
    .populate("resolvedBy", "name email role")
    .populate("institution", "name logo_text")
    .sort({ createdAt: -1 });

  let filteredRequests = requests;
  if (req.user.role !== "scope_admin" && req.user.role !== "super_admin") {
    filteredRequests = requests.filter(r => r.user && r.user.role !== "institution_admin");
  }

  sendSuccess(res, filteredRequests);
}));

// POST resolve request (updates student password)
passwordResetsRouter.post("/:id/resolve", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    throw badRequest("Password must be at least 8 characters long");
  }

  const resetReq = await PasswordResetRequest.findById(id);
  if (!resetReq) throw notFound("Password reset request not found");

  if (!isAllowed(req.user, resetReq.institution)) {
    throw forbidden("You don't have access to resolve this request");
  }

  const student = await User.findById(resetReq.user);
  if (!student) throw notFound("User not found");

  if (student.role === "institution_admin" && req.user.role !== "scope_admin" && req.user.role !== "super_admin") {
    throw forbidden("Only Scope Admin can resolve an Institutional Admin's password reset request");
  }

  // Hash new password
  student.passwordHash = await bcrypt.hash(password, 12);
  // Reset token fields if any
  student.resetPasswordTokenHash = null;
  student.resetPasswordExpiresAt = null;
  await student.save();

  // Revoke active sessions for the student so they have to login with new password
  await Session.updateMany({ user: student._id, revokedAt: null }, { revokedAt: new Date() });

  // Update reset request status
  resetReq.status = "resolved";
  resetReq.resolvedBy = req.user._id;
  resetReq.resolvedAt = new Date();
  resetReq.tempPasswordUsed = password; // Option to view what it was set to
  await resetReq.save();

  sendSuccess(res, { success: true }, "Password has been updated and request resolved");
}));
