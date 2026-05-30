import { NotificationOutbox } from "../models/NotificationOutbox.js";
import { Notification } from "../models/Notification.js";
import { getNotificationQueue, notificationJobId } from "../queues/notification.queue.js";
import { env } from "../config/env.js";

function normalizeNotification(input) {
  if (!input?.user) {
    throw new Error("Notification requires a target user id");
  }
  if (!input?.kind) {
    throw new Error("Notification requires kind");
  }
  if (!input?.title) {
    throw new Error("Notification requires title");
  }

  return {
    user: input.user,
    kind: input.kind,
    title: input.title,
    body: input.body || "",
    link: input.link || "",
    dedupeKey: input.dedupeKey || null,
  };
}

function retryDateFromNow(multiplier = 1) {
  return new Date(Date.now() + (env.notificationsQueueBackoffMs * Math.max(1, multiplier)));
}

async function deliverInlineEntries(entries) {
  const settled = await Promise.allSettled(entries.map(async (entry) => {
    try {
      await Notification.create({
        user: entry.payload.user,
        kind: entry.payload.kind,
        title: entry.payload.title,
        body: entry.payload.body,
        link: entry.payload.link,
        dedupeKey: entry.payload.dedupeKey,
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }

    await NotificationOutbox.updateOne(
      { _id: entry._id },
      { $set: { status: "sent", sentAt: new Date(), lastError: "", nextRetryAt: null } },
    );
    return true;
  }));

  const deliveredCount = settled.filter((item) => item.status === "fulfilled").length;
  const failedEntries = settled
    .map((item, index) => ({ item, entry: entries[index] }))
    .filter(({ item }) => item.status === "rejected");

  if (failedEntries.length) {
    await Promise.all(failedEntries.map(({ item, entry }) => NotificationOutbox.updateOne(
      { _id: entry._id },
      {
        $set: {
          status: "failed",
          lastError: item.reason?.message || String(item.reason || "delivery_failed"),
          nextRetryAt: retryDateFromNow(1),
        },
      },
    )));
  }

  return deliveredCount;
}

async function enqueueOutboxEntries(entries) {
  const queue = await getNotificationQueue();
  if (!queue) {
    const deliveredCount = await deliverInlineEntries(entries);
    return { queuedCount: 0, deliveredCount };
  }

  const settled = await Promise.allSettled(entries.map(async (entry) => {
    const jobId = notificationJobId(entry._id);
    await queue.add("deliver-notification", { outbox_id: String(entry._id) }, { jobId });
    return { id: entry._id, jobId };
  }));

  const queued = [];
  const failed = [];
  settled.forEach((item, index) => {
    if (item.status === "fulfilled") {
      queued.push(item.value);
    } else {
      failed.push({
        id: entries[index]._id,
        error: item.reason?.message || String(item.reason || "enqueue_failed"),
      });
    }
  });

  if (queued.length) {
    await NotificationOutbox.updateMany(
      { _id: { $in: queued.map((item) => item.id) } },
      { $set: { status: "queued", nextRetryAt: retryDateFromNow(1) } },
    );
  }

  let deliveredCount = 0;
  if (failed.length) {
    const failedEntries = entries.filter((entry) => failed.some((item) => String(item.id) === String(entry._id)));
    deliveredCount = await deliverInlineEntries(failedEntries);
  }

  return { queuedCount: queued.length, deliveredCount };
}

export async function dispatchNotification(input, options = {}) {
  const payload = normalizeNotification(input);
  const [entry] = await NotificationOutbox.create([{
    payload,
    status: "pending",
    maxAttempts: env.notificationsQueueAttempts,
    nextRetryAt: new Date(),
    source: options.source || "api",
    requestId: options.requestId || null,
  }]);

  const { queuedCount, deliveredCount } = await enqueueOutboxEntries([entry]);
  return {
    outbox_id: entry.id,
    queued: queuedCount > 0,
    delivered: deliveredCount > 0,
  };
}

export async function dispatchNotifications(inputs, options = {}) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return { created: 0, queued: 0 };
  }

  const docs = inputs.map((input) => ({
    payload: normalizeNotification(input),
    status: "pending",
    maxAttempts: env.notificationsQueueAttempts,
    nextRetryAt: new Date(),
    source: options.source || "api",
    requestId: options.requestId || null,
  }));

  const entries = await NotificationOutbox.insertMany(docs, { ordered: false });
  const { queuedCount, deliveredCount } = await enqueueOutboxEntries(entries);
  return {
    created: entries.length,
    queued: queuedCount,
    delivered: deliveredCount,
  };
}
