import express from "express";
import mongoose from "mongoose";
import { Department, User } from "../models/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendSuccess } from "../utils/response.js";
import { forbidden, notFound } from "../utils/errors.js";

export const departmentsRouter = express.Router();

departmentsRouter.use(authMiddleware);

// GET all departments for an institution
departmentsRouter.get("/", asyncHandler(async (req, res) => {
  const institutionId = req.query.institutionId || req.user.institution;
  
  if (!institutionId) {
    throw forbidden("Institution ID is required");
  }

  const departments = await Department.find({ institution: institutionId })
    .populate("headOfDepartment", "name email salutation")
    .sort({ name: 1 });
  
  const enrichedDepartments = await Promise.all(departments.map(async (dept) => {
    const [studentCount, facultyCount] = await Promise.all([
      User.countDocuments({ 
        department: dept._id, 
        role: "student",
        disabledAt: null 
      }),
      User.countDocuments({ 
        department: dept._id, 
        role: "faculty",
        disabledAt: null 
      })
    ]);
    
    return {
      ...dept.toObject(),
      studentCount,
      facultyCount
    };
  }));

  sendSuccess(res, enrichedDepartments);
}));

// POST create a new department
departmentsRouter.post("/", asyncHandler(async (req, res) => {
  const { name, code, description } = req.body;
  const institutionId = req.user.institution;

  if (!institutionId) {
    throw forbidden("Only institutional admins can create departments");
  }

  const department = await Department.create({
    institution: institutionId,
    name,
    code,
    description
  });

  sendSuccess(res, department, 201);
}));

// PATCH update a department
departmentsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  let department = await Department.findById(id);
  if (!department) throw notFound("Department not found");

  if (department.institution.toString() !== req.user.institution?.toString() && req.user.role !== "super_admin") {
    throw forbidden("You don't have permission to update this department");
  }

  department = await Department.findByIdAndUpdate(id, updates, { new: true });
  sendSuccess(res, department);
}));

// DELETE a department
departmentsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  const department = await Department.findById(id);
  if (!department) throw notFound("Department not found");

  if (department.institution.toString() !== req.user.institution?.toString() && req.user.role !== "super_admin") {
    throw forbidden("You don't have permission to delete this department");
  }

  await Department.findByIdAndDelete(id);
  sendSuccess(res, { message: "Department deleted successfully" });
}));
