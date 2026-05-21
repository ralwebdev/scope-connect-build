import mongoose from "mongoose";

const eventRSVPSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true }
  },
  { timestamps: true }
);

eventRSVPSchema.index({ user: 1, event: 1 }, { unique: true });

eventRSVPSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
eventRSVPSchema.set("toJSON", { virtuals: true, versionKey: false });

export const EventRSVP = mongoose.model("EventRSVP", eventRSVPSchema);
