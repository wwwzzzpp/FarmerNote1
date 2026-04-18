import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

import 'package:farmernote_app/app/farmernote_app.dart';
import 'package:farmernote_app/app/farmernote_controller.dart';
import 'package:farmernote_app/models/auth_session.dart';
import 'package:farmernote_app/models/cloud_user_profile.dart';
import 'package:farmernote_app/models/entry_record.dart';
import 'package:farmernote_app/models/stored_app_state.dart';
import 'package:farmernote_app/services/app_storage_service.dart';
import 'package:farmernote_app/services/sync_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'record screen keeps hydrated signed-in state when returning from other tabs',
    (tester) async {
      final initialState = _buildStoredState(
        entries: <EntryRecord>[
          _buildEntry(
            id: 'entry-1',
            noteText: '田边有一处积水',
            createdAt: '2026-04-18T08:00:00.000Z',
          ),
        ],
      );
      final syncCompleter = Completer<SyncResult>();
      final controller = FarmerNoteController(
        storageService: _FakeAppStorageService(initialState),
        syncService: _FakeSyncService((_) => syncCompleter.future),
      );
      addTearDown(controller.dispose);

      await controller.initialize();
      await tester.pumpWidget(FarmerNoteApp(controller: controller));
      await tester.pump();

      expect(find.text('检查云端更新'), findsOneWidget);
      expect(find.text('当前处于本机模式'), findsNothing);
      expect(find.text('微信登录'), findsNothing);

      controller.goToTimeline();
      await tester.pump();
      controller.goToRecord();
      await tester.pump();

      expect(find.text('检查云端更新'), findsOneWidget);
      expect(find.text('当前处于本机模式'), findsNothing);
      expect(find.text('微信登录'), findsNothing);

      syncCompleter.complete(_syncResult(initialState));
      await tester.pumpAndSettle();
    },
  );
}

class _FakeAppStorageService extends AppStorageService {
  _FakeAppStorageService(this.state);

  StoredAppState state;

  @override
  Future<StoredAppState> loadState() async => state;

  @override
  Future<void> saveState(StoredAppState nextState) async {
    state = nextState;
  }
}

class _FakeSyncService extends SyncService {
  _FakeSyncService(this.onSynchronize);

  final Future<SyncResult> Function(StoredAppState state) onSynchronize;

  @override
  Future<SyncResult> synchronize(StoredAppState state) => onSynchronize(state);
}

StoredAppState _buildStoredState({
  List<EntryRecord> entries = const <EntryRecord>[],
}) {
  return StoredAppState(
    entries: entries,
    tasks: const [],
    pendingMutations: const [],
    lastSyncedVersion: 0,
    authSession: _buildAuthSession(),
    mediaCacheIndex: const <String, String>{},
  );
}

SyncResult _syncResult(StoredAppState state) => SyncResult(
  state: state,
  session: state.authSession!,
  appliedMutationCount: 0,
  downloadedPhotoCount: 0,
);

AuthSession _buildAuthSession() {
  return AuthSession(
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessExpiresAt: '2099-01-01T00:00:00.000Z',
    refreshExpiresAt: '2099-02-01T00:00:00.000Z',
    userProfile: const CloudUserProfile(
      id: 'user-1',
      unionId: 'union-1',
      displayName: 'Tester',
      avatarUrl: '',
      linkedProviders: <String>['wechat'],
      maskedPhone: '138****0000',
    ),
  );
}

EntryRecord _buildEntry({
  required String id,
  required String noteText,
  required String createdAt,
}) {
  return EntryRecord(
    id: id,
    noteText: noteText,
    photoObjectPath: '',
    localPhotoPath: '',
    createdAt: createdAt,
    updatedAt: createdAt,
    clientUpdatedAt: createdAt,
    deletedAt: null,
    sourcePlatform: 'flutter_app',
    syncVersion: 0,
    cloudTracked: true,
  );
}
