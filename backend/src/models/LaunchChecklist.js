import mongoose from "mongoose";

const launchChecklistSchema = new mongoose.Schema(
  {
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, unique: true, index: true },
    facultyAssigned: { type: Boolean, default: false },
    leaderShortlisted: { type: Boolean, default: false },
    launchScheduled: { type: Boolean, default: false },
    registrationsStarted: { type: Boolean, default: false },
    pageLive: { type: Boolean, default: false },
    challengeActivated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

launchChecklistSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

launchChecklistSchema.set("toJSON", { virtuals: true, versionKey: false });

export const LaunchChecklist = mongoose.model("LaunchChecklist", launchChecklistSchema);
