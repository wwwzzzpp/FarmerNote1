import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'flutter crop plan catalog mirrors the miniprogram source catalog',
    () async {
      final flutterCatalog = File('assets/crop_plan_catalog.json');
      final miniprogramCatalog = File(
        '../../../miniprogram/data/crop_plan_catalog.json',
      );

      expect(flutterCatalog.existsSync(), isTrue);
      expect(miniprogramCatalog.existsSync(), isTrue);

      final flutterRaw = await flutterCatalog.readAsString();
      final miniprogramRaw = await miniprogramCatalog.readAsString();

      expect(
        flutterRaw.replaceAll('\r\n', '\n'),
        equals(miniprogramRaw.replaceAll('\r\n', '\n')),
      );
    },
  );
}
