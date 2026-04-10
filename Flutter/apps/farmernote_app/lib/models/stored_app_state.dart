import 'entry_record.dart';
import 'task_record.dart';

class StoredAppState {
  const StoredAppState({required this.entries, required this.tasks});

  final List<EntryRecord> entries;
  final List<TaskRecord> tasks;

  factory StoredAppState.empty() {
    return const StoredAppState(
      entries: <EntryRecord>[],
      tasks: <TaskRecord>[],
    );
  }

  factory StoredAppState.fromJson(Map<String, dynamic> json) {
    final rawEntries = json['entries'];
    final rawTasks = json['tasks'];

    final entries = rawEntries is List
        ? rawEntries
              .whereType<Map<dynamic, dynamic>>()
              .map((item) => EntryRecord.fromJson(item.cast<String, dynamic>()))
              .where(
                (entry) =>
                    entry.id.isNotEmpty && entry.noteText.trim().isNotEmpty,
              )
              .toList()
        : <EntryRecord>[];

    final tasks = rawTasks is List
        ? rawTasks
              .whereType<Map<dynamic, dynamic>>()
              .map((item) => TaskRecord.fromJson(item.cast<String, dynamic>()))
              .where(
                (task) =>
                    task.id.isNotEmpty &&
                    task.entryId.isNotEmpty &&
                    task.dueAt.isNotEmpty,
              )
              .toList()
        : <TaskRecord>[];

    return StoredAppState(entries: entries, tasks: tasks);
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'entries': entries.map((entry) => entry.toJson()).toList(),
    'tasks': tasks.map((task) => task.toJson()).toList(),
  };

  StoredAppState copyWith({
    List<EntryRecord>? entries,
    List<TaskRecord>? tasks,
  }) {
    return StoredAppState(
      entries: entries ?? this.entries,
      tasks: tasks ?? this.tasks,
    );
  }
}
