class CloudUserProfile {
  const CloudUserProfile({
    required this.id,
    required this.unionId,
    required this.displayName,
    required this.avatarUrl,
    required this.linkedProviders,
    required this.maskedPhone,
  });

  final String id;
  final String unionId;
  final String displayName;
  final String avatarUrl;
  final List<String> linkedProviders;
  final String maskedPhone;

  bool get hasWeChatLinked =>
      linkedProviders.contains('wechat') || unionId.trim().isNotEmpty;
  bool get hasPhoneLinked =>
      linkedProviders.contains('phone') || maskedPhone.trim().isNotEmpty;

  factory CloudUserProfile.fromJson(Map<String, dynamic> json) {
    final rawProviders = json['linkedProviders'];
    final linkedProviders = rawProviders is List
        ? rawProviders
              .map((item) => item.toString())
              .where((item) => item.isNotEmpty)
              .toList()
        : <String>[];

    return CloudUserProfile(
      id: (json['id'] ?? '').toString(),
      unionId: (json['unionId'] ?? '').toString(),
      displayName: (json['displayName'] ?? '').toString(),
      avatarUrl: (json['avatarUrl'] ?? '').toString(),
      linkedProviders: linkedProviders,
      maskedPhone: (json['maskedPhone'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'unionId': unionId,
    'displayName': displayName,
    'avatarUrl': avatarUrl,
    'linkedProviders': linkedProviders,
    'maskedPhone': maskedPhone,
  };
}
