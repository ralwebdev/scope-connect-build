import { Opportunity } from "../models/index.js";
import { sendSuccess } from "../utils/response.js";

export async function listOpportunities(req, res) {
  const items = await Opportunity.find({}).sort({ createdAt: -1 });
  sendSuccess(res, { items });
}

export async function createOpportunity(req, res) {
  const opp = await Opportunity.create(req.body);
  sendSuccess(res, { opportunity: opp }, "Opportunity created", 201);
}
