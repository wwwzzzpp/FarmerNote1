enum CropPlanActionStatus {
  pending('pending'),
  completed('completed');

  const CropPlanActionStatus(this.value);

  final String value;

  static CropPlanActionStatus fromValue(String value) {
    return CropPlanActionStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => CropPlanActionStatus.pending,
    );
  }
}

class CropPlanActionProgress {
  const CropPlanActionProgress({
    required this.id,
    required this.planInstanceId,
    required this.actionId,
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
  final String planInstanceId;
  final String actionId;
  final CropPlanActionStatus status;
  final String? completedAt;
  final String createdAt;
  final String updatedAt;
  final String clientUpdatedAt;
  final String? deletedAt;
  final int syncVersion;
  final bool cloudTracked;

  bool get isDeleted => deletedAt != null && deletedAt!.isNotEmpty;

  factory CropPlanActionProgress.fromJson(Map<String, dynamic> json) {
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final createdAt = (json['createdAt'] ?? nowIso).toString();
    final updatedAt = (json['updatedAt'] ?? createdAt).toString();

    return CropPlanActionProgress(
      id: (json['id'] ?? '').toString(),
      planInstanceId: (json['planInstanceId'] ?? '').toString(),
      actionId: (json['actionId'] ?? '').toString(),
      status: CropPlanActionStatus.fromValue(
        (json['status'] ?? 'pending').toString(),
      ),
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
    'planInstanceId': planInstanceId,
    'actionId': actionId,
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
    'planInstanceId': planInstanceId,
    'actionId': actionId,
    'status': status.value,
    'completedAt': completedAt,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
    'clientUpdatedAt': clientUpdatedAt,
    'deletedAt': deletedAt,
  };

  CropPlanActionProgress copyWith({
    String? id,
    String? planInstanceId,
    String? actionId,
    CropPlanActionStatus? status,
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
    return CropPlanActionProgress(
      id: id ?? this.id,
      planInstanceId: planInstanceId ?? this.planInstanceId,
      actionId: actionId ?? this.actionId,
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
