import { corsHeaders } from '../_shared/cors.ts';
import { createSession } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, readJson } from '../_shared/response.ts';
import { exchangeWeChatCode } from '../_shared/wechat.ts';

interface AuthLoginRequest {
  platform: 'mini_program' | 'flutter_app';
  wechatCode: string;
  deviceId?: string;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405, 'method_not_allowed');
  }

  try {
    const body = await readJson<AuthLoginRequest>(request);
    if (
      !body ||
      (body.platform !== 'mini_program' && body.platform !== 'flutter_app')
    ) {
      return errorResponse('Invalid platform.', 400, 'invalid_platform');
    }

    const identity = await exchangeWeChatCode({
      platform: body.platform,
      wechatCode: body.wechatCode,
    });

    const client = createServiceClient();
    const { data: existingUser } = await client
      .from('farmer_users')
      .select('id, unionid, mini_openid, app_openid')
      .eq('unionid', identity.unionId)
      .maybeSingle();

    let userId = existingUser?.id as string | undefined;
    if (userId) {
      const updatePayload =
        identity.platform === 'mini_program'
          ? { mini_openid: identity.openId }
          : { app_openid: identity.openId };
      const { error: updateError } = await client
        .from('farmer_users')
        .update(updatePayload)
        .eq('id', userId);
      if (updateError) {
        throw updateError;
      }
    } else {
      const insertPayload =
        identity.platform === 'mini_program'
          ? { unionid: identity.unionId, mini_openid: identity.openId }
          : { unionid: identity.unionId, app_openid: identity.openId };
      const { data: inserted, error: insertError } = await client
        .from('farmer_users')
        .insert(insertPayload)
        .select('id')
        .single();
      if (insertError || !inserted) {
        throw insertError ?? new Error('Unable to create user.');
      }
      userId = inserted.id as string;
    }

    const session = await createSession({
      userId,
      platform: body.platform,
      deviceId: body.deviceId,
    });

    return jsonResponse(session);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Login failed.',
      400,
      'wechat_login_failed',
    );
  }
});
