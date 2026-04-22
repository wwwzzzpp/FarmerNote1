const mediaUtils = require('../../utils/media');
const startupConsent = require('../../utils/startup-consent');
const store = require('../../utils/store');
const taskModuleUtils = require('../../utils/task-module');

Page({
  data: {
    upcomingTasks: [],
    overdueTasks: [],
    completedTasks: [],
    hasTasks: false,
    hasUpcomingTasks: false,
    hasOverdueTasks: false,
    hasCompletedTasks: false,
    isInitialLoading: false,
    hasResolvedInitialLoad: false,
    focusTaskId: '',
  },

  onLoad(options) {
    this.setData({
      focusTaskId: options.focusTaskId || '',
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
    await this.refreshPage();
    wx.stopPullDownRefresh();
  },

  getLocalViewState() {
    return taskModuleUtils.buildTaskModuleViewState(store.getTaskSections(), {
      focusTaskId: this.data.focusTaskId,
    });
  },

  async refreshPage() {
    const isSignedIn = store.isSignedInToCloud();
    const localViewState = this.getLocalViewState();
    const shouldShowInitialLoading =
      !this.data.hasResolvedInitialLoad && !localViewState.hasTasks && isSignedIn;

    this.setData({
      ...localViewState,
      isInitialLoading: shouldShowInitialLoading,
    });

    if (isSignedIn) {
      try {
        await store.syncNow();
      } catch (_) {
        // Keep local tasks visible when cloud sync fails.
      }
    }

    this.setData({
      ...this.getLocalViewState(),
      isInitialLoading: false,
      hasResolvedInitialLoad: true,
    });
  },

  completeTask(event) {
    const { taskId } = event.currentTarget.dataset;

    store.completeTask(taskId);
    void this.refreshPage();
    wx.showToast({
      title: '已完成',
      icon: 'success',
    });
  },

  deleteTask(event) {
    const { taskId } = event.currentTarget.dataset;

    wx.showModal({
      title: '删除待办',
      content: '删除后，这条任务会被移除，但原记录仍会保留在时间线里。',
      success: ({ confirm }) => {
        if (!confirm) {
          return;
        }

        store.deleteTask(taskId);
        void this.refreshPage();
        wx.showToast({
          title: '已删除',
          icon: 'success',
        });
      },
    });
  },

  previewPhoto(event) {
    const { photoPath } = event.currentTarget.dataset;
    mediaUtils.previewPhoto(photoPath);
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

  goTasks() {},

  goMe() {
    wx.redirectTo({
      url: '/pages/settings/index',
    });
  },
});
