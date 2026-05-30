import mongoose from "mongoose";

const notificationOutboxSchema = new mongoose.Schema(
  {
    payload: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
      kind: { type: String, required: true, trim: true },
      title: { type: String, required: true, trim: true },
      body: { type: String, default: "" },
      link: { type: String, default: "" },
      dedupeKey: { type: String, default: null },
    },
    status: {
      type: String,
      enum: ["pending", "queued", "processing", "sent", "failed"],
      default: "pending",
      index: true,
    },
    attemptsMade: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 8, min: 1 },
    nextRetryAt: { type: Date, default: Date.now, index: true },
    lastAttemptAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
    jobId: { type: String, default: null, index: true, sparse: true },
    source: { type: String, default: "system", trim: true, maxlength: 120 },
    requestId: { type: String, default: null, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);

notificationOutboxSchema.index({ status: 1, nextRetryAt: 1, createdAt: 1 });
notificationOutboxSchema.index({ "payload.user": 1, createdAt: -1 });

notificationOutboxSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
notificationOutboxSchema.set("toJSON", { virtuals: true, versionKey: false });

export const NotificationOutbox = mongoose.model("NotificationOutbox", notificationOutboxSchema);
