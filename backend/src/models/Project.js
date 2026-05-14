import mongoose from "mongoose";

export const projectStatuses = ["draft", "open", "in_review", "in_progress", "completed", "cancelled"];

const projectSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", default: null, index: true },
    title: { type: String, required: true, trim: true },
    summary: String,
    description: String,
    domain: { type: String, index: true },
    tags: [{ type: String }],
    status: { type: String, enum: projectStatuses, default: "draft", index: true },
    capacity: { type: Number, default: 1, min: 1 },
    startsOn: Date,
    endsOn: Date,
    coverUrl: String,
    visibility: { type: String, enum: ["public", "institution", "private"], default: "public" },
    meta: { type: Map, of: String },
  },
  { timestamps: true },
);

projectSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
projectSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Project = mongoose.model("Project", projectSchema);

