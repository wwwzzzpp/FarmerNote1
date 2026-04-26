const startupConsent = require('../../utils/startup-consent');
const store = require('../../utils/store');

function buildStageStatusClass(status) {
  if (status === 'current') {
    return 'status-chip--warning';
  }
  if (status === 'passed') {
    return 'status-chip--success';
  }
  return 'status-chip--neutral';
}

function buildActionStatusClass(status) {
  return status === 'completed' ? 'status-chip--success' : 'status-chip--warning';
}

Page({
  data: {
    cropCode: '',
    detail: null,
  },

  onLoad(options) {
    this.setData({
      cropCode: String((options && options.cropCode) || ''),
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
    if (store.isSignedInToCloud()) {
      try {
        if (settings.forceSync) {
          await store.syncNow();
        } else {
          await store.syncIfNeeded({ reason: 'plan_detail' });
        }
      } catch (_) {
        // Keep local detail visible even when sync fails.
      }
    }

    const detail = store.getCropPlanDetail(this.data.cropCode);
    if (!detail) {
      this.setData({
        detail: null,
      });
      return;
    }

    this.setData({
      detail: {
        ...detail,
        stages: detail.stages.map((stage) => ({
          ...stage,
          statusClass: buildStageStatusClass(stage.status),
          milestones: stage.milestones.map((milestone) => ({
            ...milestone,
            actions: milestone.actions.map((action) => ({
              ...action,
              statusClass: buildActionStatusClass(action.status),
            })),
          })),
        })),
      },
    });
  },

  openActionDetail(event) {
    const actionId = String(event.currentTarget.dataset.actionId || '');
    if (!this.data.detail || !actionId) {
      return;
    }

    wx.navigateTo({
      url: `/pages/plan/action?planInstanceId=${this.data.detail.planInstanceId}&actionId=${actionId}`,
    });
  },
});
