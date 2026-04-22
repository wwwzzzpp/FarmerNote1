const calendarUtils = require('../../utils/calendar');
const dateUtils = require('../../utils/date');
const mediaUtils = require('../../utils/media');
const reminderIntent = require('../../utils/reminder-intent');
const startupConsent = require('../../utils/startup-consent');
const store = require('../../utils/store');
const taskModuleUtils = require('../../utils/task-module');
const TASK_MODULE_PAGE_SIZE = 10;

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

function getLocalRecordViewState(options) {
  const settings = options || {};
  return {
    stats: store.getStats(),
    cloudStatus: store.getCloudStatus(),
    taskModule: taskModuleUtils.buildTaskModuleViewState(store.getTaskSections(), {
      page: settings.taskModulePage,
      pageSize: TASK_MODULE_PAGE_SIZE,
      focusTaskId: settings.focusTaskId,
    }),
  };
}

function getEmptyRecordViewState() {
  return {
    stats: {
      entryCount: 0,
      pendingTaskCount: 0,
      overdueTaskCount: 0,
      completedTaskCount: 0,
    },
    cloudStatus: {
      isConfigured: store.isCloudConfigured(),
      isSignedIn: false,
      isBusy: false,
      actionLabel: '',
      primaryActionLabel: '',
      canUseWeChatLogin: false,
      shouldShowPrimaryAction: false,
      secondaryActionLabel: '',
      headline: '继续使用前，请先完成协议确认',
      detail: '只有在你同意《隐私政策》和《用户协议》后，小程序才会恢复本地状态与云端账号信息。',
      linkedProviders: [],
      maskedPhone: '',
      canLinkPhone: false,
      canLinkWeChat: false,
      hasPhone: false,
      hasWeChat: false,
    },
    taskModule: taskModuleUtils.getEmptyTaskModuleViewState(),
  };
}

Page({
  data: {
    noteText: '',
    reminderEnabled: false,
    reminderDate: '',
    reminderTime: '',
    draftPlanInstanceId: '',
    draftPlanActionId: '',
    draftSourceLabel: '',
    smartReminderVisible: false,
    smartReminderTag: '',
    smartReminderToneClass: 'status-chip--neutral',
    smartReminderMessage: '',
    smartReminderMatchedText: '',
    manualReminderEdited: false,
    autoReminderApplied: false,
    previewTimeText: '',
    previewHint: '',
    feedbackMessage: '',
    photoTempPath: '',
    isSaving: false,
    phoneNumber: '',
    phoneCode: '',
    phoneCodeCountdown: 0,
    phoneActionBusy: false,
    hasResolvedTaskModuleLoad: false,
    taskModulePage: 1,
    taskModuleFocusTaskId: '',
    ...getEmptyRecordViewState(),
  },

  onLoad(options) {
    this.noteAnalysisTimer = null;
    this.phoneCodeTimer = null;
    this.lastAcceptedNoteText = '';
    this.lastLineLimitToastAt = 0;
    if (!startupConsent.ensureAcceptedOrLaunch()) {
      return;
    }
    this.setData({
      taskModuleFocusTaskId: options && options.focusTaskId ? String(options.focusTaskId) : '',
      taskModulePage: 1,
    });
    this.ensureReminderDraft();
    this.applyIncomingDraft(options || {});
    void this.refreshPage();
  },

  onUnload() {
    if (this.noteAnalysisTimer) {
      clearTimeout(this.noteAnalysisTimer);
      this.noteAnalysisTimer = null;
    }

    if (this.phoneCodeTimer) {
      clearInterval(this.phoneCodeTimer);
      this.phoneCodeTimer = null;
    }
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

  onReachBottom() {
    if (!startupConsent.ensureAcceptedOrLaunch()) {
      return;
    }

    if (!this.data.taskModule || !this.data.taskModule.hasMore) {
      return;
    }

    void this.loadMoreTaskModule();
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

  applyIncomingDraft(options) {
    const noteText = options.noteText ? decodeURIComponent(options.noteText) : '';
    const reminderEnabled =
      options.reminderEnabled === '1' || options.reminderEnabled === 'true';
    const reminderDate = options.reminderDate ? String(options.reminderDate) : this.data.reminderDate;
    const reminderTime = options.reminderTime ? String(options.reminderTime) : this.data.reminderTime;
    const draftSourceLabel = options.sourceLabel ? decodeURIComponent(options.sourceLabel) : '';

    if (!noteText && !options.planInstanceId && !options.planActionId) {
      return;
    }

    this.lastAcceptedNoteText = noteText;
    this.setData(
      {
        noteText,
        reminderEnabled,
        reminderDate,
        reminderTime,
        draftPlanInstanceId: options.planInstanceId ? String(options.planInstanceId) : '',
        draftPlanActionId: options.planActionId ? String(options.planActionId) : '',
        draftSourceLabel,
        smartReminderVisible: false,
        smartReminderTag: '',
        smartReminderToneClass: 'status-chip--neutral',
        smartReminderMessage: '',
        smartReminderMatchedText: '',
        manualReminderEdited: reminderEnabled,
        autoReminderApplied: false,
      },
      () => {
        this.updatePreview();
      }
    );
  },

  async refreshPage(options) {
    const settings = options || {};
    const nextTaskModuleFocusTaskId =
      settings.focusTaskId !== undefined
        ? String(settings.focusTaskId || '')
        : String(this.data.taskModuleFocusTaskId || '');
    const nextTaskModulePage = Number(
      settings.taskModulePage || this.data.taskModulePage || 1
    );
    const localViewState = getLocalRecordViewState({
      taskModulePage: nextTaskModulePage,
      focusTaskId: nextTaskModuleFocusTaskId,
    });
    const shouldShowTaskModuleInitialLoading =
      !this.data.hasResolvedTaskModuleLoad &&
      !localViewState.taskModule.hasTasks &&
      store.isSignedInToCloud();

    this.setData({
      ...localViewState,
      taskModule: {
        ...localViewState.taskModule,
        isInitialLoading: shouldShowTaskModuleInitialLoading,
      },
      taskModulePage: localViewState.taskModule.page,
      taskModuleFocusTaskId: nextTaskModuleFocusTaskId,
    });

    if (settings.sync !== false && store.isSignedInToCloud()) {
      try {
        await store.syncNow();
      } catch (_) {
        // Keep local usage available even when cloud sync fails.
      }
    }

    const refreshedViewState = getLocalRecordViewState({
      taskModulePage: nextTaskModulePage,
      focusTaskId: nextTaskModuleFocusTaskId,
    });
    this.setData({
      ...refreshedViewState,
      taskModule: {
        ...refreshedViewState.taskModule,
        isInitialLoading: false,
      },
      hasResolvedTaskModuleLoad: true,
      taskModulePage: refreshedViewState.taskModule.page,
      taskModuleFocusTaskId: nextTaskModuleFocusTaskId,
    });
    this.updatePreview();
  },

  async loadMoreTaskModule() {
    if (!this.data.taskModule || !this.data.taskModule.hasMore) {
      return;
    }

    await this.refreshPage({
      sync: false,
      taskModulePage: Number(this.data.taskModule.page || this.data.taskModulePage || 1) + 1,
      focusTaskId: this.data.taskModuleFocusTaskId,
    });
  },

  startPhoneCodeCountdown() {
    if (this.phoneCodeTimer) {
      clearInterval(this.phoneCodeTimer);
    }

    this.setData({
      phoneCodeCountdown: 60,
    });

    this.phoneCodeTimer = setInterval(() => {
      const next = Number(this.data.phoneCodeCountdown || 0) - 1;
      if (next <= 0) {
        clearInterval(this.phoneCodeTimer);
        this.phoneCodeTimer = null;
        this.setData({
          phoneCodeCountdown: 0,
        });
        return;
      }

      this.setData({
        phoneCodeCountdown: next,
      });
    }, 1000);
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

  scheduleReminderAnalysis(noteText) {
    if (this.noteAnalysisTimer) {
      clearTimeout(this.noteAnalysisTimer);
    }

    this.noteAnalysisTimer = setTimeout(() => {
      this.noteAnalysisTimer = null;
      this.runReminderAnalysis(noteText);
    }, 700);
  },

  clearSmartReminder(options) {
    const settings = options || {};
    const nextDraft = dateUtils.getSuggestedReminderParts();
    const nextState = {
      smartReminderVisible: false,
      smartReminderTag: '',
      smartReminderToneClass: 'status-chip--neutral',
      smartReminderMessage: '',
      smartReminderMatchedText: '',
    };

    if (settings.resetManualEdited) {
      nextState.manualReminderEdited = false;
    }

    if (settings.resetAutoReminder) {
      nextState.autoReminderApplied = false;
    }

    if (settings.resetReminderFields) {
      nextState.reminderEnabled = false;
      nextState.reminderDate = nextDraft.date;
      nextState.reminderTime = nextDraft.time;
      nextState.previewTimeText = '';
      nextState.previewHint = '';
    }

    this.setData(nextState, () => {
      if (settings.resetReminderFields) {
        this.updatePreview();
      }
    });
  },

  buildManualOverrideState(message) {
    if (!this.data.smartReminderMatchedText) {
      return {
        manualReminderEdited: true,
        autoReminderApplied: false,
      };
    }

    return {
      manualReminderEdited: true,
      autoReminderApplied: false,
      smartReminderVisible: true,
      smartReminderTag: '手动优先',
      smartReminderToneClass: 'status-chip--warning',
      smartReminderMessage: message,
    };
  },

  runReminderAnalysis(noteText) {
    const text = String(noteText || '').trim();

    if (!text) {
      this.clearSmartReminder({
        resetManualEdited: true,
        resetAutoReminder: true,
        resetReminderFields: true,
      });
      return;
    }

    const result = reminderIntent.parseReminderIntent(text, {
      reference: new Date(),
    });

    if (!result.needsReminder) {
      this.clearSmartReminder({
        resetAutoReminder: true,
        resetReminderFields: this.data.autoReminderApplied && !this.data.manualReminderEdited,
      });
      return;
    }

    const parts = dateUtils.splitDateTime(result.dueAt);

    if (this.data.manualReminderEdited) {
      this.setData({
        smartReminderVisible: true,
        smartReminderTag: '手动优先',
        smartReminderToneClass: 'status-chip--warning',
        smartReminderMessage: `识别到“${result.matchedText || '待处理时间'}”，但你已经手动改过提醒时间，系统不再自动覆盖。`,
        smartReminderMatchedText: result.matchedText,
        autoReminderApplied: false,
      });
      return;
    }

    this.setData(
      {
        reminderEnabled: true,
        reminderDate: parts.date,
        reminderTime: parts.time,
        smartReminderVisible: true,
        smartReminderTag: result.confidence === 'high' ? '自动填充' : '智能建议',
        smartReminderToneClass:
          result.confidence === 'high' ? 'status-chip--success' : 'status-chip--warning',
        smartReminderMessage: result.message,
        smartReminderMatchedText: result.matchedText,
        autoReminderApplied: true,
      },
      () => {
        this.updatePreview();
      }
    );
  },

  handleNoteInput(event) {
    const noteText = String(event.detail.value || '')
      .replace(/\r\n/g, '\n')
      .split('\n')
      .slice(0, 2)
      .join('\n');

    this.setData({
      noteText,
    });

    if (!String(noteText || '').trim()) {
      if (this.noteAnalysisTimer) {
        clearTimeout(this.noteAnalysisTimer);
        this.noteAnalysisTimer = null;
      }

      this.clearSmartReminder({
        resetManualEdited: true,
        resetAutoReminder: true,
        resetReminderFields: true,
      });
      return;
    }

    this.scheduleReminderAnalysis(noteText);
  },

  handleNoteLineChange(event) {
    const lineCount = Number((event.detail && event.detail.lineCount) || 0);

    if (lineCount <= 2) {
      this.lastAcceptedNoteText = this.data.noteText;
      return;
    }

    const fallbackNoteText = this.lastAcceptedNoteText || '';

    if (this.noteAnalysisTimer) {
      clearTimeout(this.noteAnalysisTimer);
      this.noteAnalysisTimer = null;
    }

    this.setData({
      noteText: fallbackNoteText,
    });

    if (fallbackNoteText) {
      this.scheduleReminderAnalysis(fallbackNoteText);
    } else {
      this.clearSmartReminder({
        resetManualEdited: true,
        resetAutoReminder: true,
        resetReminderFields: true,
      });
    }

    const now = Date.now();
    if (now - this.lastLineLimitToastAt > 1200) {
      this.lastLineLimitToastAt = now;
      wx.showToast({
        title: '最多输入两行',
        icon: 'none',
      });
    }
  },

  async handleTakePhoto() {
    try {
      const photoTempPath = await mediaUtils.chooseCameraPhoto();

      this.setData({
        photoTempPath,
      });
    } catch (error) {
      if (error && error.code === 'cancel') {
        return;
      }

      wx.showToast({
        title: '拍照失败',
        icon: 'none',
      });
    }
  },

  clearPhoto() {
    this.setData({
      photoTempPath: '',
    });
  },

  previewPhoto() {
    mediaUtils.previewPhoto(this.data.photoTempPath);
  },

  handleReminderToggle(event) {
    this.ensureReminderDraft();
    this.setData(
      Object.assign(
        {
          reminderEnabled: !!event.detail.value,
        },
        this.buildManualOverrideState(
          `识别到“${this.data.smartReminderMatchedText}”，但你选择了手动控制提醒。`
        )
      ),
      () => {
        this.updatePreview();
      }
    );
  },

  handleDateChange(event) {
    this.setData(
      Object.assign(
        {
          reminderDate: event.detail.value,
        },
        this.buildManualOverrideState(
          `识别到“${this.data.smartReminderMatchedText}”，但当前时间已按你的手动修改为准。`
        )
      ),
      () => {
        this.updatePreview();
      }
    );
  },

  handleTimeChange(event) {
    this.setData(
      Object.assign(
        {
          reminderTime: event.detail.value,
        },
        this.buildManualOverrideState(
          `识别到“${this.data.smartReminderMatchedText}”，但当前时间已按你的手动修改为准。`
        )
      ),
      () => {
        this.updatePreview();
      }
    );
  },

  async handleSave() {
    if (this.data.isSaving) {
      return;
    }

    const noteText = String(this.data.noteText || '').trim();

    if (!noteText) {
      wx.showToast({
        title: '先写点内容',
        icon: 'none',
      });
      return;
    }

    let dueAt = null;
    let savedPhotoPath = '';

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

    this.setData({
      isSaving: true,
    });

    try {
      if (this.data.photoTempPath) {
        savedPhotoPath = await mediaUtils.persistPhoto(this.data.photoTempPath);
      }

      const result = store.createEntry({
        noteText,
        dueAt,
        photoPath: savedPhotoPath,
        planInstanceId: this.data.draftPlanInstanceId,
        planActionId: this.data.draftPlanActionId,
      });

      const suggestion = dateUtils.getSuggestedReminderParts();
      let feedbackMessage = savedPhotoPath
        ? '文字和现场照片都已保存到本机时间线。'
        : '记录已保存到本机时间线。';

      if (result.entry && result.entry.cloudTracked) {
        feedbackMessage = savedPhotoPath
          ? '记录、照片都已保存，并已加入云同步队列。'
          : '记录已保存，并已加入云同步队列。';
      }

      if (result.task && result.task.status === 'overdue') {
        feedbackMessage = savedPhotoPath
          ? '记录、照片都已保存，提醒时间已经过去，已自动放进逾期待办。'
          : '记录已保存，提醒时间已经过去，已自动放进逾期待办。';
      } else if (result.task) {
        feedbackMessage = savedPhotoPath
          ? '记录、照片和待办都已保存，正在尝试写入手机日历提醒。'
          : '记录和待办都已保存，正在尝试写入手机日历提醒。';
      }

      this.lastAcceptedNoteText = '';
      this.setData({
        noteText: '',
        reminderEnabled: false,
        reminderDate: suggestion.date,
        reminderTime: suggestion.time,
        smartReminderVisible: false,
        smartReminderTag: '',
        smartReminderToneClass: 'status-chip--neutral',
        smartReminderMessage: '',
        smartReminderMatchedText: '',
        manualReminderEdited: false,
        autoReminderApplied: false,
        previewTimeText: '',
        previewHint: '',
        feedbackMessage,
        photoTempPath: '',
        draftPlanInstanceId: '',
        draftPlanActionId: '',
        draftSourceLabel: '',
        stats: store.getStats(),
        cloudStatus: store.getCloudStatus(),
        taskModule: taskModuleUtils.buildTaskModuleViewState(store.getTaskSections(), {
          page: this.data.taskModulePage,
          pageSize: TASK_MODULE_PAGE_SIZE,
          focusTaskId: this.data.taskModuleFocusTaskId,
        }),
      });

      wx.showToast({
        title: '已保存',
        icon: 'success',
      });

      if (result.task && result.task.status === 'pending') {
        void this.trySyncPhoneCalendar({
          noteText,
          dueAt,
          hasPhoto: !!savedPhotoPath,
        });
      }
    } catch (error) {
      if (savedPhotoPath) {
        void mediaUtils.removeSavedPhoto(savedPhotoPath);
      }

      wx.showToast({
        title: error && error.code === 'save_failed' ? '照片保存失败' : '保存失败，请重试',
        icon: 'none',
      });
    } finally {
      this.setData({
        isSaving: false,
      });
    }
  },

  async trySyncPhoneCalendar({ noteText, dueAt, hasPhoto }) {
    const baseLabel = hasPhoto ? '记录、照片和待办都已保存' : '记录和待办都已保存';

    try {
      await calendarUtils.addTaskToPhoneCalendar({
        noteText,
        dueAt,
      });

      this.setData({
        feedbackMessage: `${baseLabel}，手机日历提醒也已写入。`,
      });

      wx.showToast({
        title: '已写入日历',
        icon: 'success',
      });
    } catch (error) {
      if (error && error.code === 'unsupported') {
        this.setData({
          feedbackMessage: `${baseLabel}，但当前微信环境不支持写入手机系统日历。`,
        });
        return;
      }

      if (error && error.code === 'cancel') {
        this.setData({
          feedbackMessage: `${baseLabel}，但你刚刚取消了写入手机日历。`,
        });
        return;
      }

      if (error && error.code === 'permission_denied') {
        this.setData({
          feedbackMessage: `${baseLabel}，但微信还没有拿到系统日历权限。`,
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
        feedbackMessage: `${baseLabel}，但写入手机日历失败了。`,
      });
    }
  },

  async handleCloudPrimaryAction() {
    if (!store.isCloudConfigured()) {
      return;
    }

    try {
      if (store.isSignedInToCloud()) {
        await store.syncNow();
      } else {
        await store.signInToCloud();
      }
      await this.refreshPage({
        sync: false,
      });
    } catch (error) {
      await this.refreshPage({
        sync: false,
      });
      wx.showToast({
        title: (error && error.message) || '云同步失败，请稍后再试',
        icon: 'none',
      });
    }
  },

  handlePhoneNumberInput(event) {
    this.setData({
      phoneNumber: String((event.detail && event.detail.value) || ''),
    });
  },

  handlePhoneCodeInput(event) {
    this.setData({
      phoneCode: String((event.detail && event.detail.value) || '').replace(/\s+/g, ''),
    });
  },

  async handleSendPhoneCode() {
    if (this.data.phoneActionBusy || this.data.phoneCodeCountdown > 0) {
      return;
    }

    this.setData({
      phoneActionBusy: true,
    });

    try {
      await store.sendPhoneCodeToCloud(this.data.phoneNumber);
      this.startPhoneCodeCountdown();
      wx.showToast({
        title: '验证码已发送',
        icon: 'none',
      });
    } catch (error) {
      wx.showToast({
        title: (error && error.message) || '验证码发送失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        phoneActionBusy: false,
      });
      await this.refreshPage({
        sync: false,
      });
    }
  },

  async handleCloudPhoneAction() {
    if (this.data.phoneActionBusy) {
      return;
    }

    this.setData({
      phoneActionBusy: true,
    });

    try {
      if (store.isSignedInToCloud()) {
        await store.linkPhoneToCloud(this.data.phoneNumber, this.data.phoneCode);
        wx.showToast({
          title: '手机号已绑定',
          icon: 'none',
        });
      } else {
        await store.signInToCloudWithPhone(this.data.phoneNumber, this.data.phoneCode);
        wx.showToast({
          title: '已登录云端',
          icon: 'none',
        });
      }

      this.setData({
        phoneCode: '',
      });
      await this.refreshPage({
        sync: false,
      });
    } catch (error) {
      await this.refreshPage({
        sync: false,
      });
      wx.showToast({
        title: (error && error.message) || '手机号操作失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        phoneActionBusy: false,
      });
    }
  },

  async handleLinkWeChatAction() {
    if (this.data.phoneActionBusy) {
      return;
    }

    this.setData({
      phoneActionBusy: true,
    });

    try {
      await store.linkWeChatToCloud();
      await this.refreshPage({
        sync: false,
      });
      wx.showToast({
        title: '微信已绑定',
        icon: 'none',
      });
    } catch (error) {
      await this.refreshPage({
        sync: false,
      });
      wx.showToast({
        title: (error && error.message) || '微信绑定失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        phoneActionBusy: false,
      });
    }
  },

  previewTaskPhoto(event) {
    const { photoPath } = event.currentTarget.dataset;
    mediaUtils.previewPhoto(photoPath);
  },

  async handleTaskComplete(event) {
    const { taskId } = event.currentTarget.dataset;

    store.completeTask(taskId);
    await this.refreshPage();
    wx.showToast({
      title: '已完成',
      icon: 'success',
    });
  },

  handleTaskDelete(event) {
    const { taskId } = event.currentTarget.dataset;

    wx.showModal({
      title: '删除待办',
      content: '删除后，这条任务会被移除，但原记录仍会保留在时间线里。',
      success: async ({ confirm }) => {
        if (!confirm) {
          return;
        }

        store.deleteTask(taskId);
        await this.refreshPage();
        wx.showToast({
          title: '已删除',
          icon: 'success',
        });
      },
    });
  },

  goRecord() {
    this.setData({
      taskModuleFocusTaskId: '',
    });
  },

  goPlan() {
    wx.redirectTo({
      url: '/pages/plan/index',
    });
  },

  goSettings() {
    wx.navigateTo({
      url: '/pages/settings/index',
    });
  },

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
