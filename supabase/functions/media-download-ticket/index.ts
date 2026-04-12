import { corsHeaders } from '../_shared/cors.ts';
import { requireSession } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, readJson } from '../_shared/response.ts';

interface DownloadTicketRequest {
  objectPath: string;
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
    const body = await readJson<DownloadTicketRequest>(request);
    const objectPath = String(body?.objectPath ?? '').trim();
    if (!objectPath) {
      return errorResponse('Missing object path.', 400, 'missing_object_path');
    }
    if (!objectPath.startsWith(`${session.userId}/`)) {
      return errorResponse('Forbidden.', 403, 'forbidden');
    }

    const client = createServiceClient();
    const { data, error } = await client.storage
      .from('entry-photos')
      .createSignedUrl(objectPath, 60 * 60);

    if (error || !data) {
      throw error ?? new Error('Unable to create signed download URL.');
    }

    return jsonResponse({
      objectPath,
      downloadUrl: data.signedUrl,
      expiresInSeconds: 3600,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Unable to create download ticket.',
      400,
      'download_ticket_failed',
    );
  }
});
