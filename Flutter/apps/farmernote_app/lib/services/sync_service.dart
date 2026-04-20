import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/cloud_config.dart';
import '../models/auth_session.dart';
import '../models/entry_record.dart';
import '../models/stored_app_state.dart';
import '../models/sync_mutation.dart';
import '../models/task_record.dart';
import 'auth_service.dart';
import 'media_repository.dart';
import 'sync_queue_store.dart';

class SyncResult {
  const SyncResult({
    required this.state,
    required this.session,
    required this.appliedMutationCount,
    required this.downloadedPhotoCount,
    required this.processedMutationIds,
  });

  final StoredAppState state;
  final AuthSession session;
  final int appliedMutationCount;
  final int downloadedPhotoCount;
  final List<String> processedMutationIds;
}

class SyncServiceException implements Exception {
  const SyncServiceException(this.code, this.message, {this.statusCode});

  final String code;
  final String message;
  final int? statusCode;

  @override
  String toString() => 'SyncServiceException($code, $message)';
}

class SyncService {
  SyncService({
    AuthService? authService,
    MediaRepository? mediaRepository,
    SyncQueueStore? queueStore,
    http.Client? client,
  }) : _authService = authService ?? AuthService(),
       _mediaRepository = mediaRepository ?? MediaRepository(),
       _queueStore = queueStore ?? const SyncQueueStore(),
       _client = client ?? http.Client();

  final AuthService _authService;
  final MediaRepository _mediaRepository;
  final SyncQueueStore _queueStore;
  final http.Client _client;

  Future<SyncResult> synchronize(StoredAppState state) async {
    final existingSession = state.authSession;
    if (existingSession == null) {
      throw const SyncServiceException('not_signed_in', '当前还没有登录云端账号。');
    }
    if (!CloudConfig.isSupabaseConfigured) {
      throw const SyncServiceException(
        'cloud_not_configured',
        '还没配置 Supabase Functions 地址，暂时无法同步。',
      );
    }

    var session = existingSession;
    if (session.shouldRefresh) {
      session = await _authService.refreshSession(session);
    }

    var workingState = state.copyWith(authSession: session);
    workingState = await _uploadPendingPhotos(workingState, session);

    var appliedMutationCount = 0;
    var processedMutationIds = <String>[];
    if (workingState.pendingMutations.isNotEmpty) {
      final pushPayload = await _buildPushMutations(workingState);
      final pushResponse = await _authorizedPost(
        session: session,
        endpoint: 'sync-push',
        body: <String, dynamic>{'mutations': pushPayload},
      );

      final appliedIds = _readStringList(pushResponse['appliedMutationIds']);
      final ignoredIds = _readStringList(pushResponse['ignoredMutationIds']);
      processedMutationIds = <String>[...appliedIds, ...ignoredIds];
      appliedMutationCount = appliedIds.length;
      workingState = workingState.copyWith(
        pendingMutations: _queueStore.removeByIds(
          workingState.pendingMutations,
          <String>{...processedMutationIds},
        ),
      );
    }

    var hasMore = true;
    var downloadedPhotoCount = 0;
    while (hasMore) {
      final pullResponse = await _authorizedPost(
        session: session,
        endpoint: 'sync-pull',
        body: <String, dynamic>{
          'lastSyncedVersion': workingState.lastSyncedVersion,
          'limit': 100,
        },
      );

      final mergedState = _mergePulledState(workingState, pullResponse);
      workingState = mergedState;
      hasMore = pullResponse['hasMore'] == true;
      if (!hasMore) {
        final hydrated = await _hydrateRemotePhotos(workingState, session);
        workingState = hydrated.state;
        downloadedPhotoCount = hydrated.downloadedPhotoCount;
      }
    }

    return SyncResult(
      state: workingState.copyWith(authSession: session),
      session: session,
      appliedMutationCount: appliedMutationCount,
      downloadedPhotoCount: downloadedPhotoCount,
      processedMutationIds: processedMutationIds,
    );
  }

  Future<StoredAppState> _uploadPendingPhotos(
    StoredAppState state,
    AuthSession session,
  ) async {
    final entries = List<EntryRecord>.from(state.entries);
    final mediaCacheIndex = Map<String, String>.from(state.mediaCacheIndex);
    var changed = false;

    for (var index = 0; index < state.pendingMutations.length; index += 1) {
      final mutation = state.pendingMutations[index];
      if (mutation.entityType != SyncEntityType.entry ||
          mutation.operation != SyncOperation.upsert) {
        continue;
      }

      final entryIndex = entries.indexWhere(
        (entry) => entry.id == mutation.entityId,
      );
      if (entryIndex < 0) {
        continue;
      }

      final entry = entries[entryIndex];
      if (!entry.cloudTracked ||
          entry.localPhotoPath.isEmpty ||
          entry.photoObjectPath.isNotEmpty) {
        if (entry.photoObjectPath.isNotEmpty &&
            entry.localPhotoPath.isNotEmpty) {
          mediaCacheIndex[entry.photoObjectPath] = entry.localPhotoPath;
        }
        continue;
      }

      final objectPath = await _mediaRepository.uploadPhoto(
        session: session,
        localPath: entry.localPhotoPath,
      );
      entries[entryIndex] = entry.copyWith(photoObjectPath: objectPath);
      mediaCacheIndex[objectPath] = entry.localPhotoPath;
      changed = true;
    }

    if (!changed) {
      return state.copyWith(authSession: session);
    }

    return state.copyWith(
      entries: entries,
      authSession: session,
      mediaCacheIndex: mediaCacheIndex,
    );
  }

  Future<List<Map<String, dynamic>>> _buildPushMutations(
    StoredAppState state,
  ) async {
    final entriesById = <String, EntryRecord>{
      for (final entry in state.entries) entry.id: entry,
    };
    final tasksById = <String, TaskRecord>{
      for (final task in state.tasks) task.id: task,
    };

    return state.pendingMutations.map((mutation) {
      Map<String, dynamic> payload = mutation.payload;
      if (mutation.entityType == SyncEntityType.entry) {
        final entry = entriesById[mutation.entityId];
        if (entry != null) {
          payload = entry.toCloudJson();
        }
      } else if (mutation.entityType == SyncEntityType.task) {
        final task = tasksById[mutation.entityId];
        if (task != null) {
          payload = task.toCloudJson();
        }
      }

      return <String, dynamic>{
        'entityType': mutation.entityType.value,
        'operation': mutation.operation.value,
        'payload': payload,
        'clientMutationId': mutation.id,
        'clientUpdatedAt': mutation.clientUpdatedAt,
      };
    }).toList();
  }

  StoredAppState _mergePulledState(
    StoredAppState state,
    Map<String, dynamic> payload,
  ) {
    final entries = <String, EntryRecord>{
      for (final entry in state.entries) entry.id: entry,
    };
    final tasks = <String, TaskRecord>{
      for (final task in state.tasks) task.id: task,
    };
    final mediaCacheIndex = Map<String, String>.from(state.mediaCacheIndex);

    final rawEntries = payload['entries'];
    if (rawEntries is List) {
      for (final item in rawEntries.whereType<Map>()) {
        final serverEntry = EntryRecord.fromJson(item.cast<String, dynamic>());
        final existingEntry = entries[serverEntry.id];
        final nextLocalPhotoPath =
            serverEntry.photoObjectPath.isNotEmpty &&
                existingEntry?.photoObjectPath == serverEntry.photoObjectPath
            ? (existingEntry?.localPhotoPath ?? '')
            : mediaCacheIndex[serverEntry.photoObjectPath] ?? '';
        entries[serverEntry.id] = serverEntry.copyWith(
          localPhotoPath: nextLocalPhotoPath,
          cloudTracked: true,
        );
        if (serverEntry.photoObjectPath.isNotEmpty &&
            nextLocalPhotoPath.isNotEmpty) {
          mediaCacheIndex[serverEntry.photoObjectPath] = nextLocalPhotoPath;
        }
      }
    }

    final rawTasks = payload['tasks'];
    if (rawTasks is List) {
      for (final item in rawTasks.whereType<Map>()) {
        final serverTask = TaskRecord.fromJson(item.cast<String, dynamic>());
        tasks[serverTask.id] = serverTask.copyWith(cloudTracked: true);
      }
    }

    return state.copyWith(
      entries: entries.values.toList(),
      tasks: tasks.values.toList(),
      lastSyncedVersion: payload['nextSyncedVersion'] is int
          ? payload['nextSyncedVersion'] as int
          : int.tryParse((payload['nextSyncedVersion'] ?? '').toString()) ??
                state.lastSyncedVersion,
      mediaCacheIndex: mediaCacheIndex,
    );
  }

  Future<({StoredAppState state, int downloadedPhotoCount})>
  _hydrateRemotePhotos(StoredAppState state, AuthSession session) async {
    final entries = List<EntryRecord>.from(state.entries);
    final mediaCacheIndex = Map<String, String>.from(state.mediaCacheIndex);
    var downloadedPhotoCount = 0;

    for (var index = 0; index < entries.length; index += 1) {
      final entry = entries[index];
      if (entry.isDeleted || entry.photoObjectPath.isEmpty) {
        continue;
      }
      if (await _mediaRepository.hasUsableFile(entry.localPhotoPath)) {
        mediaCacheIndex[entry.photoObjectPath] = entry.localPhotoPath;
        continue;
      }

      final localPhotoPath = await _mediaRepository.ensureDownloadedPhoto(
        session: session,
        objectPath: entry.photoObjectPath,
      );
      entries[index] = entry.copyWith(localPhotoPath: localPhotoPath);
      mediaCacheIndex[entry.photoObjectPath] = localPhotoPath;
      downloadedPhotoCount += 1;
    }

    return (
      state: state.copyWith(entries: entries, mediaCacheIndex: mediaCacheIndex),
      downloadedPhotoCount: downloadedPhotoCount,
    );
  }

  Future<Map<String, dynamic>> _authorizedPost({
    required AuthSession session,
    required String endpoint,
    required Map<String, dynamic> body,
  }) async {
    final response = await _client.post(
      CloudConfig.functionUri(endpoint),
      headers: <String, String>{
        'Authorization': 'Bearer ${session.accessToken}',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(body),
    );
    final payload = _decodeResponse(response);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final errorInfo = _readErrorInfo(
        payload,
        fallbackCode: 'sync_failed',
        fallbackMessage: '云同步失败。',
      );
      throw SyncServiceException(
        errorInfo.code,
        errorInfo.message,
        statusCode: response.statusCode,
      );
    }
    return payload;
  }

  List<String> _readStringList(Object? value) {
    if (value is! List) {
      return const <String>[];
    }
    return value.map((item) => item.toString()).toList();
  }

  Map<String, dynamic> _decodeResponse(http.Response response) {
    if (response.body.isEmpty) {
      return <String, dynamic>{};
    }

    final decoded = jsonDecode(response.body);
    if (decoded is Map<String, dynamic>) {
      return decoded;
    }
    if (decoded is Map) {
      return decoded.cast<String, dynamic>();
    }
    return <String, dynamic>{};
  }

  ({String code, String message}) _readErrorInfo(
    Map<String, dynamic> payload, {
    required String fallbackCode,
    required String fallbackMessage,
  }) {
    final nestedError = payload['error'];
    if (nestedError is Map<String, dynamic>) {
      return (
        code: (nestedError['code'] ?? fallbackCode).toString(),
        message: (nestedError['message'] ?? fallbackMessage).toString(),
      );
    }
    if (nestedError is Map) {
      final casted = nestedError.cast<String, dynamic>();
      return (
        code: (casted['code'] ?? fallbackCode).toString(),
        message: (casted['message'] ?? fallbackMessage).toString(),
      );
    }

    return (
      code: (payload['code'] ?? fallbackCode).toString(),
      message: (payload['message'] ?? fallbackMessage).toString(),
    );
  }
}
