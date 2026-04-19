import {
  getAccountDeletionStatus,
  loadBoundPhoneForUser,
  loadBoundWeChatUnionId,
  requireSession,
  scheduleAccountDeletion,
} from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { enforceUserRateLimit } from "../_shared/rate-limit.ts";
import {
  errorMessage,
  errorResponse,
  jsonResponse,
  readJson,
} from "../_shared/response.ts";
import { sendPhoneOtp, verifyPhoneOtp } from "../_shared/phone.ts";
import { exchangeWeChatCode } from "../_shared/wechat.ts";

interface AccountRequestDeletionBody {
  action:
    | "send_phone_code"
    | "confirm_phone_code"
    | "confirm_wechat";
  code?: string;
  platform?: "mini_program" | "flutter_app";
  wechatCode?: string;
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
      endpoint: "account-request-deletion",
      session,
    });
    if (limited) {
      return limited;
    }

    const body = await readJson<AccountRequestDeletionBody>(request);
    const action = String(body?.action ?? "").trim();
    const currentStatus = await getAccountDeletionStatus(session.userId);
    if (currentStatus.status === "pending") {
      return jsonResponse(currentStatus);
    }

    if (action === "send_phone_code") {
      const phone = await loadBoundPhoneForUser(session.userId);
      if (!phone) {
        return errorResponse(
          "当前账号还没有绑定手机号，无法通过短信验证码确认注销。",
          400,
          "phone_not_linked",
        );
      }

      await sendPhoneOtp(phone, {
        purpose: "account_deletion",
      });
      return jsonResponse({
        ok: true,
        message: "注销验证码已发送。",
      });
    }

    if (action === "confirm_phone_code") {
      const phone = await loadBoundPhoneForUser(session.userId);
      if (!phone) {
        return errorResponse(
          "当前账号还没有绑定手机号，无法通过短信验证码确认注销。",
          400,
          "phone_not_linked",
        );
      }

      await verifyPhoneOtp({
        phone,
        token: String(body?.code ?? ""),
        purpose: "account_deletion",
      });

      return jsonResponse(
        await scheduleAccountDeletion({
          userId: session.userId,
          confirmedBy: "phone",
        }),
      );
    }

    if (action === "confirm_wechat") {
      if (
        body?.platform !== "mini_program" && body?.platform !== "flutter_app"
      ) {
        return errorResponse("Invalid platform.", 400, "invalid_platform");
      }

      const boundUnionId = await loadBoundWeChatUnionId(session.userId);
      if (!boundUnionId) {
        return errorResponse(
          "当前账号还没有绑定微信，无法通过微信确认注销。",
          400,
          "wechat_not_linked",
        );
      }

      const identity = await exchangeWeChatCode({
        platform: body.platform,
        wechatCode: String(body?.wechatCode ?? ""),
      });
      if (identity.unionId !== boundUnionId) {
        return errorResponse(
          "本次微信授权与当前账号绑定的微信身份不一致。",
          400,
          "wechat_identity_mismatch",
        );
      }

      return jsonResponse(
        await scheduleAccountDeletion({
          userId: session.userId,
          confirmedBy: "wechat",
        }),
      );
    }

    return errorResponse("Invalid deletion action.", 400, "invalid_action");
  } catch (error) {
    return errorResponse(
      errorMessage(error, "发起账号注销失败。"),
      400,
      "account_request_deletion_failed",
    );
  }
});
