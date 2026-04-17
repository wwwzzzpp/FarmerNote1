class CloudConfig {
  static const String supabaseFunctionsBaseUrl = String.fromEnvironment(
    'FARMERNOTE_SUPABASE_FUNCTIONS_BASE_URL',
  );
  static const String devLoginMode = String.fromEnvironment(
    'FARMERNOTE_ENABLE_DEV_LOGIN',
    defaultValue: 'false',
  );
  static const String flutterWeChatLoginMode = String.fromEnvironment(
    'FARMERNOTE_ENABLE_FLUTTER_WECHAT_LOGIN',
    defaultValue: 'false',
  );
  static const String devLoginKey = String.fromEnvironment(
    'FARMERNOTE_DEV_LOGIN_KEY',
    defaultValue: 'farmernote-local-shared-user',
  );
  static const String devLoginDisplayName = String.fromEnvironment(
    'FARMERNOTE_DEV_LOGIN_DISPLAY_NAME',
    defaultValue: 'FarmerNote 临时联调',
  );
  static const String flutterWeChatAppId = String.fromEnvironment(
    'FARMERNOTE_FLUTTER_WECHAT_APP_ID',
  );
  static const String flutterWeChatUniversalLink = String.fromEnvironment(
    'FARMERNOTE_FLUTTER_WECHAT_UNIVERSAL_LINK',
  );

  static bool get isSupabaseConfigured => supabaseFunctionsBaseUrl.isNotEmpty;

  static bool get isDevLoginEnabled {
    final normalizedMode = devLoginMode.trim().toLowerCase();
    if (normalizedMode == 'true' || normalizedMode == '1') {
      return true;
    }
    if (normalizedMode == 'false' || normalizedMode == '0') {
      return false;
    }
    return false;
  }

  static bool get isFlutterWeChatConfigured => flutterWeChatAppId.isNotEmpty;

  static bool get isFlutterWeChatLoginEnabled {
    final normalizedMode = flutterWeChatLoginMode.trim().toLowerCase();
    if (normalizedMode == 'true' || normalizedMode == '1') {
      return true;
    }
    if (normalizedMode == 'false' || normalizedMode == '0') {
      return false;
    }
    return false;
  }

  static Uri functionUri(String endpoint) {
    final base = supabaseFunctionsBaseUrl.endsWith('/')
        ? supabaseFunctionsBaseUrl.substring(
            0,
            supabaseFunctionsBaseUrl.length - 1,
          )
        : supabaseFunctionsBaseUrl;
    final cleanedEndpoint = endpoint.startsWith('/')
        ? endpoint.substring(1)
        : endpoint;
    return Uri.parse('$base/$cleanedEndpoint');
  }

  static String get storageOrigin {
    if (!isSupabaseConfigured) {
      return '';
    }
    return functionUri('health').origin;
  }
}
