const startupConsent = require('../../utils/startup-consent');

Page({
  data: {
    isCheckingConsent: true,
    isSubmitting: false,
    startupError: '',
  },

  onLoad() {
    this.refreshConsentState();
  },

  onShow() {
    this.refreshConsentState();
  },

  refreshConsentState() {
    if (startupConsent.hasAcceptedConsent()) {
      wx.reLaunch({
        url: '/pages/record/index',
      });
      return;
    }

    this.setData({
      isCheckingConsent: false,
    });
  },

  openPrivacy() {
    wx.navigateTo({
      url: '/pages/legal/index?type=privacy',
    });
  },

  openTerms() {
    wx.navigateTo({
      url: '/pages/legal/index?type=terms',
    });
  },

  handleAccept() {
    if (this.data.isSubmitting) {
      return;
    }

    this.setData({
      isSubmitting: true,
      startupError: '',
    });

    try {
      startupConsent.acceptConsent();
      wx.reLaunch({
        url: '/pages/record/index',
      });
    } catch (_) {
      this.setData({
        isSubmitting: false,
        startupError: '写入协议确认状态失败了，请重试一次。',
      });
    }
  },

  handleDecline() {
    wx.exitMiniProgram({
      fail: () => {
        wx.showToast({
          title: '你可以手动关闭当前小程序',
          icon: 'none',
        });
      },
    });
  },
});
