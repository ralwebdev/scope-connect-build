import mongoose from "mongoose";

export const taskStatuses = ["Assigned", "In Progress", "Submitted", "Reviewed", "Completed", "Rework Needed"];

const taskEvidenceSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["link", "file", "screenshot", "comment"], required: true },
    value: { type: String, required: true, trim: true, maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const projectTaskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "ProjectRoom", default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000, default: "" },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deadline: Date,
    deliverables: [{ type: String, trim: true, maxlength: 500 }],
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProjectTask" }],
    priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
    status: { type: String, enum: taskStatuses, default: "Assigned", index: true },
    evidence: [taskEvidenceSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: Date,
  },
  { timestamps: true },
);

projectTaskSchema.index({ project: 1, status: 1, updatedAt: -1 });
projectTaskSchema.index({ project: 1, assignedTo: 1, status: 1 });
projectTaskSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
projectTaskSchema.set("toJSON", { virtuals: true, versionKey: false });

export const ProjectTask = mongoose.model("ProjectTask", projectTaskSchema);
