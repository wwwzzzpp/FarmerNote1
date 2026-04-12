class CloudUserProfile {
  const CloudUserProfile({
    required this.id,
    required this.unionId,
    required this.displayName,
    required this.avatarUrl,
  });

  final String id;
  final String unionId;
  final String displayName;
  final String avatarUrl;

  factory CloudUserProfile.fromJson(Map<String, dynamic> json) {
    return CloudUserProfile(
      id: (json['id'] ?? '').toString(),
      unionId: (json['unionId'] ?? '').toString(),
      displayName: (json['displayName'] ?? '').toString(),
      avatarUrl: (json['avatarUrl'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'unionId': unionId,
    'displayName': displayName,
    'avatarUrl': avatarUrl,
  };
}
