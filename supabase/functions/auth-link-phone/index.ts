import {
  linkPhoneIdentityToUser,
  replaceSession,
  requireSession,
} from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { normalizePhoneNumber, verifyPhoneOtp } from "../_shared/phone.ts";
import { enforceUserRateLimit } from "../_shared/rate-limit.ts";
import {
  errorMessage,
  errorResponse,
  jsonResponse,
  readJson,
} from "../_shared/response.ts";

interface AuthLinkPhoneRequest {
  phone: string;
  code: string;
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
      endpoint: "auth-link-phone",
      session,
    });
    if (limited) {
      return limited;
    }

    const body = await readJson<AuthLinkPhoneRequest>(request);
    const phone = normalizePhoneNumber(String(body?.phone ?? ""));
    const verifiedPhone = await verifyPhoneOtp({
      phone,
      token: String(body?.code ?? ""),
    });
    const userId = await linkPhoneIdentityToUser({
      currentUserId: session.userId,
      phone: verifiedPhone,
    });

    const nextSession = await replaceSession({
      session,
      userId,
    });

    return jsonResponse(nextSession);
  } catch (error) {
    return errorResponse(
      errorMessage(error, "手机号绑定失败。"),
      400,
      "link_phone_failed",
    );
  }
});
