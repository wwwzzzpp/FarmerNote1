import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

import '../config/cloud_config.dart';
import '../models/auth_session.dart';
import 'http_debug_logger.dart';

class MediaRepositoryException implements Exception {
  const MediaRepositoryException(this.code, this.message, {this.statusCode});

  final String code;
  final String message;
  final int? statusCode;

  @override
  String toString() => 'MediaRepositoryException($code, $message)';
}

class MediaRepository {
  MediaRepository({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<String> stageCapturedPhoto(String tempPath) async {
    if (tempPath.isEmpty) {
      return '';
    }

    final source = File(tempPath);
    if (!await source.exists()) {
      throw const MediaRepositoryException('missing_photo', '没有找到刚拍下来的照片文件。');
    }

    final extension = _inferExtension(tempPath);
    final directory = await _ensureDirectory('draft-photos');
    final nextPath = '${directory.path}/${const Uuid().v4()}.$extension';
    return source.copy(nextPath).then((file) => file.path);
  }

  Future<void> removeLocalPhoto(String filePath) async {
    if (filePath.isEmpty || filePath.startsWith('data:')) {
      return;
    }

    final file = File(filePath);
    if (await file.exists()) {
      await file.delete();
    }
  }

  Future<void> clearAllLocalMedia() async {
    final root = await getApplicationSupportDirectory();
    final directories = <String>['draft-photos', 'media-cache'];
    for (final segment in directories) {
      final directory = Directory('${root.path}/$segment');
      if (await directory.exists()) {
        await directory.delete(recursive: true);
      }
    }
  }

  Future<String> uploadPhoto({
    required AuthSession session,
    required String localPath,
    String? existingObjectPath,
  }) async {
    if (localPath.isEmpty) {
      return existingObjectPath ?? '';
    }
    if (localPath.startsWith('data:')) {
      throw const MediaRepositoryException(
        'legacy_photo_source',
        '旧版 base64 照片不会自动上云，请用新版拍照后再同步。',
      );
    }

    final file = File(localPath);
    if (!await file.exists()) {
      throw const MediaRepositoryException(
        'missing_local_photo',
        '本地照片文件不存在，无法上传到云端。',
      );
    }

    final contentType = _inferContentType(localPath);
    final extension = _inferExtension(localPath);
    final ticketUri = CloudConfig.functionUri('media-upload-ticket');
    final ticketStopwatch = HttpDebugLogger.start('POST', ticketUri);
    late final http.Response ticketResponse;
    try {
      ticketResponse = await _client.post(
        ticketUri,
        headers: <String, String>{
          'Authorization': 'Bearer ${session.accessToken}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(<String, dynamic>{
          'contentType': contentType,
          'fileExtension': extension,
        }),
      );
    } catch (error) {
      HttpDebugLogger.failure('POST', ticketUri, ticketStopwatch, error);
      rethrow;
    }

    final ticketPayload = _decodeResponse(ticketResponse);
    if (ticketResponse.statusCode < 200 || ticketResponse.statusCode >= 300) {
      HttpDebugLogger.failure(
        'POST',
        ticketUri,
        ticketStopwatch,
        'upload_ticket_failed',
        statusCode: ticketResponse.statusCode,
      );
      final errorInfo = _readErrorInfo(
        ticketPayload,
        fallbackCode: 'upload_ticket_failed',
        fallbackMessage: '创建图片上传票据失败。',
      );
      throw MediaRepositoryException(
        errorInfo.code,
        errorInfo.message,
        statusCode: ticketResponse.statusCode,
      );
    }
    HttpDebugLogger.success(
      'POST',
      ticketUri,
      ticketStopwatch,
      ticketResponse.statusCode,
    );

    final uploadUrl = (ticketPayload['uploadUrl'] ?? '').toString();
    final objectPath = (ticketPayload['objectPath'] ?? '').toString();
    if (uploadUrl.isEmpty || objectPath.isEmpty) {
      throw const MediaRepositoryException(
        'invalid_upload_ticket',
        '图片上传票据不完整。',
      );
    }

    final uploadUri = Uri.parse(uploadUrl);
    final uploadStopwatch = HttpDebugLogger.start('PUT', uploadUri);
    late final http.Response uploadResponse;
    try {
      uploadResponse = await _client.put(
        uploadUri,
        headers: <String, String>{'Content-Type': contentType},
        body: await file.readAsBytes(),
      );
    } catch (error) {
      HttpDebugLogger.failure('PUT', uploadUri, uploadStopwatch, error);
      rethrow;
    }

    if (uploadResponse.statusCode < 200 || uploadResponse.statusCode >= 300) {
      HttpDebugLogger.failure(
        'PUT',
        uploadUri,
        uploadStopwatch,
        'upload_failed',
        statusCode: uploadResponse.statusCode,
      );
      final responseBody = uploadResponse.body.trim();
      final detail = responseBody.isEmpty
          ? '状态码 ${uploadResponse.statusCode}'
          : '状态码 ${uploadResponse.statusCode}，响应：$responseBody';
      throw MediaRepositoryException('upload_failed', '上传图片到云端失败，$detail');
    }
    HttpDebugLogger.success(
      'PUT',
      uploadUri,
      uploadStopwatch,
      uploadResponse.statusCode,
    );

    return objectPath;
  }

  Future<String> ensureDownloadedPhoto({
    required AuthSession session,
    required String objectPath,
  }) async {
    if (objectPath.isEmpty) {
      return '';
    }

    final targetFile = await _buildCacheFile(objectPath);
    if (await targetFile.exists()) {
      return targetFile.path;
    }

    final ticketUri = CloudConfig.functionUri('media-download-ticket');
    final ticketStopwatch = HttpDebugLogger.start('POST', ticketUri);
    late final http.Response ticketResponse;
    try {
      ticketResponse = await _client.post(
        ticketUri,
        headers: <String, String>{
          'Authorization': 'Bearer ${session.accessToken}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(<String, dynamic>{'objectPath': objectPath}),
      );
    } catch (error) {
      HttpDebugLogger.failure('POST', ticketUri, ticketStopwatch, error);
      rethrow;
    }

    final ticketPayload = _decodeResponse(ticketResponse);
    if (ticketResponse.statusCode < 200 || ticketResponse.statusCode >= 300) {
      HttpDebugLogger.failure(
        'POST',
        ticketUri,
        ticketStopwatch,
        'download_ticket_failed',
        statusCode: ticketResponse.statusCode,
      );
      final errorInfo = _readErrorInfo(
        ticketPayload,
        fallbackCode: 'download_ticket_failed',
        fallbackMessage: '创建图片下载票据失败。',
      );
      throw MediaRepositoryException(
        errorInfo.code,
        errorInfo.message,
        statusCode: ticketResponse.statusCode,
      );
    }
    HttpDebugLogger.success(
      'POST',
      ticketUri,
      ticketStopwatch,
      ticketResponse.statusCode,
    );

    final rawDownloadUrl = (ticketPayload['downloadUrl'] ?? '').toString();
    if (rawDownloadUrl.isEmpty) {
      throw const MediaRepositoryException(
        'invalid_download_ticket',
        '图片下载票据不完整。',
      );
    }

    final resolvedUrl = rawDownloadUrl.startsWith('http')
        ? rawDownloadUrl
        : '${CloudConfig.storageOrigin}$rawDownloadUrl';
    final downloadUri = Uri.parse(resolvedUrl);
    final downloadStopwatch = HttpDebugLogger.start('GET', downloadUri);
    late final http.Response downloadResponse;
    try {
      downloadResponse = await _client.get(downloadUri);
    } catch (error) {
      HttpDebugLogger.failure('GET', downloadUri, downloadStopwatch, error);
      rethrow;
    }
    if (downloadResponse.statusCode < 200 ||
        downloadResponse.statusCode >= 300) {
      HttpDebugLogger.failure(
        'GET',
        downloadUri,
        downloadStopwatch,
        'download_failed',
        statusCode: downloadResponse.statusCode,
      );
      final responseBody = downloadResponse.body.trim();
      final detail = responseBody.isEmpty
          ? '状态码 ${downloadResponse.statusCode}'
          : '状态码 ${downloadResponse.statusCode}，响应：$responseBody';
      throw MediaRepositoryException('download_failed', '下载云端图片失败，$detail');
    }
    HttpDebugLogger.success(
      'GET',
      downloadUri,
      downloadStopwatch,
      downloadResponse.statusCode,
    );

    await targetFile.parent.create(recursive: true);
    await targetFile.writeAsBytes(downloadResponse.bodyBytes, flush: true);
    return targetFile.path;
  }

  Future<bool> hasUsableFile(String filePath) async {
    if (filePath.isEmpty || filePath.startsWith('data:')) {
      return false;
    }
    return File(filePath).exists();
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

  Future<Directory> _ensureDirectory(String segment) async {
    final root = await getApplicationSupportDirectory();
    final directory = Directory('${root.path}/$segment');
    if (!await directory.exists()) {
      await directory.create(recursive: true);
    }
    return directory;
  }

  Future<File> _buildCacheFile(String objectPath) async {
    final root = await _ensureDirectory('media-cache');
    final sanitizedPath = objectPath.split('/').join(Platform.pathSeparator);
    return File('${root.path}${Platform.pathSeparator}$sanitizedPath');
  }

  String _inferContentType(String filePath) {
    final extension = _inferExtension(filePath);
    if (extension == 'png') {
      return 'image/png';
    }
    if (extension == 'webp') {
      return 'image/webp';
    }
    return 'image/jpeg';
  }

  String _inferExtension(String filePath) {
    final dotIndex = filePath.lastIndexOf('.');
    if (dotIndex < 0 || dotIndex == filePath.length - 1) {
      return 'jpg';
    }
    final extension = filePath.substring(dotIndex + 1).toLowerCase();
    if (extension == 'jpeg') {
      return 'jpg';
    }
    if (extension == 'png' || extension == 'webp' || extension == 'jpg') {
      return extension;
    }
    return 'jpg';
  }
}
