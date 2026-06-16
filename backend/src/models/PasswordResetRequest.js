import mongoose from "mongoose";

const passwordResetRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", default: null, index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null, index: true },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
      index: true,
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    tempPasswordUsed: { type: String, default: null },
  },
  { timestamps: true },
);

passwordResetRequestSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

passwordResetRequestSchema.set("toJSON", { virtuals: true, versionKey: false });

export const PasswordResetRequest = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);
