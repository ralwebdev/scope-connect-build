import mongoose from "mongoose";

const platformConfigSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.Mixed, default: {} },
    contact: { type: mongoose.Schema.Types.Mixed, default: {} },
    features: { type: mongoose.Schema.Types.Mixed, default: {} },
    campuses: { type: [mongoose.Schema.Types.Mixed], default: [] }
  },
  { timestamps: true }
);

platformConfigSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
platformConfigSchema.set("toJSON", { virtuals: true, versionKey: false });

export const PlatformConfig = mongoose.model("PlatformConfig", platformConfigSchema);
