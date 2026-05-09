import mongoose from "mongoose";

export const portfolioItemTypes = ["Project", "Design", "Research", "Startup Idea", "Campaign", "Certificate"];

const normalizeString = (value) => (typeof value === "string" ? value.trim() : value);

const portfolioItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: portfolioItemTypes, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    skills: [{ type: String, trim: true, maxlength: 80 }],
    link: { type: String, trim: true, maxlength: 500, default: "", set: normalizeString },
    cover: { type: String, required: true, trim: true, maxlength: 20, default: "PRJ" },
  },
  { timestamps: true },
);

portfolioItemSchema.index({ user: 1, createdAt: -1 });

portfolioItemSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
portfolioItemSchema.set("toJSON", { virtuals: true, versionKey: false });

export const PortfolioItem = mongoose.model("PortfolioItem", portfolioItemSchema);
