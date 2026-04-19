import 'package:flutter/services.dart';

class StartupConsentService {
  static const MethodChannel _channel = MethodChannel(
    'farmernote/startup_consent',
  );

  Future<bool> hasAcceptedConsent() async {
    final accepted = await _channel.invokeMethod<bool>('getConsentStatus');
    return accepted ?? false;
  }

  Future<void> acceptConsent() {
    return _channel.invokeMethod<void>('acceptConsent');
  }
}
