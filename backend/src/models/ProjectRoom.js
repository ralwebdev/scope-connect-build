import mongoose from "mongoose";

const projectRoomSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, unique: true, index: true },
    status: { type: String, enum: ["open", "locked", "completed"], default: "open", index: true },
    temporaryCoordinator: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    participants: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      role: { type: String, trim: true, maxlength: 80, default: "Contributor" },
      joinedAt: { type: Date, default: Date.now },
      progress: { type: Number, min: 0, max: 100, default: 0 },
      contributionScore: { type: Number, min: 0, max: 100, default: 0 },
    }],
    dailySync: [{
      notes: { type: String, trim: true, maxlength: 10000, default: "" },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      createdAt: { type: Date, default: Date.now },
    }],
    meetingNotes: [{
      note: { type: String, required: true, trim: true, maxlength: 5000 },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      createdAt: { type: Date, default: Date.now },
    }],
    finalDeliverables: [{
      title: { type: String, trim: true, maxlength: 200 },
      url: { type: String, trim: true, maxlength: 2000 },
      notes: { type: String, trim: true, maxlength: 2000 },
      submittedAt: { type: Date, default: Date.now },
    }],
    grievances: [{
      title: { type: String, required: true, trim: true, maxlength: 200 },
      description: { type: String, required: true, trim: true, maxlength: 5000 },
      status: { type: String, enum: ["open", "resolved"], default: "open" },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      createdAt: { type: Date, default: Date.now },
      adminResponse: { type: String, trim: true, default: "" },
    }],
  },
  { timestamps: true },
);

projectRoomSchema.virtual("id").get(function getId() {
  return this._id.toString();
});
projectRoomSchema.set("toJSON", { virtuals: true, versionKey: false });

export const ProjectRoom = mongoose.model("ProjectRoom", projectRoomSchema);
