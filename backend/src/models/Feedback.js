import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    rating: { type: Number, required: true, min: 1, max: 5 },
    type: { type: String, required: true, trim: true, maxlength: 100 },
    text: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: ["new", "reviewed", "resolved"], default: "new" }
  },
  { timestamps: true }
);

feedbackSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
feedbackSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Feedback = mongoose.model("Feedback", feedbackSchema);
