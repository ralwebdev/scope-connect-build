import mongoose from "mongoose";

const crmVisitSchema = new mongoose.Schema(
  {
    institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ["scheduled", "checked_in", "completed", "cancelled"],
      default: "scheduled",
      index: true,
    },
    notes: String,
  },
  { timestamps: true },
);

crmVisitSchema.virtual("id").get(function getId() {
  return this._id.toString();
});

crmVisitSchema.set("toJSON", { virtuals: true, versionKey: false });

export const CrmVisit = mongoose.model("CrmVisit", crmVisitSchema);
