import 'entry_record.dart';
import 'task_record.dart';

class TimelineEntryRecord {
  const TimelineEntryRecord({required this.entry, required this.task});

  final EntryRecord entry;
  final TaskRecord? task;
}
