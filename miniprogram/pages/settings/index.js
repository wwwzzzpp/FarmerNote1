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

  handleSignOut() {
    wx.showModal({
      title: '退出登录',
      content: '退出后会清掉当前登录态与待同步队列，现有记录仍保留在本机，继续以本地模式使用。',
      confirmText: '退出登录',
      confirmColor: '#b42318',
      success: (result) => {
        if (!result.confirm) {
          return;
        }

        try {
          store.signOutFromCloud();
          this.setData(getPageState());
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
          });
        } catch (error) {
          wx.showToast({
            title: (error && error.message) || '退出登录失败',
            icon: 'none',
          });
        }
      },
    });
  },

  goRecord() {
    wx.redirectTo({
      url: '/pages/record/index',
    });
  },

  goPlan() {
    wx.redirectTo({
      url: '/pages/plan/index',
    });
  },

  goTimeline() {
    wx.redirectTo({
      url: '/pages/timeline/index',
    });
  },

  goMe() {},
});
