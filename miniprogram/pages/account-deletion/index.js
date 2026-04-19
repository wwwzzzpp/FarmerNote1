const dateUtils = require('../../utils/date');
const legalConfig = require('../../utils/legal-config');
const startupConsent = require('../../utils/startup-consent');
const store = require('../../utils/store');

function emptyStatus() {
  return {
    status: 'none',
    requestedAt: '',
    scheduledFor: '',
    confirmedBy: '',
    message: '',
  };
}

function formatDeletionTime(value) {
  if (!value) {
    return '';
  }

  try {
    return dateUtils.formatFriendlyDateTime(value);
  } catch (_) {
    return String(value || '');
  }
}

function buildPageState() {
  return {
    account: {
      isSignedIn: false,
      title: '当前未登录云端',
      detail: '未登录时，设置页仍可查看协议与官网地址。',
      hasPhone: false,
      hasWeChat: false,
      maskedPhone: '',
    },
    status: emptyStatus(),
    deletionWindowDays: legalConfig.DELETION_WINDOW_DAYS,
    isLoadingStatus: true,
    sendCountdown: 0,
    code: '',
    isBusy: false,
    scheduledForLabel: '',
  };
}

Page({
  data: buildPageState(),

  onLoad() {
    this.countdownTimer = null;
  },

  onUnload() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  },

  onShow() {
    if (!startupConsent.ensureAcceptedOrLaunch()) {
      return;
    }

    this.setData({
      account: store.getAccountProfileSummary(),
      isLoadingStatus: true,
    });
    void this.refreshStatus();
  },

  async refreshStatus() {
    try {
      const status = await store.loadAccountDeletionStatus();
      this.setData({
        status,
        scheduledForLabel: formatDeletionTime(status.scheduledFor),
      });
    } catch (error) {
      wx.showToast({
        title: (error && error.message) || '加载注销状态失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        account: store.getAccountProfileSummary(),
        isLoadingStatus: false,
      });
    }
  },

  startCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    this.setData({
      sendCountdown: 60,
    });

    this.countdownTimer = setInterval(() => {
      const next = Number(this.data.sendCountdown || 0) - 1;
      if (next <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.setData({
          sendCountdown: 0,
        });
        return;
      }

      this.setData({
        sendCountdown: next,
      });
    }, 1000);
  },

  handleCodeInput(event) {
    this.setData({
      code: String((event.detail && event.detail.value) || '').replace(/\s+/g, ''),
    });
  },

  async handleSendCode() {
    if (this.data.sendCountdown > 0 || this.data.isBusy) {
      return;
    }

    this.setData({
      isBusy: true,
    });

    try {
      await store.sendAccountDeletionPhoneCode();
      this.startCountdown();
      wx.showToast({
        title: '注销验证码已发送',
        icon: 'none',
      });
    } catch (error) {
      wx.showToast({
        title: (error && error.message) || '验证码发送失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        isBusy: false,
      });
    }
  },

  async handleConfirmPhoneDeletion() {
    if (this.data.isBusy) {
      return;
    }

    const code = String(this.data.code || '').trim();
    if (!code) {
      wx.showToast({
        title: '先输入验证码',
        icon: 'none',
      });
      return;
    }

    this.setData({
      isBusy: true,
    });

    try {
      const status = await store.requestAccountDeletionWithPhone(code);
      await this.handleDeletionRequested(status);
    } catch (error) {
      wx.showToast({
        title: (error && error.message) || '注销申请失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        isBusy: false,
      });
    }
  },

  async handleConfirmWeChatDeletion() {
    if (this.data.isBusy) {
      return;
    }

    this.setData({
      isBusy: true,
    });

    try {
      const status = await store.requestAccountDeletionWithWeChat();
      await this.handleDeletionRequested(status);
    } catch (error) {
      wx.showToast({
        title: (error && error.message) || '注销申请失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        isBusy: false,
      });
    }
  },

  handleDeletionRequested(status) {
    return new Promise((resolve) => {
      wx.showModal({
        title: '注销申请已提交',
        content:
          (status && status.message) ||
          `账号已进入 ${legalConfig.DELETION_WINDOW_DAYS} 天待删除窗口。`,
        showCancel: false,
        confirmText: '知道了',
        complete: () => {
          wx.reLaunch({
            url: '/pages/record/index',
          });
          resolve();
        },
      });
    });
  },
});
