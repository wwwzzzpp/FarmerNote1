import '../models/reminder_intent_result.dart';
import 'date_utils.dart' as farmer_date;

class ReminderIntentParser {
  static final RegExp _chineseNumber = RegExp(r'[零一二两三四五六七八九十\d]+');
  static final RegExp _reminderKeyword = RegExp(
    r'提醒我|提醒一下|提醒下|记得|别忘|定时|到时|到时候|闹钟',
  );
  static final RegExp _actionKeyword = RegExp(
    r'再去|去看|看看|看下|查看|补看|复查|处理|巡田|施肥|追肥|打药|施药|喷药|浇水|灌水|关泵|开泵|观察|回访|跟进|检查|收割|去地里|去田里|上架|补处理',
  );
  static final RegExp _pastTense = RegExp(
    r'刚刚|刚才|已经|已完成|完成了|处理了|看了|去了|做了|结束了|收完|打完|施完',
  );

  static const Map<String, int> _weekdayMap = <String, int>{
    '日': DateTime.sunday,
    '天': DateTime.sunday,
    '一': DateTime.monday,
    '二': DateTime.tuesday,
    '三': DateTime.wednesday,
    '四': DateTime.thursday,
    '五': DateTime.friday,
    '六': DateTime.saturday,
  };

  static const Map<String, int> _periodDefaultHour = <String, int>{
    '凌晨': 6,
    '早上': 8,
    '早晨': 8,
    '上午': 9,
    '中午': 12,
    '下午': 15,
    '傍晚': 18,
    '晚上': 19,
    '今晚': 19,
    '明晚': 19,
  };

  ReminderIntentResult parse(String noteText, {DateTime? reference}) {
    final now = (reference ?? DateTime.now()).toLocal();
    final text = _normalizeText(noteText);
    if (text.isEmpty) {
      return ReminderIntentResult.empty();
    }

    final offsetInfo = _parseRelativeOffset(text, now);
    final dateInfo = _parseExplicitDate(text, now);
    final timeInfo = _parseTimeExpression(text);

    if (!_hasFutureIntent(
      text,
      offsetInfo: offsetInfo,
      dateInfo: dateInfo,
      timeInfo: timeInfo,
    )) {
      return ReminderIntentResult.empty();
    }

    final dueResult = _buildDueAt(
      reference: now,
      offsetInfo: offsetInfo,
      dateInfo: dateInfo,
      timeInfo: timeInfo,
    );

    if (dueResult == null || dueResult.dueAt.isEmpty) {
      return ReminderIntentResult.empty();
    }

    var confidence = 'medium';
    if ((offsetInfo?.exact ?? false) ||
        ((dateInfo != null) && (timeInfo?.explicit ?? false)) ||
        (dateInfo == null && (timeInfo?.explicit ?? false))) {
      confidence = 'high';
    }

    return ReminderIntentResult(
      needsReminder: true,
      dueAt: dueResult.dueAt,
      confidence: confidence,
      matchedText: dueResult.matchedText,
      message: _buildMessage(
        matchedText: dueResult.matchedText,
        usedDefaultTime: dueResult.usedDefaultTime,
        dueAt: dueResult.dueAt,
      ),
      usedDefaultTime: dueResult.usedDefaultTime,
    );
  }

  DateTime _startOfDay(DateTime value) {
    final safe = value.toLocal();
    return DateTime(safe.year, safe.month, safe.day);
  }

  String _normalizeText(String text) {
    return text
        .replaceAll(RegExp(r'[，,]'), ' ')
        .replaceAll(RegExp(r'[。；;！!？?]'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  int _chineseNumberToInt(String token) {
    final value = token.trim();
    if (value.isEmpty) {
      return -1;
    }

    if (RegExp(r'^\d+$').hasMatch(value)) {
      return int.parse(value);
    }

    final normalized = value.replaceAll('两', '二');
    const digitMap = <String, int>{
      '零': 0,
      '一': 1,
      '二': 2,
      '三': 3,
      '四': 4,
      '五': 5,
      '六': 6,
      '七': 7,
      '八': 8,
      '九': 9,
    };

    if (normalized == '十') {
      return 10;
    }

    if (normalized.contains('十')) {
      final parts = normalized.split('十');
      final tens = parts.first.isNotEmpty ? digitMap[parts.first] : 1;
      final units = parts.length > 1 && parts[1].isNotEmpty
          ? digitMap[parts[1]]
          : 0;
      if (tens == null || units == null) {
        return -1;
      }
      return tens * 10 + units;
    }

    if (normalized.length > 1) {
      final digits = normalized
          .split('')
          .map((char) => digitMap[char])
          .toList();
      if (digits.every((digit) => digit != null)) {
        return digits.cast<int>().fold<int>(
          0,
          (acc, digit) => acc * 10 + digit,
        );
      }
    }

    return digitMap[normalized] ?? -1;
  }

  DateTime _createDate(DateTime reference, int dayOffset) {
    return _startOfDay(farmer_date.addDays(reference, dayOffset));
  }

  bool _isValidDate(int year, int month, int day) {
    final candidate = DateTime(year, month, day);
    return candidate.year == year &&
        candidate.month == month &&
        candidate.day == day;
  }

  _RelativeOffsetInfo? _parseRelativeOffset(String text, DateTime reference) {
    final halfHourMatch = RegExp(r'半小时后|半个小时后|半钟头后').firstMatch(text);
    if (halfHourMatch != null) {
      return _RelativeOffsetInfo(
        date: reference.add(const Duration(minutes: 30)),
        matchedText: halfHourMatch.group(0)!,
        exact: true,
        source: 'relative_offset',
      );
    }

    final hourMatch = RegExp(
      '(${_chineseNumber.pattern})(?:个)?小时后',
    ).firstMatch(text);
    if (hourMatch != null) {
      final hours = _chineseNumberToInt(hourMatch.group(1)!);
      if (hours >= 0) {
        return _RelativeOffsetInfo(
          date: reference.add(Duration(hours: hours)),
          matchedText: hourMatch.group(0)!,
          exact: true,
          source: 'relative_offset',
        );
      }
    }

    final dayMatch = RegExp(
      '(?:过)?(${_chineseNumber.pattern})(?:天|日)后',
    ).firstMatch(text);
    if (dayMatch != null) {
      final days = _chineseNumberToInt(dayMatch.group(1)!);
      if (days >= 0) {
        return _RelativeOffsetInfo(
          date: _createDate(reference, days),
          matchedText: dayMatch.group(0)!,
          exact: false,
          source: 'relative_offset',
        );
      }
    }

    final soonMatch = RegExp(r'待会|一会儿|等会|稍后').firstMatch(text);
    if (soonMatch != null) {
      return _RelativeOffsetInfo(
        date: reference.add(const Duration(minutes: 30)),
        matchedText: soonMatch.group(0)!,
        exact: true,
        source: 'relative_offset',
      );
    }

    return null;
  }

  _DateInfo? _parseExplicitDate(String text, DateTime reference) {
    final fullDateMatch = RegExp(
      r'(\d{4})年(\d{1,2})月(\d{1,2})(?:日|号)?',
    ).firstMatch(text);
    if (fullDateMatch != null) {
      final year = int.parse(fullDateMatch.group(1)!);
      final month = int.parse(fullDateMatch.group(2)!);
      final day = int.parse(fullDateMatch.group(3)!);
      if (_isValidDate(year, month, day)) {
        return _DateInfo(
          date: DateTime(year, month, day),
          matchedText: fullDateMatch.group(0)!,
          kind: 'absolute_date',
        );
      }
    }

    final monthDayMatch = RegExp(
      r'(\d{1,2})月(\d{1,2})(?:日|号)?',
    ).firstMatch(text);
    if (monthDayMatch != null) {
      final month = int.parse(monthDayMatch.group(1)!);
      final day = int.parse(monthDayMatch.group(2)!);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        var year = reference.year;
        if (!_isValidDate(year, month, day)) {
          return null;
        }

        var candidate = DateTime(year, month, day);
        if (candidate.isBefore(_startOfDay(reference))) {
          year += 1;
          candidate = DateTime(year, month, day);
        }

        return _DateInfo(
          date: candidate,
          matchedText: monthDayMatch.group(0)!,
          kind: 'absolute_date',
        );
      }
    }

    final namedPatterns =
        <({RegExp pattern, int offset, String impliedPeriod})>[
          (pattern: RegExp(r'明晚'), offset: 1, impliedPeriod: '晚上'),
          (pattern: RegExp(r'明早|明晨'), offset: 1, impliedPeriod: '早上'),
          (pattern: RegExp(r'今晚'), offset: 0, impliedPeriod: '晚上'),
          (pattern: RegExp(r'今早|今晨'), offset: 0, impliedPeriod: '早上'),
          (pattern: RegExp(r'大后天'), offset: 3, impliedPeriod: ''),
          (pattern: RegExp(r'后天'), offset: 2, impliedPeriod: ''),
          (pattern: RegExp(r'明天|明日'), offset: 1, impliedPeriod: ''),
          (pattern: RegExp(r'今天|今日'), offset: 0, impliedPeriod: ''),
        ];

    for (final item in namedPatterns) {
      final match = item.pattern.firstMatch(text);
      if (match != null) {
        return _DateInfo(
          date: _createDate(reference, item.offset),
          matchedText: match.group(0)!,
          kind: 'relative_day',
          impliedPeriod: item.impliedPeriod,
        );
      }
    }

    final prefixedWeekdayMatch = RegExp(
      r'(下周|这周|本周)([一二三四五六日天])',
    ).firstMatch(text);
    if (prefixedWeekdayMatch != null) {
      final prefix = prefixedWeekdayMatch.group(1)!;
      final weekday = _weekdayMap[prefixedWeekdayMatch.group(2)!]!;
      final currentWeekday = reference.weekday == DateTime.sunday
          ? 0
          : reference.weekday;
      var diff = weekday - currentWeekday;
      if (prefix == '下周') {
        diff = diff <= 0 ? diff + 14 : diff + 7;
      } else {
        diff = diff < 0 ? diff + 7 : diff;
      }

      return _DateInfo(
        date: _createDate(reference, diff),
        matchedText: prefixedWeekdayMatch.group(0)!,
        kind: 'weekday',
      );
    }

    final weekdayMatch = RegExp(r'(?:星期|周|礼拜)([一二三四五六日天])').firstMatch(text);
    if (weekdayMatch != null) {
      final weekday = _weekdayMap[weekdayMatch.group(1)!]!;
      final currentWeekday = reference.weekday == DateTime.sunday
          ? 0
          : reference.weekday;
      final diff = weekday - currentWeekday < 0
          ? weekday - currentWeekday + 7
          : weekday - currentWeekday;

      return _DateInfo(
        date: _createDate(reference, diff),
        matchedText: weekdayMatch.group(0)!,
        kind: 'weekday',
      );
    }

    return null;
  }

  int _applyPeriodToHour(int hour, String period) {
    if (period == '下午' ||
        period == '傍晚' ||
        period == '晚上' ||
        period == '今晚' ||
        period == '明晚') {
      return hour < 12 ? hour + 12 : hour;
    }

    if (period == '中午') {
      if (hour >= 1 && hour <= 10) {
        return hour + 12;
      }
      return hour == 0 ? 12 : hour;
    }

    if (period == '凌晨' || period == '早上' || period == '早晨' || period == '上午') {
      return hour == 12 ? 0 : hour;
    }

    return hour;
  }

  _TimeInfo? _parseTimeExpression(String text) {
    final colonMatch = RegExp(
      r'(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|今晚|明晚)?\s*(\d{1,2})\s*[:：]\s*(\d{1,2})',
    ).firstMatch(text);
    if (colonMatch != null) {
      final period = colonMatch.group(1) ?? '';
      var hour = int.parse(colonMatch.group(2)!);
      final minute = int.parse(colonMatch.group(3)!);
      if (minute >= 0 && minute <= 59) {
        hour = _applyPeriodToHour(hour, period);
        if (hour >= 0 && hour <= 23) {
          return _TimeInfo(
            hour: hour,
            minute: minute,
            matchedText: colonMatch.group(0)!.trim(),
            explicit: true,
          );
        }
      }
    }

    final pointMatch = RegExp(
      '(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|今晚|明晚)?\\s*(${_chineseNumber.pattern})\\s*点(?:(半)|\\s*(${_chineseNumber.pattern})\\s*分?)?',
    ).firstMatch(text);
    if (pointMatch != null) {
      final period = pointMatch.group(1) ?? '';
      var hour = _chineseNumberToInt(pointMatch.group(2)!);
      var minute = 0;
      if (pointMatch.group(3) != null) {
        minute = 30;
      } else if (pointMatch.group(4) != null) {
        minute = _chineseNumberToInt(pointMatch.group(4)!);
      }

      if (hour >= 0 && minute >= 0 && minute <= 59) {
        hour = _applyPeriodToHour(hour, period);
        if (hour >= 0 && hour <= 23) {
          return _TimeInfo(
            hour: hour,
            minute: minute,
            matchedText: pointMatch.group(0)!.trim(),
            explicit: true,
          );
        }
      }
    }

    final periodOnlyMatch = RegExp(
      r'凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|今晚|明晚',
    ).firstMatch(text);
    if (periodOnlyMatch != null) {
      final period = periodOnlyMatch.group(0)!;
      return _TimeInfo(
        hour: _periodDefaultHour[period]!,
        minute: 0,
        matchedText: period,
        explicit: false,
      );
    }

    return null;
  }

  String _joinMatchedText(List<String> parts) {
    return parts.where((part) => part.isNotEmpty).join(' ').trim();
  }

  _DueAtResult? _buildDueAt({
    required DateTime reference,
    required _RelativeOffsetInfo? offsetInfo,
    required _DateInfo? dateInfo,
    required _TimeInfo? timeInfo,
  }) {
    if (offsetInfo != null && offsetInfo.exact) {
      return _DueAtResult(
        dueAt: offsetInfo.date.toUtc().toIso8601String(),
        usedDefaultTime: false,
        matchedText: offsetInfo.matchedText,
      );
    }

    final daySource =
        dateInfo ??
        ((offsetInfo != null && !offsetInfo.exact) ? offsetInfo : null);
    var baseDate = daySource != null ? _startOfDay(daySource.date) : null;
    var finalTimeInfo = timeInfo;
    var usedDefaultTime = false;

    if (baseDate == null && timeInfo == null) {
      return null;
    }

    baseDate ??= _startOfDay(reference);

    if (finalTimeInfo == null) {
      final impliedPeriod = daySource is _DateInfo
          ? daySource.impliedPeriod
          : '';
      final defaultHour = impliedPeriod.isNotEmpty
          ? _periodDefaultHour[impliedPeriod]!
          : 9;
      finalTimeInfo = _TimeInfo(
        hour: defaultHour,
        minute: 0,
        matchedText: impliedPeriod,
        explicit: false,
      );
      usedDefaultTime = true;
    } else if (!finalTimeInfo.explicit) {
      usedDefaultTime = true;
    }

    var dueDate = DateTime(
      baseDate.year,
      baseDate.month,
      baseDate.day,
      finalTimeInfo.hour,
      finalTimeInfo.minute,
    );

    if (daySource == null && !dueDate.isAfter(reference)) {
      dueDate = farmer_date.addDays(dueDate, 1);
    }

    if (daySource is _DateInfo &&
        daySource.kind == 'weekday' &&
        !dueDate.isAfter(reference)) {
      dueDate = farmer_date.addDays(dueDate, 7);
    }

    return _DueAtResult(
      dueAt: dueDate.toUtc().toIso8601String(),
      usedDefaultTime: usedDefaultTime,
      matchedText: _joinMatchedText(<String>[
        daySource?.matchedText ?? '',
        finalTimeInfo.matchedText,
      ]),
    );
  }

  bool _hasFutureIntent(
    String text, {
    required _RelativeOffsetInfo? offsetInfo,
    required _DateInfo? dateInfo,
    required _TimeInfo? timeInfo,
  }) {
    final hasReminderKeyword = _reminderKeyword.hasMatch(text);
    final hasActionKeyword = _actionKeyword.hasMatch(text);
    final hasPastTense = _pastTense.hasMatch(text);
    final hasTimeSignal =
        offsetInfo != null || dateInfo != null || timeInfo != null;
    final hasExplicitFutureDay =
        dateInfo != null &&
        !(dateInfo.kind == 'relative_day' &&
            (dateInfo.matchedText == '今天' || dateInfo.matchedText == '今日'));

    if (!hasTimeSignal) {
      return false;
    }
    if (hasReminderKeyword || offsetInfo != null) {
      return true;
    }
    if (hasActionKeyword &&
        !hasPastTense &&
        (hasExplicitFutureDay || timeInfo != null)) {
      return true;
    }
    return false;
  }

  String _buildMessage({
    required String matchedText,
    required bool usedDefaultTime,
    required String dueAt,
  }) {
    final dueText = farmer_date.formatFriendlyDateTime(dueAt);
    if (usedDefaultTime) {
      return '识别到“${matchedText.isNotEmpty ? matchedText : '待处理时间'}”，先帮你默认填成 $dueText，你可以继续改。';
    }
    return '识别到“${matchedText.isNotEmpty ? matchedText : dueText}”，已自动填好提醒时间。';
  }
}

abstract class _BaseDateInfo {
  const _BaseDateInfo({
    required this.date,
    required this.matchedText,
    required this.kind,
  });

  final DateTime date;
  final String matchedText;
  final String kind;
}

class _RelativeOffsetInfo extends _BaseDateInfo {
  const _RelativeOffsetInfo({
    required super.date,
    required super.matchedText,
    required this.exact,
    required this.source,
  }) : super(kind: 'relative_offset');

  final bool exact;
  final String source;
}

class _DateInfo extends _BaseDateInfo {
  const _DateInfo({
    required super.date,
    required super.matchedText,
    required super.kind,
    this.impliedPeriod = '',
  });

  final String impliedPeriod;
}

class _TimeInfo {
  const _TimeInfo({
    required this.hour,
    required this.minute,
    required this.matchedText,
    required this.explicit,
  });

  final int hour;
  final int minute;
  final String matchedText;
  final bool explicit;
}

class _DueAtResult {
  const _DueAtResult({
    required this.dueAt,
    required this.usedDefaultTime,
    required this.matchedText,
  });

  final String dueAt;
  final bool usedDefaultTime;
  final String matchedText;
}
