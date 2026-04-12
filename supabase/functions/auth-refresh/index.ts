import { corsHeaders } from '../_shared/cors.ts';
import { rotateSession } from '../_shared/auth.ts';
import { errorResponse, jsonResponse, readJson } from '../_shared/response.ts';

interface RefreshRequest {
  refreshToken: string;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405, 'method_not_allowed');
  }

  try {
    const body = await readJson<RefreshRequest>(request);
    if (!body?.refreshToken?.trim()) {
      return errorResponse('Missing refresh token.', 400, 'missing_refresh_token');
    }

    return jsonResponse(await rotateSession(body.refreshToken));
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Refresh failed.',
      401,
      'refresh_failed',
    );
  }
});
