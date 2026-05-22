import mongoose from "mongoose";

const reportRecoveryRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", default: null, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    dayKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    reason: { type: String, required: true, trim: true, maxlength: 3000 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewerNote: { type: String, trim: true, maxlength: 2000, default: "" },
  },
  { timestamps: true },
);

reportRecoveryRequestSchema.index({ user: 1, project: 1, dayKey: 1 }, { unique: true });
reportRecoveryRequestSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
reportRecoveryRequestSchema.set("toJSON", { virtuals: true, versionKey: false });

export const ReportRecoveryRequest = mongoose.model("ReportRecoveryRequest", reportRecoveryRequestSchema);
