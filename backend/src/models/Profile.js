import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    handle: { type: String, unique: true, sparse: true, trim: true },
    headline: String,
    bio: String,
    skills: [{ type: String }],
    interests: [{ type: String }],
    savedProjects: [{ type: String }],
    availability: {
      type: String,
      enum: ["Open to collab", "Building solo", "Hiring teammates", "Looking for internship"],
      default: "Open to collab",
    },
    avatarColor: { type: String, default: "#00D1FF" },
    avatarUrl: String,
    coverUrl: String,
    location: String,
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", default: null, index: true },
    graduationYear: Number,
    website: String,
    githubUrl: String,
    twitterUrl: String,
    linkedinUrl: String,
    instagramUrl: String,
    portfolioWebsite: String,
    resumeUrl: String,
    portfolioPdfUrl: String,
    primaryDomain: { type: String, index: true },
    specialization: String,
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streakDays: { type: Number, default: 0 },
    achievements: { type: [String], default: ["early_adopter"] },
    lastActiveDate: Date,
    emailVerifiedAt: Date,
    institutionVerified: { type: Boolean, default: false },
    opportunitiesVerified: { type: Boolean, default: false },
    opportunitiesVerificationStatus: {
      type: String,
      enum: ["none", "pending", "verified", "rejected"],
      default: "none",
      index: true,
    },
    unlockedOpportunities: [{ type: mongoose.Schema.Types.ObjectId, ref: "Opportunity" }],
    trustScore: { type: Number, default: 0 },
  },
  { timestamps: true },
);

profileSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

profileSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Profile = mongoose.model("Profile", profileSchema);
