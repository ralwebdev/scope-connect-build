import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema(
  {
    scope: { type: String, required: true, enum: ["campus", "global"], default: "global" },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    difficulty: { type: String, required: true, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    seatsTotal: { type: Number, required: true, min: 1, max: 100000 },
    seatsFilled: { type: Number, default: 0, min: 0 },
    reward: { type: String, required: true, trim: true, maxlength: 100 }
  },
  { timestamps: true }
);

challengeSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
challengeSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Challenge = mongoose.model("Challenge", challengeSchema);
