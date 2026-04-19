import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:fluwx/fluwx.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../config/cloud_config.dart';
import '../models/account_deletion_status.dart';
import '../models/auth_session.dart';

class AuthServiceException implements Exception {
  const AuthServiceException(this.code, this.message, {this.statusCode});

  final String code;
  final String message;
  final int? statusCode;

  @override
  String toString() => 'AuthServiceException($code, $message)';
}

class AuthService {
  AuthService({http.Client? client}) : _client = client ?? http.Client();

  static const String _deviceIdStorageKey = 'farmernote_flutter_device_id_v1';

  final http.Client _client;
  bool _registered = false;

  bool get canUseWeChatAuth =>
      CloudConfig.isFlutterWeChatLoginEnabled &&
      CloudConfig.isFlutterWeChatConfigured &&
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  Future<void> sendPhoneCode(String phone) async {
    _ensureCloudConfigured();
    final normalizedPhone = _normalizePhoneNumber(phone);
    await _postJson(
      endpoint: 'auth-phone-send-code',
      body: <String, dynamic>{'phone': normalizedPhone},
      fallbackMessage: '验证码发送失败。',
    );
  }

  Future<AuthSession> signInWithPhone({
    required String phone,
    required String code,
  }) async {
    _ensureCloudConfigured();
    return _postAuth(
      endpoint: 'auth-phone-login',
      body: <String, dynamic>{
        'platform': 'flutter_app',
        'phone': _normalizePhoneNumber(phone),
        'code': code.trim(),
        'deviceId': await _ensureDeviceId(),
      },
      fallbackMessage: '手机号登录失败。',
    );
  }

  Future<AuthSession> linkPhone({
    required AuthSession session,
    required String phone,
    required String code,
  }) async {
    _ensureCloudConfigured();
    return _postAuth(
      endpoint: 'auth-link-phone',
      body: <String, dynamic>{
        'phone': _normalizePhoneNumber(phone),
        'code': code.trim(),
      },
      bearerToken: session.accessToken,
      fallbackMessage: '手机号绑定失败。',
    );
  }

  Future<AuthSession> signInWithWeChat() async {
    _ensureCloudConfigured();
    _ensureWeChatConfigured();

    final authCode = await _requestWeChatCode();
    return _postAuth(
      endpoint: 'auth-wechat-login',
      body: <String, dynamic>{
        'platform': 'flutter_app',
        'wechatCode': authCode,
        'deviceId': await _ensureDeviceId(),
      },
      fallbackMessage: '微信登录失败。',
    );
  }

  Future<AuthSession> linkWeChat({required AuthSession session}) async {
    _ensureCloudConfigured();
    _ensureWeChatConfigured();

    final authCode = await _requestWeChatCode();
    return _postAuth(
      endpoint: 'auth-link-wechat',
      body: <String, dynamic>{
        'platform': 'flutter_app',
        'wechatCode': authCode,
      },
      bearerToken: session.accessToken,
      fallbackMessage: '微信绑定失败。',
    );
  }

  Future<AuthSession> signInWithDevLogin() async {
    _ensureCloudConfigured();

    if (!CloudConfig.isDevLoginEnabled) {
      throw const AuthServiceException(
        'dev_login_not_enabled',
        '当前构建还没打开临时联调登录。',
      );
    }

    return _postAuth(
      endpoint: 'auth-dev-login',
      body: <String, dynamic>{
        'platform': 'flutter_app',
        'debugUserKey': CloudConfig.devLoginKey,
        'displayName': CloudConfig.devLoginDisplayName,
        'deviceId': await _ensureDeviceId(),
      },
      fallbackMessage: '临时联调登录失败。',
    );
  }

  Future<AuthSession> refreshSession(AuthSession session) {
    return _postAuth(
      endpoint: 'auth-refresh',
      body: <String, dynamic>{'refreshToken': session.refreshToken},
      fallbackMessage: '刷新登录状态失败。',
    );
  }

  Future<AccountDeletionStatus> loadAccountDeletionStatus({
    required AuthSession session,
  }) async {
    final payload = await _postJson(
      endpoint: 'account-deletion-status',
      body: const <String, dynamic>{},
      bearerToken: session.accessToken,
      fallbackMessage: '加载账号注销状态失败。',
    );
    return AccountDeletionStatus.fromJson(payload);
  }

  Future<void> sendAccountDeletionPhoneCode({
    required AuthSession session,
  }) async {
    await _postJson(
      endpoint: 'account-request-deletion',
      body: const <String, dynamic>{'action': 'send_phone_code'},
      bearerToken: session.accessToken,
      fallbackMessage: '发送注销验证码失败。',
    );
  }

  Future<AccountDeletionStatus> requestAccountDeletionWithPhone({
    required AuthSession session,
    required String code,
  }) async {
    final payload = await _postJson(
      endpoint: 'account-request-deletion',
      body: <String, dynamic>{
        'action': 'confirm_phone_code',
        'code': code.trim(),
      },
      bearerToken: session.accessToken,
      fallbackMessage: '提交账号注销失败。',
    );
    return AccountDeletionStatus.fromJson(payload);
  }

  Future<AccountDeletionStatus> requestAccountDeletionWithWeChat({
    required AuthSession session,
  }) async {
    _ensureWeChatConfigured();
    final authCode = await _requestWeChatCode();
    final payload = await _postJson(
      endpoint: 'account-request-deletion',
      body: <String, dynamic>{
        'action': 'confirm_wechat',
        'platform': 'flutter_app',
        'wechatCode': authCode,
      },
      bearerToken: session.accessToken,
      fallbackMessage: '提交账号注销失败。',
    );
    return AccountDeletionStatus.fromJson(payload);
  }

  void _ensureCloudConfigured() {
    if (!CloudConfig.isSupabaseConfigured) {
      throw const AuthServiceException(
        'cloud_not_configured',
        '还没配置 Supabase Functions 地址，请先补上 dart-define。',
      );
    }
  }

  void _ensureWeChatConfigured() {
    if (!CloudConfig.isFlutterWeChatLoginEnabled) {
      throw const AuthServiceException(
        'wechat_login_disabled',
        '当前构建暂未开放 Flutter 微信登录入口，请先使用手机号验证码登录。',
      );
    }

    if (!CloudConfig.isFlutterWeChatConfigured) {
      throw const AuthServiceException(
        'wechat_not_configured',
        '还没配置 Flutter 微信 AppId，请先补上 dart-define。',
      );
    }

    if (!canUseWeChatAuth) {
      throw const AuthServiceException(
        'unsupported_platform',
        '当前平台暂不支持 Flutter 微信登录，请在 Android 或 iPhone 真机上登录。',
      );
    }
  }

  String _normalizePhoneNumber(String value) {
    final trimmed = value.trim().replaceAll(RegExp(r'[^\d+]'), '');
    if (trimmed.isEmpty) {
      throw const AuthServiceException('invalid_phone', '请输入手机号。');
    }

    final digits = trimmed.replaceAll(RegExp(r'\D'), '');
    if (RegExp(r'^1\d{10}$').hasMatch(digits)) {
      return '+86$digits';
    }
    if (RegExp(r'^86\d{11}$').hasMatch(digits)) {
      return '+$digits';
    }
    if (trimmed.startsWith('+')) {
      final prefixed = '+${trimmed.substring(1).replaceAll(RegExp(r'\D'), '')}';
      if (RegExp(r'^\+861\d{10}$').hasMatch(prefixed)) {
        return prefixed;
      }
    }

    throw const AuthServiceException('invalid_phone', '当前仅支持中国大陆手机号。');
  }

  Future<AuthSession> _postAuth({
    required String endpoint,
    required Map<String, dynamic> body,
    required String fallbackMessage,
    String bearerToken = '',
  }) async {
    final payload = await _postJson(
      endpoint: endpoint,
      body: body,
      bearerToken: bearerToken,
      fallbackMessage: fallbackMessage,
    );
    return AuthSession.fromJson(payload);
  }

  Future<Map<String, dynamic>> _postJson({
    required String endpoint,
    required Map<String, dynamic> body,
    required String fallbackMessage,
    String bearerToken = '',
  }) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (bearerToken.trim().isNotEmpty) {
      headers['Authorization'] = 'Bearer ${bearerToken.trim()}';
    }

    final response = await _client.post(
      CloudConfig.functionUri(endpoint),
      headers: headers,
      body: jsonEncode(body),
    );
    final payload = _decodeResponse(response);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final errorInfo = _readErrorInfo(
        payload,
        fallbackCode: 'request_failed',
        fallbackMessage: fallbackMessage,
      );
      throw AuthServiceException(
        errorInfo.code,
        errorInfo.message,
        statusCode: response.statusCode,
      );
    }
    return payload;
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

  Future<String> _requestWeChatCode() async {
    await _ensureFluwxRegistered();

    final installed = await Fluwx().isWeChatInstalled;
    if (!installed) {
      throw const AuthServiceException(
        'wechat_not_installed',
        '这台设备还没装微信，暂时没法完成微信登录。',
      );
    }

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
      final authResponse = await completer.future.timeout(
        const Duration(seconds: 60),
      );
      final code = (authResponse.code ?? '').trim();
      if (code.isEmpty) {
        throw const AuthServiceException(
          'wechat_auth_failed',
          '没有拿到微信登录授权码，请重试一次。',
        );
      }
      return code;
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

  ({String code, String message}) _readErrorInfo(
    Map<String, dynamic> payload, {
    required String fallbackCode,
    required String fallbackMessage,
  }) {
    final nestedError = payload['error'];
    if (nestedError is Map<String, dynamic>) {
      return (
        code: (nestedError['code'] ?? fallbackCode).toString(),
        message: (nestedError['message'] ?? fallbackMessage).toString(),
      );
    }
    if (nestedError is Map) {
      final casted = nestedError.cast<String, dynamic>();
      return (
        code: (casted['code'] ?? fallbackCode).toString(),
        message: (casted['message'] ?? fallbackMessage).toString(),
      );
    }

    return (
      code: (payload['code'] ?? fallbackCode).toString(),
      message: (payload['message'] ?? fallbackMessage).toString(),
    );
  }
}
