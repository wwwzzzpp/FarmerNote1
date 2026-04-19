import { getAccountDeletionStatus, requireSession } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  errorMessage,
  errorResponse,
  jsonResponse,
} from "../_shared/response.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return errorResponse("Method not allowed.", 405, "method_not_allowed");
  }

  try {
    const session = await requireSession(request);
    return jsonResponse(await getAccountDeletionStatus(session.userId));
  } catch (error) {
    return errorResponse(
      errorMessage(error, "加载账号注销状态失败。"),
      400,
      "account_deletion_status_failed",
    );
  }
});
