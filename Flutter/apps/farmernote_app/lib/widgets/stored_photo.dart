import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

class StoredPhoto extends StatelessWidget {
  const StoredPhoto({
    required this.dataUri,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius = const BorderRadius.all(Radius.circular(18)),
    super.key,
  });

  final String dataUri;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius borderRadius;

  static Uint8List? decode(String dataUri) {
    if (dataUri.isEmpty) {
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
    final bytes = decode(dataUri);
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
}
