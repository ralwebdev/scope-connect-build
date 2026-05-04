import mongoose from "mongoose";

const institutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    city: String,
    state: String,
    country: { type: String, default: "IN" },
    domain: { type: String, lowercase: true, trim: true, index: true },
    verified: { type: Boolean, default: false },
    logoUrl: String,
    mouStatus: { type: String, enum: ["none", "in_discussion", "signed"], default: "none" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

institutionSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
institutionSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Institution = mongoose.model("Institution", institutionSchema);

