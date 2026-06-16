import mongoose from "mongoose";

export const projectStatuses = ["draft", "open", "in_review", "in_progress", "completed", "cancelled"];

const projectSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", default: null, index: true },
    title: { type: String, required: true, trim: true },
    projectType: { type: String, trim: true, maxlength: 80 },
    summary: String,
    description: String,
    expectedOutcomes: [{ type: String, trim: true, maxlength: 500 }],
    duration: { type: String, trim: true, maxlength: 120 },
    deadline: Date,
    difficulty: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Easy", "Medium", "Hard"], default: "Intermediate" },
    domain: { type: String, index: true },
    tags: [{ type: String }],
    status: { type: String, enum: projectStatuses, default: "draft", index: true },
    capacity: { type: Number, default: 1, min: 1 },
    teamsAllowed: { type: Number, default: 0 },
    teamMembersLimit: { type: Number, default: 1 },
    startsOn: Date,
    endsOn: Date,
    coverUrl: String,
    visibility: { type: String, enum: ["public", "institution", "private"], default: "public" },
    participantsNeeded: { type: Number, default: 1, min: 1 },
    minimumXpRequired: { type: Number, default: 0, min: 0 },
    xpCommitmentStake: { type: Number, default: 0, min: 0 },
    maximumParticipants: { type: Number, default: 1, min: 1 },
    allowedInstitutions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Institution" }],
    requiredSkills: [{ type: String, trim: true, maxlength: 80 }],
    roleRequirements: [{
      role: { type: String, trim: true, maxlength: 80 },
      count: { type: Number, min: 1, default: 1 },
      skills: [{ type: String, trim: true, maxlength: 80 }],
      prizePoolPercentage: { type: Number, min: 0, max: 100, default: 0 },
    }],
    deliverables: [{ type: String, trim: true, maxlength: 500 }],
    responsibilities: [{ type: String, trim: true, maxlength: 500 }],
    successCriteria: [{ type: String, trim: true, maxlength: 500 }],
    dailyReportingRequired: { type: Boolean, default: false },
    minimumContributionScore: { type: Number, min: 0, max: 100, default: 70 },
    reviewFrequency: { type: String, trim: true, maxlength: 80, default: "Daily" },
    mentorReviewRequired: { type: Boolean, default: false },
    rewardPoolXp: { type: Number, default: 0, min: 0 },
    stakeRefundPolicy: { type: String, enum: ["enabled", "disabled", "partial"], default: "enabled" },
    performanceMultiplier: { type: Number, default: 1, min: 0, max: 10 },
    dropoutPenalty: { type: Number, default: 0, min: 0 },
    inactivePenalty: { type: Number, default: 0, min: 0 },
    votes: { type: Number, default: 0 },
    votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    meta: { type: Map, of: String },
  },
  { timestamps: true },
);

projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ institution: 1, status: 1, createdAt: -1 });
projectSchema.index({ createdBy: 1, createdAt: -1 });

projectSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
projectSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Project = mongoose.model("Project", projectSchema);

