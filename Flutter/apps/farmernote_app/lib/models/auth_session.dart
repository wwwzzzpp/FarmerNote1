import 'cloud_user_profile.dart';

class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.accessExpiresAt,
    required this.refreshExpiresAt,
    required this.userProfile,
  });

  final String accessToken;
  final String refreshToken;
  final String accessExpiresAt;
  final String refreshExpiresAt;
  final CloudUserProfile userProfile;

  bool get hasWeChatLinked => userProfile.hasWeChatLinked;
  bool get hasPhoneLinked => userProfile.hasPhoneLinked;

  DateTime get accessExpiry => DateTime.parse(accessExpiresAt).toUtc();
  DateTime get refreshExpiry => DateTime.parse(refreshExpiresAt).toUtc();

  bool get hasUsableAccessToken =>
      accessToken.isNotEmpty && accessExpiry.isAfter(DateTime.now().toUtc());

  bool get hasUsableRefreshToken =>
      refreshToken.isNotEmpty && refreshExpiry.isAfter(DateTime.now().toUtc());

  bool get shouldRefresh {
    if (refreshToken.isEmpty) {
      return false;
    }
    final threshold = DateTime.now().toUtc().add(const Duration(minutes: 5));
    return !accessExpiry.isAfter(threshold);
  }

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      accessToken: (json['accessToken'] ?? '').toString(),
      refreshToken: (json['refreshToken'] ?? '').toString(),
      accessExpiresAt: (json['accessExpiresAt'] ?? '').toString(),
      refreshExpiresAt: (json['refreshExpiresAt'] ?? '').toString(),
      userProfile: CloudUserProfile.fromJson(
        (json['userProfile'] is Map<String, dynamic>)
            ? json['userProfile'] as Map<String, dynamic>
            : (json['userProfile'] is Map)
            ? (json['userProfile'] as Map).cast<String, dynamic>()
            : <String, dynamic>{},
      ),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'accessToken': accessToken,
    'refreshToken': refreshToken,
    'accessExpiresAt': accessExpiresAt,
    'refreshExpiresAt': refreshExpiresAt,
    'userProfile': userProfile.toJson(),
  };
}
