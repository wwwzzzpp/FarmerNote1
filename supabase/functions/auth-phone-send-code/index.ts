import { corsHeaders } from "../_shared/cors.ts";
import { enforceIpRateLimit } from "../_shared/rate-limit.ts";
import {
  errorMessage,
  errorResponse,
  jsonResponse,
  readJson,
} from "../_shared/response.ts";
import { normalizePhoneNumber, sendPhoneOtp } from "../_shared/phone.ts";

interface AuthPhoneSendCodeRequest {
  phone: string;
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
      endpoint: "auth-phone-send-code",
      request,
    });
    if (limited) {
      return limited;
    }

    const body = await readJson<AuthPhoneSendCodeRequest>(request);
    const phone = normalizePhoneNumber(String(body?.phone ?? ""));
    await sendPhoneOtp(phone);

    return jsonResponse({
      ok: true,
      phone,
    });
  } catch (error) {
    return errorResponse(
      errorMessage(error, "验证码发送失败。"),
      400,
      "phone_send_code_failed",
    );
  }
});
