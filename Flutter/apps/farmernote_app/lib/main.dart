import 'package:flutter/widgets.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import 'app/farmernote_app.dart';
import 'app/farmernote_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  tz_data.initializeTimeZones();
  tz.setLocalLocation(tz.getLocation('Asia/Shanghai'));
  final controller = FarmerNoteController();
  await controller.initialize();
  runApp(FarmerNoteApp(controller: controller));
}
