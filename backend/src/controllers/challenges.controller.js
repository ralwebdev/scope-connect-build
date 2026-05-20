import { Challenge } from "../models/index.js";
import { sendSuccess } from "../utils/response.js";

export async function listChallenges(req, res) {
  const items = await Challenge.find({}).sort({ createdAt: -1 });
  sendSuccess(res, { items });
}

export async function createChallenge(req, res) {
  const challenge = await Challenge.create(req.body);
  sendSuccess(res, { challenge }, "Challenge created", 201);
}
