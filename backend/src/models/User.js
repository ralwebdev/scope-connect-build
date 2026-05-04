import mongoose from "mongoose";
import { roles, roleVariants } from "../utils/roles.js";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: roles, default: "student", index: true },
    roleVariant: { type: String, enum: roleVariants, default: "student" },
    founder: { type: Boolean, default: false },
    disabledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

userSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);

