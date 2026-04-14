import { corsHeaders } from '../_shared/cors.ts';
import { requireSession } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, readJson } from '../_shared/response.ts';

interface SyncPullRequest {
  lastSyncedVersion?: number;
  limit?: number;
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
}) {
  const { lastSyncedVersion, limit, entryVersions, taskVersions } = input;
  const entryHitLimit = entryVersions.length >= limit;
  const taskHitLimit = taskVersions.length >= limit;
  const entryMax = entryVersions.reduce(
    (max, value) => Math.max(max, value),
    lastSyncedVersion,
  );
  const taskMax = taskVersions.reduce(
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
  ].filter((value): value is number => value != null);
  if (saturatedFrontiers.length > 0) {
    return saturatedFrontiers.reduce(
      (min: number, value: number) => value < min ? value : min,
      saturatedFrontiers[0],
    );
  }

  return Math.max(lastSyncedVersion, entryMax, taskMax);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405, 'method_not_allowed');
  }

  try {
    const session = await requireSession(request);
    const body = await readJson<SyncPullRequest>(request);
    const lastSyncedVersion = Number(body?.lastSyncedVersion ?? 0);
    const limit = normalizeLimit(body?.limit);
    const client = createServiceClient();

    const { data: entries, error: entryError } = await client
      .from('entries')
      .select(
        'id, note_text, photo_object_path, source_platform, created_at, updated_at, client_updated_at, deleted_at, sync_version',
      )
      .eq('user_id', session.userId)
      .gt('sync_version', lastSyncedVersion)
      .order('sync_version', { ascending: true })
      .limit(limit);

    if (entryError) {
      throw entryError;
    }

    const { data: tasks, error: taskError } = await client
      .from('tasks')
      .select(
        'id, entry_id, due_at, status, completed_at, created_at, updated_at, client_updated_at, deleted_at, sync_version',
      )
      .eq('user_id', session.userId)
      .gt('sync_version', lastSyncedVersion)
      .order('sync_version', { ascending: true })
      .limit(limit);

    if (taskError) {
      throw taskError;
    }

    const entryList = (entries ?? []).map((entry) => ({
      id: entry.id,
      noteText: entry.note_text,
      photoObjectPath: entry.photo_object_path ?? '',
      sourcePlatform: entry.source_platform,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
      clientUpdatedAt: entry.client_updated_at,
      deletedAt: entry.deleted_at,
      syncVersion: entry.sync_version,
    }));

    const taskList = (tasks ?? []).map((task) => ({
      id: task.id,
      entryId: task.entry_id,
      dueAt: task.due_at,
      status: task.status,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      clientUpdatedAt: task.client_updated_at,
      deletedAt: task.deleted_at,
      syncVersion: task.sync_version,
    }));

    const nextSyncedVersion = buildNextSyncedVersion({
      lastSyncedVersion,
      limit,
      entryVersions: entryList.map((entry) => Number(entry.syncVersion ?? 0)),
      taskVersions: taskList.map((task) => Number(task.syncVersion ?? 0)),
    });

    return jsonResponse({
      entries: entryList,
      tasks: taskList,
      nextSyncedVersion,
      hasMore: entryList.length >= limit || taskList.length >= limit,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Sync pull failed.',
      400,
      'sync_pull_failed',
    );
  }
});
