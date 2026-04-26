const SUPABASE_FUNCTIONS_BASE_URL =
  'https://api-test.chuya.wang/functions/v1';
// const SUPABASE_FUNCTIONS_BASE_URL =
  // 'https://rfnjqodcpxxmxinijqcb.supabase.co/functions/v1';

const ENABLE_DEV_LOGIN = false;
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
