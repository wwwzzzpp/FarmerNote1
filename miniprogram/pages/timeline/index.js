const mediaUtils = require('../../utils/media');
const dateUtils = require('../../utils/date');
const store = require('../../utils/store');

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function getWeekdayLabel(date) {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
}

function formatDayKey(value) {
  const date = dateUtils.toDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getStartOfDay(value) {
  const date = dateUtils.toDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function formatDayGroupMeta(value, reference) {
  const date = dateUtils.toDate(value);
  const baseDay = getStartOfDay(reference || new Date());
  const targetDay = getStartOfDay(date);
  const diffDays = Math.round((targetDay.getTime() - baseDay.getTime()) / (24 * 60 * 60 * 1000));

  let relativeLabel = '';

  if (diffDays === 0) {
    relativeLabel = '今天';
  } else if (diffDays === -1) {
    relativeLabel = '昨天';
  } else if (diffDays === 1) {
    relativeLabel = '明天';
  }

  return {
    dayKey: formatDayKey(date),
    dayLabel: relativeLabel || `${date.getMonth() + 1}月${date.getDate()}日`,
    dayCaption: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 · ${getWeekdayLabel(date)}`,
  };
}

function formatTimelineClock(value) {
  const date = dateUtils.toDate(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildEntryViewModel(entry, focusEntryId) {
  let statusLabel = '纯记录';
  let statusClass = 'status-chip--neutral';
  let dotClass = 'thread-dot--neutral';

  if (entry.task && entry.task.status === 'pending') {
    statusLabel = '待办';
    statusClass = 'status-chip--warning';
    dotClass = 'thread-dot--warning';
  } else if (entry.task && entry.task.status === 'overdue') {
    statusLabel = '已逾期';
    statusClass = 'status-chip--danger';
    dotClass = 'thread-dot--danger';
  } else if (entry.task && entry.task.status === 'completed') {
    statusLabel = '已完成';
    statusClass = 'status-chip--success';
    dotClass = 'thread-dot--success';
  }

  return {
    id: entry.id,
    noteText: entry.noteText,
    photoPath: entry.photoPath || '',
    hasPhoto: !!entry.photoPath,
    createdAt: entry.createdAt,
    createdClockLabel: formatTimelineClock(entry.createdAt),
    focusClass: entry.id === focusEntryId ? 'timeline-card--focused' : '',
    dotClass,
    statusLabel,
    statusClass,
    hasTask: !!entry.task,
    taskId: entry.task ? entry.task.id : '',
  };
}

function groupEntriesByDay(entries, reference) {
  const groupedMap = Object.create(null);
  const orderedKeys = [];

  entries.forEach((entry) => {
    const meta = formatDayGroupMeta(entry.createdAt, reference);

    if (!groupedMap[meta.dayKey]) {
      groupedMap[meta.dayKey] = {
        dayKey: meta.dayKey,
        dayLabel: meta.dayLabel,
        dayCaption: meta.dayCaption,
        countLabel: '',
        entries: [],
      };
      orderedKeys.push(meta.dayKey);
    }

    groupedMap[meta.dayKey].entries.push(entry);
  });

  return orderedKeys.map((dayKey) => {
    const group = groupedMap[dayKey];

    return {
      dayKey: group.dayKey,
      dayLabel: group.dayLabel,
      dayCaption: group.dayCaption,
      countLabel: `${group.entries.length} 条`,
      entries: group.entries.map((entry, index) => ({
        ...entry,
        isLastInGroup: index === group.entries.length - 1,
      })),
    };
  });
}

Page({
  data: {
    dayGroups: [],
    entryCount: 0,
    isEmpty: true,
    isInitialLoading: false,
    hasResolvedInitialLoad: false,
    focusEntryId: '',
  },

  onLoad(options) {
    this.setData({
      focusEntryId: options.focusEntryId || '',
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
    const entries = store
      .getTimelineEntries()
      .map((entry) => buildEntryViewModel(entry, this.data.focusEntryId));
    const dayGroups = groupEntriesByDay(entries, new Date());

    return {
      dayGroups,
      entryCount: entries.length,
      isEmpty: entries.length === 0,
    };
  },

  async refreshPage() {
    const isSignedIn = store.isSignedInToCloud();
    const localViewState = this.getLocalViewState();
    const shouldShowInitialLoading =
      !this.data.hasResolvedInitialLoad && localViewState.isEmpty && isSignedIn;

    this.setData({
      ...localViewState,
      isInitialLoading: shouldShowInitialLoading,
    });

    if (isSignedIn) {
      try {
        await store.syncNow();
      } catch (_) {
        // Keep local timeline visible when cloud sync fails.
      }
    }

    this.setData({
      ...this.getLocalViewState(),
      isInitialLoading: false,
      hasResolvedInitialLoad: true,
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

  goTimeline() {},

  goTasks() {
    wx.redirectTo({
      url: '/pages/tasks/index',
    });
  },
});
