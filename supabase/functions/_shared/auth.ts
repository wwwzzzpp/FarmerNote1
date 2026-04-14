import { getNumberEnv } from "./env.ts";
import { issueOpaqueToken, sha256Hex } from "./crypto.ts";
import { createServiceClient } from "./supabase.ts";

const accessTokenTtlSeconds = () =>
  getNumberEnv("FARMERNOTE_ACCESS_TOKEN_TTL_SECONDS", 60 * 60 * 24);
const refreshTokenTtlSeconds = () =>
  getNumberEnv("FARMERNOTE_REFRESH_TOKEN_TTL_SECONDS", 60 * 60 * 24 * 30);

export interface FarmerUserProfile {
  id: string;
  unionid: string;
  display_name: string;
  avatar_url: string;
}

export interface AuthenticatedSession {
  sessionId: string;
  userId: string;
  platform: "mini_program" | "flutter_app";
  accessToken: string;
  profile: FarmerUserProfile;
}

export interface EnsureFarmerUserInput {
  unionId: string;
  miniOpenId?: string;
  appOpenId?: string;
  displayName?: string;
  avatarUrl?: string;
}

function normalizeProfile(value: unknown): FarmerUserProfile {
  if (Array.isArray(value)) {
    if (!value.length) {
      throw new Error("Unable to load user profile.");
    }
    return normalizeProfile(value[0]);
  }

  if (!value || typeof value !== "object") {
    throw new Error("Unable to load user profile.");
  }

  const profile = value as Record<string, unknown>;
  return {
    id: String(profile.id ?? ""),
    unionid: String(profile.unionid ?? ""),
    display_name: String(profile.display_name ?? ""),
    avatar_url: String(profile.avatar_url ?? ""),
  };
}

function buildSessionResponse(
  profile: FarmerUserProfile,
  accessToken: string,
  refreshToken: string,
) {
  const now = Date.now();
  const accessExpiresAt = new Date(
    now + accessTokenTtlSeconds() * 1000,
  ).toISOString();
  const refreshExpiresAt = new Date(
    now + refreshTokenTtlSeconds() * 1000,
  ).toISOString();

  return {
    accessToken,
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt,
    userProfile: {
      id: profile.id,
      unionId: profile.unionid,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
    },
  };
}

export async function ensureFarmerUser(
  input: EnsureFarmerUserInput,
): Promise<string> {
  const client = createServiceClient();
  const { data: existingUser, error: selectError } = await client
    .from("farmer_users")
    .select("id, mini_openid, app_openid, display_name, avatar_url")
    .eq("unionid", input.unionId)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  const nextDisplayName = (input.displayName ?? "").trim();
  const nextAvatarUrl = (input.avatarUrl ?? "").trim();

  if (existingUser?.id) {
    const updatePayload: Record<string, string> = {};

    if (input.miniOpenId && input.miniOpenId !== existingUser.mini_openid) {
      updatePayload.mini_openid = input.miniOpenId;
    }
    if (input.appOpenId && input.appOpenId !== existingUser.app_openid) {
      updatePayload.app_openid = input.appOpenId;
    }
    if (nextDisplayName && nextDisplayName !== existingUser.display_name) {
      updatePayload.display_name = nextDisplayName;
    }
    if (nextAvatarUrl && nextAvatarUrl !== existingUser.avatar_url) {
      updatePayload.avatar_url = nextAvatarUrl;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await client
        .from("farmer_users")
        .update(updatePayload)
        .eq("id", existingUser.id as string);

      if (updateError) {
        throw updateError;
      }
    }

    return existingUser.id as string;
  }

  const insertPayload: Record<string, string> = {
    unionid: input.unionId,
  };
  if (input.miniOpenId) {
    insertPayload.mini_openid = input.miniOpenId;
  }
  if (input.appOpenId) {
    insertPayload.app_openid = input.appOpenId;
  }
  if (nextDisplayName) {
    insertPayload.display_name = nextDisplayName;
  }
  if (nextAvatarUrl) {
    insertPayload.avatar_url = nextAvatarUrl;
  }

  const { data: inserted, error: insertError } = await client
    .from("farmer_users")
    .insert(insertPayload)
    .select("id")
    .single();
  if (insertError || !inserted) {
    throw insertError ?? new Error("Unable to create user.");
  }

  return inserted.id as string;
}

export async function createSession(input: {
  userId: string;
  platform: "mini_program" | "flutter_app";
  deviceId?: string;
}): Promise<ReturnType<typeof buildSessionResponse>> {
  const client = createServiceClient();
  const accessToken = issueOpaqueToken("atk");
  const refreshToken = issueOpaqueToken("rtk");
  const accessTokenHash = await sha256Hex(accessToken);
  const refreshTokenHash = await sha256Hex(refreshToken);
  const accessExpiresAt = new Date(
    Date.now() + accessTokenTtlSeconds() * 1000,
  ).toISOString();
  const refreshExpiresAt = new Date(
    Date.now() + refreshTokenTtlSeconds() * 1000,
  ).toISOString();

  const { error: insertError } = await client.from("farmer_user_sessions")
    .insert({
      user_id: input.userId,
      platform: input.platform,
      device_id: input.deviceId ?? null,
      access_token_hash: accessTokenHash,
      refresh_token_hash: refreshTokenHash,
      access_expires_at: accessExpiresAt,
      refresh_expires_at: refreshExpiresAt,
    });

  if (insertError) {
    throw insertError;
  }

  const { data: user, error: userError } = await client
    .from("farmer_users")
    .select("id, unionid, display_name, avatar_url")
    .eq("id", input.userId)
    .single();

  if (userError || !user) {
    throw userError ?? new Error("Unable to load user profile.");
  }

  return buildSessionResponse(
    normalizeProfile(user),
    accessToken,
    refreshToken,
  );
}

export async function rotateSession(
  refreshToken: string,
): Promise<ReturnType<typeof buildSessionResponse>> {
  const client = createServiceClient();
  const refreshTokenHash = await sha256Hex(refreshToken);

  const { data: session, error } = await client
    .from("farmer_user_sessions")
    .select(
      "id, user_id, platform, refresh_expires_at, farmer_users!inner(id, unionid, display_name, avatar_url)",
    )
    .eq("refresh_token_hash", refreshTokenHash)
    .single();

  if (error || !session) {
    throw new Error("Invalid refresh token.");
  }

  const expiresAt = new Date(session.refresh_expires_at as string).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("Refresh token expired.");
  }

  const nextAccessToken = issueOpaqueToken("atk");
  const nextRefreshToken = issueOpaqueToken("rtk");
  const nextAccessTokenHash = await sha256Hex(nextAccessToken);
  const nextRefreshTokenHash = await sha256Hex(nextRefreshToken);
  const nextAccessExpiresAt = new Date(
    Date.now() + accessTokenTtlSeconds() * 1000,
  ).toISOString();
  const nextRefreshExpiresAt = new Date(
    Date.now() + refreshTokenTtlSeconds() * 1000,
  ).toISOString();

  const { error: updateError } = await client
    .from("farmer_user_sessions")
    .update({
      access_token_hash: nextAccessTokenHash,
      refresh_token_hash: nextRefreshTokenHash,
      access_expires_at: nextAccessExpiresAt,
      refresh_expires_at: nextRefreshExpiresAt,
    })
    .eq("id", session.id as string);

  if (updateError) {
    throw updateError;
  }

  return buildSessionResponse(
    normalizeProfile(session.farmer_users),
    nextAccessToken,
    nextRefreshToken,
  );
}

export async function requireSession(
  request: Request,
): Promise<AuthenticatedSession> {
  const authorization = request.headers.get("Authorization") ?? "";
  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix)) {
    throw new Error("Missing bearer token.");
  }

  const accessToken = authorization.slice(prefix.length).trim();
  if (!accessToken) {
    throw new Error("Missing bearer token.");
  }

  const accessTokenHash = await sha256Hex(accessToken);
  const client = createServiceClient();
  const { data: session, error } = await client
    .from("farmer_user_sessions")
    .select(
      "id, user_id, platform, access_expires_at, farmer_users!inner(id, unionid, display_name, avatar_url)",
    )
    .eq("access_token_hash", accessTokenHash)
    .single();

  if (error || !session) {
    throw new Error("Invalid access token.");
  }

  const expiresAt = new Date(session.access_expires_at as string).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("Access token expired.");
  }

  return {
    sessionId: session.id as string,
    userId: session.user_id as string,
    platform: session.platform as "mini_program" | "flutter_app",
    accessToken,
    profile: normalizeProfile(session.farmer_users),
  };
}
