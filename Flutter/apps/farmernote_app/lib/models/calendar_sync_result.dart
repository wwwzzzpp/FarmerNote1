enum CalendarSyncCode { success, unsupported, cancel, permissionDenied, failed }

class CalendarSyncResult {
  const CalendarSyncResult(this.code, {this.detail = ''});

  final CalendarSyncCode code;
  final String detail;
}
