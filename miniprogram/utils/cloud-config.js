const SUPABASE_FUNCTIONS_BASE_URL = 'https://rfnjqodcpxxmxinijqcb.supabase.co/functions/v1';
// const SUPABASE_FUNCTIONS_BASE_URL = 'http://192.168.0.108:54321/functions/v1';
// 本机联调默认也走和线上一致的微信 + 手机号登录。
// 只有明确想切回临时联调账号时，再手动改成 true。
const ENABLE_DEV_LOGIN = false;
// 小程序微信登录逻辑先保留，但页面入口默认隐藏。
// 等后续确认微信开放平台 / unionid 链路稳定后，再手动改成 true。
const ENABLE_WECHAT_LOGIN = false;
const DEV_LOGIN_KEY = 'farmernote-local-shared-user';
const DEV_LOGIN_DISPLAY_NAME = 'FarmerNote 临时联调';


function isConfigured() {
  return !!SUPABASE_FUNCTIONS_BASE_URL;
}

function isDevLoginEnabled() {
  return ENABLE_DEV_LOGIN;
}

function isWeChatLoginEnabled() {
  return ENABLE_WECHAT_LOGIN;
}

function getDevLoginKey() {
  return DEV_LOGIN_KEY;
}

function getDevLoginDisplayName() {
  return DEV_LOGIN_DISPLAY_NAME;
}

function getFunctionUrl(endpoint) {
  const base = SUPABASE_FUNCTIONS_BASE_URL.replace(/\/+$/, '');
  const cleanedEndpoint = String(endpoint || '').replace(/^\/+/, '');
  return `${base}/${cleanedEndpoint}`;
}

function getStorageOrigin() {
  if (!isConfigured()) {
    return '';
  }

  const match = getFunctionUrl('health').match(/^(https?:\/\/[^/]+)/);
  return match ? match[1] : '';
}

module.exports = {
  getDevLoginDisplayName,
  getDevLoginKey,
  getFunctionUrl,
  getStorageOrigin,
  isDevLoginEnabled,
  isWeChatLoginEnabled,
  isConfigured,
};
