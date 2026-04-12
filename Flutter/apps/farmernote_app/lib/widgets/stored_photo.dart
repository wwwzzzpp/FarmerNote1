import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';

class StoredPhoto extends StatelessWidget {
  const StoredPhoto({
    required this.source,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius = const BorderRadius.all(Radius.circular(18)),
    super.key,
  });

  final String source;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius borderRadius;

  static Uint8List? decodeDataUri(String dataUri) {
    if (dataUri.isEmpty || !dataUri.startsWith('data:')) {
      return null;
    }

    try {
      final commaIndex = dataUri.indexOf(',');
      final encoded = commaIndex >= 0
          ? dataUri.substring(commaIndex + 1)
          : dataUri;
      return base64Decode(encoded);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (source.isEmpty) {
      return const SizedBox.shrink();
    }

    if (source.startsWith('data:')) {
      final bytes = decodeDataUri(source);
      if (bytes == null) {
        return const SizedBox.shrink();
      }

      return ClipRRect(
        borderRadius: borderRadius,
        child: Image.memory(
          bytes,
          width: width,
          height: height,
          fit: fit,
          gaplessPlayback: true,
        ),
      );
    }

    final file = File(source);
    if (!file.existsSync()) {
      return const SizedBox.shrink();
    }

    return ClipRRect(
      borderRadius: borderRadius,
      child: Image.file(
        file,
        width: width,
        height: height,
        fit: fit,
        gaplessPlayback: true,
      ),
    );
  }
}
