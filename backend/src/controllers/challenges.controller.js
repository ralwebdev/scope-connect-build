import { Challenge } from "../models/index.js";
import { sendSuccess } from "../utils/response.js";

export async function listChallenges(req, res) {
  const items = await Challenge.find({}).sort({ createdAt: -1 });
  sendSuccess(res, { items });
}

export async function createChallenge(req, res) {
  const challenge = await Challenge.create({
    scope: req.body.scope,
    title: req.body.title,
    category: req.body.category,
    difficulty: req.body.difficulty,
    seatsTotal: req.body.seatsTotal,
    reward: req.body.reward,
    duration: req.body.duration,
    stakeXp: req.body.stake_xp || 0,
    rewardPool: req.body.reward_pool || 0,
    evaluationMethod: req.body.evaluation_method,
    submissionFormat: req.body.submission_format,
    leaderboard: req.body.leaderboard ?? true,
    stakeRefundPolicy: req.body.stake_refund_policy || "score_threshold",
    minimumScoreToRefund: req.body.minimum_score_to_refund ?? 50,
    forfeitOnNoSubmission: req.body.forfeit_on_no_submission ?? true,
  });
  sendSuccess(res, { challenge }, "Challenge created", 201);
}
