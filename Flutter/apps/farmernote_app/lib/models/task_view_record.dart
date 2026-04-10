import 'task_record.dart';

class TaskViewRecord {
  const TaskViewRecord({
    required this.task,
    required this.noteText,
    required this.photoDataUri,
    required this.entryCreatedAt,
  });

  final TaskRecord task;
  final String noteText;
  final String photoDataUri;
  final String entryCreatedAt;

  String get id => task.id;
  String get dueAt => task.dueAt;
  TaskStatus get status => task.status;
  String? get completedAt => task.completedAt;
  bool get hasPhoto => photoDataUri.isNotEmpty;
}
