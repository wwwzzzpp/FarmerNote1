import { corsHeaders } from "../_shared/cors.ts";
import { createSession, ensureFarmerUser } from "../_shared/auth.ts";
import { errorResponse, jsonResponse, readJson } from "../_shared/response.ts";
import { exchangeWeChatCode } from "../_shared/wechat.ts";

interface AuthLoginRequest {
  platform: "mini_program" | "flutter_app";
  wechatCode: string;
  deviceId?: string;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return errorResponse("Method not allowed.", 405, "method_not_allowed");
  }

  try {
    const body = await readJson<AuthLoginRequest>(request);
    if (
      !body ||
      (body.platform !== "mini_program" && body.platform !== "flutter_app")
    ) {
      return errorResponse("Invalid platform.", 400, "invalid_platform");
    }

    const identity = await exchangeWeChatCode({
      platform: body.platform,
      wechatCode: body.wechatCode,
    });

    const userId = await ensureFarmerUser({
      unionId: identity.unionId,
      miniOpenId: identity.platform === "mini_program" ? identity.openId : "",
      appOpenId: identity.platform === "flutter_app" ? identity.openId : "",
    });

    const session = await createSession({
      userId,
      platform: body.platform,
      deviceId: body.deviceId,
    });

    return jsonResponse(session);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Login failed.",
      400,
      "wechat_login_failed",
    );
  }
});
