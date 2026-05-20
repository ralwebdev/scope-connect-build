import { Waitlist } from "../models/index.js";
import { sendSuccess } from "../utils/response.js";

export async function joinWaitlist(req, res) {
  const waitlist = await Waitlist.create({
    email: req.body.email,
    name: req.body.name,
    campus: req.body.campus,
    interests: req.body.interests,
  });
  sendSuccess(res, { waitlist }, "Joined waitlist", 201);
}
