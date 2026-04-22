enum CropPlanInstanceStatus {
  active('active');

  const CropPlanInstanceStatus(this.value);

  final String value;

  static CropPlanInstanceStatus fromValue(String value) {
    return CropPlanInstanceStatus.values.firstWhere(
      (status) => status.value == value,
      orElse: () => CropPlanInstanceStatus.active,
    );
  }
}

class CropPlanInstance {
  const CropPlanInstance({
    required this.id,
    required this.cropCode,
    required this.regionCode,
    required this.anchorDate,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.clientUpdatedAt,
    required this.deletedAt,
    required this.syncVersion,
    required this.cloudTracked,
  });

  final String id;
  final String cropCode;
  final String regionCode;
  final String anchorDate;
  final CropPlanInstanceStatus status;
  final String createdAt;
  final String updatedAt;
  final String clientUpdatedAt;
  final String? deletedAt;
  final int syncVersion;
  final bool cloudTracked;

  bool get isDeleted => deletedAt != null && deletedAt!.isNotEmpty;

  factory CropPlanInstance.fromJson(Map<String, dynamic> json) {
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final createdAt = (json['createdAt'] ?? nowIso).toString();
    final updatedAt = (json['updatedAt'] ?? createdAt).toString();

    return CropPlanInstance(
      id: (json['id'] ?? '').toString(),
      cropCode: (json['cropCode'] ?? '').toString(),
      regionCode: (json['regionCode'] ?? '').toString(),
      anchorDate: (json['anchorDate'] ?? '').toString(),
      status: CropPlanInstanceStatus.fromValue(
        (json['status'] ?? 'active').toString(),
      ),
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
    'cropCode': cropCode,
    'regionCode': regionCode,
    'anchorDate': anchorDate,
    'status': status.value,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
    'clientUpdatedAt': clientUpdatedAt,
    'deletedAt': deletedAt,
    'syncVersion': syncVersion,
    'cloudTracked': cloudTracked,
  };

  Map<String, dynamic> toCloudJson() => <String, dynamic>{
    'id': id,
    'cropCode': cropCode,
    'regionCode': regionCode,
    'anchorDate': anchorDate,
    'status': status.value,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
    'clientUpdatedAt': clientUpdatedAt,
    'deletedAt': deletedAt,
  };

  CropPlanInstance copyWith({
    String? id,
    String? cropCode,
    String? regionCode,
    String? anchorDate,
    CropPlanInstanceStatus? status,
    String? createdAt,
    String? updatedAt,
    String? clientUpdatedAt,
    String? deletedAt,
    int? syncVersion,
    bool? cloudTracked,
    bool clearDeletedAt = false,
  }) {
    return CropPlanInstance(
      id: id ?? this.id,
      cropCode: cropCode ?? this.cropCode,
      regionCode: regionCode ?? this.regionCode,
      anchorDate: anchorDate ?? this.anchorDate,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      clientUpdatedAt: clientUpdatedAt ?? this.clientUpdatedAt,
      deletedAt: clearDeletedAt ? null : deletedAt ?? this.deletedAt,
      syncVersion: syncVersion ?? this.syncVersion,
      cloudTracked: cloudTracked ?? this.cloudTracked,
    );
  }
}
