import mongoose from "mongoose";

const fileAssetSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["avatar", "cover", "resume", "document"], required: true },
    mimeType: { type: String, required: true },
    byteSize: { type: Number, required: true },
    storageKey: { type: String, required: true },
    public: { type: Boolean, default: true },
    checksumSha256: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

fileAssetSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
fileAssetSchema.set("toJSON", { virtuals: true, versionKey: false });

export const FileAsset = mongoose.model("FileAsset", fileAssetSchema);

