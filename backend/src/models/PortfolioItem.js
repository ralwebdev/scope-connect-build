import mongoose from "mongoose";

const portfolioTypes = ["Project", "Design", "Research", "Startup Idea", "Campaign", "Certificate"];

const portfolioItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: portfolioTypes, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    skills: [{ type: String, trim: true, maxlength: 80 }],
    link: { type: String, trim: true, maxlength: 500 },
    cover: { type: String, required: true, trim: true, maxlength: 20 },
  },
  { timestamps: true },
);

portfolioItemSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
portfolioItemSchema.set("toJSON", { virtuals: true, versionKey: false });

export const PortfolioItem = mongoose.model("PortfolioItem", portfolioItemSchema);

