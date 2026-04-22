import 'package:flutter_test/flutter_test.dart';

import 'package:farmernote_app/app/farmernote_controller.dart';
import 'package:farmernote_app/models/auth_session.dart';
import 'package:farmernote_app/models/cloud_user_profile.dart';
import 'package:farmernote_app/models/entry_record.dart';
import 'package:farmernote_app/models/stored_app_state.dart';
import 'package:farmernote_app/models/sync_mutation.dart';
import 'package:farmernote_app/services/app_storage_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'signOut clears auth session and pending sync while keeping local data',
    () async {
      final signedInState = StoredAppState(
        entries: <EntryRecord>[
          const EntryRecord(
            id: 'entry-1',
            noteText: '已同步的巡田记录',
            photoObjectPath: '',
            localPhotoPath: '',
            createdAt: '2026-04-20T08:00:00.000Z',
            updatedAt: '2026-04-20T08:00:00.000Z',
            clientUpdatedAt: '2026-04-20T08:00:00.000Z',
            deletedAt: null,
            sourcePlatform: 'flutter_app',
            planInstanceId: '',
            planActionId: '',
            syncVersion: 3,
            cloudTracked: true,
          ),
        ],
        tasks: const [],
        cropPlanInstances: const [],
        cropPlanActionProgresses: const [],
        pendingMutations: <SyncMutation>[
          const SyncMutation(
            id: 'mutation-1',
            entityType: SyncEntityType.entry,
            operation: SyncOperation.upsert,
            entityId: 'entry-1',
            payload: <String, dynamic>{'id': 'entry-1'},
            clientUpdatedAt: '2026-04-20T08:00:00.000Z',
          ),
        ],
        lastSyncedVersion: 9,
        authSession: _session(),
        mediaCacheIndex: const <String, String>{},
      );
      final storage = _FakeAppStorageService(signedInState);
      final controller = FarmerNoteController(storageService: storage);
      addTearDown(controller.dispose);

      await controller.initialize();
      await controller.signOut();

      expect(controller.isSignedIn, isFalse);
      expect(controller.pendingCloudChangeCount, 0);
      expect(controller.entries.single.cloudTracked, isFalse);
      expect(storage.state.authSession, isNull);
      expect(storage.state.pendingMutations, isEmpty);
      expect(storage.state.lastSyncedVersion, 0);
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

AuthSession _session() {
  return const AuthSession(
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessExpiresAt: '2099-01-01T00:00:00.000Z',
    refreshExpiresAt: '2099-02-01T00:00:00.000Z',
    userProfile: CloudUserProfile(
      id: 'user-1',
      unionId: 'union-1',
      displayName: 'Tester',
      avatarUrl: '',
      linkedProviders: <String>['phone'],
      maskedPhone: '138****0000',
    ),
  );
}
