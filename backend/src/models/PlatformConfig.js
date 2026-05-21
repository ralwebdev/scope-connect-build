import mongoose from "mongoose";

const platformConfigSchema = new mongoose.Schema(
  {
    brand: {
      name: { type: String, required: true, trim: true, maxlength: 100 },
      primaryColor: { type: String, trim: true, maxlength: 50 },
      logoUrl: { type: String, trim: true, maxlength: 500 }
    },
    contact: {
      email: { type: String, trim: true, lowercase: true, maxlength: 255 },
      supportUrl: { type: String, trim: true, maxlength: 500 }
    },
    features: {
      enableXP: { type: Boolean, default: true },
      enableMarketplace: { type: Boolean, default: true },
      enableChallenges: { type: Boolean, default: true }
    },
    campuses: [{ type: String, trim: true }]
  },
  { timestamps: true }
);

platformConfigSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
platformConfigSchema.set("toJSON", { virtuals: true, versionKey: false });

export const PlatformConfig = mongoose.model("PlatformConfig", platformConfigSchema);
