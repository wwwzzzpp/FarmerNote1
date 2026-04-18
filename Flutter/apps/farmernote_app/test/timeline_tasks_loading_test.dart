import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

import 'package:farmernote_app/app/farmernote_app.dart';
import 'package:farmernote_app/app/farmernote_controller.dart';
import 'package:farmernote_app/models/auth_session.dart';
import 'package:farmernote_app/models/cloud_user_profile.dart';
import 'package:farmernote_app/models/entry_record.dart';
import 'package:farmernote_app/models/stored_app_state.dart';
import 'package:farmernote_app/models/task_record.dart';
import 'package:farmernote_app/services/app_storage_service.dart';
import 'package:farmernote_app/services/sync_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'timeline shows loading first, then empty state after initial sync',
    (tester) async {
      final initialState = _buildStoredState();
      final storageService = _FakeAppStorageService(initialState);
      final syncCompleter = Completer<SyncResult>();
      final controller = FarmerNoteController(
        storageService: storageService,
        syncService: _FakeSyncService((_) => syncCompleter.future),
      );
      addTearDown(controller.dispose);

      await controller.initialize();
      controller.goToTimeline();

      await tester.pumpWidget(FarmerNoteApp(controller: controller));
      await tester.pump();

      expect(find.text('正在加载时间线…'), findsOneWidget);
      expect(find.text('时间线还是空的'), findsNothing);

      syncCompleter.complete(_syncResult(initialState));
      await tester.pumpAndSettle();

      expect(find.text('正在加载时间线…'), findsNothing);
      expect(find.text('时间线还是空的'), findsOneWidget);
    },
  );

  testWidgets(
    'tasks shows loading first, then empty state after initial sync',
    (tester) async {
      final initialState = _buildStoredState();
      final storageService = _FakeAppStorageService(initialState);
      final syncCompleter = Completer<SyncResult>();
      final controller = FarmerNoteController(
        storageService: storageService,
        syncService: _FakeSyncService((_) => syncCompleter.future),
      );
      addTearDown(controller.dispose);

      await controller.initialize();
      controller.goToTasks();

      await tester.pumpWidget(FarmerNoteApp(controller: controller));
      await tester.pump();

      expect(find.text('正在加载待办…'), findsOneWidget);
      expect(find.text('还没有定时任务'), findsNothing);

      syncCompleter.complete(_syncResult(initialState));
      await tester.pumpAndSettle();

      expect(find.text('正在加载待办…'), findsNothing);
      expect(find.text('还没有定时任务'), findsOneWidget);
    },
  );

  testWidgets('local timeline and tasks stay visible during initial sync', (
    tester,
  ) async {
    final entry = _buildEntry(
      id: 'entry-local',
      noteText: '本地巡田记录',
      createdAt: '2026-04-18T08:00:00.000Z',
    );
    final task = _buildTask(
      id: 'task-local',
      entryId: entry.id,
      dueAt: '2026-04-19T09:00:00.000Z',
    );
    final initialState = _buildStoredState(
      entries: <EntryRecord>[entry],
      tasks: <TaskRecord>[task],
    );
    final storageService = _FakeAppStorageService(initialState);
    final syncCompleter = Completer<SyncResult>();
    final controller = FarmerNoteController(
      storageService: storageService,
      syncService: _FakeSyncService((_) => syncCompleter.future),
    );
    addTearDown(controller.dispose);

    await controller.initialize();
    controller.goToTimeline();

    await tester.pumpWidget(FarmerNoteApp(controller: controller));
    await tester.pump();

    expect(find.text('本地巡田记录'), findsOneWidget);
    expect(find.text('正在加载时间线…'), findsNothing);

    controller.goToTasks();
    await tester.pump();

    expect(find.text('本地巡田记录'), findsOneWidget);
    expect(find.text('正在加载待办…'), findsNothing);

    syncCompleter.complete(_syncResult(initialState));
    await tester.pumpAndSettle();
  });
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
  List<TaskRecord> tasks = const <TaskRecord>[],
}) {
  return StoredAppState(
    entries: entries,
    tasks: tasks,
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

TaskRecord _buildTask({
  required String id,
  required String entryId,
  required String dueAt,
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
    cloudTracked: true,
  );
}
