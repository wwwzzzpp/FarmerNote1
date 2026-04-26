import 'package:flutter_test/flutter_test.dart';

import 'package:farmernote_app/app/farmernote_controller.dart';
import 'package:farmernote_app/models/auth_session.dart';
import 'package:farmernote_app/models/cloud_user_profile.dart';
import 'package:farmernote_app/models/entry_record.dart';
import 'package:farmernote_app/models/stored_app_state.dart';
import 'package:farmernote_app/models/sync_mutation.dart';
import 'package:farmernote_app/models/task_record.dart';
import 'package:farmernote_app/services/app_storage_service.dart';
import 'package:farmernote_app/services/auth_service.dart';
import 'package:farmernote_app/services/sync_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('sign-in promotes local offline data into cloud sync queue', () async {
    final localEntry = _buildEntry(
      id: 'entry-local',
      noteText: '离线巡田记录',
      createdAt: '2026-04-25T08:00:00.000Z',
      cloudTracked: false,
    );
    final localTask = _buildTask(
      id: 'task-local',
      entryId: localEntry.id,
      dueAt: '2026-04-26T09:00:00.000Z',
      cloudTracked: false,
    );
    final storage = _FakeAppStorageService(
      StoredAppState(
        entries: <EntryRecord>[localEntry],
        tasks: <TaskRecord>[localTask],
        cropPlanInstances: const [],
        cropPlanActionProgresses: const [],
        pendingMutations: const [],
        lastSyncedVersion: 0,
        authSession: null,
        mediaCacheIndex: const <String, String>{},
      ),
    );
    final session = _buildAuthSession();
    final syncService = _CapturingSyncService();
    final controller = FarmerNoteController(
      storageService: storage,
      authService: _FakeAuthService(session),
      syncService: syncService,
    );
    addTearDown(controller.dispose);

    await controller.initialize();
    await controller.signInWithPhone(phone: '13800000000', code: '123456');

    expect(syncService.capturedStates, hasLength(1));
    final pushedState = syncService.capturedStates.single;
    expect(
      pushedState.pendingMutations
          .map((mutation) => mutation.entityType.value)
          .toList(),
      unorderedEquals(<String>['entry', 'task']),
    );
    expect(pushedState.entries.single.cloudTracked, isTrue);
    expect(pushedState.tasks.single.cloudTracked, isTrue);

    expect(controller.isSignedIn, isTrue);
    expect(controller.pendingCloudChangeCount, 0);
    expect(controller.entries.single.cloudTracked, isTrue);
    expect(controller.tasks.single.cloudTracked, isTrue);
  });

  test(
    'silent sync skips immediate tab refresh when cloud state is fresh',
    () async {
      final syncService = _CapturingSyncService();
      final controller = FarmerNoteController(
        storageService: _FakeAppStorageService(
          StoredAppState(
            entries: const [],
            tasks: const [],
            cropPlanInstances: const [],
            cropPlanActionProgresses: const [],
            pendingMutations: const [],
            lastSyncedVersion: 12,
            authSession: _buildAuthSession(),
            mediaCacheIndex: const <String, String>{},
          ),
        ),
        syncService: syncService,
      );
      addTearDown(controller.dispose);

      await controller.initialize();
      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(syncService.callCount, 1);

      controller.goToTimeline();
      await Future<void>.delayed(const Duration(milliseconds: 10));
      controller.goToPlan();
      await Future<void>.delayed(const Duration(milliseconds: 10));

      expect(syncService.callCount, 1);
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

class _FakeAuthService extends AuthService {
  _FakeAuthService(this.session);

  final AuthSession session;

  @override
  Future<AuthSession> signInWithPhone({
    required String phone,
    required String code,
  }) async => session;
}

class _CapturingSyncService extends SyncService {
  final List<StoredAppState> capturedStates = <StoredAppState>[];

  int get callCount => capturedStates.length;

  @override
  Future<SyncResult> synchronize(StoredAppState state) async {
    capturedStates.add(state);
    return SyncResult(
      state: state.copyWith(
        pendingMutations: const <SyncMutation>[],
        lastSyncedVersion: state.lastSyncedVersion > 0
            ? state.lastSyncedVersion
            : 1,
      ),
      session: state.authSession!,
      appliedMutationCount: state.pendingMutations.length,
      downloadedPhotoCount: 0,
      processedMutationIds: state.pendingMutations
          .map((mutation) => mutation.id)
          .toList(),
    );
  }
}

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
      linkedProviders: <String>['wechat', 'phone'],
      maskedPhone: '138****0000',
    ),
  );
}

EntryRecord _buildEntry({
  required String id,
  required String noteText,
  required String createdAt,
  required bool cloudTracked,
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
    planInstanceId: '',
    planActionId: '',
    syncVersion: 0,
    cloudTracked: cloudTracked,
  );
}

TaskRecord _buildTask({
  required String id,
  required String entryId,
  required String dueAt,
  required bool cloudTracked,
}) {
  return TaskRecord(
    id: id,
    entryId: entryId,
    dueAt: dueAt,
    status: TaskStatus.pending,
    completedAt: null,
    createdAt: dueAt,
    updatedAt: dueAt,
    clientUpdatedAt: dueAt,
    deletedAt: null,
    syncVersion: 0,
    cloudTracked: cloudTracked,
  );
}
