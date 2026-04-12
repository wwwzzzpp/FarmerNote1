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
    required this.createdAt,
    required this.updatedAt,
    required this.clientUpdatedAt,
    required this.deletedAt,
    required this.syncVersion,
    required this.cloudTracked,
  });

  final String id;
  final String entryId;
  final String dueAt;
  final TaskStatus status;
  final String? completedAt;
  final String createdAt;
  final String updatedAt;
  final String clientUpdatedAt;
  final String? deletedAt;
  final int syncVersion;
  final bool cloudTracked;

  bool get isDeleted => deletedAt != null && deletedAt!.isNotEmpty;

  factory TaskRecord.fromJson(Map<String, dynamic> json) {
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final createdAt = (json['createdAt'] ?? nowIso).toString();
    final updatedAt = (json['updatedAt'] ?? createdAt).toString();

    return TaskRecord(
      id: (json['id'] ?? '').toString(),
      entryId: (json['entryId'] ?? '').toString(),
      dueAt: (json['dueAt'] ?? '').toString(),
      status: TaskStatus.fromValue((json['status'] ?? '').toString()),
      completedAt: json['completedAt'] is String
          ? json['completedAt'] as String
          : null,
      createdAt: createdAt,
      updatedAt: updatedAt,
      clientUpdatedAt: (json['clientUpdatedAt'] ?? updatedAt).toString(),
      deletedAt: json['deletedAt'] is String
          ? json['deletedAt'] as String
          : null,
      syncVersion: json['syncVersion'] is int
          ? json['syncVersion'] as int
          : int.tryParse((json['syncVersion'] ?? '').toString()) ?? 0,
      cloudTracked: json['cloudTracked'] == true,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'entryId': entryId,
    'dueAt': dueAt,
    'status': status.value,
    'completedAt': completedAt,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
    'clientUpdatedAt': clientUpdatedAt,
    'deletedAt': deletedAt,
    'syncVersion': syncVersion,
    'cloudTracked': cloudTracked,
  };

  Map<String, dynamic> toCloudJson() => <String, dynamic>{
    'id': id,
    'entryId': entryId,
    'dueAt': dueAt,
    'status': status.value,
    'completedAt': completedAt,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
    'clientUpdatedAt': clientUpdatedAt,
    'deletedAt': deletedAt,
  };

  TaskRecord copyWith({
    String? id,
    String? entryId,
    String? dueAt,
    TaskStatus? status,
    String? completedAt,
    String? createdAt,
    String? updatedAt,
    String? clientUpdatedAt,
    String? deletedAt,
    int? syncVersion,
    bool? cloudTracked,
    bool clearCompletedAt = false,
    bool clearDeletedAt = false,
  }) {
    return TaskRecord(
      id: id ?? this.id,
      entryId: entryId ?? this.entryId,
      dueAt: dueAt ?? this.dueAt,
      status: status ?? this.status,
      completedAt: clearCompletedAt ? null : completedAt ?? this.completedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      clientUpdatedAt: clientUpdatedAt ?? this.clientUpdatedAt,
      deletedAt: clearDeletedAt ? null : deletedAt ?? this.deletedAt,
      syncVersion: syncVersion ?? this.syncVersion,
      cloudTracked: cloudTracked ?? this.cloudTracked,
    );
  }
}
