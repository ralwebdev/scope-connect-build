import { Notification, NotificationOutbox } from "../models/index.js";
import { env } from "../config/env.js";
import { getRedisConnection } from "../queues/redis.js";
import { NOTIFICATION_QUEUE_NAME, getNotificationQueue, notificationJobId } from "../queues/notification.queue.js";

let bullmqModulePromise = null;

async function loadBullmq() {
  if (!bullmqModulePromise) {
    bullmqModulePromise = import("bullmq").catch(() => null);
  }
  return bullmqModulePromise;
}

function retryDateFromAttempt(attempt) {
  const multiplier = Math.max(1, attempt);
  return new Date(Date.now() + (env.notificationsQueueBackoffMs * multiplier));
}

function isDuplicateNotificationError(error) {
  return error?.code === 11000;
}

async function markOutboxSent(id) {
  await NotificationOutbox.updateOne(
    { _id: id },
    {
      $set: {
        status: "sent",
        sentAt: new Date(),
        nextRetryAt: null,
        lastError: "",
      },
    },
  );
}

async function claimOutboxForProcessing(id) {
  return NotificationOutbox.findOneAndUpdate(
    {
      _id: id,
      status: { $in: ["pending", "queued", "failed", "processing"] },
    },
    {
      $set: { status: "processing", lastAttemptAt: new Date() },
      $inc: { attemptsMade: 1 },
    },
    { new: true },
  );
}

async function markOutboxFailed(id, attemptsMade, error) {
  const message = error?.message || String(error || "delivery_failed");
  await NotificationOutbox.updateOne(
    { _id: id },
    {
      $set: {
        status: "failed",
        lastError: message.slice(0, 2000),
        nextRetryAt: retryDateFromAttempt(attemptsMade || 1),
      },
    },
  );
}

async function deliverOutboxEntry(outboxId) {
  const outbox = await claimOutboxForProcessing(outboxId);
  if (!outbox) return { skipped: true };

  if (outbox.attemptsMade > outbox.maxAttempts) {
    await NotificationOutbox.updateOne(
      { _id: outbox._id },
      { $set: { status: "failed", lastError: "Max attempts exceeded" } },
    );
    return { skipped: true };
  }

  try {
    await Notification.create({
      user: outbox.payload.user,
      kind: outbox.payload.kind,
      title: outbox.payload.title,
      body: outbox.payload.body,
      link: outbox.payload.link,
      dedupeKey: outbox.payload.dedupeKey,
    });
  } catch (error) {
    if (!isDuplicateNotificationError(error)) {
      await markOutboxFailed(outbox._id, outbox.attemptsMade, error);
      throw error;
    }
  }

  await markOutboxSent(outbox._id);
  return { sent: true };
}

async function queuePendingOutboxEntries(limit = env.notificationsOutboxSweepBatchSize) {
  const queue = await getNotificationQueue();
  if (!queue) return 0;

  const now = new Date();
  const pending = await NotificationOutbox.find({
    status: { $in: ["pending", "failed"] },
    nextRetryAt: { $lte: now },
    attemptsMade: { $lt: env.notificationsQueueAttempts },
  })
    .sort({ createdAt: 1 })
    .limit(Math.max(1, limit))
    .select("_id");

  if (!pending.length) return 0;

  const settled = await Promise.allSettled(pending.map((entry) => queue.add(
    "deliver-notification",
    { outbox_id: String(entry._id) },
    { jobId: notificationJobId(entry._id) },
  )));

  const queuedIds = settled
    .filter((item) => item.status === "fulfilled")
    .map((_, index) => pending[index]._id);

  if (queuedIds.length) {
    await NotificationOutbox.updateMany(
      { _id: { $in: queuedIds } },
      { $set: { status: "queued", nextRetryAt: retryDateFromAttempt(1) } },
    );
  }

  return queuedIds.length;
}

export async function startNotificationWorker() {
  if (!env.notificationsQueueEnabled || !env.notificationsWorkerEnabled) {
    console.warn("[notifications] worker disabled via env flags.");
    return null;
  }

  const bullmq = await loadBullmq();
  const connection = await getRedisConnection("scope-connect-notification-worker");
  if (!bullmq?.Worker || !connection) {
    console.warn("[notifications] worker did not start (missing BullMQ/Redis connection).");
    return null;
  }

  const worker = new bullmq.Worker(
    NOTIFICATION_QUEUE_NAME,
    async (job) => deliverOutboxEntry(job.data?.outbox_id),
    {
      connection,
      concurrency: Math.max(1, env.notificationsWorkerConcurrency),
      autorun: true,
    },
  );

  worker.on("failed", (job, error) => {
    console.error(`[notifications] job failed id=${job?.id} reason=${error?.message || error}`);
  });

  const sweepTimer = setInterval(() => {
    queuePendingOutboxEntries().catch((error) => {
      console.error("[notifications] outbox sweep failed:", error?.message || error);
    });
  }, Math.max(2000, env.notificationsOutboxSweepMs));
  if (typeof sweepTimer.unref === "function") sweepTimer.unref();

  await queuePendingOutboxEntries().catch((error) => {
    console.error("[notifications] initial outbox sweep failed:", error?.message || error);
  });

  console.log(`[notifications] worker online (queue=${NOTIFICATION_QUEUE_NAME}, concurrency=${env.notificationsWorkerConcurrency})`);

  return {
    worker,
    close: async () => {
      clearInterval(sweepTimer);
      await worker.close();
    },
  };
}
