const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const longFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function isPastDate(value: string | Date, reference = new Date()) {
  return toDate(value).getTime() <= reference.getTime();
}

export function formatFriendlyDateTime(value: string | Date) {
  return longFormatter.format(toDate(value));
}

export function formatCompactDateTime(value: string | Date) {
  return dateTimeFormatter.format(toDate(value));
}

export function formatRelativeReminder(value: string | Date, reference = new Date()) {
  const date = toDate(value);
  const tomorrow = new Date(reference);
  tomorrow.setDate(reference.getDate() + 1);

  if (isSameDay(date, reference)) {
    return `今天 ${dateTimeFormatter.format(date).split(' ')[1] ?? dateTimeFormatter.format(date)}`;
  }

  if (isSameDay(date, tomorrow)) {
    return `明天 ${dateTimeFormatter.format(date).split(' ')[1] ?? dateTimeFormatter.format(date)}`;
  }

  return formatCompactDateTime(date);
}

export function getSuggestedReminderDate(reference = new Date()) {
  const next = new Date(reference.getTime() + 60 * 60 * 1000);
  const roundedMinutes = Math.ceil(next.getMinutes() / 10) * 10;

  next.setMinutes(roundedMinutes === 60 ? 0 : roundedMinutes, 0, 0);

  if (roundedMinutes === 60) {
    next.setHours(next.getHours() + 1);
  }

  return next;
}

export function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
