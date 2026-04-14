const cloudConfig = require('./cloud-config');
const requestUtils = require('./cloud-request');

function parseSession(session) {
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
    },
  };
}

async function loginWithWeChat() {
  if (!cloudConfig.isConfigured()) {
    throw requestUtils.buildError(
      'cloud_not_configured',
      '还没配置小程序云端地址，请先补上 cloud-config.js。'
    );
  }

  const loginResult = await requestUtils.wxLogin();
  const code = String((loginResult && loginResult.code) || '');
  if (!code) {
    throw requestUtils.buildError('wx_login_failed', '没有拿到微信登录 code。');
  }

  const session = await requestUtils.requestJson({
    url: cloudConfig.getFunctionUrl('auth-wechat-login'),
    method: 'POST',
    data: {
      platform: 'mini_program',
      wechatCode: code,
    },
    header: {
      'Content-Type': 'application/json',
    },
  });

  return parseSession(session);
}

async function loginForDevelopment() {
  if (!cloudConfig.isConfigured()) {
    throw requestUtils.buildError(
      'cloud_not_configured',
      '还没配置小程序云端地址，请先补上 cloud-config.js。'
    );
  }

  if (!cloudConfig.isDevLoginEnabled()) {
    throw requestUtils.buildError(
      'dev_login_not_enabled',
      '当前小程序还没打开临时联调登录。'
    );
  }

  const session = await requestUtils.requestJson({
    url: cloudConfig.getFunctionUrl('auth-dev-login'),
    method: 'POST',
    data: {
      platform: 'mini_program',
      debugUserKey: cloudConfig.getDevLoginKey(),
      displayName: cloudConfig.getDevLoginDisplayName(),
    },
    header: {
      'Content-Type': 'application/json',
    },
  });

  return parseSession(session);
}

async function refreshSession(session) {
  const nextSession = await requestUtils.requestJson({
    url: cloudConfig.getFunctionUrl('auth-refresh'),
    method: 'POST',
    data: {
      refreshToken: session.refreshToken,
    },
    header: {
      'Content-Type': 'application/json',
    },
  });

  return parseSession(nextSession);
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
  loginForDevelopment,
  loginWithWeChat,
  refreshSession,
  shouldRefreshSession,
};
