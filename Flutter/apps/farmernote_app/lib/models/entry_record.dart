class EntryRecord {
  const EntryRecord({
    required this.id,
    required this.noteText,
    required this.photoObjectPath,
    required this.localPhotoPath,
    required this.createdAt,
    required this.updatedAt,
    required this.clientUpdatedAt,
    required this.deletedAt,
    required this.sourcePlatform,
    required this.syncVersion,
    required this.cloudTracked,
  });

  final String id;
  final String noteText;
  final String photoObjectPath;
  final String localPhotoPath;
  final String createdAt;
  final String updatedAt;
  final String clientUpdatedAt;
  final String? deletedAt;
  final String sourcePlatform;
  final int syncVersion;
  final bool cloudTracked;

  bool get hasPhoto => photoObjectPath.isNotEmpty || localPhotoPath.isNotEmpty;
  bool get isDeleted => deletedAt != null && deletedAt!.isNotEmpty;

  factory EntryRecord.fromJson(Map<String, dynamic> json) {
    final createdAt = json['createdAt'];
    final updatedAt = json['updatedAt'];
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final legacyPhotoDataUri = (json['photoDataUri'] ?? '').toString();
    final localPhotoPath = (json['localPhotoPath'] ?? '').toString();

    return EntryRecord(
      id: (json['id'] ?? '').toString(),
      noteText: (json['noteText'] ?? '').toString(),
      photoObjectPath: (json['photoObjectPath'] ?? '').toString(),
      localPhotoPath: localPhotoPath.isNotEmpty
          ? localPhotoPath
          : legacyPhotoDataUri,
      createdAt: createdAt is String ? createdAt : nowIso,
      updatedAt: updatedAt is String
          ? updatedAt
          : createdAt is String
          ? createdAt
          : nowIso,
      clientUpdatedAt:
          (json['clientUpdatedAt'] ?? updatedAt ?? createdAt ?? nowIso)
              .toString(),
      deletedAt: json['deletedAt'] is String
          ? json['deletedAt'] as String
          : null,
      sourcePlatform: (json['sourcePlatform'] ?? 'flutter_app').toString(),
      syncVersion: json['syncVersion'] is int
          ? json['syncVersion'] as int
          : int.tryParse((json['syncVersion'] ?? '').toString()) ?? 0,
      cloudTracked: json['cloudTracked'] == true,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'noteText': noteText,
    'photoObjectPath': photoObjectPath,
    'localPhotoPath': localPhotoPath,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
    'clientUpdatedAt': clientUpdatedAt,
    'deletedAt': deletedAt,
    'sourcePlatform': sourcePlatform,
    'syncVersion': syncVersion,
    'cloudTracked': cloudTracked,
  };

  Map<String, dynamic> toCloudJson() => <String, dynamic>{
    'id': id,
    'noteText': noteText,
    'photoObjectPath': photoObjectPath,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
    'clientUpdatedAt': clientUpdatedAt,
    'deletedAt': deletedAt,
    'sourcePlatform': sourcePlatform,
  };

  EntryRecord copyWith({
    String? id,
    String? noteText,
    String? photoObjectPath,
    String? localPhotoPath,
    String? createdAt,
    String? updatedAt,
    String? clientUpdatedAt,
    String? deletedAt,
    String? sourcePlatform,
    int? syncVersion,
    bool? cloudTracked,
    bool clearDeletedAt = false,
  }) {
    return EntryRecord(
      id: id ?? this.id,
      noteText: noteText ?? this.noteText,
      photoObjectPath: photoObjectPath ?? this.photoObjectPath,
      localPhotoPath: localPhotoPath ?? this.localPhotoPath,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      clientUpdatedAt: clientUpdatedAt ?? this.clientUpdatedAt,
      deletedAt: clearDeletedAt ? null : deletedAt ?? this.deletedAt,
      sourcePlatform: sourcePlatform ?? this.sourcePlatform,
      syncVersion: syncVersion ?? this.syncVersion,
      cloudTracked: cloudTracked ?? this.cloudTracked,
    );
  }
}
