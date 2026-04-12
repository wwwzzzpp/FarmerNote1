class CloudConfig {
  static const String supabaseFunctionsBaseUrl = String.fromEnvironment(
    'FARMERNOTE_SUPABASE_FUNCTIONS_BASE_URL',
  );
  static const String flutterWeChatAppId = String.fromEnvironment(
    'FARMERNOTE_FLUTTER_WECHAT_APP_ID',
  );
  static const String flutterWeChatUniversalLink = String.fromEnvironment(
    'FARMERNOTE_FLUTTER_WECHAT_UNIVERSAL_LINK',
  );

  static bool get isSupabaseConfigured => supabaseFunctionsBaseUrl.isNotEmpty;

  static bool get isFlutterWeChatConfigured => flutterWeChatAppId.isNotEmpty;

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
