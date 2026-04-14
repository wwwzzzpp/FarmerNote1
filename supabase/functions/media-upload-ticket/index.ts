import { corsHeaders } from "../_shared/cors.ts";
import { requireSession } from "../_shared/auth.ts";
import { enforceUserRateLimit } from "../_shared/rate-limit.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { getEnv, getOptionalEnv } from "../_shared/env.ts";
import { errorResponse, jsonResponse, readJson } from "../_shared/response.ts";

interface UploadTicketRequest {
  contentType?: string;
  fileExtension?: string;
}

function normalizeExtension(extension: string, contentType: string): string {
  const cleaned = extension.replace(/^\./, "").trim().toLowerCase();
  if (cleaned) {
    return cleaned;
  }

  if (contentType === "image/png") {
    return "png";
  }
  if (contentType === "image/webp") {
    return "webp";
  }
  return "jpg";
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
      endpoint: "media-upload-ticket",
      session,
    });
    if (limited) {
      return limited;
    }

    const body = await readJson<UploadTicketRequest>(request);
    const contentType = (body?.contentType ?? "image/jpeg").trim()
      .toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      return errorResponse(
        "Unsupported image type.",
        400,
        "unsupported_media_type",
      );
    }

    const extension = normalizeExtension(
      body?.fileExtension ?? "",
      contentType,
    );
    const objectPath = `${session.userId}/${
      new Date().toISOString().slice(0, 10)
    }/${crypto.randomUUID()}.${extension}`;
    const client = createServiceClient();
    const { data, error } = await client.storage
      .from("entry-photos")
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      throw error ?? new Error("Unable to create signed upload URL.");
    }

    const storageOrigin = resolveStorageOrigin(request);
    const encodedPath = objectPath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return jsonResponse({
      objectPath,
      contentType,
      token: data.token,
      uploadUrl:
        `${storageOrigin}/storage/v1/object/upload/sign/entry-photos/${encodedPath}` +
        `?token=${encodeURIComponent(data.token)}`,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Unable to create upload ticket.",
      400,
      "upload_ticket_failed",
    );
  }
});
