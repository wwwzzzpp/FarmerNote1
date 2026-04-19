const STORAGE_KEY = 'farmernote_privacy_consent_v1';

function hasAcceptedConsent() {
  return !!wx.getStorageSync(STORAGE_KEY);
}

function acceptConsent() {
  wx.setStorageSync(STORAGE_KEY, true);
}

function resetConsent() {
  wx.removeStorageSync(STORAGE_KEY);
}

function ensureAcceptedOrLaunch() {
  if (hasAcceptedConsent()) {
    return true;
  }

  wx.reLaunch({
    url: '/pages/launch/index',
  });
  return false;
}

module.exports = {
  STORAGE_KEY,
  acceptConsent,
  ensureAcceptedOrLaunch,
  hasAcceptedConsent,
  resetConsent,
};
