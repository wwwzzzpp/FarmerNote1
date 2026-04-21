import 'package:flutter/foundation.dart';

class HttpDebugLogger {
  const HttpDebugLogger._();

  static Stopwatch start(String method, Uri uri) {
    if (kDebugMode) {
      debugPrint('[HTTP] $method $uri');
    }
    return Stopwatch()..start();
  }

  static void success(
    String method,
    Uri uri,
    Stopwatch stopwatch,
    int statusCode,
  ) {
    if (!kDebugMode) {
      return;
    }
    _stop(stopwatch);
    debugPrint(
      '[HTTP] $statusCode $method $uri (${stopwatch.elapsedMilliseconds}ms)',
    );
  }

  static void failure(
    String method,
    Uri uri,
    Stopwatch stopwatch,
    Object error, {
    int? statusCode,
  }) {
    if (!kDebugMode) {
      return;
    }
    _stop(stopwatch);
    final statusLabel = statusCode == null ? 'ERROR' : 'ERROR $statusCode';
    debugPrint(
      '[HTTP] $statusLabel $method $uri (${stopwatch.elapsedMilliseconds}ms) $error',
    );
  }

  static void _stop(Stopwatch stopwatch) {
    if (stopwatch.isRunning) {
      stopwatch.stop();
    }
  }
}
