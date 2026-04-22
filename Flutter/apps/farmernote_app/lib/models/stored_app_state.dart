import 'auth_session.dart';
import 'crop_plan_action_progress.dart';
import 'crop_plan_instance.dart';
import 'entry_record.dart';
import 'sync_mutation.dart';
import 'task_record.dart';

class StoredAppState {
  const StoredAppState({
    required this.entries,
    required this.tasks,
    required this.cropPlanInstances,
    required this.cropPlanActionProgresses,
    required this.pendingMutations,
    required this.lastSyncedVersion,
    required this.authSession,
    required this.mediaCacheIndex,
  });

  final List<EntryRecord> entries;
  final List<TaskRecord> tasks;
  final List<CropPlanInstance> cropPlanInstances;
  final List<CropPlanActionProgress> cropPlanActionProgresses;
  final List<SyncMutation> pendingMutations;
  final int lastSyncedVersion;
  final AuthSession? authSession;
  final Map<String, String> mediaCacheIndex;

  factory StoredAppState.empty() {
    return const StoredAppState(
      entries: <EntryRecord>[],
      tasks: <TaskRecord>[],
      cropPlanInstances: <CropPlanInstance>[],
      cropPlanActionProgresses: <CropPlanActionProgress>[],
      pendingMutations: <SyncMutation>[],
      lastSyncedVersion: 0,
      authSession: null,
      mediaCacheIndex: <String, String>{},
    );
  }

  factory StoredAppState.fromJson(Map<String, dynamic> json) {
    final rawEntries = json['entries'];
    final rawTasks = json['tasks'];
    final rawPlanInstances = json['cropPlanInstances'];
    final rawPlanActionProgresses = json['cropPlanActionProgresses'];
    final rawMutations = json['pendingMutations'];
    final rawMediaCacheIndex = json['mediaCacheIndex'];

    final entries = rawEntries is List
        ? rawEntries
              .whereType<Map<dynamic, dynamic>>()
              .map((item) => EntryRecord.fromJson(item.cast<String, dynamic>()))
              .where(
                (entry) =>
                    entry.id.isNotEmpty && entry.noteText.trim().isNotEmpty,
              )
              .toList()
        : <EntryRecord>[];

    final tasks = rawTasks is List
        ? rawTasks
              .whereType<Map<dynamic, dynamic>>()
              .map((item) => TaskRecord.fromJson(item.cast<String, dynamic>()))
              .where(
                (task) =>
                    task.id.isNotEmpty &&
                    task.entryId.isNotEmpty &&
                    task.dueAt.isNotEmpty,
              )
              .toList()
        : <TaskRecord>[];

    final cropPlanInstances = rawPlanInstances is List
        ? rawPlanInstances
              .whereType<Map<dynamic, dynamic>>()
              .map(
                (item) =>
                    CropPlanInstance.fromJson(item.cast<String, dynamic>()),
              )
              .where(
                (plan) =>
                    plan.id.isNotEmpty &&
                    plan.cropCode.isNotEmpty &&
                    plan.anchorDate.isNotEmpty,
              )
              .toList()
        : <CropPlanInstance>[];

    final cropPlanActionProgresses = rawPlanActionProgresses is List
        ? rawPlanActionProgresses
              .whereType<Map<dynamic, dynamic>>()
              .map(
                (item) => CropPlanActionProgress.fromJson(
                  item.cast<String, dynamic>(),
                ),
              )
              .where(
                (progress) =>
                    progress.id.isNotEmpty &&
                    progress.planInstanceId.isNotEmpty &&
                    progress.actionId.isNotEmpty,
              )
              .toList()
        : <CropPlanActionProgress>[];

    final pendingMutations = rawMutations is List
        ? rawMutations
              .whereType<Map<dynamic, dynamic>>()
              .map(
                (item) => SyncMutation.fromJson(item.cast<String, dynamic>()),
              )
              .where(
                (mutation) =>
                    mutation.id.isNotEmpty && mutation.entityId.isNotEmpty,
              )
              .toList()
        : <SyncMutation>[];

    final mediaCacheIndex = rawMediaCacheIndex is Map
        ? rawMediaCacheIndex.map(
            (key, value) =>
                MapEntry(key.toString(), value == null ? '' : value.toString()),
          )
        : <String, String>{};

    final authSession = json['authSession'] is Map<String, dynamic>
        ? AuthSession.fromJson(json['authSession'] as Map<String, dynamic>)
        : json['authSession'] is Map
        ? AuthSession.fromJson(
            (json['authSession'] as Map).cast<String, dynamic>(),
          )
        : null;

    return StoredAppState(
      entries: entries,
      tasks: tasks,
      cropPlanInstances: cropPlanInstances,
      cropPlanActionProgresses: cropPlanActionProgresses,
      pendingMutations: pendingMutations,
      lastSyncedVersion: json['lastSyncedVersion'] is int
          ? json['lastSyncedVersion'] as int
          : int.tryParse((json['lastSyncedVersion'] ?? '').toString()) ?? 0,
      authSession: authSession,
      mediaCacheIndex: mediaCacheIndex,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'entries': entries.map((entry) => entry.toJson()).toList(),
    'tasks': tasks.map((task) => task.toJson()).toList(),
    'cropPlanInstances': cropPlanInstances
        .map((plan) => plan.toJson())
        .toList(),
    'cropPlanActionProgresses': cropPlanActionProgresses
        .map((progress) => progress.toJson())
        .toList(),
    'pendingMutations': pendingMutations
        .map((mutation) => mutation.toJson())
        .toList(),
    'lastSyncedVersion': lastSyncedVersion,
    'authSession': authSession?.toJson(),
    'mediaCacheIndex': mediaCacheIndex,
  };

  StoredAppState copyWith({
    List<EntryRecord>? entries,
    List<TaskRecord>? tasks,
    List<CropPlanInstance>? cropPlanInstances,
    List<CropPlanActionProgress>? cropPlanActionProgresses,
    List<SyncMutation>? pendingMutations,
    int? lastSyncedVersion,
    AuthSession? authSession,
    bool clearAuthSession = false,
    Map<String, String>? mediaCacheIndex,
  }) {
    return StoredAppState(
      entries: entries ?? this.entries,
      tasks: tasks ?? this.tasks,
      cropPlanInstances: cropPlanInstances ?? this.cropPlanInstances,
      cropPlanActionProgresses:
          cropPlanActionProgresses ?? this.cropPlanActionProgresses,
      pendingMutations: pendingMutations ?? this.pendingMutations,
      lastSyncedVersion: lastSyncedVersion ?? this.lastSyncedVersion,
      authSession: clearAuthSession ? null : authSession ?? this.authSession,
      mediaCacheIndex: mediaCacheIndex ?? this.mediaCacheIndex,
    );
  }
}
