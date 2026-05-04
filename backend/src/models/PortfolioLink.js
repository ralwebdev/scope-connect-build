import mongoose from "mongoose";

const portfolioLinkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    url: { type: String, required: true },
    category: { type: String, enum: ["domain", "universal", "custom"], default: "custom" },
    position: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

portfolioLinkSchema.index({ user: 1, key: 1 }, { unique: true });
portfolioLinkSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
portfolioLinkSchema.set("toJSON", { virtuals: true, versionKey: false });

export const PortfolioLink = mongoose.model("PortfolioLink", portfolioLinkSchema);

