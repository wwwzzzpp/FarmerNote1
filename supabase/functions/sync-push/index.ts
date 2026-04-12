import { corsHeaders } from '../_shared/cors.ts';
import { requireSession } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, readJson } from '../_shared/response.ts';

type MutationEntity = 'entry' | 'task';
type MutationOperation = 'upsert' | 'delete';

interface SyncMutation {
  entityType: MutationEntity;
  operation: MutationOperation;
  payload: Record<string, unknown>;
  clientMutationId: string;
  clientUpdatedAt: string;
}

interface SyncPushRequest {
  mutations: SyncMutation[];
}

function toIsoOrNow(value: unknown): string {
  const date = value ? new Date(String(value)) : new Date();
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

function isIncomingNewer(
  incomingClientUpdatedAt: string,
  existingClientUpdatedAt?: string,
): boolean {
  if (!existingClientUpdatedAt) {
    return true;
  }

  return (
    new Date(incomingClientUpdatedAt).getTime() >=
    new Date(existingClientUpdatedAt).getTime()
  );
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
    const body = await readJson<SyncPushRequest>(request);
    const mutations = Array.isArray(body?.mutations) ? body.mutations : [];
    const client = createServiceClient();
    const appliedMutationIds: string[] = [];
    const ignoredMutationIds: string[] = [];

    for (const mutation of mutations.slice(0, 200)) {
      if (!mutation?.clientMutationId) {
        continue;
      }

      const clientUpdatedAt = toIsoOrNow(mutation.clientUpdatedAt);

      if (mutation.entityType === 'entry') {
        const payload = mutation.payload ?? {};
        const entryId = String(payload.id ?? '');
        if (!entryId) {
          ignoredMutationIds.push(mutation.clientMutationId);
          continue;
        }

        const { data: existing } = await client
          .from('entries')
          .select(
            'id, created_at, client_updated_at, photo_object_path, deleted_at',
          )
          .eq('id', entryId)
          .eq('user_id', session.userId)
          .maybeSingle();

        if (
          existing &&
          !isIncomingNewer(clientUpdatedAt, existing.client_updated_at as string)
        ) {
          ignoredMutationIds.push(mutation.clientMutationId);
          continue;
        }

        const nextDeletedAt =
          mutation.operation === 'delete'
            ? toIsoOrNow(payload.deletedAt ?? clientUpdatedAt)
            : payload.deletedAt
            ? toIsoOrNow(payload.deletedAt)
            : null;
        const nextPhotoObjectPath =
          nextDeletedAt == null ? String(payload.photoObjectPath ?? '') : '';

        if (
          existing?.photo_object_path &&
          existing.photo_object_path !== nextPhotoObjectPath
        ) {
          await client.storage
            .from('entry-photos')
            .remove([existing.photo_object_path as string]);
        }

        const { error } = await client.from('entries').upsert(
          {
            id: entryId,
            user_id: session.userId,
            note_text: String(payload.noteText ?? ''),
            photo_object_path: nextPhotoObjectPath || null,
            source_platform: String(payload.sourcePlatform ?? session.platform),
            created_at: existing?.created_at ?? toIsoOrNow(payload.createdAt),
            client_updated_at: clientUpdatedAt,
            deleted_at: nextDeletedAt,
          },
          { onConflict: 'id' },
        );

        if (error) {
          throw error;
        }

        appliedMutationIds.push(mutation.clientMutationId);
        continue;
      }

      if (mutation.entityType === 'task') {
        const payload = mutation.payload ?? {};
        const taskId = String(payload.id ?? '');
        if (!taskId) {
          ignoredMutationIds.push(mutation.clientMutationId);
          continue;
        }

        const { data: existing } = await client
          .from('tasks')
          .select('id, created_at, client_updated_at')
          .eq('id', taskId)
          .eq('user_id', session.userId)
          .maybeSingle();

        if (
          existing &&
          !isIncomingNewer(clientUpdatedAt, existing.client_updated_at as string)
        ) {
          ignoredMutationIds.push(mutation.clientMutationId);
          continue;
        }

        const nextDeletedAt =
          mutation.operation === 'delete'
            ? toIsoOrNow(payload.deletedAt ?? clientUpdatedAt)
            : payload.deletedAt
            ? toIsoOrNow(payload.deletedAt)
            : null;

        const { error } = await client.from('tasks').upsert(
          {
            id: taskId,
            user_id: session.userId,
            entry_id: String(payload.entryId ?? ''),
            due_at: toIsoOrNow(payload.dueAt),
            status: String(payload.status ?? 'pending'),
            completed_at: payload.completedAt
              ? toIsoOrNow(payload.completedAt)
              : null,
            created_at: existing?.created_at ?? toIsoOrNow(payload.createdAt),
            client_updated_at: clientUpdatedAt,
            deleted_at: nextDeletedAt,
          },
          { onConflict: 'id' },
        );

        if (error) {
          throw error;
        }

        appliedMutationIds.push(mutation.clientMutationId);
        continue;
      }

      ignoredMutationIds.push(mutation.clientMutationId);
    }

    return jsonResponse({
      appliedMutationIds,
      ignoredMutationIds,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Sync push failed.',
      400,
      'sync_push_failed',
    );
  }
});
