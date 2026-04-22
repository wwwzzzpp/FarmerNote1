class PlanRecordDraft {
  const PlanRecordDraft({
    required this.id,
    required this.noteText,
    required this.reminderEnabled,
    required this.reminderDate,
    required this.reminderTime,
    required this.planInstanceId,
    required this.planActionId,
    required this.sourceLabel,
  });

  final String id;
  final String noteText;
  final bool reminderEnabled;
  final String reminderDate;
  final String reminderTime;
  final String planInstanceId;
  final String planActionId;
  final String sourceLabel;
}
