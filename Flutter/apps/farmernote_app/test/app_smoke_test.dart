import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:farmernote_app/app/farmernote_app.dart';
import 'package:farmernote_app/app/farmernote_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'app boots into the record screen and renders the four primary entries',
    (tester) async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final controller = FarmerNoteController();
      addTearDown(() async {
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump();
        controller.dispose();
      });
      await controller.initialize();

      await tester.pumpWidget(FarmerNoteApp(controller: controller));
      await _pumpUntilVisible(tester, find.text('今天田里看到啥，先记下来。'));

      expect(find.text('今天田里看到啥，先记下来。'), findsOneWidget);
      expect(find.text('保存这条记录'), findsOneWidget);
      expect(find.text('记录'), findsOneWidget);
      expect(find.text('计划'), findsOneWidget);
      expect(find.text('时间线'), findsOneWidget);
      expect(find.text('我'), findsOneWidget);
    },
  );
}

Future<void> _pumpUntilVisible(
  WidgetTester tester,
  Finder finder, {
  Duration step = const Duration(milliseconds: 100),
  int maxSteps = 60,
}) async {
  for (var index = 0; index < maxSteps; index += 1) {
    await tester.pump(step);
    if (finder.evaluate().isNotEmpty) {
      return;
    }
  }

  fail('Timed out waiting for the target finder to appear.');
}
