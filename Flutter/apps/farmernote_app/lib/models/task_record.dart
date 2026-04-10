enum TaskStatus {
  pending('pending'),
  overdue('overdue'),
  completed('completed');

  const TaskStatus(this.value);

  final String value;

  static TaskStatus fromValue(String value) {
    return TaskStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => TaskStatus.pending,
    );
  }
}

class TaskRecord {
  const TaskRecord({
    required this.id,
    required this.entryId,
    required this.dueAt,
    required this.status,
    required this.completedAt,
  });

  final String id;
  final String entryId;
  final String dueAt;
  final TaskStatus status;
  final String? completedAt;

  factory TaskRecord.fromJson(Map<String, dynamic> json) {
    return TaskRecord(
      id: (json['id'] ?? '').toString(),
      entryId: (json['entryId'] ?? '').toString(),
      dueAt: (json['dueAt'] ?? '').toString(),
      status: TaskStatus.fromValue((json['status'] ?? '').toString()),
      completedAt: json['completedAt'] is String
          ? json['completedAt'] as String
          : null,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'entryId': entryId,
    'dueAt': dueAt,
    'status': status.value,
    'completedAt': completedAt,
  };

  TaskRecord copyWith({
    String? id,
    String? entryId,
    String? dueAt,
    TaskStatus? status,
    String? completedAt,
    bool clearCompletedAt = false,
  }) {
    return TaskRecord(
      id: id ?? this.id,
      entryId: entryId ?? this.entryId,
      dueAt: dueAt ?? this.dueAt,
      status: status ?? this.status,
      completedAt: clearCompletedAt ? null : completedAt ?? this.completedAt,
    );
  }
}
