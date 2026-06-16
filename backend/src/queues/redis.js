import { env } from "../config/env.js";

let ioredisModulePromise = null;
let redisConnection = null;
let warnedUnavailable = false;
let warnedUnreachable = false;

async function loadIoredis() {
  if (!ioredisModulePromise) {
    ioredisModulePromise = import("ioredis").catch(() => null);
  }
  return ioredisModulePromise;
}

function redisOptions(connectionName) {
  const base = {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectionName,
    db: env.redisDb,
  };

  if (env.redisUrl) {
    return { type: "url", value: env.redisUrl, options: base };
  }

  return {
    type: "host",
    value: {
      host: env.redisHost,
      port: env.redisPort,
      username: env.redisUsername || undefined,
      password: env.redisPassword || undefined,
      ...base,
    },
  };
}

export async function getRedisConnection(connectionName = "scope-connect-notifications") {
  if (!env.notificationsQueueEnabled) return null;
  if (redisConnection) return redisConnection;

  const moduleRef = await loadIoredis();
  if (!moduleRef?.default) {
    if (!warnedUnavailable) {
      warnedUnavailable = true;
      console.warn("[notifications] ioredis not installed; queue dispatch is disabled until dependencies are installed.");
    }
    return null;
  }

  const Redis = moduleRef.default;
  const options = redisOptions(connectionName);
  redisConnection = options.type === "url"
    ? new Redis(options.value, options.options)
    : new Redis(options.value);

  redisConnection.on("error", (error) => {
    console.error("[notifications] Redis connection error:", error?.message || error);
  });

  try {
    await redisConnection.ping();
  } catch (error) {
    if (!warnedUnreachable) {
      warnedUnreachable = true;
      console.warn("[notifications] Redis is unavailable; queue dispatch is disabled until Redis is configured and reachable.");
    }
    redisConnection.disconnect();
    redisConnection = null;
    return null;
  }

  return redisConnection;
}
