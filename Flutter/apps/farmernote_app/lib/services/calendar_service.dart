import 'package:device_calendar/device_calendar.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:timezone/timezone.dart' as tz;

import '../models/calendar_sync_result.dart';
import '../utils/date_utils.dart' as farmer_date;

class CalendarService {
  CalendarService({DeviceCalendarPlugin? plugin})
    : _plugin = plugin ?? DeviceCalendarPlugin();

  static const String _farmerCalendarName = 'FarmerNote 提醒';
  static const String _farmerCalendarAccount = 'FarmerNote';

  final DeviceCalendarPlugin _plugin;

  Future<CalendarSyncResult> addTaskToPhoneCalendar({
    required String noteText,
    required String dueAt,
    String title = '',
  }) async {
    if (kIsWeb) {
      return const CalendarSyncResult(CalendarSyncCode.unsupported);
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
      case TargetPlatform.iOS:
        break;
      case TargetPlatform.fuchsia:
      case TargetPlatform.linux:
      case TargetPlatform.macOS:
      case TargetPlatform.windows:
        return const CalendarSyncResult(CalendarSyncCode.unsupported);
    }

    try {
      final permissionResult = await _plugin.hasPermissions();
      _logResult('hasPermissions', permissionResult);
      final hasPermission = permissionResult.data ?? false;
      if (!hasPermission) {
        final requestResult = await _plugin.requestPermissions();
        _logResult('requestPermissions', requestResult);
        if (!(requestResult.data ?? false)) {
          return const CalendarSyncResult(CalendarSyncCode.permissionDenied);
        }
      }

      final calendarsResult = await _plugin.retrieveCalendars();
      _logResult('retrieveCalendars', calendarsResult);

      final writableCalendar = await _resolveWritableCalendar(
        calendarsResult.data?.toList() ?? <Calendar>[],
      );
      if (writableCalendar == null) {
        return const CalendarSyncResult(
          CalendarSyncCode.failed,
          detail: '没有找到可写入的系统日历，请先在手机日历里启用一个本地或云端日历账户。',
        );
      }

      final start = DateTime.parse(dueAt).toLocal();
      final end = start.add(const Duration(minutes: 30));
      final normalizedNoteText = noteText.trim();
      final normalizedTitle = title.trim().isNotEmpty
          ? title.trim()
          : normalizedNoteText.isNotEmpty
          ? normalizedNoteText
          : '农事提醒：巡田任务';

      final primaryEvent = _buildEvent(
        calendarId: writableCalendar.id!,
        title: normalizedTitle,
        description: normalizedNoteText,
        start: start,
        end: end,
      );
      final created = await _plugin.createOrUpdateEvent(primaryEvent);
      if (created?.isSuccess == true) {
        return const CalendarSyncResult(CalendarSyncCode.success);
      }

      _logResult('createOrUpdateEvent(primary)', created);

      if (defaultTargetPlatform == TargetPlatform.android) {
        final fallbackCalendar = await _createOrReuseFarmerCalendar(
          excludingCalendarId: writableCalendar.id,
        );
        if (fallbackCalendar != null) {
          final fallbackEvent = _buildEvent(
            calendarId: fallbackCalendar.id!,
            title: normalizedTitle,
            description: normalizedNoteText,
            start: start,
            end: end,
          );
          final fallbackCreated = await _plugin.createOrUpdateEvent(
            fallbackEvent,
          );
          if (fallbackCreated?.isSuccess == true) {
            return const CalendarSyncResult(CalendarSyncCode.success);
          }

          _logResult('createOrUpdateEvent(fallback)', fallbackCreated);
        }
      }

      return CalendarSyncResult(
        CalendarSyncCode.failed,
        detail:
            _extractFailureDetail(created) ?? '系统日历拒绝了这条提醒的写入，请确认手机日历应用可用后再试。',
      );
    } on PlatformException catch (error) {
      final message = '${error.code} ${error.message}'.toLowerCase();
      if (message.contains('cancel')) {
        return const CalendarSyncResult(CalendarSyncCode.cancel);
      }
      if (message.contains('permission') || message.contains('denied')) {
        return const CalendarSyncResult(CalendarSyncCode.permissionDenied);
      }
      return const CalendarSyncResult(
        CalendarSyncCode.failed,
        detail: '系统日历写入失败了，请稍后重试。',
      );
    } catch (_) {
      return const CalendarSyncResult(
        CalendarSyncCode.failed,
        detail: '系统日历写入失败了，请稍后重试。',
      );
    }
  }

  String buildCalendarTitle(String noteText) {
    final normalized = noteText.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (normalized.isEmpty) {
      return '农事提醒：巡田任务';
    }

    return '巡田任务：${farmer_date.truncateText(normalized, 20)}';
  }

  Event _buildEvent({
    required String calendarId,
    required String title,
    required String description,
    required DateTime start,
    required DateTime end,
  }) {
    return Event(
      calendarId,
      title: title,
      description: description,
      start: tz.TZDateTime.from(start, tz.local),
      end: tz.TZDateTime.from(end, tz.local),
      reminders: <Reminder>[Reminder(minutes: 0)],
    );
  }

  Future<Calendar?> _resolveWritableCalendar(List<Calendar> calendars) async {
    final existing = _pickWritableCalendar(calendars);
    if (existing != null) {
      return existing;
    }

    if (defaultTargetPlatform != TargetPlatform.android) {
      return null;
    }

    return _createOrReuseFarmerCalendar();
  }

  Calendar? _pickWritableCalendar(List<Calendar> calendars) {
    final writable = calendars.where(_isWritableCalendar).toList();
    if (writable.isEmpty) {
      return null;
    }

    for (final calendar in writable) {
      if (calendar.isDefault == true) {
        return calendar;
      }
    }

    for (final calendar in writable) {
      if ((calendar.accountName ?? '').trim().isNotEmpty) {
        return calendar;
      }
    }

    return writable.first;
  }

  bool _isWritableCalendar(Calendar calendar) {
    return (calendar.id ?? '').trim().isNotEmpty &&
        !(calendar.isReadOnly ?? false);
  }

  Future<Calendar?> _createOrReuseFarmerCalendar({
    String? excludingCalendarId,
  }) async {
    final currentCalendars = await _plugin.retrieveCalendars();
    _logResult('retrieveCalendars(fallback)', currentCalendars);

    final existingCalendars = currentCalendars.data?.toList() ?? <Calendar>[];
    for (final calendar in existingCalendars) {
      final matchesFarmerCalendar =
          calendar.name == _farmerCalendarName ||
          (calendar.accountName ?? '') == _farmerCalendarAccount;
      if (matchesFarmerCalendar &&
          _isWritableCalendar(calendar) &&
          calendar.id != excludingCalendarId) {
        return calendar;
      }
    }

    final created = await _plugin.createCalendar(
      _farmerCalendarName,
      calendarColor: const Color(0xFF6F7751),
      localAccountName: _farmerCalendarAccount,
    );
    _logResult('createCalendar', created);

    final createdId = created.data ?? '';
    if (created.isSuccess && createdId.isNotEmpty) {
      return Calendar(
        id: createdId,
        name: _farmerCalendarName,
        isReadOnly: false,
        isDefault: existingCalendars.isEmpty,
        accountName: _farmerCalendarAccount,
        accountType: 'LOCAL',
      );
    }

    final refreshedCalendars = await _plugin.retrieveCalendars();
    _logResult('retrieveCalendars(afterCreate)', refreshedCalendars);

    final refreshed = refreshedCalendars.data?.toList() ?? <Calendar>[];
    for (final calendar in refreshed) {
      final matchesFarmerCalendar =
          calendar.name == _farmerCalendarName ||
          (calendar.accountName ?? '') == _farmerCalendarAccount;
      if (matchesFarmerCalendar &&
          _isWritableCalendar(calendar) &&
          calendar.id != excludingCalendarId) {
        return calendar;
      }
    }

    return null;
  }

  String? _extractFailureDetail(Result<String>? result) {
    if (result == null || result.errors.isEmpty) {
      return null;
    }

    final errorMessage = result.errors.first.errorMessage.toLowerCase();
    if (errorMessage.contains('permission') ||
        errorMessage.contains('denied')) {
      return '应用还没有拿到系统日历权限。';
    }
    if (errorMessage.contains('couldn\'t retrieve the calendar') ||
        errorMessage.contains('could not be found')) {
      return '系统里没有可写入的日历账户，请先在手机日历里启用一个账户。';
    }

    return '系统日历拒绝了这条提醒的写入，请确认手机日历应用可用后再试。';
  }

  void _logResult(String label, Result<dynamic>? result) {
    if (result == null || !result.hasErrors) {
      return;
    }

    final messages = result.errors
        .map((error) => '[${error.errorCode}] ${error.errorMessage}')
        .join(' | ');
    debugPrint('CalendarService.$label -> $messages');
  }
}
