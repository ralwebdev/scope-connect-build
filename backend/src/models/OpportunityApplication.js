import mongoose from "mongoose";

export const opportunityApplicationStatuses = ["pending", "shortlisted", "accepted", "rejected", "withdrawn"];

const opportunityApplicationSchema = new mongoose.Schema(
  {
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: "Opportunity", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: opportunityApplicationStatuses, default: "pending", index: true },
    fitNote: { type: String, maxlength: 2000, default: "" },
    profileType: { type: String, enum: ["developer", "designer", "general"], required: true },
    portfolioUrl: String,
    githubUrl: String,
    dribbbleUrl: String,
    otherUrl: String,
    resumeFileId: { type: mongoose.Schema.Types.ObjectId, ref: "FileAsset", default: null },
    resumeUrl: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: Date,
    adminComment: { type: String, maxlength: 2000, default: "" },
  },
  { timestamps: true },
);

opportunityApplicationSchema.index({ opportunity: 1, createdAt: -1 });
opportunityApplicationSchema.index({ opportunity: 1, status: 1, createdAt: -1 });
opportunityApplicationSchema.index({ opportunity: 1, user: 1 }, { unique: true });
opportunityApplicationSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
opportunityApplicationSchema.set("toJSON", { virtuals: true, versionKey: false });

export const OpportunityApplication = mongoose.model("OpportunityApplication", opportunityApplicationSchema);
