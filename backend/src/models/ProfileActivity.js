import mongoose from "mongoose";

const profileActivitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, required: true, trim: true, maxlength: 80 },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

profileActivitySchema.index({ user: 1, createdAt: -1 });
profileActivitySchema.virtual("id").get(function getId() {
  return this._id.toString();
});
profileActivitySchema.set("toJSON", { virtuals: true, versionKey: false });

export const ProfileActivity = mongoose.model("ProfileActivity", profileActivitySchema);

