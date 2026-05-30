import mongoose from "mongoose";

const dailyReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", default: null, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    assignmentKey: { type: String, required: true, trim: true },
    dayKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    tasksDone: { type: String, required: true, trim: true, maxlength: 5000 },
    deliverables: [{ type: String, trim: true, maxlength: 500 }],
    hoursSpent: { type: Number, min: 0, max: 24, default: 0 },
    blockers: { type: String, trim: true, maxlength: 2000, default: "" },
    tomorrowPlan: { type: String, trim: true, maxlength: 3000, default: "" },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

dailyReportSchema.index({ user: 1, assignmentKey: 1, dayKey: 1 }, { unique: true });
dailyReportSchema.index({ project: 1, user: 1, createdAt: -1 });
dailyReportSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
dailyReportSchema.set("toJSON", { virtuals: true, versionKey: false });

export const DailyReport = mongoose.model("DailyReport", dailyReportSchema);
