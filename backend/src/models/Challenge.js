import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema(
  {
    scope: { type: String, required: true, enum: ["campus", "global"], default: "global" },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    duration: { type: String, trim: true, maxlength: 120, default: "" },
    difficulty: { type: String, required: true, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    stakeXp: { type: Number, default: 0, min: 0 },
    rewardPool: { type: Number, default: 0, min: 0 },
    evaluationMethod: { type: String, trim: true, maxlength: 200, default: "manual_review" },
    submissionFormat: { type: String, trim: true, maxlength: 200, default: "link" },
    leaderboard: { type: Boolean, default: true },
    stakeRefundPolicy: {
      type: String,
      enum: ["always", "score_threshold", "manual", "forfeit_below_threshold"],
      default: "score_threshold",
    },
    minimumScoreToRefund: { type: Number, min: 0, max: 100, default: 50 },
    forfeitOnNoSubmission: { type: Boolean, default: true },
    seatsTotal: { type: Number, required: true, min: 1, max: 100000 },
    seatsFilled: { type: Number, default: 0, min: 0 },
    reward: { type: String, required: true, trim: true, maxlength: 100 }
  },
  { timestamps: true }
);

challengeSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
challengeSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Challenge = mongoose.model("Challenge", challengeSchema);
