import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 255 },
    reason: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: ["open", "resolved"], default: "open" }
  },
  { timestamps: true }
);

contactMessageSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
contactMessageSchema.set("toJSON", { virtuals: true, versionKey: false });

export const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);
