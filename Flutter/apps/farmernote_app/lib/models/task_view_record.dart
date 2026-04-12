import 'task_record.dart';

class TaskViewRecord {
  const TaskViewRecord({
    required this.task,
    required this.noteText,
    required this.photoSource,
    required this.entryCreatedAt,
  });

  final TaskRecord task;
  final String noteText;
  final String photoSource;
  final String entryCreatedAt;

  String get id => task.id;
  String get dueAt => task.dueAt;
  TaskStatus get status => task.status;
  String? get completedAt => task.completedAt;
  bool get hasPhoto => photoSource.isNotEmpty;
}
