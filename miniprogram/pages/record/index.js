const calendarUtils = require('../../utils/calendar');
const dateUtils = require('../../utils/date');
const store = require('../../utils/store');

function buildReminderPreview(dateValue, timeValue) {
  const dueAt = dateUtils.combineDateAndTime(dateValue, timeValue);
  const dueInPast = dateUtils.isPastDate(dueAt);

  return {
    dueAt,
    previewTimeText: dateUtils.formatFriendlyDateTime(dueAt),
    previewHint: dueInPast
      ? '这个时间已经过去了。保存后它会直接进入“已逾期”，不会出现在“即将到来”里。'
      : '保存后它会出现在待办里，并自动尝试写入手机日历提醒。微信小程序本身仍不支持离线本地闹钟。',
  };
}

Page({
  data: {
    noteText: '',
    reminderEnabled: false,
    reminderDate: '',
    reminderTime: '',
    previewTimeText: '',
    previewHint: '',
    feedbackMessage: '',
    stats: {
      entryCount: 0,
      pendingTaskCount: 0,
      overdueTaskCount: 0,
      completedTaskCount: 0,
    },
  },

  onLoad() {
    this.ensureReminderDraft();
    this.refreshPage();
  },

  onShow() {
    this.refreshPage();
  },

  onPullDownRefresh() {
    this.refreshPage();
    wx.stopPullDownRefresh();
  },

  ensureReminderDraft() {
    if (this.data.reminderDate && this.data.reminderTime) {
      return;
    }

    const suggestion = dateUtils.getSuggestedReminderParts();
    this.setData({
      reminderDate: suggestion.date,
      reminderTime: suggestion.time,
    });
  },

  refreshPage() {
    this.setData({
      stats: store.getStats(),
    });
    this.updatePreview();
  },

  updatePreview() {
    if (!this.data.reminderEnabled) {
      this.setData({
        previewTimeText: '',
        previewHint: '',
      });
      return;
    }

    try {
      const preview = buildReminderPreview(this.data.reminderDate, this.data.reminderTime);
      this.setData({
        previewTimeText: preview.previewTimeText,
        previewHint: preview.previewHint,
      });
    } catch (error) {
      this.setData({
        previewTimeText: '',
        previewHint: '',
      });
    }
  },

  handleNoteInput(event) {
    this.setData({
      noteText: event.detail.value,
    });
  },

  handleReminderToggle(event) {
    this.ensureReminderDraft();
    this.setData(
      {
        reminderEnabled: !!event.detail.value,
      },
      () => {
        this.updatePreview();
      }
    );
  },

  handleDateChange(event) {
    this.setData(
      {
        reminderDate: event.detail.value,
      },
      () => {
        this.updatePreview();
      }
    );
  },

  handleTimeChange(event) {
    this.setData(
      {
        reminderTime: event.detail.value,
      },
      () => {
        this.updatePreview();
      }
    );
  },

  handleSave() {
    const noteText = String(this.data.noteText || '').trim();

    if (!noteText) {
      wx.showToast({
        title: '先写点内容',
        icon: 'none',
      });
      return;
    }

    let dueAt = null;

    if (this.data.reminderEnabled) {
      try {
        dueAt = dateUtils.combineDateAndTime(this.data.reminderDate, this.data.reminderTime);
      } catch (error) {
        wx.showToast({
          title: '提醒时间不完整',
          icon: 'none',
        });
        return;
      }
    }

    const result = store.createEntry({
      noteText,
      dueAt,
    });

    const suggestion = dateUtils.getSuggestedReminderParts();
    let feedbackMessage = '记录已保存到本机时间线。';

    if (result.task && result.task.status === 'overdue') {
      feedbackMessage = '记录已保存，提醒时间已经过去，已自动放进逾期待办。';
    } else if (result.task) {
      feedbackMessage = '记录和待办都已保存，正在尝试写入手机日历提醒。';
    }

    this.setData({
      noteText: '',
      reminderEnabled: false,
      reminderDate: suggestion.date,
      reminderTime: suggestion.time,
      previewTimeText: '',
      previewHint: '',
      feedbackMessage,
      stats: store.getStats(),
    });

    wx.showToast({
      title: '已保存',
      icon: 'success',
    });

    if (result.task && result.task.status === 'pending') {
      void this.trySyncPhoneCalendar({
        noteText,
        dueAt,
      });
    }
  },

  async trySyncPhoneCalendar({ noteText, dueAt }) {
    try {
      await calendarUtils.addTaskToPhoneCalendar({
        noteText,
        dueAt,
      });

      this.setData({
        feedbackMessage: '记录、待办和手机日历提醒都已保存。',
      });

      wx.showToast({
        title: '已写入日历',
        icon: 'success',
      });
    } catch (error) {
      if (error && error.code === 'unsupported') {
        this.setData({
          feedbackMessage: '记录和待办都已保存，但当前微信环境不支持写入手机系统日历。',
        });
        return;
      }

      if (error && error.code === 'cancel') {
        this.setData({
          feedbackMessage: '记录和待办都已保存，但你刚刚取消了写入手机日历。',
        });
        return;
      }

      if (error && error.code === 'permission_denied') {
        this.setData({
          feedbackMessage: '记录和待办都已保存，但微信还没有拿到系统日历权限。',
        });

        wx.showModal({
          title: '日历权限未开启',
          content: '这条记录已经保存。要让手机日历提醒生效，请允许微信写入系统日历后再试一次。',
          showCancel: false,
          confirmText: '知道了',
        });
        return;
      }

      this.setData({
        feedbackMessage: '记录和待办都已保存，但写入手机日历失败了。',
      });
    }
  },

  goRecord() {},

  goTimeline() {
    wx.redirectTo({
      url: '/pages/timeline/index',
    });
  },

  goTasks() {
    wx.redirectTo({
      url: '/pages/tasks/index',
    });
  },
});
