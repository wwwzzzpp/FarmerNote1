import 'dart:convert';

import 'package:image_picker/image_picker.dart';

class MediaServiceException implements Exception {
  const MediaServiceException(this.code, this.message);

  final String code;
  final String message;

  @override
  String toString() => 'MediaServiceException($code, $message)';
}

class MediaService {
  MediaService({ImagePicker? picker}) : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  Future<String> chooseCameraPhotoDataUri() async {
    try {
      final file = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 75,
        maxWidth: 1800,
      );

      if (file == null) {
        throw const MediaServiceException('cancel', '已取消拍照。');
      }

      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) {
        throw const MediaServiceException('empty_result', '没有拿到照片，请重试。');
      }

      final mime = _inferMimeType(file.name);
      return 'data:$mime;base64,${base64Encode(bytes)}';
    } on MediaServiceException {
      rethrow;
    } catch (_) {
      throw const MediaServiceException('choose_failed', '拍照失败，请稍后再试。');
    }
  }

  String _inferMimeType(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.endsWith('.png')) {
      return 'image/png';
    }
    if (lower.endsWith('.webp')) {
      return 'image/webp';
    }
    return 'image/jpeg';
  }
}
