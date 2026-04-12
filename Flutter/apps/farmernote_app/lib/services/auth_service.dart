import 'dart:convert';
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:fluwx/fluwx.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../config/cloud_config.dart';
import '../models/auth_session.dart';

class AuthServiceException implements Exception {
  const AuthServiceException(this.code, this.message);

  final String code;
  final String message;

  @override
  String toString() => 'AuthServiceException($code, $message)';
}

class AuthService {
  AuthService({http.Client? client}) : _client = client ?? http.Client();

  static const String _deviceIdStorageKey = 'farmernote_flutter_device_id_v1';

  final http.Client _client;
  bool _registered = false;

  Future<AuthSession> signInWithWeChat() async {
    if (!CloudConfig.isSupabaseConfigured) {
      throw const AuthServiceException(
        'cloud_not_configured',
        '还没配置 Supabase Functions 地址，请先补上 dart-define。',
      );
    }

    if (!CloudConfig.isFlutterWeChatConfigured) {
      throw const AuthServiceException(
        'wechat_not_configured',
        '还没配置 Flutter 微信 AppId，请先补上 dart-define。',
      );
    }

    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      throw const AuthServiceException(
        'unsupported_platform',
        '当前平台暂不支持 Flutter 微信登录，请在 Android 或 iPhone 真机上登录。',
      );
    }

    await _ensureFluwxRegistered();
    final installed = await Fluwx().isWeChatInstalled;
    if (!installed) {
      throw const AuthServiceException(
        'wechat_not_installed',
        '这台设备还没装微信，暂时没法完成微信登录。',
      );
    }

    final authResponse = await _requestWeChatAuthCode();
    if ((authResponse.code ?? '').isEmpty) {
      throw const AuthServiceException(
        'wechat_auth_failed',
        '没有拿到微信登录授权码，请重试一次。',
      );
    }

    return _postAuth(
      endpoint: 'auth-wechat-login',
      body: <String, dynamic>{
        'platform': 'flutter_app',
        'wechatCode': authResponse.code,
        'deviceId': await _ensureDeviceId(),
      },
    );
  }

  Future<AuthSession> refreshSession(AuthSession session) {
    return _postAuth(
      endpoint: 'auth-refresh',
      body: <String, dynamic>{'refreshToken': session.refreshToken},
    );
  }

  Future<AuthSession> _postAuth({
    required String endpoint,
    required Map<String, dynamic> body,
  }) async {
    final response = await _client.post(
      CloudConfig.functionUri(endpoint),
      headers: const <String, String>{'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    final payload = _decodeResponse(response);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthServiceException(
        (payload['code'] ?? 'request_failed').toString(),
        (payload['message'] ?? '登录请求失败。').toString(),
      );
    }
    return AuthSession.fromJson(payload);
  }

  Future<void> _ensureFluwxRegistered() async {
    if (_registered) {
      return;
    }
    await Fluwx().registerApi(
      appId: CloudConfig.flutterWeChatAppId,
      universalLink: CloudConfig.flutterWeChatUniversalLink,
    );
    _registered = true;
  }

  Future<WeChatAuthResponse> _requestWeChatAuthCode() async {
    final fluwx = Fluwx();
    final completer = Completer<WeChatAuthResponse>();
    final cancelable = fluwx.addSubscriber((response) {
      if (response is! WeChatAuthResponse || completer.isCompleted) {
        return;
      }
      if ((response.code ?? '').isNotEmpty) {
        completer.complete(response);
        return;
      }
      completer.completeError(
        AuthServiceException(
          'wechat_auth_failed',
          (response.errStr ?? '微信登录失败，请稍后再试。').toString(),
        ),
      );
    });

    final started = await fluwx.authBy(
      which: NormalAuth(scope: 'snsapi_userinfo', state: 'farmernote'),
    );
    if (!started) {
      cancelable.cancel();
      throw const AuthServiceException(
        'wechat_auth_failed',
        '微信登录请求没有成功发起，请重试一次。',
      );
    }

    try {
      return await completer.future.timeout(const Duration(seconds: 60));
    } on TimeoutException {
      throw const AuthServiceException(
        'wechat_auth_timeout',
        '等待微信登录结果超时了，请再试一次。',
      );
    } finally {
      cancelable.cancel();
    }
  }

  Future<String> _ensureDeviceId() async {
    final preferences = await SharedPreferences.getInstance();
    final existing = preferences.getString(_deviceIdStorageKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final next = const Uuid().v4();
    await preferences.setString(_deviceIdStorageKey, next);
    return next;
  }

  Map<String, dynamic> _decodeResponse(http.Response response) {
    if (response.body.isEmpty) {
      return <String, dynamic>{};
    }

    final decoded = jsonDecode(response.body);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
    if (decoded is Map) {
      return decoded.cast<String, dynamic>();
    }
    return <String, dynamic>{};
  }
}
