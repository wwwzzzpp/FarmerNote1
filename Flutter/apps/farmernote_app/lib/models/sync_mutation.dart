enum SyncEntityType {
  entry('entry'),
  task('task');

  const SyncEntityType(this.value);

  final String value;

  static SyncEntityType fromValue(String value) {
    return SyncEntityType.values.firstWhere(
      (entityType) => entityType.value == value,
      orElse: () => SyncEntityType.entry,
    );
  }
}

enum SyncOperation {
  upsert('upsert'),
  delete('delete');

  const SyncOperation(this.value);

  final String value;

  static SyncOperation fromValue(String value) {
    return SyncOperation.values.firstWhere(
      (operation) => operation.value == value,
      orElse: () => SyncOperation.upsert,
    );
  }
}

class SyncMutation {
  const SyncMutation({
    required this.id,
    required this.entityType,
    required this.operation,
    required this.entityId,
    required this.payload,
    required this.clientUpdatedAt,
  });

  final String id;
  final SyncEntityType entityType;
  final SyncOperation operation;
  final String entityId;
  final Map<String, dynamic> payload;
  final String clientUpdatedAt;

  String get queueKey => '${entityType.value}:$entityId';

  factory SyncMutation.fromJson(Map<String, dynamic> json) {
    final rawPayload = json['payload'];
    return SyncMutation(
      id: (json['id'] ?? '').toString(),
      entityType: SyncEntityType.fromValue(
        (json['entityType'] ?? '').toString(),
      ),
      operation: SyncOperation.fromValue((json['operation'] ?? '').toString()),
      entityId: (json['entityId'] ?? '').toString(),
      payload: rawPayload is Map<String, dynamic>
          ? rawPayload
          : rawPayload is Map
          ? rawPayload.cast<String, dynamic>()
          : <String, dynamic>{},
      clientUpdatedAt: (json['clientUpdatedAt'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'entityType': entityType.value,
    'operation': operation.value,
    'entityId': entityId,
    'payload': payload,
    'clientUpdatedAt': clientUpdatedAt,
  };

  SyncMutation copyWith({
    String? id,
    SyncEntityType? entityType,
    SyncOperation? operation,
    String? entityId,
    Map<String, dynamic>? payload,
    String? clientUpdatedAt,
  }) {
    return SyncMutation(
      id: id ?? this.id,
      entityType: entityType ?? this.entityType,
      operation: operation ?? this.operation,
      entityId: entityId ?? this.entityId,
      payload: payload ?? this.payload,
      clientUpdatedAt: clientUpdatedAt ?? this.clientUpdatedAt,
    );
  }
}
