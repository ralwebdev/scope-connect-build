import { ContactMessage } from "../models/index.js";
import { sendSuccess } from "../utils/response.js";

export async function submitContact(req, res) {
  const message = await ContactMessage.create({
    name: req.body.name,
    email: req.body.email,
    reason: req.body.reason,
    message: req.body.message,
  });
  sendSuccess(res, { message }, "Message submitted", 201);
}
