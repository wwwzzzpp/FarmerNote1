class EntryRecord {
  const EntryRecord({
    required this.id,
    required this.noteText,
    required this.photoDataUri,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String noteText;
  final String photoDataUri;
  final String createdAt;
  final String updatedAt;

  factory EntryRecord.fromJson(Map<String, dynamic> json) {
    final createdAt = json['createdAt'];
    final updatedAt = json['updatedAt'];
    final nowIso = DateTime.now().toUtc().toIso8601String();

    return EntryRecord(
      id: (json['id'] ?? '').toString(),
      noteText: (json['noteText'] ?? '').toString(),
      photoDataUri: (json['photoDataUri'] ?? '').toString(),
      createdAt: createdAt is String ? createdAt : nowIso,
      updatedAt: updatedAt is String
          ? updatedAt
          : createdAt is String
          ? createdAt
          : nowIso,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'noteText': noteText,
    'photoDataUri': photoDataUri,
    'createdAt': createdAt,
    'updatedAt': updatedAt,
  };

  EntryRecord copyWith({
    String? id,
    String? noteText,
    String? photoDataUri,
    String? createdAt,
    String? updatedAt,
  }) {
    return EntryRecord(
      id: id ?? this.id,
      noteText: noteText ?? this.noteText,
      photoDataUri: photoDataUri ?? this.photoDataUri,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
