import mongoose from "mongoose";

export const applicationStatuses = ["pending", "shortlisted", "accepted", "rejected", "withdrawn"];
export const submissionReviewStatuses = ["not_submitted", "submitted", "passed", "needs_changes"];

const applicationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: String,
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
applicationSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
applicationSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Application = mongoose.model("Application", applicationSchema);
