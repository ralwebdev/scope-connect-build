import mongoose from "mongoose";

const scopeAdminProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    region: { type: String, default: "Assigned Territory", trim: true },
    focus: { type: String, default: "Partnerships", trim: true },
    target: { type: Number, min: 0, default: 6 },
  },
  { timestamps: true },
);

scopeAdminProfileSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
scopeAdminProfileSchema.set("toJSON", { virtuals: true, versionKey: false });

export const ScopeAdminProfile = mongoose.model("ScopeAdminProfile", scopeAdminProfileSchema);
