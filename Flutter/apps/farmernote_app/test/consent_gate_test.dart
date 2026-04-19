import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:farmernote_app/app/farmernote_bootstrap_app.dart';
import 'package:farmernote_app/app/farmernote_controller.dart';
import 'package:farmernote_app/services/startup_consent_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('startup gate blocks controller initialization before consent', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final consentService = _FakeStartupConsentService(initialAccepted: false);
    var initializeCallCount = 0;

    await tester.pumpWidget(
      FarmerNoteBootstrapApp(
        startupConsentService: consentService,
        controllerInitializer: () async {
          initializeCallCount += 1;
          final controller = FarmerNoteController();
          await controller.initialize();
          return controller;
        },
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('继续使用前，请先阅读《隐私政策》和《用户协议》。'), findsOneWidget);
    expect(initializeCallCount, 0);
  });

  testWidgets('accepted consent resumes normal app initialization', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final consentService = _FakeStartupConsentService(initialAccepted: true);
    var initializeCallCount = 0;

    await tester.pumpWidget(
      FarmerNoteBootstrapApp(
        startupConsentService: consentService,
        controllerInitializer: () async {
          initializeCallCount += 1;
          final controller = FarmerNoteController();
          await controller.initialize();
          return controller;
        },
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('今天田里看到啥，先记下来。'), findsOneWidget);
    expect(initializeCallCount, 1);
  });
}

class _FakeStartupConsentService extends StartupConsentService {
  _FakeStartupConsentService({required this.initialAccepted});

  final bool initialAccepted;

  @override
  Future<bool> hasAcceptedConsent() async => initialAccepted;

  @override
  Future<void> acceptConsent() async {}
}
