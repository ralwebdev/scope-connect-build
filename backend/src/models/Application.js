import mongoose from "mongoose";

export const applicationStatuses = ["pending", "shortlisted", "accepted", "rejected", "withdrawn"];

const applicationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: String,
    status: { type: String, enum: applicationStatuses, default: "pending", index: true },
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

