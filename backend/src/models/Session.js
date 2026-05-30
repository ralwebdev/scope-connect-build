import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenHash: { type: String, required: true, index: true },
    userAgent: String,
    ip: String,
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    rotatedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Session", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

sessionSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
sessionSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Session = mongoose.model("Session", sessionSchema);

