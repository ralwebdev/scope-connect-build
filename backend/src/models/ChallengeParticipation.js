import mongoose from "mongoose";

const challengeParticipationSchema = new mongoose.Schema(
  {
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stakeXp: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["joined", "submitted", "scored", "withdrawn"],
      default: "joined",
      index: true,
    },
    submission: {
      format: { type: String, trim: true, maxlength: 120 },
      url: { type: String, trim: true, maxlength: 2000 },
      fileId: { type: String, trim: true, maxlength: 200 },
      notes: { type: String, trim: true, maxlength: 5000 },
      submittedAt: Date,
    },
    score: { type: Number, min: 0, max: 100, default: null },
    rank: { type: Number, min: 1, default: null },
    badge: { type: String, trim: true, maxlength: 120, default: "" },
    xpReward: { type: Number, min: 0, default: 0 },
    certificateUrl: { type: String, trim: true, maxlength: 2000, default: "" },
    scoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    scoredAt: Date,
  },
  { timestamps: true },
);

challengeParticipationSchema.index({ challenge: 1, user: 1 }, { unique: true });
challengeParticipationSchema.index({ challenge: 1, score: -1, updatedAt: 1 });
challengeParticipationSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
challengeParticipationSchema.set("toJSON", { virtuals: true, versionKey: false });

export const ChallengeParticipation = mongoose.model("ChallengeParticipation", challengeParticipationSchema);
