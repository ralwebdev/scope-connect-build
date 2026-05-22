import mongoose from "mongoose";

const xpTransactionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    source_type: { type: String, required: true, trim: true, maxlength: 80, index: true },
    source_id: { type: String, required: true, trim: true, maxlength: 160, index: true },
    action: { type: String, required: true, trim: true, maxlength: 80, index: true },
    amount: { type: Number, required: true },
    balance_before: { type: Number, required: true },
    balance_after: { type: Number, required: true },
    status: {
      type: String,
      enum: ["completed", "skipped", "failed"],
      default: "completed",
      index: true,
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

xpTransactionSchema.index({ user_id: 1, source_type: 1, source_id: 1, action: 1 });
xpTransactionSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
xpTransactionSchema.set("toJSON", { virtuals: true, versionKey: false });

export const XpTransaction = mongoose.model("XpTransaction", xpTransactionSchema);
