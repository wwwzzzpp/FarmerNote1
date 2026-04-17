import SMSPackage from "npm:@alicloud/dysmsapi20170525@4.5.1";
import OpenApi from "npm:@alicloud/openapi-client@0.4.15";

import { sha256Hex } from "./crypto.ts";
import { getEnv, getNumberEnv, getOptionalEnv } from "./env.ts";
import { createServiceClient } from "./supabase.ts";

const verificationTable = "farmer_phone_verification_codes";
const verificationPurpose = "auth";

type VerificationStatus =
  | "pending"
  | "verified"
  | "expired"
  | "attempts_exhausted"
  | "send_failed";

interface VerificationRow {
  id: string;
  phone: string;
  purpose: string;
  code_hash: string;
  status: VerificationStatus;
  attempt_count: number;
  max_attempts: number;
  expires_at: string;
  sent_at: string;
}

interface AliyunSmsResult {
  deliveryId: string;
  requestId: string;
  responseCode: string;
  responseMessage: string;
}

let smsClient: InstanceType<typeof SMSPackage.default> | null = null;

const otpLength = () => {
  const raw = getNumberEnv("FARMERNOTE_PHONE_OTP_LENGTH", 6);
  return Math.max(4, Math.min(Math.trunc(raw), 8));
};
const otpTtlSeconds = () =>
  getNumberEnv("FARMERNOTE_PHONE_OTP_TTL_SECONDS", 5 * 60);
const otpResendCooldownSeconds = () =>
  getNumberEnv("FARMERNOTE_PHONE_OTP_RESEND_COOLDOWN_SECONDS", 60);
const otpMaxAttempts = () =>
  getNumberEnv("FARMERNOTE_PHONE_OTP_MAX_ATTEMPTS", 5);

function compactDigits(value: string): string {
  return value.replace(/[^\d+]+/g, "");
}

export function normalizePhoneNumber(value: string): string {
  const trimmed = compactDigits(String(value ?? "").trim());
  if (!trimmed) {
    throw new Error("请输入手机号。");
  }

  const digits = trimmed.replace(/\D+/g, "");
  if (/^1\d{10}$/.test(digits)) {
    return `+86${digits}`;
  }

  if (/^86\d{11}$/.test(digits)) {
    return `+${digits}`;
  }

  if (trimmed.startsWith("+")) {
    const prefixed = `+${trimmed.slice(1).replace(/\D+/g, "")}`;
    if (/^\+861\d{10}$/.test(prefixed)) {
      return prefixed;
    }
  }

  throw new Error("当前短信登录仅支持中国大陆手机号。");
}

function mainlandSmsPhone(phone: string): string {
  const digits = normalizePhoneNumber(phone).replace(/\D+/g, "");
  if (!/^861\d{10}$/.test(digits)) {
    throw new Error("当前短信登录仅支持中国大陆手机号。");
  }
  return digits.slice(2);
}

function smsTemplateCode(): string {
  return getEnv("ALIYUN_SMS_TEMPLATE_CODE");
}

function getSmsClient(): InstanceType<typeof SMSPackage.default> {
  if (smsClient) {
    return smsClient;
  }

  const config = new OpenApi.Config({
    accessKeyId: getEnv("ALIYUN_SMS_ACCESS_KEY_ID"),
    accessKeySecret: getEnv("ALIYUN_SMS_ACCESS_KEY_SECRET"),
    endpoint: getOptionalEnv("ALIYUN_SMS_ENDPOINT") || "dysmsapi.aliyuncs.com",
  });

  smsClient = new SMSPackage.default(config);
  return smsClient;
}

function buildSmsErrorMessage(error: unknown): string {
  const message = String(
    (error && typeof error === "object" &&
      (error as Record<string, unknown>).message) ||
      error ||
      "",
  ).trim();
  const normalizedMessage = message.toUpperCase();

  if (normalizedMessage.includes("BUSINESS_LIMIT_CONTROL")) {
    return "短信发送过于频繁，请稍后再试。";
  }
  if (
    normalizedMessage.includes("NOPERMISSION") ||
    normalizedMessage.includes("YOU ARE NOT AUTHORIZED")
  ) {
    return "当前阿里云短信账号没有发送权限，请给这对 AccessKey 授权 dysms:SendSms。";
  }
  if (normalizedMessage.includes("MOBILE_NUMBER_ILLEGAL")) {
    return "手机号格式不正确。";
  }
  if (
    normalizedMessage.includes("SIGN_NAME_ILLEGAL") ||
    normalizedMessage.includes("SIGNATURE")
  ) {
    return "短信签名配置不正确，请检查阿里云短信签名。";
  }
  if (normalizedMessage.includes("TEMPLATE")) {
    return "短信模板配置不正确，请检查阿里云短信模板。";
  }

  return "验证码发送失败，请稍后再试。";
}

function generateNumericCode(length: number): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (item) => `${item % 10}`).join("");
}

async function hashPhoneCode(phone: string, code: string): Promise<string> {
  return sha256Hex(
    `${getEnv("FARMERNOTE_PHONE_CODE_SECRET")}:${phone}:${code.trim()}`,
  );
}

function normalizeVerificationRow(value: unknown): VerificationRow {
  if (Array.isArray(value)) {
    if (!value.length) {
      throw new Error("Unable to load phone verification.");
    }
    return normalizeVerificationRow(value[0]);
  }

  if (!value || typeof value !== "object") {
    throw new Error("Unable to load phone verification.");
  }

  const row = value as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    phone: String(row.phone ?? ""),
    purpose: String(row.purpose ?? ""),
    code_hash: String(row.code_hash ?? ""),
    status: String(row.status ?? "pending") as VerificationStatus,
    attempt_count: Number(row.attempt_count ?? 0),
    max_attempts: Number(row.max_attempts ?? otpMaxAttempts()),
    expires_at: String(row.expires_at ?? ""),
    sent_at: String(row.sent_at ?? ""),
  };
}

async function loadLatestVerification(
  phone: string,
): Promise<VerificationRow | null> {
  const client = createServiceClient();
  const { data, error } = await client
    .from(verificationTable)
    .select(
      "id, phone, purpose, code_hash, status, attempt_count, max_attempts, expires_at, sent_at",
    )
    .eq("phone", phone)
    .eq("purpose", verificationPurpose)
    .neq("status", "send_failed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeVerificationRow(data) : null;
}

function secondsUntil(value: string): number {
  const expiresAt = new Date(value).getTime();
  if (!Number.isFinite(expiresAt)) {
    return 0;
  }

  return Math.max(Math.ceil((expiresAt - Date.now()) / 1000), 0);
}

async function createPendingVerification(input: {
  phone: string;
  codeHash: string;
}): Promise<VerificationRow> {
  const client = createServiceClient();
  const now = Date.now();
  const { data, error } = await client
    .from(verificationTable)
    .insert({
      phone: input.phone,
      purpose: verificationPurpose,
      provider: "aliyun_sms",
      code_hash: input.codeHash,
      status: "pending",
      attempt_count: 0,
      max_attempts: otpMaxAttempts(),
      expires_at: new Date(now + otpTtlSeconds() * 1000).toISOString(),
      sent_at: new Date(now).toISOString(),
      template_code: smsTemplateCode(),
      metadata: {},
    })
    .select(
      "id, phone, purpose, code_hash, status, attempt_count, max_attempts, expires_at, sent_at",
    )
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Unable to create phone verification.");
  }

  return normalizeVerificationRow(data);
}

async function updateVerificationRecord(
  id: string,
  patch: Record<string, unknown>,
  expectedStatus = "",
): Promise<boolean> {
  const client = createServiceClient();
  let query = client.from(verificationTable).update(patch).eq("id", id);
  if (expectedStatus) {
    query = query.eq("status", expectedStatus);
  }
  const { data, error } = await query.select("id").maybeSingle();

  if (error) {
    throw error;
  }

  return !!data;
}

async function sendAliyunSms(input: {
  phone: string;
  code: string;
}): Promise<AliyunSmsResult> {
  const client = getSmsClient();
  const response = await client.sendSms(
    new SMSPackage.SendSmsRequest({
      phoneNumbers: mainlandSmsPhone(input.phone),
      signName: getEnv("ALIYUN_SMS_SIGN_NAME"),
      templateCode: smsTemplateCode(),
      templateParam: JSON.stringify({
        code: input.code,
      }),
      outId: crypto.randomUUID(),
    }),
  );

  const body = (response.body ?? {}) as Record<string, unknown>;
  const responseCode = String(body.code ?? "").trim();
  if (responseCode.toUpperCase() !== "OK") {
    const responseMessage = String(body.message ?? "短信发送失败。").trim();
    throw new Error(`${responseCode}: ${responseMessage}`);
  }

  return {
    deliveryId: String(body.bizId ?? "").trim(),
    requestId: String(body.requestId ?? "").trim(),
    responseCode,
    responseMessage: String(body.message ?? "OK").trim(),
  };
}

export async function sendPhoneOtp(phone: string): Promise<void> {
  const normalizedPhone = normalizePhoneNumber(phone);
  const latestVerification = await loadLatestVerification(normalizedPhone);
  const retryAfterSeconds = latestVerification
    ? Math.max(
      otpResendCooldownSeconds() -
        Math.floor(
          (Date.now() - new Date(latestVerification.sent_at).getTime()) / 1000,
        ),
      0,
    )
    : 0;

  if (retryAfterSeconds > 0) {
    throw new Error(`验证码发送太频繁，请 ${retryAfterSeconds} 秒后再试。`);
  }

  const code = generateNumericCode(otpLength());
  const verification = await createPendingVerification({
    phone: normalizedPhone,
    codeHash: await hashPhoneCode(normalizedPhone, code),
  });

  try {
    const delivery = await sendAliyunSms({
      phone: normalizedPhone,
      code,
    });

    await updateVerificationRecord(verification.id, {
      delivery_id: delivery.deliveryId || null,
      metadata: {
        requestId: delivery.requestId,
        responseCode: delivery.responseCode,
        responseMessage: delivery.responseMessage,
      },
    });
  } catch (error) {
    console.error("Aliyun SMS send failed", error);
    await updateVerificationRecord(verification.id, {
      status: "send_failed",
      metadata: {
        errorMessage: String(
          (error && typeof error === "object" &&
            (error as Record<string, unknown>).message) ||
            error ||
            "",
        ),
      },
    }).catch((updateError) => {
      console.error(
        "Failed to mark phone verification send failure",
        updateError,
      );
    });
    throw new Error(buildSmsErrorMessage(error));
  }
}

export async function verifyPhoneOtp(input: {
  phone: string;
  token: string;
}): Promise<string> {
  const phone = normalizePhoneNumber(input.phone);
  const token = String(input.token ?? "").trim().replace(/\s+/g, "");
  if (!token) {
    throw new Error("请输入验证码。");
  }
  if (!/^\d{4,8}$/.test(token)) {
    throw new Error("验证码格式不正确。");
  }

  const client = createServiceClient();
  const verification = await loadLatestVerification(phone);
  if (!verification) {
    throw new Error("请先获取验证码。");
  }

  if (verification.status === "verified") {
    throw new Error("验证码已使用，请重新获取。");
  }
  if (verification.status === "expired") {
    throw new Error("验证码已过期，请重新获取。");
  }
  if (verification.status === "attempts_exhausted") {
    throw new Error("验证码错误次数过多，请重新获取。");
  }
  if (verification.status !== "pending") {
    throw new Error("验证码已失效，请重新获取。");
  }

  if (secondsUntil(verification.expires_at) <= 0) {
    await updateVerificationRecord(
      verification.id,
      {
        status: "expired",
      },
      "pending",
    );
    throw new Error("验证码已过期，请重新获取。");
  }

  const tokenHash = await hashPhoneCode(phone, token);
  if (tokenHash !== verification.code_hash) {
    const nextAttemptCount = verification.attempt_count + 1;
    const updated = await updateVerificationRecord(
      verification.id,
      {
        attempt_count: nextAttemptCount,
        status: nextAttemptCount >= verification.max_attempts
          ? "attempts_exhausted"
          : "pending",
      },
      "pending",
    );
    if (!updated) {
      throw new Error("验证码已失效，请重新获取。");
    }

    if (nextAttemptCount >= verification.max_attempts) {
      throw new Error("验证码错误次数过多，请重新获取。");
    }
    throw new Error("验证码不正确。");
  }

  const { data, error } = await client
    .from(verificationTable)
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
      consumed_at: new Date().toISOString(),
    })
    .eq("id", verification.id)
    .eq("status", "pending")
    .eq("code_hash", tokenHash)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("验证码已失效，请重新获取。");
  }

  return phone;
}
