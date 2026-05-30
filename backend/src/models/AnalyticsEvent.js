import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    sessionId: String,
    event: { type: String, required: true, index: true },
    props: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

analyticsEventSchema.index({ event: 1, occurredAt: -1 });
analyticsEventSchema.index({ user: 1, occurredAt: -1 });
analyticsEventSchema.index({ event: 1, user: 1, occurredAt: -1 });

export const AnalyticsEvent = mongoose.model("AnalyticsEvent", analyticsEventSchema);

