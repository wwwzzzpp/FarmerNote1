import { createSession, ensureFarmerUser } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getBooleanEnv, getOptionalEnv } from "../_shared/env.ts";
import { enforceIpRateLimit } from "../_shared/rate-limit.ts";
import { errorResponse, jsonResponse, readJson } from "../_shared/response.ts";

interface AuthDevLoginRequest {
  platform: "mini_program" | "flutter_app";
  debugUserKey: string;
  displayName?: string;
  deviceId?: string;
}

function normalizeDebugUserKey(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return normalized.replace(/^-+|-+$/g, "").slice(0, 48);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return errorResponse("Method not allowed.", 405, "method_not_allowed");
  }

  if (!getBooleanEnv("FARMERNOTE_ENABLE_DEV_LOGIN", false)) {
    return errorResponse(
      "临时联调登录当前未开启，请先在 supabase/.env.local 中打开 FARMERNOTE_ENABLE_DEV_LOGIN=true。",
      403,
      "dev_login_disabled",
    );
  }

  try {
    const limited = await enforceIpRateLimit({
      endpoint: "auth-dev-login",
      request,
    });
    if (limited) {
      return limited;
    }

    const body = await readJson<AuthDevLoginRequest>(request);
    if (
      !body ||
      (body.platform !== "mini_program" && body.platform !== "flutter_app")
    ) {
      return errorResponse("Invalid platform.", 400, "invalid_platform");
    }

    const normalizedKey = normalizeDebugUserKey(
      String(body.debugUserKey ?? ""),
    );
    if (!normalizedKey) {
      return errorResponse(
        "请提供 debugUserKey，用来把小程序和 Flutter 绑定到同一个临时测试账号。",
        400,
        "missing_debug_user_key",
      );
    }

    const configuredKey = normalizeDebugUserKey(
      getOptionalEnv("FARMERNOTE_DEV_LOGIN_KEY"),
    );
    if (configuredKey && normalizedKey !== configuredKey) {
      return errorResponse(
        "debugUserKey 不匹配，请检查小程序、Flutter 和 supabase/.env.local 里的联调 key 是否一致。",
        403,
        "invalid_debug_user_key",
      );
    }

    const userId = await ensureFarmerUser({
      unionId: `dev_union_${normalizedKey}`,
      miniOpenId: body.platform === "mini_program"
        ? `dev_mini_${normalizedKey}`
        : "",
      appOpenId: body.platform === "flutter_app"
        ? `dev_app_${normalizedKey}`
        : "",
      displayName: String(body.displayName || "FarmerNote 临时联调"),
    });

    const session = await createSession({
      userId,
      platform: body.platform,
      deviceId: body.deviceId,
    });

    return jsonResponse(session);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Dev login failed.",
      400,
      "dev_login_failed",
    );
  }
});
