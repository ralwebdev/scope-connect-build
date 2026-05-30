import { Profile } from "../models/index.js";
import { awardXp } from "./xp-engine.js";
import { dispatchNotification } from "../services/notification-dispatcher.js";

/**
 * Safely unlocks an achievement for a user.
 * Awards the corresponding XP and queues a notification.
 *
 * @param {string} userId
 * @param {string} achievementKey
 * @returns {Promise<string[]>}
 */
export async function unlockAchievement(userId, achievementKey) {
  try {
    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      console.warn(`[AchievementEngine] Profile not found for user ${userId}`);
      return [];
    }

    if (!profile.achievements) {
      profile.achievements = ["early_adopter"];
    }

    if (profile.achievements.includes(achievementKey)) {
      return profile.achievements;
    }

    profile.achievements.push(achievementKey);
    await profile.save();

    const achievementMap = {
      verified_builder: {
        rule: "achievement_verified_builder",
        title: "Verified Builder",
        desc: "Institution verified",
      },
      first_project: {
        rule: "achievement_first_project",
        title: "First Project",
        desc: "Launched a work item",
      },
      team_player: {
        rule: "achievement_team_player",
        title: "Team Player",
        desc: "Voted on 5 projects",
      },
    };

    const achievementInfo = achievementMap[achievementKey];
    if (achievementInfo) {
      await awardXp({
        userId,
        institutionId: profile.institution,
        rule: achievementInfo.rule,
        dedupeKey: `achievement:${userId}:${achievementKey}`,
        text: `Unlocked "${achievementInfo.title}" achievement!`,
      }).catch((error) => console.error("[AchievementEngine] Failed to award XP", error));

      await dispatchNotification({
        user: userId,
        kind: "achievement",
        title: "Achievement Unlocked!",
        body: `You unlocked: ${achievementInfo.title} (${achievementInfo.desc})`,
        link: "/profile?tab=achievements",
        dedupeKey: `achievement:notif:${userId}:${achievementKey}`,
      }, {
        source: "achievement_unlocked",
      }).catch((error) => console.error("[AchievementEngine] Failed to queue notification", error));
    }

    return profile.achievements;
  } catch (error) {
    console.error(`[AchievementEngine] Error unlocking achievement ${achievementKey} for user ${userId}:`, error);
    return [];
  }
}
