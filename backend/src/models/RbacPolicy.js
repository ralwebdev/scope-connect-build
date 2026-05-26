import mongoose from "mongoose";

const rbacPolicySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default", index: true },
    rolePermissions: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

rbacPolicySchema.virtual("id").get(function getId() {
  return this._id.toString();
});
rbacPolicySchema.set("toJSON", { virtuals: true, versionKey: false });

export const RbacPolicy = mongoose.model("RbacPolicy", rbacPolicySchema);
