import { corsHeaders } from "../_shared/cors.ts";
import { requireSession } from "../_shared/auth.ts";
import { enforceUserRateLimit } from "../_shared/rate-limit.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import {
  errorMessage,
  errorResponse,
  jsonResponse,
  readJson,
} from "../_shared/response.ts";

interface SyncPullRequest {
  lastSyncedVersion?: number;
  limit?: number;
}

function readSchemaErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  if (error && typeof error === "object") {
    const payload = error as Record<string, unknown>;
    return [
      payload.message,
      payload.details,
      payload.hint,
      payload.code,
    ].filter((value): value is string => typeof value === "string")
      .join(" | ")
      .toLowerCase();
  }

  return "";
}

function isLegacyPlanEntryColumnError(error: unknown): boolean {
  const text = readSchemaErrorText(error);
  return (text.includes("plan_instance_id") ||
      text.includes("plan_action_id")) &&
    (text.includes("column") ||
      text.includes("schema cache") ||
      text.includes("could not find"));
}

function isLegacyPlanRelationError(
  error: unknown,
  relationName: string,
): boolean {
  const text = readSchemaErrorText(error);
  return text.includes(relationName) &&
    (text.includes("relation") ||
      text.includes("schema cache") ||
      text.includes("could not find") ||
      text.includes("does not exist"));
}

function normalizeLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 200;
  }
  return Math.min(Math.max(Number(value), 1), 500);
}

function buildNextSyncedVersion(input: {
  lastSyncedVersion: number;
  limit: number;
  entryVersions: number[];
  taskVersions: number[];
  planInstanceVersions: number[];
  planActionProgressVersions: number[];
}) {
  const {
    lastSyncedVersion,
    limit,
    entryVersions,
    taskVersions,
    planInstanceVersions,
    planActionProgressVersions,
  } = input;
  const entryHitLimit = entryVersions.length >= limit;
  const taskHitLimit = taskVersions.length >= limit;
  const planInstanceHitLimit = planInstanceVersions.length >= limit;
  const planActionProgressHitLimit = planActionProgressVersions.length >= limit;
  const entryMax = entryVersions.reduce(
    (max, value) => Math.max(max, value),
    lastSyncedVersion,
  );
  const taskMax = taskVersions.reduce(
    (max, value) => Math.max(max, value),
    lastSyncedVersion,
  );
  const planInstanceMax = planInstanceVersions.reduce(
    (max, value) => Math.max(max, value),
    lastSyncedVersion,
  );
  const planActionProgressMax = planActionProgressVersions.reduce(
    (max, value) => Math.max(max, value),
    lastSyncedVersion,
  );

  // When one table fills the page and the other does not, advancing to the
  // overall max can skip unseen rows from the slower table. We therefore advance
  // to the smallest "frontier" among the saturated streams and tolerate
  // duplicate rows on the next pull.
  const saturatedFrontiers = [
    entryHitLimit ? entryMax : null,
    taskHitLimit ? taskMax : null,
    planInstanceHitLimit ? planInstanceMax : null,
    planActionProgressHitLimit ? planActionProgressMax : null,
  ].filter((value): value is number => value != null);
  if (saturatedFrontiers.length > 0) {
    return saturatedFrontiers.reduce(
      (min: number, value: number) => value < min ? value : min,
      saturatedFrontiers[0],
    );
  }

  return Math.max(
    lastSyncedVersion,
    entryMax,
    taskMax,
    planInstanceMax,
    planActionProgressMax,
  );
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
      endpoint: "sync-pull",
      session,
    });
    if (limited) {
      return limited;
    }

    const body = await readJson<SyncPullRequest>(request);
    const lastSyncedVersion = Number(body?.lastSyncedVersion ?? 0);
    const limit = normalizeLimit(body?.limit);
    const client = createServiceClient();

    let entries: Record<string, unknown>[] = [];
    const { data: entriesWithPlan, error: entryError } = await client
      .from("entries")
      .select(
        "id, note_text, photo_object_path, source_platform, plan_instance_id, plan_action_id, created_at, updated_at, client_updated_at, deleted_at, sync_version",
      )
      .eq("user_id", session.userId)
      .gt("sync_version", lastSyncedVersion)
      .order("sync_version", { ascending: true })
      .limit(limit);

    if (entryError && isLegacyPlanEntryColumnError(entryError)) {
      const { data: fallbackEntries, error: fallbackEntryError } = await client
        .from("entries")
        .select(
          "id, note_text, photo_object_path, source_platform, created_at, updated_at, client_updated_at, deleted_at, sync_version",
        )
        .eq("user_id", session.userId)
        .gt("sync_version", lastSyncedVersion)
        .order("sync_version", { ascending: true })
        .limit(limit);

      if (fallbackEntryError) {
        throw fallbackEntryError;
      }

      entries = (fallbackEntries ?? []) as Record<string, unknown>[];
    } else if (entryError) {
      throw entryError;
    } else {
      entries = (entriesWithPlan ?? []) as Record<string, unknown>[];
    }

    const { data: tasks, error: taskError } = await client
      .from("tasks")
      .select(
        "id, entry_id, due_at, status, completed_at, created_at, updated_at, client_updated_at, deleted_at, sync_version",
      )
      .eq("user_id", session.userId)
      .gt("sync_version", lastSyncedVersion)
      .order("sync_version", { ascending: true })
      .limit(limit);

    if (taskError) {
      throw taskError;
    }

    let cropPlanInstances: Record<string, unknown>[] = [];
    const { data: cropPlanInstancesData, error: cropPlanInstanceError } =
      await client
        .from("crop_plan_instances")
        .select(
          "id, crop_code, region_code, anchor_date, status, created_at, updated_at, client_updated_at, deleted_at, sync_version",
        )
        .eq("user_id", session.userId)
        .gt("sync_version", lastSyncedVersion)
        .order("sync_version", { ascending: true })
        .limit(limit);

    if (
      cropPlanInstanceError &&
      !isLegacyPlanRelationError(cropPlanInstanceError, "crop_plan_instances")
    ) {
      throw cropPlanInstanceError;
    }
    cropPlanInstances = (cropPlanInstancesData ?? []) as Record<string, unknown>[];

    let cropPlanActionProgresses: Record<string, unknown>[] = [];
    const {
      data: cropPlanActionProgressesData,
      error: cropPlanActionProgressError,
    } = await client
      .from("crop_plan_action_progresses")
      .select(
        "id, plan_instance_id, action_id, status, completed_at, created_at, updated_at, client_updated_at, deleted_at, sync_version",
      )
      .eq("user_id", session.userId)
      .gt("sync_version", lastSyncedVersion)
      .order("sync_version", { ascending: true })
      .limit(limit);

    if (
      cropPlanActionProgressError &&
      !isLegacyPlanRelationError(
        cropPlanActionProgressError,
        "crop_plan_action_progresses",
      )
    ) {
      throw cropPlanActionProgressError;
    }
    cropPlanActionProgresses =
      (cropPlanActionProgressesData ?? []) as Record<string, unknown>[];

    const entryList = entries.map((entry) => ({
      id: String(entry.id ?? ""),
      noteText: String(entry.note_text ?? ""),
      photoObjectPath: String(entry.photo_object_path ?? ""),
      sourcePlatform: String(entry.source_platform ?? ""),
      planInstanceId: String(entry.plan_instance_id ?? ""),
      planActionId: String(entry.plan_action_id ?? ""),
      createdAt: String(entry.created_at ?? ""),
      updatedAt: String(entry.updated_at ?? ""),
      clientUpdatedAt: String(entry.client_updated_at ?? ""),
      deletedAt: typeof entry.deleted_at === "string" ? entry.deleted_at : null,
      syncVersion: Number(entry.sync_version ?? 0),
    }));

    const taskList = ((tasks ?? []) as Record<string, unknown>[]).map((task) => ({
      id: String(task.id ?? ""),
      entryId: String(task.entry_id ?? ""),
      dueAt: String(task.due_at ?? ""),
      status: String(task.status ?? "pending"),
      completedAt: typeof task.completed_at === "string"
        ? task.completed_at
        : null,
      createdAt: String(task.created_at ?? ""),
      updatedAt: String(task.updated_at ?? ""),
      clientUpdatedAt: String(task.client_updated_at ?? ""),
      deletedAt: typeof task.deleted_at === "string" ? task.deleted_at : null,
      syncVersion: Number(task.sync_version ?? 0),
    }));

    const cropPlanInstanceList = cropPlanInstances.map((plan) => ({
      id: String(plan.id ?? ""),
      cropCode: String(plan.crop_code ?? ""),
      regionCode: String(plan.region_code ?? ""),
      anchorDate: String(plan.anchor_date ?? ""),
      status: String(plan.status ?? "active"),
      createdAt: String(plan.created_at ?? ""),
      updatedAt: String(plan.updated_at ?? ""),
      clientUpdatedAt: String(plan.client_updated_at ?? ""),
      deletedAt: typeof plan.deleted_at === "string" ? plan.deleted_at : null,
      syncVersion: Number(plan.sync_version ?? 0),
    }));

    const cropPlanActionProgressList = cropPlanActionProgresses.map(
      (progress) => ({
        id: String(progress.id ?? ""),
        planInstanceId: String(progress.plan_instance_id ?? ""),
        actionId: String(progress.action_id ?? ""),
        status: String(progress.status ?? "pending"),
        completedAt: typeof progress.completed_at === "string"
          ? progress.completed_at
          : null,
        createdAt: String(progress.created_at ?? ""),
        updatedAt: String(progress.updated_at ?? ""),
        clientUpdatedAt: String(progress.client_updated_at ?? ""),
        deletedAt: typeof progress.deleted_at === "string"
          ? progress.deleted_at
          : null,
        syncVersion: Number(progress.sync_version ?? 0),
      }),
    );

    const nextSyncedVersion = buildNextSyncedVersion({
      lastSyncedVersion,
      limit,
      entryVersions: entryList.map((entry) => Number(entry.syncVersion ?? 0)),
      taskVersions: taskList.map((task) => Number(task.syncVersion ?? 0)),
      planInstanceVersions: cropPlanInstanceList.map((plan) =>
        Number(plan.syncVersion ?? 0)
      ),
      planActionProgressVersions: cropPlanActionProgressList.map((progress) =>
        Number(progress.syncVersion ?? 0)
      ),
    });

    return jsonResponse({
      entries: entryList,
      tasks: taskList,
      cropPlanInstances: cropPlanInstanceList,
      cropPlanActionProgresses: cropPlanActionProgressList,
      nextSyncedVersion,
      hasMore:
        entryList.length >= limit ||
        taskList.length >= limit ||
        cropPlanInstanceList.length >= limit ||
        cropPlanActionProgressList.length >= limit,
    });
  } catch (error) {
    return errorResponse(
      errorMessage(error, "Sync pull failed."),
      400,
      "sync_pull_failed",
    );
  }
});
