import mongoose from "mongoose";

export const applicationStatuses = ["pending", "shortlisted", "accepted", "rejected", "withdrawn"];
export const submissionReviewStatuses = ["not_submitted", "submitted", "passed", "needs_changes"];

const applicationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: String,
    projectRole: { type: String, trim: true, maxlength: 80, default: "Contributor" },
    committedXp: { type: Number, default: 0, min: 0 },
    commitmentStatus: {
      type: String,
      enum: ["none", "reserved", "refunded", "forfeited"],
      default: "none",
      index: true,
    },
    coordinator: { type: Boolean, default: false },
    contributionScore: {
      deliverables: { type: Number, min: 0, max: 100, default: 0 },
      reporting: { type: Number, min: 0, max: 100, default: 0 },
      peerReview: { type: Number, min: 0, max: 100, default: 0 },
      mentorReview: { type: Number, min: 0, max: 100, default: 0 },
      engagement: { type: Number, min: 0, max: 100, default: 0 },
      attendance: { type: Number, min: 0, max: 100, default: 0 },
      total: { type: Number, min: 0, max: 100, default: 0 },
    },
    rewardEligible: { type: Boolean, default: false },
    rewardXp: { type: Number, default: 0, min: 0 },
    settlementStatus: {
      type: String,
      enum: ["pending", "settled", "partial", "forfeited"],
      default: "pending",
      index: true,
    },
    status: { type: String, enum: applicationStatuses, default: "pending", index: true },
    submissionReviewStatus: {
      type: String,
      enum: submissionReviewStatuses,
      default: "not_submitted",
      index: true,
    },
    submission: {
      liveUrl: String,
      githubUrl: String,
      screenshotFileId: { type: mongoose.Schema.Types.ObjectId, ref: "FileAsset", default: null },
      screenshotUrl: String,
      notes: String,
      submittedAt: Date,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reviewedAt: Date,
      adminComment: String,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: Date,
  },
  { timestamps: true },
);

applicationSchema.index({ project: 1, user: 1 }, { unique: true });
applicationSchema.index({ user: 1, status: 1, commitmentStatus: 1 });
applicationSchema.index({ user: 1, status: 1, projectRole: 1 });
applicationSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
applicationSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Application = mongoose.model("Application", applicationSchema);
