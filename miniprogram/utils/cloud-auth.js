const cloudConfig = require('./cloud-config');
const requestUtils = require('./cloud-request');

function parseSession(session) {
  const linkedProviders = Array.isArray(session && session.userProfile && session.userProfile.linkedProviders)
    ? session.userProfile.linkedProviders
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    : [];

  return {
    accessToken: String((session && session.accessToken) || ''),
    refreshToken: String((session && session.refreshToken) || ''),
    accessExpiresAt: String((session && session.accessExpiresAt) || ''),
    refreshExpiresAt: String((session && session.refreshExpiresAt) || ''),
    userProfile: {
      id: String((session && session.userProfile && session.userProfile.id) || ''),
      unionId: String((session && session.userProfile && session.userProfile.unionId) || ''),
      displayName: String((session && session.userProfile && session.userProfile.displayName) || ''),
      avatarUrl: String((session && session.userProfile && session.userProfile.avatarUrl) || ''),
      linkedProviders,
      maskedPhone: String((session && session.userProfile && session.userProfile.maskedPhone) || ''),
    },
  };
}

function ensureCloudConfigured() {
  if (!cloudConfig.isConfigured()) {
    throw requestUtils.buildError(
      'cloud_not_configured',
      '还没配置小程序云端地址，请先补上 cloud-config.js。'
    );
  }
}

function normalizePhoneNumber(value) {
  const raw = String(value || '')
    .trim()
    .replace(/[^\d+]+/g, '');

  if (!raw) {
    throw requestUtils.buildError('invalid_phone', '请输入手机号。');
  }

  const digits = raw.replace(/\D+/g, '');
  if (/^1\d{10}$/.test(digits)) {
    return `+86${digits}`;
  }
  if (/^86\d{11}$/.test(digits)) {
    return `+${digits}`;
  }
  if (raw.indexOf('+') === 0) {
    const prefixed = `+${raw.slice(1).replace(/\D+/g, '')}`;
    if (/^\+861\d{10}$/.test(prefixed)) {
      return prefixed;
    }
  }

  throw requestUtils.buildError('invalid_phone', '当前仅支持中国大陆手机号。');
}

async function requestWeChatCode() {
  const loginResult = await requestUtils.wxLogin();
  const code = String((loginResult && loginResult.code) || '');
  if (!code) {
    throw requestUtils.buildError('wx_login_failed', '没有拿到微信登录 code。');
  }
  return code;
}

async function postAuth(options) {
  const payload = await requestUtils.requestJson({
    url: cloudConfig.getFunctionUrl(options.endpoint),
    method: 'POST',
    data: options.data,
    header: Object.assign(
      {
        'Content-Type': 'application/json',
      },
      options.accessToken
        ? {
            Authorization: `Bearer ${options.accessToken}`,
          }
        : {}
    ),
  });

  return parseSession(payload);
}

async function loginWithWeChat() {
  ensureCloudConfigured();

  return postAuth({
    endpoint: 'auth-wechat-login',
    data: {
      platform: 'mini_program',
      wechatCode: await requestWeChatCode(),
    },
  });
}

async function sendPhoneCode(phone) {
  ensureCloudConfigured();

  return requestUtils.requestJson({
    url: cloudConfig.getFunctionUrl('auth-phone-send-code'),
    method: 'POST',
    data: {
      phone: normalizePhoneNumber(phone),
    },
    header: {
      'Content-Type': 'application/json',
    },
  });
}

async function loginWithPhone(phone, code) {
  ensureCloudConfigured();

  return postAuth({
    endpoint: 'auth-phone-login',
    data: {
      platform: 'mini_program',
      phone: normalizePhoneNumber(phone),
      code: String(code || '').trim(),
    },
  });
}

async function linkPhone(session, phone, code) {
  ensureCloudConfigured();

  return postAuth({
    endpoint: 'auth-link-phone',
    data: {
      phone: normalizePhoneNumber(phone),
      code: String(code || '').trim(),
    },
    accessToken: session && session.accessToken,
  });
}

async function linkWithWeChat(session) {
  ensureCloudConfigured();

  return postAuth({
    endpoint: 'auth-link-wechat',
    data: {
      platform: 'mini_program',
      wechatCode: await requestWeChatCode(),
    },
    accessToken: session && session.accessToken,
  });
}

async function loginForDevelopment() {
  ensureCloudConfigured();

  if (!cloudConfig.isDevLoginEnabled()) {
    throw requestUtils.buildError(
      'dev_login_not_enabled',
      '当前小程序还没打开临时联调登录。'
    );
  }

  return postAuth({
    endpoint: 'auth-dev-login',
    data: {
      platform: 'mini_program',
      debugUserKey: cloudConfig.getDevLoginKey(),
      displayName: cloudConfig.getDevLoginDisplayName(),
    },
  });
}

async function refreshSession(session) {
  return postAuth({
    endpoint: 'auth-refresh',
    data: {
      refreshToken: session.refreshToken,
    },
  });
}

function shouldRefreshSession(session) {
  if (!session || !session.accessExpiresAt) {
    return false;
  }

  const refreshAt = new Date(session.accessExpiresAt).getTime();
  return Number.isFinite(refreshAt) && refreshAt <= Date.now() + 5 * 60 * 1000;
}

function isSessionInvalidError(error) {
  const statusCode = Number(
    (error && error.statusCode) ||
      (error && error.originalError && error.originalError.statusCode) ||
      0
  );
  if (statusCode === 401) {
    return true;
  }

  const code = String((error && error.code) || '').trim().toLowerCase();
  if (code === 'session_invalid') {
    return true;
  }

  const message = String((error && error.message) || '').trim().toLowerCase();
  return (
    message.indexOf('invalid access token') >= 0 ||
    message.indexOf('access token expired') >= 0 ||
    message.indexOf('invalid refresh token') >= 0 ||
    message.indexOf('refresh token expired') >= 0
  );
}

module.exports = {
  isSessionInvalidError,
  linkPhone,
  linkWithWeChat,
  loginForDevelopment,
  loginWithPhone,
  loginWithWeChat,
  refreshSession,
  sendPhoneCode,
  shouldRefreshSession,
};
