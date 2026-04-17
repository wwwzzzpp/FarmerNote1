import { getNumberEnv } from "./env.ts";
import { issueOpaqueToken, sha256Hex } from "./crypto.ts";
import { createServiceClient } from "./supabase.ts";

const accessTokenTtlSeconds = () =>
  getNumberEnv("FARMERNOTE_ACCESS_TOKEN_TTL_SECONDS", 60 * 60 * 24);
const refreshTokenTtlSeconds = () =>
  getNumberEnv("FARMERNOTE_REFRESH_TOKEN_TTL_SECONDS", 60 * 60 * 24 * 30);

const userProfileSelect =
  "id, unionid, display_name, avatar_url, farmer_user_identities(provider, identity_key)";
const sessionProfileSelect =
  `id, user_id, platform, device_id, access_expires_at, farmer_users!inner(${userProfileSelect})`;
const refreshSessionSelect =
  `id, user_id, platform, device_id, refresh_expires_at, farmer_users!inner(${userProfileSelect})`;

type IdentityProvider =
  | "wechat_unionid"
  | "wechat_mini_openid"
  | "wechat_app_openid"
  | "phone";

type LinkedProvider = "wechat" | "phone";

interface UserIdentityRow {
  provider: string;
  identity_key: string;
}

interface MergeSnapshot {
  createdAt: string;
  dataCount: number;
  hasPhone: boolean;
  hasWeChat: boolean;
}

export interface FarmerUserProfile {
  id: string;
  unionid: string;
  display_name: string;
  avatar_url: string;
  linked_providers: LinkedProvider[];
  masked_phone: string;
}

export interface AuthenticatedSession {
  sessionId: string;
  userId: string;
  platform: "mini_program" | "flutter_app";
  deviceId: string;
  accessToken: string;
  profile: FarmerUserProfile;
}

function normalizeIdentityRows(value: unknown): UserIdentityRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const identity = item as Record<string, unknown>;
      return {
        provider: String(identity.provider ?? ""),
        identity_key: String(identity.identity_key ?? ""),
      };
    })
    .filter((item) => item.provider && item.identity_key);
}

function linkedProviderForIdentity(provider: string): LinkedProvider | "" {
  if (provider === "phone") {
    return "phone";
  }
  if (
    provider === "wechat_unionid" ||
    provider === "wechat_mini_openid" ||
    provider === "wechat_app_openid"
  ) {
    return "wechat";
  }
  return "";
}

function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D+/g, "");
  if (digits.length < 7) {
    return phone;
  }

  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
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
  const identities = normalizeIdentityRows(profile.farmer_user_identities);
  const linkedProviders = new Set<LinkedProvider>();
  let derivedUnionId = String(profile.unionid ?? "");
  let maskedPhone = "";

  for (const identity of identities) {
    const linked = linkedProviderForIdentity(identity.provider);
    if (linked) {
      linkedProviders.add(linked);
    }

    if (!derivedUnionId && identity.provider === "wechat_unionid") {
      derivedUnionId = identity.identity_key;
    }

    if (!maskedPhone && identity.provider === "phone") {
      maskedPhone = maskPhoneNumber(identity.identity_key);
    }
  }

  return {
    id: String(profile.id ?? ""),
    unionid: derivedUnionId,
    display_name: String(profile.display_name ?? ""),
    avatar_url: String(profile.avatar_url ?? ""),
    linked_providers: Array.from(linkedProviders).sort(),
    masked_phone: maskedPhone,
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
      linkedProviders: profile.linked_providers,
      maskedPhone: profile.masked_phone,
    },
  };
}

function normalizeUuid(value: unknown): string {
  return String(value ?? "").trim();
}

async function loadUserProfile(userId: string): Promise<FarmerUserProfile> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("farmer_users")
    .select(userProfileSelect)
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Unable to load user profile.");
  }

  return normalizeProfile(data);
}

async function findIdentityOwner(
  provider: IdentityProvider,
  identityKey: string,
): Promise<string> {
  const client = createServiceClient();
  const { data, error } = await client
    .from("farmer_user_identities")
    .select("user_id")
    .eq("provider", provider)
    .eq("identity_key", identityKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeUuid(data?.user_id);
}

async function createFarmerUserRecord(input?: {
  unionId?: string;
  miniOpenId?: string;
  appOpenId?: string;
  displayName?: string;
  avatarUrl?: string;
}): Promise<string> {
  const payload: Record<string, string | null> = {
    unionid: input?.unionId?.trim() || null,
    mini_openid: input?.miniOpenId?.trim() || null,
    app_openid: input?.appOpenId?.trim() || null,
    display_name: input?.displayName?.trim() || "",
    avatar_url: input?.avatarUrl?.trim() || "",
  };

  const client = createServiceClient();
  const { data, error } = await client
    .from("farmer_users")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create user.");
  }

  return String(data.id ?? "");
}

function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === "object" &&
    String((error as Record<string, unknown>).code ?? "") === "23505";
}

async function updateFarmerUserRecord(
  userId: string,
  input: {
    unionId?: string;
    miniOpenId?: string;
    appOpenId?: string;
    displayName?: string;
    avatarUrl?: string;
  },
): Promise<void> {
  const payload: Record<string, string> = {};
  const displayName = input.displayName?.trim() ?? "";
  const avatarUrl = input.avatarUrl?.trim() ?? "";
  const unionId = input.unionId?.trim() ?? "";
  const miniOpenId = input.miniOpenId?.trim() ?? "";
  const appOpenId = input.appOpenId?.trim() ?? "";

  if (displayName) {
    payload.display_name = displayName;
  }
  if (avatarUrl) {
    payload.avatar_url = avatarUrl;
  }
  if (unionId) {
    payload.unionid = unionId;
  }
  if (miniOpenId) {
    payload.mini_openid = miniOpenId;
  }
  if (appOpenId) {
    payload.app_openid = appOpenId;
  }

  if (!Object.keys(payload).length) {
    return;
  }

  const client = createServiceClient();
  const { error } = await client
    .from("farmer_users")
    .update(payload)
    .eq("id", userId);

  if (!error) {
    return;
  }

  if (!isUniqueViolation(error)) {
    throw error;
  }

  delete payload.unionid;
  delete payload.mini_openid;
  delete payload.app_openid;

  if (!Object.keys(payload).length) {
    return;
  }

  const { error: fallbackError } = await client
    .from("farmer_users")
    .update(payload)
    .eq("id", userId);

  if (fallbackError) {
    throw fallbackError;
  }
}

async function claimIdentity(input: {
  userId: string;
  provider: IdentityProvider;
  identityKey?: string;
}): Promise<{ ownerUserId: string; claimed: boolean }> {
  const identityKey = String(input.identityKey ?? "").trim();
  if (!identityKey) {
    return {
      ownerUserId: input.userId,
      claimed: false,
    };
  }

  const existingOwner = await findIdentityOwner(input.provider, identityKey);
  if (existingOwner) {
    return {
      ownerUserId: existingOwner,
      claimed: existingOwner === input.userId,
    };
  }

  const client = createServiceClient();
  const { error } = await client.from("farmer_user_identities").insert({
    user_id: input.userId,
    provider: input.provider,
    identity_key: identityKey,
  });

  if (!error) {
    return {
      ownerUserId: input.userId,
      claimed: true,
    };
  }

  if (!isUniqueViolation(error)) {
    throw error;
  }

  const ownerAfterRace = await findIdentityOwner(input.provider, identityKey);
  if (!ownerAfterRace) {
    throw error;
  }

  return {
    ownerUserId: ownerAfterRace,
    claimed: ownerAfterRace === input.userId,
  };
}

async function loadMergeSnapshot(userId: string): Promise<MergeSnapshot> {
  const client = createServiceClient();

  const [
    userResult,
    identityResult,
    entryResult,
    taskResult,
  ] = await Promise.all([
    client.from("farmer_users").select("created_at").eq("id", userId)
      .maybeSingle(),
    client.from("farmer_user_identities").select("provider, identity_key").eq(
      "user_id",
      userId,
    ),
    client.from("entries").select("*", { count: "exact", head: true }).eq(
      "user_id",
      userId,
    ),
    client.from("tasks").select("*", { count: "exact", head: true }).eq(
      "user_id",
      userId,
    ),
  ]);

  if (userResult.error || !userResult.data) {
    throw userResult.error ?? new Error("Unable to load merge snapshot.");
  }
  if (identityResult.error) {
    throw identityResult.error;
  }
  if (entryResult.error) {
    throw entryResult.error;
  }
  if (taskResult.error) {
    throw taskResult.error;
  }

  const providers = normalizeIdentityRows(identityResult.data).map((item) =>
    linkedProviderForIdentity(item.provider)
  );

  return {
    createdAt: String(userResult.data.created_at ?? ""),
    dataCount: Number(entryResult.count ?? 0) + Number(taskResult.count ?? 0),
    hasPhone: providers.includes("phone"),
    hasWeChat: providers.includes("wechat"),
  };
}

async function chooseMergeWinner(
  currentUserId: string,
  otherUserId: string,
): Promise<string> {
  if (currentUserId === otherUserId) {
    return currentUserId;
  }

  const [currentSnapshot, otherSnapshot] = await Promise.all([
    loadMergeSnapshot(currentUserId),
    loadMergeSnapshot(otherUserId),
  ]);

  if (currentSnapshot.hasPhone && currentSnapshot.hasWeChat) {
    return currentUserId;
  }

  if (currentSnapshot.dataCount !== otherSnapshot.dataCount) {
    return currentSnapshot.dataCount > otherSnapshot.dataCount
      ? currentUserId
      : otherUserId;
  }

  const currentCreatedAt = new Date(currentSnapshot.createdAt).getTime();
  const otherCreatedAt = new Date(otherSnapshot.createdAt).getTime();

  if (Number.isFinite(currentCreatedAt) && Number.isFinite(otherCreatedAt)) {
    return currentCreatedAt <= otherCreatedAt ? currentUserId : otherUserId;
  }

  return currentUserId;
}

async function mergeUsers(input: {
  currentUserId: string;
  otherUserId: string;
}): Promise<string> {
  if (!input.otherUserId || input.currentUserId === input.otherUserId) {
    return input.currentUserId;
  }

  const winnerUserId = await chooseMergeWinner(
    input.currentUserId,
    input.otherUserId,
  );
  const loserUserId = winnerUserId === input.currentUserId
    ? input.otherUserId
    : input.currentUserId;

  const client = createServiceClient();
  const { error } = await client.rpc("farmernote_merge_users", {
    winner_user_id: winnerUserId,
    loser_user_id: loserUserId,
  });

  if (error) {
    throw error;
  }

  return winnerUserId;
}

export async function signInWithPhoneNumber(input: {
  phone: string;
}): Promise<string> {
  const phone = String(input.phone ?? "").trim();
  if (!phone) {
    throw new Error("Missing phone number.");
  }

  let userId = await findIdentityOwner("phone", phone);
  if (!userId) {
    userId = await createFarmerUserRecord();
  }

  const claim = await claimIdentity({
    userId,
    provider: "phone",
    identityKey: phone,
  });

  if (claim.ownerUserId && claim.ownerUserId !== userId) {
    userId = await mergeUsers({
      currentUserId: userId,
      otherUserId: claim.ownerUserId,
    });
  }

  return userId;
}

export async function linkPhoneIdentityToUser(input: {
  currentUserId: string;
  phone: string;
}): Promise<string> {
  const phone = String(input.phone ?? "").trim();
  if (!phone) {
    throw new Error("Missing phone number.");
  }

  const claim = await claimIdentity({
    userId: input.currentUserId,
    provider: "phone",
    identityKey: phone,
  });

  if (claim.ownerUserId === input.currentUserId) {
    return input.currentUserId;
  }

  return mergeUsers({
    currentUserId: input.currentUserId,
    otherUserId: claim.ownerUserId,
  });
}

export async function signInWithWeChatIdentity(input: {
  unionId: string;
  platform: "mini_program" | "flutter_app";
  openId: string;
  displayName?: string;
  avatarUrl?: string;
}): Promise<string> {
  const unionId = String(input.unionId ?? "").trim();
  if (!unionId) {
    throw new Error("Missing WeChat unionid.");
  }

  const openId = String(input.openId ?? "").trim();
  const openIdProvider: IdentityProvider = input.platform === "mini_program"
    ? "wechat_mini_openid"
    : "wechat_app_openid";

  let userId = await findIdentityOwner("wechat_unionid", unionId);
  if (!userId && openId) {
    userId = await findIdentityOwner(openIdProvider, openId);
  }
  if (!userId) {
    userId = await createFarmerUserRecord({
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
    });
  }

  return linkWeChatIdentityToUser({
    currentUserId: userId,
    unionId,
    miniOpenId: input.platform === "mini_program" ? openId : "",
    appOpenId: input.platform === "flutter_app" ? openId : "",
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
  });
}

export async function linkWeChatIdentityToUser(input: {
  currentUserId: string;
  unionId: string;
  miniOpenId?: string;
  appOpenId?: string;
  displayName?: string;
  avatarUrl?: string;
}): Promise<string> {
  let activeUserId = input.currentUserId;
  const claims = [
    {
      provider: "wechat_unionid" as const,
      identityKey: input.unionId,
    },
    {
      provider: "wechat_mini_openid" as const,
      identityKey: input.miniOpenId,
    },
    {
      provider: "wechat_app_openid" as const,
      identityKey: input.appOpenId,
    },
  ];

  for (const claimInput of claims) {
    const claim = await claimIdentity({
      userId: activeUserId,
      provider: claimInput.provider,
      identityKey: claimInput.identityKey,
    });

    if (claim.ownerUserId && claim.ownerUserId !== activeUserId) {
      activeUserId = await mergeUsers({
        currentUserId: activeUserId,
        otherUserId: claim.ownerUserId,
      });
    }
  }

  await updateFarmerUserRecord(activeUserId, {
    unionId: input.unionId,
    miniOpenId: input.miniOpenId,
    appOpenId: input.appOpenId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
  });

  return activeUserId;
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

  const profile = await loadUserProfile(input.userId);
  return buildSessionResponse(profile, accessToken, refreshToken);
}

export async function deleteSessionById(sessionId: string): Promise<void> {
  if (!sessionId.trim()) {
    return;
  }

  const client = createServiceClient();
  const { error } = await client
    .from("farmer_user_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    throw error;
  }
}

export async function replaceSession(input: {
  session: AuthenticatedSession;
  userId: string;
}): Promise<ReturnType<typeof buildSessionResponse>> {
  const nextSession = await createSession({
    userId: input.userId,
    platform: input.session.platform,
    deviceId: input.session.deviceId,
  });

  await deleteSessionById(input.session.sessionId);
  return nextSession;
}

export async function rotateSession(
  refreshToken: string,
): Promise<ReturnType<typeof buildSessionResponse>> {
  const client = createServiceClient();
  const refreshTokenHash = await sha256Hex(refreshToken);

  const { data: session, error } = await client
    .from("farmer_user_sessions")
    .select(refreshSessionSelect)
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
    .select(sessionProfileSelect)
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
    sessionId: String(session.id ?? ""),
    userId: String(session.user_id ?? ""),
    platform: session.platform as "mini_program" | "flutter_app",
    deviceId: String(session.device_id ?? ""),
    accessToken,
    profile: normalizeProfile(session.farmer_users),
  };
}
