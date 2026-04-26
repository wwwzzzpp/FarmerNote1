const dateUtils = require('../../utils/date');
const shareUtils = require('../../utils/share');
const startupConsent = require('../../utils/startup-consent');
const store = require('../../utils/store');

function buildCardViewModel(card) {
  return {
    ...card,
    stageClass: !card.hasAnchorDate
      ? 'status-chip--neutral'
      : card.completedActionCount === card.totalActionCount
      ? 'status-chip--success'
      : 'status-chip--warning',
  };
}

Page({
  data: {
    todayDate: dateUtils.formatDateInput(new Date()),
    planCards: [],
  },

  onShow() {
    if (!startupConsent.ensureAcceptedOrLaunch()) {
      return;
    }

    shareUtils.enablePageShareMenus();

    void this.refreshPage();
  },

  onShareAppMessage() {
    return shareUtils.buildShareAppMessage('plan');
  },

  onShareTimeline() {
    return shareUtils.buildShareTimeline('plan');
  },

  async onPullDownRefresh() {
    if (!startupConsent.ensureAcceptedOrLaunch()) {
      wx.stopPullDownRefresh();
      return;
    }

    await this.refreshPage({
      forceSync: true,
    });
    wx.stopPullDownRefresh();
  },

  async refreshPage(options) {
    const settings = options || {};
    if (settings.sync !== false && store.isSignedInToCloud()) {
      try {
        if (settings.forceSync) {
          await store.syncNow();
        } else {
          await store.syncIfNeeded({ reason: 'plan_home' });
        }
      } catch (_) {
        // Keep local plan data visible even when sync fails.
      }
    }

    this.setData({
      planCards: store.getCropPlanCards().map(buildCardViewModel),
    });
  },

  async handleAnchorDateChange(event) {
    const cropCode = String(event.currentTarget.dataset.cropCode || '');
    const anchorDate = String(event.detail.value || '');
    if (!cropCode || !anchorDate) {
      return;
    }

    try {
      store.setCropPlanAnchor(cropCode, anchorDate);
      await this.refreshPage({
        sync: false,
      });
      wx.showToast({
        title: '播种日期已更新',
        icon: 'success',
      });
    } catch (error) {
      wx.showToast({
        title: (error && error.message) || '保存失败',
        icon: 'none',
      });
    }
  },

  openPlanDetail(event) {
    const cropCode = String(event.currentTarget.dataset.cropCode || '');
    if (!cropCode) {
      return;
    }

    wx.navigateTo({
      url: `/pages/plan/detail?cropCode=${cropCode}`,
    });
  },

  goRecord() {
    wx.redirectTo({
      url: '/pages/record/index',
    });
  },

  goPlan() {},

  goTimeline() {
    wx.redirectTo({
      url: '/pages/timeline/index',
    });
  },

  goMe() {
    wx.redirectTo({
      url: '/pages/settings/index',
    });
  },
});
