import mongoose from "mongoose";

const waitlistSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 255 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    campus: { type: String, required: false, trim: true, maxlength: 200 },
    interests: [{ type: String, trim: true, maxlength: 100 }],
    at: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

waitlistSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
waitlistSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Waitlist = mongoose.model("Waitlist", waitlistSchema);
