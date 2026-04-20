import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:farmernote_app/app/farmernote_app.dart';
import 'package:farmernote_app/app/farmernote_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('app boots into the record screen', (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final controller = FarmerNoteController();
    await controller.initialize();

    await tester.pumpWidget(FarmerNoteApp(controller: controller));
    await tester.pumpAndSettle();

    expect(find.text('今天田里看到啥，先记下来。'), findsOneWidget);
    expect(find.text('保存这条记录'), findsOneWidget);
  });

  testWidgets('bottom navigation switches tabs by tap', (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final controller = FarmerNoteController();
    await controller.initialize();

    await tester.pumpWidget(FarmerNoteApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.tap(find.text('时间线').last);
    await tester.pumpAndSettle();
    expect(find.text('巡田时间线'), findsOneWidget);

    await tester.tap(find.text('待办').last);
    await tester.pumpAndSettle();
    expect(find.text('待办提醒'), findsOneWidget);

    await tester.tap(find.text('我').last);
    await tester.pumpAndSettle();
    expect(find.text('账号与合规'), findsOneWidget);
  });
}
