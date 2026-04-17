import { corsHeaders } from "../_shared/cors.ts";
import { createSession, signInWithPhoneNumber } from "../_shared/auth.ts";
import { enforceIpRateLimit } from "../_shared/rate-limit.ts";
import {
  errorMessage,
  errorResponse,
  jsonResponse,
  readJson,
} from "../_shared/response.ts";
import { normalizePhoneNumber, verifyPhoneOtp } from "../_shared/phone.ts";

interface AuthPhoneLoginRequest {
  platform: "mini_program" | "flutter_app";
  phone: string;
  code: string;
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
    const limited = await enforceIpRateLimit({
      endpoint: "auth-phone-login",
      request,
    });
    if (limited) {
      return limited;
    }

    const body = await readJson<AuthPhoneLoginRequest>(request);
    if (
      !body ||
      (body.platform !== "mini_program" && body.platform !== "flutter_app")
    ) {
      return errorResponse("Invalid platform.", 400, "invalid_platform");
    }

    const phone = normalizePhoneNumber(String(body.phone ?? ""));
    const verifiedPhone = await verifyPhoneOtp({
      phone,
      token: String(body.code ?? ""),
    });
    const userId = await signInWithPhoneNumber({
      phone: verifiedPhone,
    });

    const session = await createSession({
      userId,
      platform: body.platform,
      deviceId: body.deviceId,
    });

    return jsonResponse(session);
  } catch (error) {
    return errorResponse(
      errorMessage(error, "手机号登录失败。"),
      400,
      "phone_login_failed",
    );
  }
});
