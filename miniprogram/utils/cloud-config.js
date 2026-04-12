const SUPABASE_FUNCTIONS_BASE_URL = '';

function isConfigured() {
  return !!SUPABASE_FUNCTIONS_BASE_URL;
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
  getFunctionUrl,
  getStorageOrigin,
  isConfigured,
};
