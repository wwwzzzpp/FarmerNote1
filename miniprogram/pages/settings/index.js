const legalConfig = require('../../utils/legal-config');
const startupConsent = require('../../utils/startup-consent');
const store = require('../../utils/store');

function getPageState() {
  return {
    account: store.getAccountProfileSummary(),
    websiteBaseUrl: legalConfig.WEBSITE_BASE_URL,
    supportContact: legalConfig.SUPPORT_CONTACT,
    supportHint: legalConfig.SUPPORT_HINT,
    appVersion: legalConfig.APP_VERSION,
  };
}

function getEmptyPageState() {
  return {
    account: {
      isSignedIn: false,
      title: '当前未登录云端',
      detail: '未登录时，设置页仍可查看协议与官网地址。',
      hasPhone: false,
      hasWeChat: false,
      maskedPhone: '',
    },
    websiteBaseUrl: legalConfig.WEBSITE_BASE_URL,
    supportContact: legalConfig.SUPPORT_CONTACT,
    supportHint: legalConfig.SUPPORT_HINT,
    appVersion: legalConfig.APP_VERSION,
  };
}

Page({
  data: getEmptyPageState(),

  onShow() {
    if (!startupConsent.ensureAcceptedOrLaunch()) {
      return;
    }

    this.setData(getPageState());
  },

  openLegal(event) {
    const type = String((event.currentTarget.dataset && event.currentTarget.dataset.type) || 'privacy');
    wx.navigateTo({
      url: `/pages/legal/index?type=${type}`,
    });
  },

  openAccountDeletion() {
    wx.navigateTo({
      url: '/pages/account-deletion/index',
    });
  },

  copyWebsiteUrl() {
    wx.setClipboardData({
      data: legalConfig.WEBSITE_BASE_URL,
    });
  },

  goRecord() {
    wx.redirectTo({
      url: '/pages/record/index',
    });
  },

  goTimeline() {
    wx.redirectTo({
      url: '/pages/timeline/index',
    });
  },

  goTasks() {
    wx.redirectTo({
      url: '/pages/tasks/index',
    });
  },

  goMe() {},
});
