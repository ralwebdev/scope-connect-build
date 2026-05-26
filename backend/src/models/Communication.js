import mongoose from "mongoose";

const communicationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    channel: { type: String, required: true, enum: ["broadcast", "email", "notice"], default: "broadcast" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null, index: true },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Optional target-specific users
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // tracks which students read it
    deliveredCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

communicationSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

communicationSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

export const Communication = mongoose.model("Communication", communicationSchema);
