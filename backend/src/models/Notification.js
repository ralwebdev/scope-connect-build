import mongoose from "mongoose";

const NOTIFICATION_KINDS = [
  "application_received",
  "application_status_changed",
  "project_invite",
  "mention",
  "system",
  "achievement",
  "admin_action",
  "opportunity_application_received",
  "opportunity_application_status_changed",
];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: {
      type: String,
      enum: NOTIFICATION_KINDS,
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body: String,
    link: String,
    dedupeKey: String,
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ user: 1, dedupeKey: 1 }, { unique: true, sparse: true });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });
notificationSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
notificationSchema.set("toJSON", { virtuals: true, versionKey: false });

export const Notification = mongoose.model("Notification", notificationSchema);

