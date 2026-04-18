const dateUtils = require('../../utils/date');
const mediaUtils = require('../../utils/media');
const store = require('../../utils/store');

function buildTaskViewModel(task, focusTaskId) {
  let statusLabel = '待处理';
  let statusClass = 'status-chip--warning';

  if (task.status === 'overdue') {
    statusLabel = '已逾期';
    statusClass = 'status-chip--danger';
  } else if (task.status === 'completed') {
    statusLabel = '已完成';
    statusClass = 'status-chip--success';
  }

  return {
    id: task.id,
    noteText: task.noteText,
    photoPath: task.photoPath || '',
    hasPhoto: !!task.photoPath,
    dueLabel: dateUtils.formatRelativeReminder(task.dueAt),
    dueCompactLabel: dateUtils.formatCompactDateTime(task.dueAt),
    focusClass: task.id === focusTaskId ? 'task-card--focused' : '',
    statusLabel,
    statusClass,
    canComplete: task.status !== 'completed',
    completedCompactLabel:
      task.status === 'completed' && task.completedAt
        ? dateUtils.formatCompactDateTime(task.completedAt)
        : '',
  };
}

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
    void this.refreshPage();
  },

  async onPullDownRefresh() {
    await this.refreshPage();
    wx.stopPullDownRefresh();
  },

  getLocalViewState() {
    const sections = store.getTaskSections();
    const upcomingTasks = sections.upcomingTasks.map((task) => buildTaskViewModel(task, this.data.focusTaskId));
    const overdueTasks = sections.overdueTasks.map((task) => buildTaskViewModel(task, this.data.focusTaskId));
    const completedTasks = sections.completedTasks.map((task) =>
      buildTaskViewModel(task, this.data.focusTaskId)
    );
    const hasTasks = upcomingTasks.length + overdueTasks.length + completedTasks.length > 0;

    return {
      upcomingTasks,
      overdueTasks,
      completedTasks,
      hasTasks,
      hasUpcomingTasks: upcomingTasks.length > 0,
      hasOverdueTasks: overdueTasks.length > 0,
      hasCompletedTasks: completedTasks.length > 0,
    };
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

  goTimeline() {
    wx.redirectTo({
      url: '/pages/timeline/index',
    });
  },

  goTasks() {},
});
