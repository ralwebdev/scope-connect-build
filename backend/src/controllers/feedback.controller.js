import { Feedback } from "../models/index.js";
import { sendSuccess } from "../utils/response.js";

export async function submitFeedback(req, res) {
  const feedback = await Feedback.create({
    user: req.user?._id,
    rating: req.body.rating,
    type: req.body.type,
    text: req.body.text,
  });
  sendSuccess(res, { feedback }, "Feedback submitted", 201);
}
