import { corsHeaders } from "../_shared/cors.ts";
import { requireSession } from "../_shared/auth.ts";
import { enforceUserRateLimit } from "../_shared/rate-limit.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { getEnv, getOptionalEnv } from "../_shared/env.ts";
import { errorResponse, jsonResponse, readJson } from "../_shared/response.ts";

interface DownloadTicketRequest {
  objectPath: string;
}

function resolveStorageOrigin(request: Request): string {
  const explicitOrigin = getOptionalEnv("FARMERNOTE_PUBLIC_SUPABASE_URL");
  if (explicitOrigin) {
    return explicitOrigin.replace(/\/+$/, "");
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]
    ?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]
    ?.trim();
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, "");
  }

  try {
    return new URL(request.url).origin.replace(/\/+$/, "");
  } catch (_) {
    return getEnv("SUPABASE_URL").replace(/\/+$/, "");
  }
}

function resolveDownloadUrl(rawUrl: string, request: Request): string {
  const storageOrigin = resolveStorageOrigin(request);
  if (!rawUrl) {
    return "";
  }

  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    const parsed = new URL(rawUrl);
    return `${storageOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  return `${storageOrigin}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;
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
      endpoint: "media-download-ticket",
      session,
    });
    if (limited) {
      return limited;
    }

    const body = await readJson<DownloadTicketRequest>(request);
    const objectPath = String(body?.objectPath ?? "").trim();
    if (!objectPath) {
      return errorResponse("Missing object path.", 400, "missing_object_path");
    }
    if (!objectPath.startsWith(`${session.userId}/`)) {
      return errorResponse("Forbidden.", 403, "forbidden");
    }

    const client = createServiceClient();
    const { data, error } = await client.storage
      .from("entry-photos")
      .createSignedUrl(objectPath, 60 * 60);

    if (error || !data) {
      throw error ?? new Error("Unable to create signed download URL.");
    }

    return jsonResponse({
      objectPath,
      downloadUrl: resolveDownloadUrl(data.signedUrl, request),
      expiresInSeconds: 3600,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Unable to create download ticket.",
      400,
      "download_ticket_failed",
    );
  }
});
