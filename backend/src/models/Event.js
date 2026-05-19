import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    type: { type: String, required: true, trim: true, maxlength: 200 },
    date: { type: String, required: true, trim: true, maxlength: 80 },
    venue: { type: String, required: true, trim: true, maxlength: 200 },
    seats: { type: Number, required: true, min: 1, max: 100000 },
    color: { type: String, required: true, enum: ["brand", "cyan", "primary"] },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rsvps: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
  },
  { timestamps: true },
);

eventSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
eventSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Event = mongoose.model("Event", eventSchema);

