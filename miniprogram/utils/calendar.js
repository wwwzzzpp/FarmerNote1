function canAddPhoneCalendar() {
  if (typeof wx === 'undefined') {
    return false;
  }

  if (typeof wx.addPhoneCalendar === 'function') {
    return true;
  }

  if (typeof wx.canIUse === 'function') {
    try {
      return wx.canIUse('addPhoneCalendar');
    } catch (error) {
      return false;
    }
  }

  return false;
}

function inferCalendarErrorCode(error) {
  const message = String((error && error.errMsg) || '').toLowerCase();

  if (message.includes('cancel')) {
    return 'cancel';
  }

  if (
    message.includes('auth deny') ||
    message.includes('authorize') ||
    message.includes('permission')
  ) {
    return 'permission_denied';
  }

  return 'failed';
}

function addTaskToPhoneCalendar({ noteText, dueAt, title }) {
  return new Promise((resolve, reject) => {
    if (!canAddPhoneCalendar()) {
      reject({
        code: 'unsupported',
        errMsg: 'wx.addPhoneCalendar is unavailable',
      });
      return;
    }

    const startTime = Math.floor(new Date(dueAt).getTime() / 1000);
    const endTime = startTime + 30 * 60;

    wx.addPhoneCalendar({
      title: title || '农事提醒：巡田任务',
      description: String(noteText || '').trim(),
      startTime,
      endTime,
      allDay: false,
      alarm: true,
      alarmOffset: 0,
      success(result) {
        resolve(result);
      },
      fail(error) {
        reject({
          ...error,
          code: inferCalendarErrorCode(error),
        });
      },
    });
  });
}

module.exports = {
  addTaskToPhoneCalendar,
  canAddPhoneCalendar,
};
