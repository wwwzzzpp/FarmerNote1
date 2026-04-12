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

  Future<String> chooseCameraPhotoPath() async {
    try {
      final file = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 75,
        maxWidth: 1800,
      );

      if (file == null) {
        throw const MediaServiceException('cancel', '已取消拍照。');
      }

      if (file.path.isEmpty) {
        throw const MediaServiceException('empty_result', '没有拿到照片，请重试。');
      }

      return file.path;
    } on MediaServiceException {
      rethrow;
    } catch (_) {
      throw const MediaServiceException('choose_failed', '拍照失败，请稍后再试。');
    }
  }
}
