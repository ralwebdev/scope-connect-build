import mongoose from "mongoose";

const proposalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    problem: { type: String, required: true },
    why: { type: String, required: true },
    teamSkills: { type: String, default: "" },
    campusRelevance: { type: String, default: "" },
    anonymous: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "reviewed", "accepted", "rejected"],
      default: "pending",
    },
    adminComment: { type: String, default: "" },
  },
  { timestamps: true }
);

proposalSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
proposalSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Proposal = mongoose.model("Proposal", proposalSchema);
