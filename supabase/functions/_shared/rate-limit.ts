import type { AuthenticatedSession } from "./auth.ts";
import { getNumberEnv } from "./env.ts";
import { errorResponse } from "./response.ts";
import { createServiceClient } from "./supabase.ts";

type RateLimitScopeType = "user" | "ip";

interface RateLimitRecord {
  allowed: boolean;
  request_count: number;
  limit_value: number;
  retry_after_seconds: number;
  window_started_at: string;
}

interface RateLimitInput {
  endpoint: string;
  scopeType: RateLimitScopeType;
  scopeKey: string;
  limit: number;
}

const userLimitPerMinute = () =>
  getNumberEnv("FARMERNOTE_USER_RATE_LIMIT_PER_MINUTE", 30);
const ipLimitPerMinute = () =>
  getNumberEnv("FARMERNOTE_IP_RATE_LIMIT_PER_MINUTE", 30);

function normalizeRecord(value: unknown): RateLimitRecord {
  if (Array.isArray(value)) {
    if (!value.length) {
      throw new Error("Unable to load rate limit result.");
    }
    return normalizeRecord(value[0]);
  }

  if (!value || typeof value !== "object") {
    throw new Error("Unable to load rate limit result.");
  }

  const record = value as Record<string, unknown>;
  return {
    allowed: record.allowed === true,
    request_count: Number(record.request_count ?? 0),
    limit_value: Number(record.limit_value ?? 0),
    retry_after_seconds: Number(record.retry_after_seconds ?? 60),
    window_started_at: String(record.window_started_at ?? ""),
  };
}

function buildRateLimitHeaders(
  record: RateLimitRecord,
): Record<string, string> {
  const remaining = Math.max(record.limit_value - record.request_count, 0);
  return {
    "Retry-After": `${Math.max(record.retry_after_seconds, 1)}`,
    "X-RateLimit-Limit": `${Math.max(record.limit_value, 1)}`,
    "X-RateLimit-Remaining": `${remaining}`,
    "X-RateLimit-Window-Started-At": record.window_started_at,
  };
}

function blockedResponse(input: {
  endpoint: string;
  scopeType: RateLimitScopeType;
  record: RateLimitRecord;
}): Response {
  const { endpoint, scopeType, record } = input;
  return errorResponse(
    `请求过于频繁，请 ${Math.max(record.retry_after_seconds, 1)} 秒后再试。`,
    429,
    "rate_limit_exceeded",
    {
      endpoint,
      scopeType,
      retryAfterSeconds: Math.max(record.retry_after_seconds, 1),
      limit: Math.max(record.limit_value, 1),
    },
    buildRateLimitHeaders(record),
  );
}

async function consumeRateLimit(
  input: RateLimitInput,
): Promise<RateLimitRecord> {
  const client = createServiceClient();
  const { data, error } = await client.rpc("farmernote_consume_rate_limit", {
    p_scope_type: input.scopeType,
    p_scope_key: input.scopeKey,
    p_endpoint: input.endpoint,
    p_request_limit: Math.max(input.limit, 1),
    p_window_seconds: 60,
  });

  if (error || !data) {
    throw error ?? new Error("Unable to consume rate limit.");
  }

  return normalizeRecord(data);
}

function requestIp(request: Request): string {
  const directHeaders = [
    "cf-connecting-ip",
    "fly-client-ip",
    "x-real-ip",
    "x-client-ip",
  ];

  for (const header of directHeaders) {
    const value = request.headers.get(header)?.trim();
    if (value) {
      return value;
    }
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.trim();
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    if (firstIp?.trim()) {
      return firstIp.trim();
    }
  }

  return "unknown";
}

export async function enforceUserRateLimit(input: {
  endpoint: string;
  session: AuthenticatedSession;
}): Promise<Response | null> {
  const record = await consumeRateLimit({
    endpoint: input.endpoint,
    scopeType: "user",
    scopeKey: input.session.userId,
    limit: userLimitPerMinute(),
  });

  if (record.allowed) {
    return null;
  }

  return blockedResponse({
    endpoint: input.endpoint,
    scopeType: "user",
    record,
  });
}

export async function enforceIpRateLimit(input: {
  endpoint: string;
  request: Request;
}): Promise<Response | null> {
  const record = await consumeRateLimit({
    endpoint: input.endpoint,
    scopeType: "ip",
    scopeKey: requestIp(input.request),
    limit: ipLimitPerMinute(),
  });

  if (record.allowed) {
    return null;
  }

  return blockedResponse({
    endpoint: input.endpoint,
    scopeType: "ip",
    record,
  });
}
