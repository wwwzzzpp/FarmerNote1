const dateUtils = require('./date');

const CHINESE_NUMBER_RE = /[零一二两三四五六七八九十\d]+/;
const REMINDER_KEYWORD_RE = /提醒我|提醒一下|提醒下|记得|别忘|定时|到时|到时候|闹钟/;
const ACTION_KEYWORD_RE =
  /再去|去看|看看|看下|查看|补看|复查|处理|巡田|施肥|追肥|打药|施药|喷药|浇水|灌水|关泵|开泵|观察|回访|跟进|检查|收割|去地里|去田里|上架|补处理/;
const PAST_TENSE_RE = /刚刚|刚才|已经|已完成|完成了|处理了|看了|去了|做了|结束了|收完|打完|施完/;

const WEEKDAY_MAP = {
  日: 0,
  天: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

const PERIOD_DEFAULT_HOUR = {
  凌晨: 6,
  早上: 8,
  早晨: 8,
  上午: 9,
  中午: 12,
  下午: 15,
  傍晚: 18,
  晚上: 19,
  今晚: 19,
  明晚: 19,
};

function startOfDay(value) {
  const date = dateUtils.toDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function normalizeText(text) {
  return String(text || '')
    .replace(/[，,]/g, ' ')
    .replace(/[。；;！!？?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function chineseNumberToInt(token) {
  const value = String(token || '').trim();

  if (!value) {
    return NaN;
  }

  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }

  const normalized = value.replace(/两/g, '二');
  const digitMap = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };

  if (normalized === '十') {
    return 10;
  }

  if (normalized.includes('十')) {
    const parts = normalized.split('十');
    const tens = parts[0] ? digitMap[parts[0]] : 1;
    const units = parts[1] ? digitMap[parts[1]] : 0;

    if (typeof tens !== 'number' || typeof units !== 'number') {
      return NaN;
    }

    return tens * 10 + units;
  }

  if (normalized.length > 1) {
    const digits = normalized
      .split('')
      .map((char) => digitMap[char])
      .filter((item) => typeof item === 'number');

    if (digits.length === normalized.length) {
      return digits.reduce((acc, digit) => acc * 10 + digit, 0);
    }
  }

  return digitMap[normalized];
}

function createDate(reference, dayOffset) {
  return startOfDay(dateUtils.addDays(reference, dayOffset));
}

function isValidDate(year, month, day) {
  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

function parseRelativeOffset(text, reference) {
  const halfHourMatch = text.match(/半小时后|半个小时后|半钟头后/);

  if (halfHourMatch) {
    return {
      date: new Date(reference.getTime() + 30 * 60 * 1000),
      matchedText: halfHourMatch[0],
      exact: true,
      source: 'relative_offset',
    };
  }

  const hourMatch = text.match(new RegExp(`(${CHINESE_NUMBER_RE.source})(?:个)?小时后`));

  if (hourMatch) {
    const hours = chineseNumberToInt(hourMatch[1]);

    if (!Number.isNaN(hours)) {
      return {
        date: new Date(reference.getTime() + hours * 60 * 60 * 1000),
        matchedText: hourMatch[0],
        exact: true,
        source: 'relative_offset',
      };
    }
  }

  const dayMatch = text.match(new RegExp(`(?:过)?(${CHINESE_NUMBER_RE.source})(?:天|日)后`));

  if (dayMatch) {
    const days = chineseNumberToInt(dayMatch[1]);

    if (!Number.isNaN(days)) {
      return {
        date: createDate(reference, days),
        matchedText: dayMatch[0],
        exact: false,
        source: 'relative_offset',
      };
    }
  }

  const soonMatch = text.match(/待会|一会儿|等会|稍后/);

  if (soonMatch) {
    return {
      date: new Date(reference.getTime() + 30 * 60 * 1000),
      matchedText: soonMatch[0],
      exact: true,
      source: 'relative_offset',
    };
  }

  return null;
}

function parseExplicitDate(text, reference) {
  const fullDateMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})(?:日|号)?/);

  if (fullDateMatch) {
    const year = parseInt(fullDateMatch[1], 10);
    const month = parseInt(fullDateMatch[2], 10);
    const day = parseInt(fullDateMatch[3], 10);

    if (isValidDate(year, month, day)) {
      return {
        date: new Date(year, month - 1, day, 0, 0, 0, 0),
        matchedText: fullDateMatch[0],
        kind: 'absolute_date',
      };
    }
  }

  const monthDayMatch = text.match(/(\d{1,2})月(\d{1,2})(?:日|号)?/);

  if (monthDayMatch) {
    const month = parseInt(monthDayMatch[1], 10);
    const day = parseInt(monthDayMatch[2], 10);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let year = reference.getFullYear();

      if (!isValidDate(year, month, day)) {
        return null;
      }

      let candidate = new Date(year, month - 1, day, 0, 0, 0, 0);

      if (candidate.getTime() < startOfDay(reference).getTime()) {
        year += 1;
        candidate = new Date(year, month - 1, day, 0, 0, 0, 0);
      }

      return {
        date: candidate,
        matchedText: monthDayMatch[0],
        kind: 'absolute_date',
      };
    }
  }

  const namedPatterns = [
    { pattern: /明晚/, offset: 1, impliedPeriod: '晚上' },
    { pattern: /明早|明晨/, offset: 1, impliedPeriod: '早上' },
    { pattern: /今晚/, offset: 0, impliedPeriod: '晚上' },
    { pattern: /今早|今晨/, offset: 0, impliedPeriod: '早上' },
    { pattern: /大后天/, offset: 3 },
    { pattern: /后天/, offset: 2 },
    { pattern: /明天|明日/, offset: 1 },
    { pattern: /今天|今日/, offset: 0 },
  ];

  for (let index = 0; index < namedPatterns.length; index += 1) {
    const item = namedPatterns[index];
    const match = text.match(item.pattern);

    if (match) {
      return {
        date: createDate(reference, item.offset),
        matchedText: match[0],
        impliedPeriod: item.impliedPeriod || '',
        kind: 'relative_day',
      };
    }
  }

  const prefixedWeekdayMatch = text.match(/(下周|这周|本周)([一二三四五六日天])/);

  if (prefixedWeekdayMatch) {
    const prefix = prefixedWeekdayMatch[1];
    const weekday = WEEKDAY_MAP[prefixedWeekdayMatch[2]];
    const currentWeekday = reference.getDay();
    let diff = weekday - currentWeekday;

    if (prefix === '下周') {
      diff = diff <= 0 ? diff + 14 : diff + 7;
    } else {
      diff = diff < 0 ? diff + 7 : diff;
    }

    return {
      date: createDate(reference, diff),
      matchedText: prefixedWeekdayMatch[0],
      kind: 'weekday',
    };
  }

  const weekdayMatch = text.match(/(?:星期|周|礼拜)([一二三四五六日天])/);

  if (weekdayMatch) {
    const weekday = WEEKDAY_MAP[weekdayMatch[1]];
    const currentWeekday = reference.getDay();
    const diff = weekday - currentWeekday < 0 ? weekday - currentWeekday + 7 : weekday - currentWeekday;

    return {
      date: createDate(reference, diff),
      matchedText: weekdayMatch[0],
      kind: 'weekday',
    };
  }

  return null;
}

function applyPeriodToHour(hour, period) {
  const safeHour = hour;

  if (period === '下午' || period === '傍晚' || period === '晚上' || period === '今晚' || period === '明晚') {
    return safeHour < 12 ? safeHour + 12 : safeHour;
  }

  if (period === '中午') {
    if (safeHour >= 1 && safeHour <= 10) {
      return safeHour + 12;
    }

    return safeHour === 0 ? 12 : safeHour;
  }

  if (period === '凌晨' || period === '早上' || period === '早晨' || period === '上午') {
    return safeHour === 12 ? 0 : safeHour;
  }

  return safeHour;
}

function parseTimeExpression(text) {
  const colonMatch = text.match(
    /(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|今晚|明晚)?\s*(\d{1,2})\s*[:：]\s*(\d{1,2})/
  );

  if (colonMatch) {
    const period = colonMatch[1] || '';
    let hour = parseInt(colonMatch[2], 10);
    const minute = parseInt(colonMatch[3], 10);

    if (!Number.isNaN(hour) && !Number.isNaN(minute) && minute >= 0 && minute <= 59) {
      hour = applyPeriodToHour(hour, period);

      if (hour >= 0 && hour <= 23) {
        return {
          hour,
          minute,
          matchedText: colonMatch[0].trim(),
          explicit: true,
        };
      }
    }
  }

  const pointMatch = text.match(
    new RegExp(
      `(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|今晚|明晚)?\\s*(${CHINESE_NUMBER_RE.source})\\s*点(?:(半)|\\s*(${CHINESE_NUMBER_RE.source})\\s*分?)?`
    )
  );

  if (pointMatch) {
    const period = pointMatch[1] || '';
    let hour = chineseNumberToInt(pointMatch[2]);
    let minute = 0;

    if (pointMatch[3]) {
      minute = 30;
    } else if (pointMatch[4]) {
      minute = chineseNumberToInt(pointMatch[4]);
    }

    if (!Number.isNaN(hour) && !Number.isNaN(minute) && minute >= 0 && minute <= 59) {
      hour = applyPeriodToHour(hour, period);

      if (hour >= 0 && hour <= 23) {
        return {
          hour,
          minute,
          matchedText: pointMatch[0].trim(),
          explicit: true,
        };
      }
    }
  }

  const periodOnlyMatch = text.match(/凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|今晚|明晚/);

  if (periodOnlyMatch) {
    const period = periodOnlyMatch[0];

    return {
      hour: PERIOD_DEFAULT_HOUR[period],
      minute: 0,
      matchedText: period,
      explicit: false,
    };
  }

  return null;
}

function joinMatchedText(parts) {
  return parts.filter(Boolean).join(' ').trim();
}

function buildDueAt({ reference, offsetInfo, dateInfo, timeInfo }) {
  if (offsetInfo && offsetInfo.exact) {
    return {
      dueAt: offsetInfo.date.toISOString(),
      usedDefaultTime: false,
      matchedText: offsetInfo.matchedText,
    };
  }

  const daySource = dateInfo || (offsetInfo && !offsetInfo.exact ? offsetInfo : null);
  let baseDate = daySource ? startOfDay(daySource.date) : null;
  let finalTimeInfo = timeInfo;
  let usedDefaultTime = false;

  if (!baseDate && !timeInfo) {
    return null;
  }

  if (!baseDate) {
    baseDate = startOfDay(reference);
  }

  if (!finalTimeInfo) {
    const impliedPeriod = daySource && daySource.impliedPeriod ? daySource.impliedPeriod : '';
    const defaultHour = impliedPeriod ? PERIOD_DEFAULT_HOUR[impliedPeriod] : 9;

    finalTimeInfo = {
      hour: defaultHour,
      minute: 0,
      matchedText: impliedPeriod || '',
      explicit: false,
    };
    usedDefaultTime = true;
  } else if (!finalTimeInfo.explicit) {
    usedDefaultTime = true;
  }

  let dueDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    finalTimeInfo.hour,
    finalTimeInfo.minute,
    0,
    0
  );

  if (!daySource && dueDate.getTime() <= reference.getTime()) {
    dueDate = dateUtils.addDays(dueDate, 1);
  }

  if (daySource && daySource.kind === 'weekday' && dueDate.getTime() <= reference.getTime()) {
    dueDate = dateUtils.addDays(dueDate, 7);
  }

  return {
    dueAt: dueDate.toISOString(),
    usedDefaultTime,
    matchedText: joinMatchedText([
      daySource ? daySource.matchedText : '',
      finalTimeInfo.matchedText,
    ]),
  };
}

function hasFutureIntent(text, parsedPieces) {
  const hasReminderKeyword = REMINDER_KEYWORD_RE.test(text);
  const hasActionKeyword = ACTION_KEYWORD_RE.test(text);
  const hasPastTense = PAST_TENSE_RE.test(text);
  const hasTimeSignal = !!parsedPieces.offsetInfo || !!parsedPieces.dateInfo || !!parsedPieces.timeInfo;
  const hasExplicitFutureDay =
    !!parsedPieces.dateInfo &&
    !(
      parsedPieces.dateInfo.kind === 'relative_day' &&
      (parsedPieces.dateInfo.matchedText === '今天' || parsedPieces.dateInfo.matchedText === '今日')
    );

  if (!hasTimeSignal) {
    return false;
  }

  if (hasReminderKeyword) {
    return true;
  }

  if (parsedPieces.offsetInfo) {
    return true;
  }

  if (hasActionKeyword && !hasPastTense && (hasExplicitFutureDay || !!parsedPieces.timeInfo)) {
    return true;
  }

  return false;
}

function buildMessage({ matchedText, usedDefaultTime, dueAt }) {
  const dueText = dateUtils.formatFriendlyDateTime(dueAt);

  if (usedDefaultTime) {
    return `识别到“${matchedText || '待处理时间'}”，先帮你默认填成 ${dueText}，你可以继续改。`;
  }

  return `识别到“${matchedText || dueText}”，已自动填好提醒时间。`;
}

function parseReminderIntent(noteText, options) {
  const reference = options && options.reference ? dateUtils.toDate(options.reference) : new Date();
  const text = normalizeText(noteText);

  if (!text) {
    return {
      needsReminder: false,
      dueAt: '',
      confidence: 'none',
      matchedText: '',
      message: '',
    };
  }

  const offsetInfo = parseRelativeOffset(text, reference);
  const dateInfo = parseExplicitDate(text, reference);
  const timeInfo = parseTimeExpression(text);

  if (
    !hasFutureIntent(text, {
      offsetInfo,
      dateInfo,
      timeInfo,
    })
  ) {
    return {
      needsReminder: false,
      dueAt: '',
      confidence: 'none',
      matchedText: '',
      message: '',
    };
  }

  const dueResult = buildDueAt({
    reference,
    offsetInfo,
    dateInfo,
    timeInfo,
  });

  if (!dueResult || !dueResult.dueAt) {
    return {
      needsReminder: false,
      dueAt: '',
      confidence: 'none',
      matchedText: '',
      message: '',
    };
  }

  let confidence = 'medium';

  if (
    (offsetInfo && offsetInfo.exact) ||
    (dateInfo && timeInfo && timeInfo.explicit) ||
    (timeInfo && timeInfo.explicit && !dateInfo)
  ) {
    confidence = 'high';
  }

  return {
    needsReminder: true,
    dueAt: dueResult.dueAt,
    confidence,
    matchedText: dueResult.matchedText,
    message: buildMessage({
      matchedText: dueResult.matchedText,
      usedDefaultTime: dueResult.usedDefaultTime,
      dueAt: dueResult.dueAt,
    }),
    usedDefaultTime: dueResult.usedDefaultTime,
  };
}

module.exports = {
  parseReminderIntent,
};
