import { Profile } from "./Profile.js";
import { User } from "./User.js";

User.schema.virtual("profile", {
  ref: Profile.modelName,
  localField: "_id",
  foreignField: "user",
  justOne: true,
});
