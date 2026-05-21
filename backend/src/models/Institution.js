import mongoose from "mongoose";

export const pipelineStages = [
  "Prospect",
  "Contacted",
  "Meeting Scheduled",
  "Meeting Completed",
  "Proposal Sent",
  "Negotiation",
  "MoU Draft Shared",
  "MoU Signed",
  "Launch Pending",
  "Live Chapter",
  "Dormant",
];

const institutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: {
      type: String,
      enum: ["University", "Engineering College", "School", "Polytechnic", "Other"],
      default: "Other",
    },
    board: String,
    city: String,
    state: String,
    country: { type: String, default: "IN" },
    domain: { type: String, lowercase: true, trim: true, index: true },
    verified: { type: Boolean, default: false },
    logoUrl: String,
    mouStatus: { type: String, enum: ["none", "in_discussion", "signed"], default: "none" },
    contactPerson: String,
    designation: String,
    phone: String,
    email: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    priority: { type: Number, min: 1, max: 5, default: 3 },
    potentialValue: { type: Number, default: 0 },
    pipelineStage: { type: String, enum: pipelineStages, default: "Prospect", index: true },
    notes: { type: String, default: "" },
    totalStudentXp: { type: Number, default: 0 },
    logoText: { type: String, default: "" },
    description: { type: String, default: "" },
    topSkills: { type: [String], default: [] },
    departments: { type: [String], default: [] },
    documents: [
      {
        kind: { type: String, enum: ["brochure", "proposal", "pricing", "mou", "document"] },
        fileId: { type: mongoose.Schema.Types.ObjectId, ref: "FileAsset" },
        fileName: String,
        fileUrl: String,
        sentAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

institutionSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
institutionSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Institution = mongoose.model("Institution", institutionSchema);
