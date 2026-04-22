import 'package:flutter_test/flutter_test.dart';

import 'package:farmernote_app/models/entry_record.dart';
import 'package:farmernote_app/models/stored_app_state.dart';
import 'package:farmernote_app/models/sync_mutation.dart';
import 'package:farmernote_app/models/task_record.dart';
import 'package:farmernote_app/services/sync_state_rebaser.dart';

void main() {
  test('rebase keeps entries and mutations created after sync started', () {
    const acknowledgedEntry = EntryRecord(
      id: 'entry-old',
      noteText: '老记录',
      photoObjectPath: '',
      localPhotoPath: '',
      createdAt: '2026-04-20T08:00:00.000Z',
      updatedAt: '2026-04-20T08:00:00.000Z',
      clientUpdatedAt: '2026-04-20T08:00:00.000Z',
      deletedAt: null,
      sourcePlatform: 'flutter_app',
      planInstanceId: '',
      planActionId: '',
      syncVersion: 7,
      cloudTracked: true,
    );
    const newLocalEntry = EntryRecord(
      id: 'entry-new',
      noteText: '新保存的记录',
      photoObjectPath: '',
      localPhotoPath: '/tmp/new.jpg',
      createdAt: '2026-04-20T08:05:00.000Z',
      updatedAt: '2026-04-20T08:05:00.000Z',
      clientUpdatedAt: '2026-04-20T08:05:00.000Z',
      deletedAt: null,
      sourcePlatform: 'flutter_app',
      planInstanceId: '',
      planActionId: '',
      syncVersion: 0,
      cloudTracked: true,
    );

    final latestState = StoredAppState(
      entries: const <EntryRecord>[acknowledgedEntry, newLocalEntry],
      tasks: const <TaskRecord>[],
      cropPlanInstances: const [],
      cropPlanActionProgresses: const [],
      pendingMutations: <SyncMutation>[
        _mutation(id: 'mutation-old', entityId: 'entry-old'),
        _mutation(id: 'mutation-new', entityId: 'entry-new'),
      ],
      lastSyncedVersion: 2,
      authSession: null,
      mediaCacheIndex: const <String, String>{},
    );

    final syncedState = StoredAppState(
      entries: const <EntryRecord>[acknowledgedEntry],
      tasks: const <TaskRecord>[],
      cropPlanInstances: const [],
      cropPlanActionProgresses: const [],
      pendingMutations: const <SyncMutation>[],
      lastSyncedVersion: 9,
      authSession: null,
      mediaCacheIndex: const <String, String>{},
    );

    final rebased = SyncStateRebaser.rebase(
      latestState: latestState,
      syncedState: syncedState,
      processedMutationIds: const <String>['mutation-old'],
    );

    expect(rebased.entries.map((entry) => entry.id), contains('entry-new'));
    expect(
      rebased.pendingMutations.map((mutation) => mutation.id).toList(),
      equals(const <String>['mutation-new']),
    );
    expect(rebased.lastSyncedVersion, 9);
  });

  test('rebase keeps newer local edit while preserving synced metadata', () {
    const latestEntry = EntryRecord(
      id: 'entry-1',
      noteText: '本地已改成新内容',
      photoObjectPath: '',
      localPhotoPath: '/tmp/entry-1.jpg',
      createdAt: '2026-04-20T08:00:00.000Z',
      updatedAt: '2026-04-20T08:06:00.000Z',
      clientUpdatedAt: '2026-04-20T08:06:00.000Z',
      deletedAt: null,
      sourcePlatform: 'flutter_app',
      planInstanceId: '',
      planActionId: '',
      syncVersion: 3,
      cloudTracked: true,
    );
    const syncedEntry = EntryRecord(
      id: 'entry-1',
      noteText: '服务端旧内容',
      photoObjectPath: 'entry-photos/user-1/entry-1.jpg',
      localPhotoPath: '/cache/entry-1.jpg',
      createdAt: '2026-04-20T08:00:00.000Z',
      updatedAt: '2026-04-20T08:04:00.000Z',
      clientUpdatedAt: '2026-04-20T08:04:00.000Z',
      deletedAt: null,
      sourcePlatform: 'flutter_app',
      planInstanceId: '',
      planActionId: '',
      syncVersion: 8,
      cloudTracked: true,
    );

    final rebased = SyncStateRebaser.rebase(
      latestState: StoredAppState(
        entries: const <EntryRecord>[latestEntry],
        tasks: const <TaskRecord>[],
        cropPlanInstances: const [],
        cropPlanActionProgresses: const [],
        pendingMutations: <SyncMutation>[
          _mutation(id: 'mutation-edit', entityId: 'entry-1'),
        ],
        lastSyncedVersion: 5,
        authSession: null,
        mediaCacheIndex: const <String, String>{},
      ),
      syncedState: StoredAppState(
        entries: const <EntryRecord>[syncedEntry],
        tasks: const <TaskRecord>[],
        cropPlanInstances: const [],
        cropPlanActionProgresses: const [],
        pendingMutations: const <SyncMutation>[],
        lastSyncedVersion: 8,
        authSession: null,
        mediaCacheIndex: const <String, String>{
          'entry-photos/user-1/entry-1.jpg': '/cache/entry-1.jpg',
        },
      ),
      processedMutationIds: const <String>[],
    );

    final mergedEntry = rebased.entries.single;
    expect(mergedEntry.noteText, '本地已改成新内容');
    expect(mergedEntry.photoObjectPath, 'entry-photos/user-1/entry-1.jpg');
    expect(mergedEntry.localPhotoPath, '/tmp/entry-1.jpg');
    expect(mergedEntry.syncVersion, 8);
  });
}

SyncMutation _mutation({required String id, required String entityId}) {
  return SyncMutation(
    id: id,
    entityType: SyncEntityType.entry,
    operation: SyncOperation.upsert,
    entityId: entityId,
    payload: const <String, dynamic>{},
    clientUpdatedAt: '2026-04-20T08:00:00.000Z',
  );
}
