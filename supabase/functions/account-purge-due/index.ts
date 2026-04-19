import { getEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  errorMessage,
  errorResponse,
  jsonResponse,
} from "../_shared/response.ts";

interface DueDeletionUser {
  id: string;
}

interface UserPhotoRow {
  photo_object_path: string | null;
}

function isAuthorized(request: Request): boolean {
  const authorization = request.headers.get("Authorization") ?? "";
  return authorization === `Bearer ${getEnv("FARMERNOTE_ACCOUNT_PURGE_TOKEN")}`;
}

async function removeUserMedia(userId: string): Promise<number> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("entries")
    .select("photo_object_path")
    .eq("user_id", userId)
    .not("photo_object_path", "is", null);

  if (error) {
    throw error;
  }

  const objectPaths = Array.from(
    new Set(
      (data ?? [])
        .map((row) =>
          String((row as UserPhotoRow).photo_object_path ?? "").trim()
        )
        .filter(Boolean),
    ),
  );

  if (!objectPaths.length) {
    return 0;
  }

  const { error: removeError } = await client.storage
    .from("entry-photos")
    .remove(objectPaths);

  if (removeError) {
    throw removeError;
  }

  return objectPaths.length;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return errorResponse("Method not allowed.", 405, "method_not_allowed");
  }

  if (!isAuthorized(request)) {
    return errorResponse("Unauthorized.", 401, "unauthorized");
  }

  try {
    const client = createServiceClient();
    const { data, error } = await client
      .from("farmer_users")
      .select("id")
      .not("deletion_requested_at", "is", null)
      .is("deletion_completed_at", null)
      .lte("deletion_scheduled_for", new Date().toISOString())
      .limit(100);

    if (error) {
      throw error;
    }

    const dueUsers = (data ?? []) as DueDeletionUser[];
    let removedObjectCount = 0;

    for (const user of dueUsers) {
      removedObjectCount += await removeUserMedia(String(user.id ?? ""));
      const { error: deleteError } = await client
        .from("farmer_users")
        .delete()
        .eq("id", user.id);

      if (deleteError) {
        throw deleteError;
      }
    }

    return jsonResponse({
      purgedUserCount: dueUsers.length,
      removedObjectCount,
      userIds: dueUsers.map((item) => item.id),
    });
  } catch (error) {
    return errorResponse(
      errorMessage(error, "清理待删除账号失败。"),
      400,
      "account_purge_due_failed",
    );
  }
});
