import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: true },
);

const feedPostSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, required: true },
    campus: { type: String, default: "" },
    type: { type: String, default: "Update", maxlength: 80 },
    content: { type: String, required: true, maxlength: 5000 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    celebrates: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [commentSchema],
  },
  { timestamps: true },
);

feedPostSchema.index({ createdAt: -1 });
feedPostSchema.virtual("id").get(function getId() { return this._id.toString(); });
feedPostSchema.set("toJSON", { virtuals: true, versionKey: false });

export const FeedPost = mongoose.model("FeedPost", feedPostSchema);

