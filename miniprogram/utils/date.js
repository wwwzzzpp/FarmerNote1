function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateInput(value) {
  const date = toDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTimeInput(value) {
  const date = toDate(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function splitDateTime(value) {
  const date = toDate(value);
  return {
    date: formatDateInput(date),
    time: formatTimeInput(date),
  };
}

function combineDateAndTime(dateValue, timeValue) {
  const dateParts = String(dateValue || '').split('-').map((part) => parseInt(part, 10));
  const timeParts = String(timeValue || '').split(':').map((part) => parseInt(part, 10));

  if (dateParts.length !== 3 || timeParts.length < 2) {
    throw new Error('提醒时间不完整。');
  }

  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;
  const next = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (Number.isNaN(next.getTime())) {
    throw new Error('提醒时间格式不正确。');
  }

  return next.toISOString();
}

function formatFriendlyDateTime(value) {
  const date = toDate(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatCompactDateTime(value) {
  const date = toDate(value);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatRelativeReminder(value, reference) {
  const date = toDate(value);
  const base = reference ? toDate(reference) : new Date();
  const tomorrow = addDays(base, 1);

  if (isSameDay(date, base)) {
    return `今天 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  if (isSameDay(date, tomorrow)) {
    return `明天 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  return formatCompactDateTime(date);
}

function isPastDate(value, reference) {
  const base = reference ? toDate(reference) : new Date();
  return toDate(value).getTime() <= base.getTime();
}

function getSuggestedReminderDate(reference) {
  const next = new Date((reference ? toDate(reference) : new Date()).getTime() + 60 * 60 * 1000);
  const roundedMinutes = Math.ceil(next.getMinutes() / 10) * 10;

  next.setSeconds(0, 0);

  if (roundedMinutes >= 60) {
    next.setHours(next.getHours() + 1);
    next.setMinutes(0);
  } else {
    next.setMinutes(roundedMinutes);
  }

  return next;
}

function getSuggestedReminderParts(reference) {
  return splitDateTime(getSuggestedReminderDate(reference));
}

function truncateText(value, maxLength) {
  if (!value || value.length <= maxLength) {
    return value || '';
  }

  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

module.exports = {
  addDays,
  combineDateAndTime,
  createId,
  formatCompactDateTime,
  formatDateInput,
  formatFriendlyDateTime,
  formatRelativeReminder,
  formatTimeInput,
  getSuggestedReminderDate,
  getSuggestedReminderParts,
  isPastDate,
  splitDateTime,
  toDate,
  truncateText,
};
