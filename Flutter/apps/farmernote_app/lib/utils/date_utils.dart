String pad(int value) {
  return value < 10 ? '0$value' : '$value';
}

DateTime toDate(Object value) {
  if (value is DateTime) {
    return value;
  }
  return DateTime.parse(value.toString());
}

bool isSameDay(DateTime left, DateTime right) {
  return left.year == right.year &&
      left.month == right.month &&
      left.day == right.day;
}

DateTime addDays(DateTime date, int days) {
  return date.add(Duration(days: days));
}

String createId(String prefix) {
  final microseconds = DateTime.now().microsecondsSinceEpoch;
  final nonce = microseconds.toRadixString(36).substring(0, 6);
  return '${prefix}_${DateTime.now().millisecondsSinceEpoch}_$nonce';
}

String formatDateInput(Object value) {
  final date = toDate(value).toLocal();
  return '${date.year}-${pad(date.month)}-${pad(date.day)}';
}

String formatTimeInput(Object value) {
  final date = toDate(value).toLocal();
  return '${pad(date.hour)}:${pad(date.minute)}';
}

DateTime combineDateAndTime(String dateValue, String timeValue) {
  final dateParts = dateValue.split('-').map(int.parse).toList();
  final timeParts = timeValue.split(':').map(int.parse).toList();

  if (dateParts.length != 3 || timeParts.length < 2) {
    throw const FormatException('提醒时间不完整。');
  }

  final candidate = DateTime(
    dateParts[0],
    dateParts[1],
    dateParts[2],
    timeParts[0],
    timeParts[1],
  );

  if (candidate.year != dateParts[0] ||
      candidate.month != dateParts[1] ||
      candidate.day != dateParts[2]) {
    throw const FormatException('提醒时间格式不正确。');
  }

  return candidate;
}

String formatFriendlyDateTime(Object value) {
  final date = toDate(value).toLocal();
  return '${date.year}年${date.month}月${date.day}日 ${pad(date.hour)}:${pad(date.minute)}';
}

String formatCompactDateTime(Object value) {
  final date = toDate(value).toLocal();
  return '${date.month}月${date.day}日 ${pad(date.hour)}:${pad(date.minute)}';
}

String formatRelativeReminder(Object value, {DateTime? reference}) {
  final date = toDate(value).toLocal();
  final base = (reference ?? DateTime.now()).toLocal();
  final tomorrow = addDays(base, 1);

  if (isSameDay(date, base)) {
    return '今天 ${pad(date.hour)}:${pad(date.minute)}';
  }

  if (isSameDay(date, tomorrow)) {
    return '明天 ${pad(date.hour)}:${pad(date.minute)}';
  }

  return formatCompactDateTime(date);
}

bool isPastDate(Object value, {DateTime? reference}) {
  final base = (reference ?? DateTime.now()).toLocal();
  return toDate(value).toLocal().millisecondsSinceEpoch <=
      base.millisecondsSinceEpoch;
}

DateTime getSuggestedReminderDate({DateTime? reference}) {
  final next = (reference ?? DateTime.now()).toLocal().add(
    const Duration(hours: 1),
  );
  final roundedMinutes = ((next.minute + 9) ~/ 10) * 10;

  if (roundedMinutes >= 60) {
    return DateTime(next.year, next.month, next.day, next.hour + 1);
  }

  return DateTime(next.year, next.month, next.day, next.hour, roundedMinutes);
}

({String date, String time}) getSuggestedReminderParts({DateTime? reference}) {
  final suggested = getSuggestedReminderDate(reference: reference);
  return (date: formatDateInput(suggested), time: formatTimeInput(suggested));
}

String truncateText(String value, int maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return '${value.substring(0, maxLength - 1)}…';
}
