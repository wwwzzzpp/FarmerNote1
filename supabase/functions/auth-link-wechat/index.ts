import {
  linkWeChatIdentityToUser,
  replaceSession,
  requireSession,
} from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { enforceUserRateLimit } from "../_shared/rate-limit.ts";
import {
  errorMessage,
  errorResponse,
  jsonResponse,
  readJson,
} from "../_shared/response.ts";
import { exchangeWeChatCode } from "../_shared/wechat.ts";

interface AuthLinkWeChatRequest {
  platform: "mini_program" | "flutter_app";
  wechatCode: string;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return errorResponse("Method not allowed.", 405, "method_not_allowed");
  }

  try {
    const session = await requireSession(request);
    const limited = await enforceUserRateLimit({
      endpoint: "auth-link-wechat",
      session,
    });
    if (limited) {
      return limited;
    }

    const body = await readJson<AuthLinkWeChatRequest>(request);
    if (
      !body ||
      (body.platform !== "mini_program" && body.platform !== "flutter_app")
    ) {
      return errorResponse("Invalid platform.", 400, "invalid_platform");
    }

    const identity = await exchangeWeChatCode({
      platform: body.platform,
      wechatCode: String(body.wechatCode ?? ""),
    });
    const userId = await linkWeChatIdentityToUser({
      currentUserId: session.userId,
      unionId: identity.unionId,
      miniOpenId: identity.platform === "mini_program" ? identity.openId : "",
      appOpenId: identity.platform === "flutter_app" ? identity.openId : "",
    });

    const nextSession = await replaceSession({
      session,
      userId,
    });

    return jsonResponse(nextSession);
  } catch (error) {
    return errorResponse(
      errorMessage(error, "微信绑定失败。"),
      400,
      "link_wechat_failed",
    );
  }
});
