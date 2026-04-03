const dateUtils = require('../../utils/date');
const store = require('../../utils/store');

function buildEntryViewModel(entry, focusEntryId) {
  let statusLabel = '纯记录';
  let statusClass = 'status-chip--neutral';

  if (entry.task && entry.task.status === 'pending') {
    statusLabel = '待办';
    statusClass = 'status-chip--warning';
  } else if (entry.task && entry.task.status === 'overdue') {
    statusLabel = '已逾期';
    statusClass = 'status-chip--danger';
  } else if (entry.task && entry.task.status === 'completed') {
    statusLabel = '已完成';
    statusClass = 'status-chip--success';
  }

  return {
    id: entry.id,
    noteText: entry.noteText,
    createdLabel: dateUtils.formatFriendlyDateTime(entry.createdAt),
    updatedLabel: dateUtils.formatFriendlyDateTime(entry.updatedAt),
    focusClass: entry.id === focusEntryId ? 'timeline-card--focused' : '',
    statusLabel,
    statusClass,
    hasTask: !!entry.task,
    taskId: entry.task ? entry.task.id : '',
    taskDueLabel: entry.task ? dateUtils.formatRelativeReminder(entry.task.dueAt) : '',
    taskDueFullLabel: entry.task ? dateUtils.formatFriendlyDateTime(entry.task.dueAt) : '',
  };
}

Page({
  data: {
    entries: [],
    entryCount: 0,
    isEmpty: true,
    focusEntryId: '',
  },

  onLoad(options) {
    this.setData({
      focusEntryId: options.focusEntryId || '',
    });
  },

  onShow() {
    this.refreshPage();
  },

  onPullDownRefresh() {
    this.refreshPage();
    wx.stopPullDownRefresh();
  },

  refreshPage() {
    const entries = store
      .getTimelineEntries()
      .map((entry) => buildEntryViewModel(entry, this.data.focusEntryId));

    this.setData({
      entries,
      entryCount: entries.length,
      isEmpty: entries.length === 0,
    });
  },

  openTask(event) {
    const { taskId } = event.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/tasks/index?focusTaskId=${taskId}`,
    });
  },

  deleteEntry(event) {
    const { entryId, hasTask } = event.currentTarget.dataset;
    const shouldDeleteTask = hasTask === true || hasTask === 'true';

    wx.showModal({
      title: '删除记录',
      content: shouldDeleteTask
        ? '删除后，这条记录和它关联的待办都会一起移除。'
        : '确定删除这条记录吗？',
      success: ({ confirm }) => {
        if (!confirm) {
          return;
        }

        store.deleteEntry(entryId);
        this.refreshPage();
        wx.showToast({
          title: '已删除',
          icon: 'success',
        });
      },
    });
  },

  goRecord() {
    wx.redirectTo({
      url: '/pages/record/index',
    });
  },

  goTimeline() {},

  goTasks() {
    wx.redirectTo({
      url: '/pages/tasks/index',
    });
  },
});
