import mongoose from "mongoose";

const publicSubmissionSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["feedback", "waitlist", "contact", "support_issue", "ambassador_application", "opportunity_verification"],
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["footer", "feedback_page", "feedback_widget", "waitlist_page", "contact_page", "support_page", "ambassador_page", "profile_verification_tab"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["new", "reviewed", "closed", "verified", "rejected"],
      default: "new",
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", default: null, index: true },
    role: { type: String, default: null },
    name: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, default: null, index: true },
    campus: { type: String, trim: true, default: null },
    type: { type: String, trim: true, default: null },
    reason: { type: String, trim: true, default: null },
    message: { type: String, trim: true, default: null },
    why: { type: String, trim: true, default: null },
    rating: { type: Number, min: 1, max: 5, default: null },
    score: { type: Number, min: 0, max: 10, default: null },
    interests: { type: [String], default: [] },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

publicSubmissionSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

publicSubmissionSchema.set("toJSON", { virtuals: true, versionKey: false });

export const PublicSubmission = mongoose.model("PublicSubmission", publicSubmissionSchema);
