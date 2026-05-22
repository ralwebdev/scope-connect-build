import { Profile, Notification } from "../models/index.js";
import { awardXp } from "./xp-engine.js";

/**
 * Safely unlocks an achievement for a user.
 * Awards the corresponding XP and pushes a styled trophy notification.
 * 
 * @param {string} userId - The student's ID
 * @param {string} achievementKey - The achievement key to unlock (e.g. 'verified_builder', 'first_project', 'team_player')
 * @returns {Promise<string[]>} The user's updated achievements array
 */
export async function unlockAchievement(userId, achievementKey) {
  try {
    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      console.warn(`[AchievementEngine] Profile not found for user ${userId}`);
      return [];
    }

    // Default to having early adopter if achievements array doesn't exist
    if (!profile.achievements) {
      profile.achievements = ["early_adopter"];
    }

    // If already unlocked, return achievements early
    if (profile.achievements.includes(achievementKey)) {
      return profile.achievements;
    }

    // Push new achievement
    profile.achievements.push(achievementKey);
    await profile.save();

    // Map achievements to XP rules and descriptors
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
      // Award XP
      await awardXp({
        userId,
        institutionId: profile.institution,
        rule: achievementInfo.rule,
        dedupeKey: `achievement:${userId}:${achievementKey}`,
        text: `Unlocked "${achievementInfo.title}" achievement!`,
      }).catch((e) => console.error("[AchievementEngine] Failed to award XP", e));

      // Push a beautiful achievement trophy notification
      await Notification.create({
        user: userId,
        kind: "achievement",
        title: "Achievement Unlocked! 🏆",
        body: `You unlocked: ${achievementInfo.title} (${achievementInfo.desc})`,
        link: "/profile?tab=achievements",
        dedupeKey: `achievement:notif:${userId}:${achievementKey}`,
      }).catch((e) => console.error("[AchievementEngine] Failed to create notification", e));
    }

    return profile.achievements;
  } catch (error) {
    console.error(`[AchievementEngine] Error unlocking achievement ${achievementKey} for user ${userId}:`, error);
    return [];
  }
}
