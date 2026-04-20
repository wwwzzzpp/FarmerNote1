import '../models/entry_record.dart';
import '../models/stored_app_state.dart';
import '../models/task_record.dart';

class SyncStateRebaser {
  const SyncStateRebaser._();

  static StoredAppState rebase({
    required StoredAppState latestState,
    required StoredAppState syncedState,
    required List<String> processedMutationIds,
  }) {
    final processedIdSet = processedMutationIds.toSet();
    final remainingMutations = latestState.pendingMutations
        .where((mutation) => !processedIdSet.contains(mutation.id))
        .toList();
    final pendingEntityKeys = remainingMutations
        .map((mutation) => _entityKey(mutation.entityType.value, mutation.entityId))
        .toSet();

    final entriesById = <String, EntryRecord>{
      for (final entry in syncedState.entries) entry.id: entry,
    };
    for (final entry in latestState.entries) {
      final pendingEntityKey = _entityKey('entry', entry.id);
      entriesById[entry.id] = _mergeEntry(
        latestEntry: entry,
        syncedEntry: entriesById[entry.id],
        hasPendingMutation: pendingEntityKeys.contains(pendingEntityKey),
      );
    }

    final tasksById = <String, TaskRecord>{
      for (final task in syncedState.tasks) task.id: task,
    };
    for (final task in latestState.tasks) {
      final pendingEntityKey = _entityKey('task', task.id);
      tasksById[task.id] = _mergeTask(
        latestTask: task,
        syncedTask: tasksById[task.id],
        hasPendingMutation: pendingEntityKeys.contains(pendingEntityKey),
      );
    }

    return StoredAppState(
      entries: entriesById.values.toList(),
      tasks: tasksById.values.toList(),
      pendingMutations: remainingMutations,
      lastSyncedVersion: _maxInt(
        latestState.lastSyncedVersion,
        syncedState.lastSyncedVersion,
      ),
      authSession: syncedState.authSession ?? latestState.authSession,
      mediaCacheIndex: <String, String>{
        ...latestState.mediaCacheIndex,
        ...syncedState.mediaCacheIndex,
      },
    );
  }

  static EntryRecord _mergeEntry({
    required EntryRecord latestEntry,
    required EntryRecord? syncedEntry,
    required bool hasPendingMutation,
  }) {
    if (syncedEntry == null) {
      return latestEntry;
    }

    if (hasPendingMutation) {
      return syncedEntry.copyWith(
        noteText: latestEntry.noteText,
        photoObjectPath: latestEntry.photoObjectPath.isNotEmpty
            ? latestEntry.photoObjectPath
            : syncedEntry.photoObjectPath,
        localPhotoPath: latestEntry.localPhotoPath.isNotEmpty
            ? latestEntry.localPhotoPath
            : syncedEntry.localPhotoPath,
        createdAt: latestEntry.createdAt,
        updatedAt: latestEntry.updatedAt,
        clientUpdatedAt: latestEntry.clientUpdatedAt,
        deletedAt: latestEntry.deletedAt,
        clearDeletedAt:
            latestEntry.deletedAt == null || latestEntry.deletedAt!.isEmpty,
        sourcePlatform: latestEntry.sourcePlatform,
        syncVersion: _maxInt(latestEntry.syncVersion, syncedEntry.syncVersion),
        cloudTracked: latestEntry.cloudTracked || syncedEntry.cloudTracked,
      );
    }

    final preferredEntry = _preferSyncedRecord(latestEntry, syncedEntry)
        ? syncedEntry
        : latestEntry;
    final fallbackEntry = identical(preferredEntry, syncedEntry)
        ? latestEntry
        : syncedEntry;

    return preferredEntry.copyWith(
      photoObjectPath: preferredEntry.photoObjectPath.isNotEmpty
          ? preferredEntry.photoObjectPath
          : fallbackEntry.photoObjectPath,
      localPhotoPath: preferredEntry.localPhotoPath.isNotEmpty
          ? preferredEntry.localPhotoPath
          : fallbackEntry.localPhotoPath,
      syncVersion: _maxInt(latestEntry.syncVersion, syncedEntry.syncVersion),
      cloudTracked: latestEntry.cloudTracked || syncedEntry.cloudTracked,
    );
  }

  static TaskRecord _mergeTask({
    required TaskRecord latestTask,
    required TaskRecord? syncedTask,
    required bool hasPendingMutation,
  }) {
    if (syncedTask == null) {
      return latestTask;
    }

    if (hasPendingMutation) {
      return syncedTask.copyWith(
        entryId: latestTask.entryId,
        dueAt: latestTask.dueAt,
        status: latestTask.status,
        completedAt: latestTask.completedAt,
        clearCompletedAt:
            latestTask.completedAt == null || latestTask.completedAt!.isEmpty,
        createdAt: latestTask.createdAt,
        updatedAt: latestTask.updatedAt,
        clientUpdatedAt: latestTask.clientUpdatedAt,
        deletedAt: latestTask.deletedAt,
        clearDeletedAt:
            latestTask.deletedAt == null || latestTask.deletedAt!.isEmpty,
        syncVersion: _maxInt(latestTask.syncVersion, syncedTask.syncVersion),
        cloudTracked: latestTask.cloudTracked || syncedTask.cloudTracked,
      );
    }

    final preferredTask = _preferSyncedRecord(latestTask, syncedTask)
        ? syncedTask
        : latestTask;
    return preferredTask.copyWith(
      syncVersion: _maxInt(latestTask.syncVersion, syncedTask.syncVersion),
      cloudTracked: latestTask.cloudTracked || syncedTask.cloudTracked,
    );
  }

  static bool _preferSyncedRecord(dynamic latestRecord, dynamic syncedRecord) {
    final latestSyncVersion = _intValue(latestRecord.syncVersion);
    final syncedSyncVersion = _intValue(syncedRecord.syncVersion);
    if (syncedSyncVersion != latestSyncVersion) {
      return syncedSyncVersion > latestSyncVersion;
    }

    final latestTimestamp = _recordTimestamp(latestRecord);
    final syncedTimestamp = _recordTimestamp(syncedRecord);
    return syncedTimestamp >= latestTimestamp;
  }

  static int _recordTimestamp(dynamic record) {
    return _maxInt(
      _parseTimestamp(record.clientUpdatedAt as String?),
      _maxInt(
        _parseTimestamp(record.updatedAt as String?),
        _parseTimestamp(record.createdAt as String?),
      ),
    );
  }

  static int _parseTimestamp(String? value) {
    final parsed = DateTime.tryParse(value ?? '')?.millisecondsSinceEpoch;
    return parsed ?? 0;
  }

  static int _intValue(int value) => value;

  static int _maxInt(int left, int right) => left >= right ? left : right;

  static String _entityKey(String entityType, String entityId) {
    return '$entityType:$entityId';
  }
}
