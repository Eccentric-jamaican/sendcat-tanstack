import { Redis } from "@upstash/redis";
import {
  getAdmissionControlConfig,
  type AdmissionControlConfig,
} from "./reliabilityConfig";

type AdmissionMode = "enforce" | "shadow";

export type AdmissionBlockReason =
  | "user_inflight"
  | "global_inflight"
  | "global_msg_rate"
  | "global_tool_rate"
  | "redis_unavailable"
  | "ticket_create_failed";

export type AdmissionTicket = {
  ticketId: string;
  ticketKey: string;
  globalInFlightKey: string;
  userInFlightKey: string;
};

type AdmissionRedisClient = Pick<
  Redis,
  | "get"
  | "set"
  | "del"
  | "incr"
  | "incrby"
  | "decr"
  | "decrby"
  | "expire"
>;

type EnforceResult =
  | {
      allowed: true;
      mode: "enforce";
      ticket: AdmissionTicket;
    }
  | {
      allowed: false;
      mode: "enforce";
      reason: AdmissionBlockReason;
      retryAfterMs: number;
    };

type ShadowResult = {
  allowed: true;
  mode: "shadow";
  wouldBlock: boolean;
  reason?: AdmissionBlockReason;
  retryAfterMs: number;
};

export type AdmissionCheckResult = EnforceResult | ShadowResult;

const REDIS_BUCKET_TTL_SECONDS = 5;
let cachedRedisClient: AdmissionRedisClient | null = null;
let cachedRedisUrl = "";
let cachedRedisToken = "";

function createTicketId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `ticket_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function toCount(value: unknown) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function toSeconds(ms: number) {
  return Math.max(Math.ceil(ms / 1000), 1);
}

function buildKeys(input: {
  principalKey: string;
  nowMs: number;
  keyPrefix: string;
  ticketId?: string;
}) {
  const second = Math.floor(input.nowMs / 1000);
  const principal = encodeURIComponent(input.principalKey);
  const base = input.keyPrefix;
  return {
    globalInFlightKey: `${base}:inflight:global`,
    userInFlightKey: `${base}:inflight:user:${principal}`,
    msgRateKey: `${base}:rate:msg:${second}`,
    toolRateKey: `${base}:rate:tool:${second}`,
    ticketKey: input.ticketId ? `${base}:ticket:${input.ticketId}` : "",
  };
}

function buildUnavailableResult(
  mode: AdmissionMode,
  config: AdmissionControlConfig,
): AdmissionCheckResult {
  if (mode === "shadow") {
    return {
      allowed: true,
      mode: "shadow",
      wouldBlock: true,
      reason: "redis_unavailable",
      retryAfterMs: config.retryAfterMs,
    };
  }
  return {
    allowed: false,
    mode: "enforce",
    reason: "redis_unavailable",
    retryAfterMs: config.retryAfterMs,
  };
}

function getRedisClient(
  config: AdmissionControlConfig,
  providedRedis?: AdmissionRedisClient | null,
) {
  if (providedRedis) return providedRedis;
  if (!config.redisUrl || !config.redisToken) return null;

  if (
    cachedRedisClient &&
    cachedRedisUrl === config.redisUrl &&
    cachedRedisToken === config.redisToken
  ) {
    return cachedRedisClient;
  }

  cachedRedisClient = new Redis({
    url: config.redisUrl,
    token: config.redisToken,
  });
  cachedRedisUrl = config.redisUrl;
  cachedRedisToken = config.redisToken;
  return cachedRedisClient;
}

async function safeDecrement(
  redis: AdmissionRedisClient,
  key: string,
  by: number,
) {
  if (by <= 0) return;
  try {
    const nextCount =
      by === 1 ? await redis.decr(key) : await redis.decrby(key, by);
    if (toCount(nextCount) < 0) {
      await redis.set(key, "0");
      await redis.expire(key, REDIS_BUCKET_TTL_SECONDS);
    }
  } catch {
    // Best effort rollback only.
  }
}

async function checkShadowAdmission(input: {
  redis: AdmissionRedisClient;
  config: AdmissionControlConfig;
  principalKey: string;
  estimatedToolCalls: number;
  nowMs: number;
}): Promise<ShadowResult> {
  const keys = buildKeys({
    principalKey: input.principalKey,
    nowMs: input.nowMs,
    keyPrefix: input.config.keyPrefix,
  });

  const userCount = toCount(await input.redis.get(keys.userInFlightKey));
  if (userCount + 1 > input.config.userMaxInFlight) {
    return {
      allowed: true,
      mode: "shadow",
      wouldBlock: true,
      reason: "user_inflight",
      retryAfterMs: input.config.retryAfterMs,
    };
  }

  const globalCount = toCount(await input.redis.get(keys.globalInFlightKey));
  if (globalCount + 1 > input.config.globalMaxInFlight) {
    return {
      allowed: true,
      mode: "shadow",
      wouldBlock: true,
      reason: "global_inflight",
      retryAfterMs: input.config.retryAfterMs,
    };
  }

  const msgCount = toCount(await input.redis.get(keys.msgRateKey));
  if (msgCount + 1 > input.config.globalMaxMessagesPerSecond) {
    return {
      allowed: true,
      mode: "shadow",
      wouldBlock: true,
      reason: "global_msg_rate",
      retryAfterMs: input.config.retryAfterMs,
    };
  }

  if (input.estimatedToolCalls > 0) {
    const toolCount = toCount(await input.redis.get(keys.toolRateKey));
    if (
      toolCount + input.estimatedToolCalls >
      input.config.globalMaxToolCallsPerSecond
    ) {
      return {
        allowed: true,
        mode: "shadow",
        wouldBlock: true,
        reason: "global_tool_rate",
        retryAfterMs: input.config.retryAfterMs,
      };
    }
  }

  return {
    allowed: true,
    mode: "shadow",
    wouldBlock: false,
    retryAfterMs: input.config.retryAfterMs,
  };
}

async function checkAndAcquireEnforceAdmission(input: {
  redis: AdmissionRedisClient;
  config: AdmissionControlConfig;
  principalKey: string;
  estimatedToolCalls: number;
  nowMs: number;
}): Promise<EnforceResult> {
  const ticketId = createTicketId();
  const keys = buildKeys({
    principalKey: input.principalKey,
    nowMs: input.nowMs,
    keyPrefix: input.config.keyPrefix,
    ticketId,
  });
  const ticketTtlSeconds = toSeconds(input.config.ticketTtlMs);

  let userInFlightAcquired = false;
  let globalInFlightAcquired = false;
  let msgRateAcquired = false;
  let toolRateAcquired = false;

  try {
    const userCount = toCount(await input.redis.incr(keys.userInFlightKey));
    await input.redis.expire(keys.userInFlightKey, ticketTtlSeconds);
    if (userCount > input.config.userMaxInFlight) {
      await safeDecrement(input.redis, keys.userInFlightKey, 1);
      return {
        allowed: false,
        mode: "enforce",
        reason: "user_inflight",
        retryAfterMs: input.config.retryAfterMs,
      };
    }
    userInFlightAcquired = true;

    const globalCount = toCount(await input.redis.incr(keys.globalInFlightKey));
    await input.redis.expire(keys.globalInFlightKey, ticketTtlSeconds);
    if (globalCount > input.config.globalMaxInFlight) {
      await safeDecrement(input.redis, keys.globalInFlightKey, 1);
      await safeDecrement(input.redis, keys.userInFlightKey, 1);
      return {
        allowed: false,
        mode: "enforce",
        reason: "global_inflight",
        retryAfterMs: input.config.retryAfterMs,
      };
    }
    globalInFlightAcquired = true;

    const msgCount = toCount(await input.redis.incr(keys.msgRateKey));
    await input.redis.expire(keys.msgRateKey, REDIS_BUCKET_TTL_SECONDS);
    if (msgCount > input.config.globalMaxMessagesPerSecond) {
      await safeDecrement(input.redis, keys.msgRateKey, 1);
      await safeDecrement(input.redis, keys.globalInFlightKey, 1);
      await safeDecrement(input.redis, keys.userInFlightKey, 1);
      return {
        allowed: false,
        mode: "enforce",
        reason: "global_msg_rate",
        retryAfterMs: input.config.retryAfterMs,
      };
    }
    msgRateAcquired = true;

    if (input.estimatedToolCalls > 0) {
      const toolCount = toCount(
        await input.redis.incrby(keys.toolRateKey, input.estimatedToolCalls),
      );
      await input.redis.expire(keys.toolRateKey, REDIS_BUCKET_TTL_SECONDS);
      if (toolCount > input.config.globalMaxToolCallsPerSecond) {
        await safeDecrement(input.redis, keys.toolRateKey, input.estimatedToolCalls);
        await safeDecrement(input.redis, keys.msgRateKey, 1);
        await safeDecrement(input.redis, keys.globalInFlightKey, 1);
        await safeDecrement(input.redis, keys.userInFlightKey, 1);
        return {
          allowed: false,
          mode: "enforce",
          reason: "global_tool_rate",
          retryAfterMs: input.config.retryAfterMs,
        };
      }
      toolRateAcquired = true;
    }

    await input.redis.set(keys.ticketKey, "1");
    await input.redis.expire(keys.ticketKey, ticketTtlSeconds);

    return {
      allowed: true,
      mode: "enforce",
      ticket: {
        ticketId,
        ticketKey: keys.ticketKey,
        globalInFlightKey: keys.globalInFlightKey,
        userInFlightKey: keys.userInFlightKey,
      },
    };
  } catch {
    if (toolRateAcquired && input.estimatedToolCalls > 0) {
      await safeDecrement(input.redis, keys.toolRateKey, input.estimatedToolCalls);
    }
    if (msgRateAcquired) {
      await safeDecrement(input.redis, keys.msgRateKey, 1);
    }
    if (globalInFlightAcquired) {
      await safeDecrement(input.redis, keys.globalInFlightKey, 1);
    }
    if (userInFlightAcquired) {
      await safeDecrement(input.redis, keys.userInFlightKey, 1);
    }
    return {
      allowed: false,
      mode: "enforce",
      reason: "redis_unavailable",
      retryAfterMs: input.config.retryAfterMs,
    };
  }
}

export async function checkAndAcquireAdmission(input: {
  principalKey: string;
  mode: AdmissionMode;
  estimatedToolCalls?: number;
  nowMs?: number;
  config?: AdmissionControlConfig;
  redis?: AdmissionRedisClient | null;
}): Promise<AdmissionCheckResult> {
  const config = input.config ?? getAdmissionControlConfig();
  if (!config.enabled) {
    return {
      allowed: true,
      mode: "shadow",
      wouldBlock: false,
      retryAfterMs: config.retryAfterMs,
    };
  }

  const redis = getRedisClient(config, input.redis);
  if (!redis) {
    return buildUnavailableResult(input.mode, config);
  }

  const nowMs = input.nowMs ?? Date.now();
  const estimatedToolCalls = Math.max(
    0,
    Math.floor(input.estimatedToolCalls ?? config.estimatedToolCallsPerMessage),
  );

  if (input.mode === "shadow") {
    try {
      return await checkShadowAdmission({
        redis,
        config,
        principalKey: input.principalKey,
        estimatedToolCalls,
        nowMs,
      });
    } catch {
      return buildUnavailableResult("shadow", config);
    }
  }

  return checkAndAcquireEnforceAdmission({
    redis,
    config,
    principalKey: input.principalKey,
    estimatedToolCalls,
    nowMs,
  });
}

export async function releaseAdmission(input: {
  ticket: AdmissionTicket | null | undefined;
  config?: AdmissionControlConfig;
  redis?: AdmissionRedisClient | null;
}) {
  const ticket = input.ticket;
  if (!ticket) return;

  const config = input.config ?? getAdmissionControlConfig();
  const redis = getRedisClient(config, input.redis);
  if (!redis) return;

  try {
    const deleted = toCount(await redis.del(ticket.ticketKey));
    if (deleted === 0) return;

    await safeDecrement(redis, ticket.globalInFlightKey, 1);
    await safeDecrement(redis, ticket.userInFlightKey, 1);
  } catch {
    // Best effort release only.
  }
}
