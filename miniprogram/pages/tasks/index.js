const dateUtils = require('../../utils/date');
const store = require('../../utils/store');

function buildTaskViewModel(task, focusTaskId, editingTaskId) {
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
    entryId: task.entryId,
    noteText: task.noteText,
    dueLabel: dateUtils.formatRelativeReminder(task.dueAt),
    dueFullLabel: dateUtils.formatFriendlyDateTime(task.dueAt),
    entryCreatedLabel: dateUtils.formatFriendlyDateTime(task.entryCreatedAt),
    focusClass: task.id === focusTaskId ? 'task-card--focused' : '',
    isEditing: task.id === editingTaskId,
    statusLabel,
    statusClass,
    canComplete: task.status !== 'completed',
    canEdit: task.status !== 'completed',
    completedLabel:
      task.status === 'completed' && task.completedAt
        ? `完成于 ${dateUtils.formatFriendlyDateTime(task.completedAt)}`
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
    focusTaskId: '',
    editingTaskId: '',
    draftDate: '',
    draftTime: '',
  },

  onLoad(options) {
    this.setData({
      focusTaskId: options.focusTaskId || '',
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
    const sections = store.getTaskSections();
    const upcomingTasks = sections.upcomingTasks.map((task) =>
      buildTaskViewModel(task, this.data.focusTaskId, this.data.editingTaskId)
    );
    const overdueTasks = sections.overdueTasks.map((task) =>
      buildTaskViewModel(task, this.data.focusTaskId, this.data.editingTaskId)
    );
    const completedTasks = sections.completedTasks.map((task) =>
      buildTaskViewModel(task, this.data.focusTaskId, this.data.editingTaskId)
    );

    this.setData({
      upcomingTasks,
      overdueTasks,
      completedTasks,
      hasTasks: upcomingTasks.length + overdueTasks.length + completedTasks.length > 0,
      hasUpcomingTasks: upcomingTasks.length > 0,
      hasOverdueTasks: overdueTasks.length > 0,
      hasCompletedTasks: completedTasks.length > 0,
    });
  },

  startEdit(event) {
    const { taskId } = event.currentTarget.dataset;
    const task = store.getTaskById(taskId);

    if (!task) {
      return;
    }

    const parts = dateUtils.splitDateTime(task.dueAt);
    this.setData(
      {
        editingTaskId: taskId,
        draftDate: parts.date,
        draftTime: parts.time,
      },
      () => {
        this.refreshPage();
      }
    );
  },

  cancelEdit() {
    this.setData(
      {
        editingTaskId: '',
      },
      () => {
        this.refreshPage();
      }
    );
  },

  handleDraftDateChange(event) {
    this.setData({
      draftDate: event.detail.value,
    });
  },

  handleDraftTimeChange(event) {
    this.setData({
      draftTime: event.detail.value,
    });
  },

  saveReschedule(event) {
    const { taskId } = event.currentTarget.dataset;
    let dueAt = '';

    try {
      dueAt = dateUtils.combineDateAndTime(this.data.draftDate, this.data.draftTime);
    } catch (error) {
      wx.showToast({
        title: '新时间不完整',
        icon: 'none',
      });
      return;
    }

    store.rescheduleTask(taskId, dueAt);
    this.setData(
      {
        editingTaskId: '',
      },
      () => {
        this.refreshPage();
      }
    );

    wx.showToast({
      title: '已更新时间',
      icon: 'success',
    });
  },

  completeTask(event) {
    const { taskId } = event.currentTarget.dataset;

    store.completeTask(taskId);
    this.refreshPage();
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
        this.refreshPage();
        wx.showToast({
          title: '已删除',
          icon: 'success',
        });
      },
    });
  },

  openEntry(event) {
    const { entryId } = event.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/timeline/index?focusEntryId=${entryId}`,
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

  goTasks() {},
});
