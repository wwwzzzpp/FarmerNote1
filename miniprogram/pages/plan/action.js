const startupConsent = require('../../utils/startup-consent');
const store = require('../../utils/store');

function buildDraftUrl(draft, sourceLabel) {
  return `/pages/record/index?noteText=${encodeURIComponent(
    draft.noteText
  )}&planInstanceId=${draft.planInstanceId}&planActionId=${draft.planActionId}&sourceLabel=${encodeURIComponent(
    sourceLabel
  )}&reminderEnabled=${draft.reminderEnabled ? '1' : '0'}${
    draft.reminderEnabled
      ? `&reminderDate=${draft.reminderDate}&reminderTime=${draft.reminderTime}`
      : ''
  }`;
}

Page({
  data: {
    planInstanceId: '',
    actionId: '',
    detail: null,
  },

  onLoad(options) {
    this.setData({
      planInstanceId: String((options && options.planInstanceId) || ''),
      actionId: String((options && options.actionId) || ''),
    });
  },

  onShow() {
    if (!startupConsent.ensureAcceptedOrLaunch()) {
      return;
    }

    void this.refreshPage();
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
          await store.syncIfNeeded({ reason: 'plan_action' });
        }
      } catch (_) {
        // Keep local action detail visible even when sync fails.
      }
    }

    this.setData({
      detail: store.getCropPlanActionDetail(this.data.planInstanceId, this.data.actionId),
    });
  },

  async toggleCompleted() {
    try {
      store.toggleCropPlanActionProgress(this.data.planInstanceId, this.data.actionId);
      await this.refreshPage({
        sync: false,
      });
      wx.showToast({
        title: '状态已更新',
        icon: 'success',
      });
    } catch (error) {
      wx.showToast({
        title: (error && error.message) || '更新失败',
        icon: 'none',
      });
    }
  },

  goWriteNote() {
    if (!this.data.detail || !this.data.detail.noteDraft) {
      return;
    }

    const sourceLabel = `${this.data.detail.cropName}-${this.data.detail.stageName}-${this.data.detail.milestoneName}-${this.data.detail.name}`;
    wx.redirectTo({
      url: buildDraftUrl(this.data.detail.noteDraft, sourceLabel),
    });
  },

  goWriteReminderNote() {
    if (!this.data.detail || !this.data.detail.reminderDraft) {
      return;
    }

    const sourceLabel = `${this.data.detail.cropName}-${this.data.detail.stageName}-${this.data.detail.milestoneName}-${this.data.detail.name}`;
    wx.redirectTo({
      url: buildDraftUrl(this.data.detail.reminderDraft, sourceLabel),
    });
  },

  openRecentEntry() {
    if (!this.data.detail || !this.data.detail.recentEntry) {
      return;
    }

    wx.redirectTo({
      url: `/pages/timeline/index?focusEntryId=${this.data.detail.recentEntry.id}`,
    });
  },
});
