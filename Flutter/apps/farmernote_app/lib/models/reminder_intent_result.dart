class ReminderIntentResult {
  const ReminderIntentResult({
    required this.needsReminder,
    required this.dueAt,
    required this.confidence,
    required this.matchedText,
    required this.message,
    this.usedDefaultTime = false,
  });

  final bool needsReminder;
  final String dueAt;
  final String confidence;
  final String matchedText;
  final String message;
  final bool usedDefaultTime;

  factory ReminderIntentResult.empty() {
    return const ReminderIntentResult(
      needsReminder: false,
      dueAt: '',
      confidence: 'none',
      matchedText: '',
      message: '',
    );
  }
}
