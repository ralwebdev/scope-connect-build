import mongoose from "mongoose";

const opportunitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    by: { type: String, required: true, maxlength: 100 },
    company: { type: String, required: true, maxlength: 140 },
    category: { type: String, required: true, maxlength: 80 },
    description: { type: String, required: true, maxlength: 5000 },
    requiredSkills: [{ type: String, trim: true, maxlength: 80 }],
    interestedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

opportunitySchema.index({ createdAt: -1 });
opportunitySchema.virtual("id").get(function getId() { return this._id.toString(); });
opportunitySchema.set("toJSON", { virtuals: true, versionKey: false });

export const Opportunity = mongoose.model("Opportunity", opportunitySchema);
