import { env } from "../config/env.js";
import { getRedisConnection } from "./redis.js";

const NOTIFICATION_QUEUE_NAME = "notifications:deliveries";

let bullmqModulePromise = null;
let notificationQueuePromise = null;
let warnedUnavailable = false;

async function loadBullmq() {
  if (!bullmqModulePromise) {
    bullmqModulePromise = import("bullmq").catch(() => null);
  }
  return bullmqModulePromise;
}

export function notificationJobId(outboxId) {
  return `notif:${String(outboxId)}`;
}

export function notificationJobOptions() {
  return {
    attempts: env.notificationsQueueAttempts,
    backoff: { type: "exponential", delay: env.notificationsQueueBackoffMs },
    removeOnComplete: { age: env.notificationsRemoveCompletedAfterSec, count: 5000 },
    removeOnFail: { age: env.notificationsRemoveFailedAfterSec, count: 20000 },
  };
}

export async function getNotificationQueue() {
  if (!env.notificationsQueueEnabled) return null;
  if (notificationQueuePromise) return notificationQueuePromise;

  notificationQueuePromise = (async () => {
    const bullmq = await loadBullmq();
    const connection = await getRedisConnection();
    if (!bullmq?.Queue || !connection) {
      if (!warnedUnavailable) {
        warnedUnavailable = true;
        console.warn("[notifications] BullMQ queue unavailable; outbox items will remain pending until queue is available.");
      }
      return null;
    }

    const queue = new bullmq.Queue(NOTIFICATION_QUEUE_NAME, {
      connection,
      defaultJobOptions: notificationJobOptions(),
    });
    return queue;
  })();

  return notificationQueuePromise;
}

export { NOTIFICATION_QUEUE_NAME };
