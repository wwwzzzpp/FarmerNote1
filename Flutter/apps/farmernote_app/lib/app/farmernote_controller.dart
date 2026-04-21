import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:uuid/uuid.dart';

import '../config/cloud_config.dart';
import '../models/auth_session.dart';
import '../models/account_deletion_status.dart';
import '../models/calendar_sync_result.dart';
import '../models/entry_record.dart';
import '../models/stored_app_state.dart';
import '../models/sync_mutation.dart';
import '../models/task_record.dart';
import '../models/task_view_record.dart';
import '../models/timeline_entry_record.dart';
import '../services/app_storage_service.dart';
import '../services/auth_service.dart';
import '../services/calendar_service.dart';
import '../services/media_repository.dart';
import '../services/sync_queue_store.dart';
import '../services/sync_service.dart';
import '../services/sync_state_rebaser.dart';
import '../utils/date_utils.dart' as farmer_date;

class SaveEntryResult {
  const SaveEntryResult({required this.entry, required this.task});

  final EntryRecord entry;
  final TaskRecord? task;
}

class FarmerNoteController extends ChangeNotifier with WidgetsBindingObserver {
  FarmerNoteController({
    AppStorageService? storageService,
    CalendarService? calendarService,
    AuthService? authService,
    SyncService? syncService,
    SyncQueueStore? syncQueueStore,
    MediaRepository? mediaRepository,
    Uuid? uuid,
  }) : _storageService = storageService ?? AppStorageService(),
       _calendarService = calendarService ?? CalendarService(),
       _authService = authService ?? AuthService(),
       _syncService = syncService ?? SyncService(),
       _syncQueueStore = syncQueueStore ?? const SyncQueueStore(),
       _mediaRepository = mediaRepository ?? MediaRepository(),
       _uuid = uuid ?? const Uuid();

  final AppStorageService _storageService;
  final CalendarService _calendarService;
  final AuthService _authService;
  final SyncService _syncService;
  final SyncQueueStore _syncQueueStore;
  final MediaRepository _mediaRepository;
  final Uuid _uuid;

  List<EntryRecord> _entries = <EntryRecord>[];
  List<TaskRecord> _tasks = <TaskRecord>[];
  List<SyncMutation> _pendingMutations = <SyncMutation>[];
  Map<String, String> _mediaCacheIndex = <String, String>{};
  AuthSession? _authSession;
  AccountDeletionStatus _accountDeletionStatus = AccountDeletionStatus.none();
  bool _isReady = false;
  bool _isSyncing = false;
  bool _isAuthenticating = false;
  bool _isInitialCloudBootstrapInFlight = false;
  bool _hasCompletedInitialCloudBootstrap = false;
  int _lastSyncedVersion = 0;
  int _selectedTabIndex = 0;
  String _focusTaskId = '';
  String _cloudError = '';
  DateTime? _lastSyncedAt;

  bool get isReady => _isReady;
  bool get isSyncing => _isSyncing;
  bool get isAuthenticating => _isAuthenticating;
  bool get isCloudConfigured => CloudConfig.isSupabaseConfigured;
  bool get isDevLoginEnabled => CloudConfig.isDevLoginEnabled;
  bool get isSignedIn => _authSession != null;
  bool get canUseWeChatLogin => _authService.canUseWeChatAuth;
  bool get hasLinkedPhone => _authSession?.hasPhoneLinked ?? false;
  bool get hasLinkedWeChat => _authSession?.hasWeChatLinked ?? false;
  String get maskedPhone => _authSession?.userProfile.maskedPhone ?? '';
  bool get canLinkPhone => isSignedIn && !hasLinkedPhone && !isDevLoginEnabled;
  bool get canLinkWeChat =>
      isSignedIn && !hasLinkedWeChat && !isDevLoginEnabled && canUseWeChatLogin;
  bool get shouldShowPhoneAuthPanel =>
      isCloudConfigured && !isDevLoginEnabled && (!isSignedIn || canLinkPhone);
  bool get shouldShowPrimaryCloudButton =>
      !isSignedIn && (isDevLoginEnabled || canUseWeChatLogin);
  bool get canTriggerPrimaryCloudAction =>
      isCloudConfigured &&
      (isSignedIn || isDevLoginEnabled || canUseWeChatLogin);
  int get selectedTabIndex => _selectedTabIndex;
  String get focusTaskId => _focusTaskId;
  int get pendingCloudChangeCount => _pendingMutations.length;
  AuthSession? get authSession => _authSession;
  AccountDeletionStatus get accountDeletionStatus => _accountDeletionStatus;
  bool get isAccountDeletionPending => _accountDeletionStatus.isPending;
  bool get isTimelineInitialLoading =>
      _isInitialCloudBootstrapInFlight &&
      !_hasCompletedInitialCloudBootstrap &&
      isSignedIn &&
      timelineEntries.isEmpty;
  bool get isTasksInitialLoading =>
      _isInitialCloudBootstrapInFlight &&
      !_hasCompletedInitialCloudBootstrap &&
      isSignedIn &&
      upcomingTasks.isEmpty &&
      overdueTasks.isEmpty &&
      completedTasks.isEmpty;

  String get cloudPrimaryActionLabel {
    if (_isAuthenticating) {
      return '登录中';
    }
    if (_isSyncing) {
      return '同步中';
    }
    if (isSignedIn) {
      return pendingCloudChangeCount > 0 ? '立即同步' : '检查云端更新';
    }
    if (isDevLoginEnabled) {
      return '临时登录';
    }
    return canUseWeChatLogin ? '微信登录' : '当前平台用手机号';
  }

  String get cloudStatusHeadline {
    if (!isSignedIn && _accountDeletionStatus.isPending) {
      return '账号已提交注销';
    }
    if (!isCloudConfigured) {
      return '当前还没接入云端环境';
    }
    if (_isAuthenticating) {
      return isDevLoginEnabled
          ? '正在接入临时联调账号'
          : canUseWeChatLogin
          ? '正在通过微信登录云端'
          : '正在登录云端';
    }
    if (_isSyncing) {
      return '正在同步 FarmerNote 云端数据';
    }
    if (isSignedIn) {
      final displayName = _authSession!.userProfile.displayName.trim();
      if (displayName.isNotEmpty) {
        return '已登录 $displayName';
      }
      if (maskedPhone.isNotEmpty) {
        return '已登录 $maskedPhone';
      }
      return '已登录云端账号';
    }
    if (isDevLoginEnabled) {
      return '当前可用临时联调登录';
    }
    return canUseWeChatLogin ? '当前处于本机模式' : '当前平台优先使用手机号登录';
  }

  String get cloudStatusDetail {
    if (!isSignedIn && _accountDeletionStatus.isPending) {
      return _accountDeletionStatus.message.isNotEmpty
          ? _accountDeletionStatus.message
          : '账号已申请注销，将在 15 天内彻底删除。';
    }
    if (!isCloudConfigured) {
      return '先配置 Supabase Functions 地址，之后多端数据才能互通。';
    }
    if (_cloudError.isNotEmpty) {
      return _cloudError;
    }
    if (!isSignedIn) {
      return isDevLoginEnabled
          ? '当前会走临时联调账号登录。只要小程序和 Flutter 使用同一个 debug key，就会同步到同一个 Supabase 测试用户。'
          : canUseWeChatLogin
          ? '未登录时，记录、图片、时间线和待办都会只保存在这台手机里。微信登录是主入口，手机号验证码登录也可直接进入同一个云端账号。'
          : '当前平台先用手机号验证码登录；登录后，记录、图片、时间线和待办才会开始跨端同步。';
    }
    if (!hasLinkedPhone) {
      return '当前账号已接入云端，但还没绑定手机号。补上手机号后，小程序和 Flutter 都能用微信或验证码进入同一个账号。';
    }
    if (!hasLinkedWeChat) {
      return canUseWeChatLogin
          ? '当前账号已绑定手机号，但还没绑定微信。补上微信后，小程序和 Flutter 都能直接用微信进入同一个账号。'
          : '当前账号已绑定手机号。等移动端微信登录入口重新开放后，再补绑微信即可。';
    }
    if (pendingCloudChangeCount > 0) {
      return '还有 $pendingCloudChangeCount 条新变更待上传。当前版本只同步新版产生的数据，不会自动迁移旧本地记录。';
    }
    if (_lastSyncedAt != null) {
      final stamp = _lastSyncedAt!.toLocal();
      return '云端和本机已对齐，上次同步时间 ${stamp.year}-${farmer_date.pad(stamp.month)}-${farmer_date.pad(stamp.day)} ${farmer_date.pad(stamp.hour)}:${farmer_date.pad(stamp.minute)}。';
    }
    return '新创建的记录会自动加入云同步队列，保持小程序和 Flutter 端同账号互通。';
  }

  List<EntryRecord> get entries => List<EntryRecord>.unmodifiable(
    _sortedEntries(_entries.where((entry) => !entry.isDeleted).toList()),
  );

  List<TaskRecord> get tasks => List<TaskRecord>.unmodifiable(
    _sortedTasks(_tasks.where((task) => !task.isDeleted).toList()),
  );

  Future<void> initialize() async {
    WidgetsBinding.instance.addObserver(this);
    final stored = await _storageService.loadState();
    await _applyState(
      _sanitizeStoredState(_reconcileState(stored)),
      shouldNotify: false,
    );
    _isReady = true;
    final shouldStartInitialCloudBootstrap = _authSession != null;
    _isInitialCloudBootstrapInFlight = shouldStartInitialCloudBootstrap;
    _hasCompletedInitialCloudBootstrap = !shouldStartInitialCloudBootstrap;
    notifyListeners();
    if (shouldStartInitialCloudBootstrap) {
      unawaited(_runInitialCloudBootstrap());
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_handleResume());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _handleResume() async {
    await reconcileOverdueTasks();
    await _syncIfPossible(silent: true);
  }

  Future<void> reconcileOverdueTasks() async {
    final beforeTasks = <String, TaskRecord>{
      for (final task in _tasks) task.id: task,
    };
    final reconciled = _reconcileState(_currentState);
    if (_taskListsEqual(reconciled.tasks, _tasks)) {
      return;
    }

    var pendingMutations = List<SyncMutation>.from(reconciled.pendingMutations);
    for (final task in reconciled.tasks) {
      final previousTask = beforeTasks[task.id];
      if (previousTask == null ||
          previousTask.status == task.status ||
          !task.cloudTracked ||
          task.isDeleted) {
        continue;
      }
      pendingMutations = _syncQueueStore.enqueue(
        pendingMutations,
        _taskMutation(task, SyncOperation.upsert),
      );
    }

    await _applyState(reconciled.copyWith(pendingMutations: pendingMutations));
    unawaited(_syncIfPossible(silent: true));
  }

  Future<SaveEntryResult> createEntry({
    required String noteText,
    required String dueAt,
    required String photoLocalPath,
  }) async {
    final trimmed = noteText.trim();
    if (trimmed.isEmpty) {
      throw Exception('请输入巡田记录内容。');
    }

    final nowIso = DateTime.now().toUtc().toIso8601String();
    final shouldTrackCloud = _authSession != null;
    final stagedPhotoPath = photoLocalPath.isEmpty
        ? ''
        : await _mediaRepository.stageCapturedPhoto(photoLocalPath);

    final entry = EntryRecord(
      id: _uuid.v4(),
      noteText: trimmed,
      photoObjectPath: '',
      localPhotoPath: stagedPhotoPath,
      createdAt: nowIso,
      updatedAt: nowIso,
      clientUpdatedAt: nowIso,
      deletedAt: null,
      sourcePlatform: 'flutter_app',
      syncVersion: 0,
      cloudTracked: shouldTrackCloud,
    );

    TaskRecord? task;
    if (dueAt.isNotEmpty) {
      task = TaskRecord(
        id: _uuid.v4(),
        entryId: entry.id,
        dueAt: dueAt,
        status: farmer_date.isPastDate(dueAt)
            ? TaskStatus.overdue
            : TaskStatus.pending,
        completedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        clientUpdatedAt: nowIso,
        deletedAt: null,
        syncVersion: 0,
        cloudTracked: shouldTrackCloud,
      );
    }

    var pendingMutations = List<SyncMutation>.from(_pendingMutations);
    if (entry.cloudTracked) {
      pendingMutations = _syncQueueStore.enqueue(
        pendingMutations,
        _entryMutation(entry, SyncOperation.upsert),
      );
    }
    if (task != null && task.cloudTracked) {
      pendingMutations = _syncQueueStore.enqueue(
        pendingMutations,
        _taskMutation(task, SyncOperation.upsert),
      );
    }

    await _applyState(
      _currentState.copyWith(
        entries: <EntryRecord>[entry, ..._entries],
        tasks: task == null ? _tasks : <TaskRecord>[..._tasks, task],
        pendingMutations: pendingMutations,
      ),
    );

    unawaited(_syncIfPossible(silent: true));
    return SaveEntryResult(entry: entry, task: task);
  }

  Future<void> deleteEntry(String entryId) async {
    final entry = _entries.where((item) => item.id == entryId).firstOrNull;
    if (entry == null) {
      return;
    }

    final relatedTasks = _tasks
        .where((task) => task.entryId == entryId)
        .toList();
    final nowIso = DateTime.now().toUtc().toIso8601String();
    var pendingMutations = List<SyncMutation>.from(_pendingMutations);

    if (entry.localPhotoPath.isNotEmpty) {
      unawaited(_mediaRepository.removeLocalPhoto(entry.localPhotoPath));
    }

    late final List<EntryRecord> nextEntries;
    late final List<TaskRecord> nextTasks;
    if (entry.cloudTracked) {
      final deletedEntry = entry.copyWith(
        localPhotoPath: '',
        updatedAt: nowIso,
        clientUpdatedAt: nowIso,
        deletedAt: nowIso,
      );
      nextEntries = _entries
          .map((item) => item.id == entryId ? deletedEntry : item)
          .toList();
      pendingMutations = _syncQueueStore.enqueue(
        pendingMutations,
        _entryMutation(deletedEntry, SyncOperation.delete),
      );

      nextTasks = _tasks.map((task) {
        if (task.entryId != entryId) {
          return task;
        }
        final deletedTask = task.copyWith(
          updatedAt: nowIso,
          clientUpdatedAt: nowIso,
          deletedAt: nowIso,
        );
        pendingMutations = _syncQueueStore.enqueue(
          pendingMutations,
          _taskMutation(deletedTask, SyncOperation.delete),
        );
        return deletedTask;
      }).toList();
    } else {
      nextEntries = _entries.where((item) => item.id != entryId).toList();
      nextTasks = _tasks.where((task) => task.entryId != entryId).toList();
      for (final task in relatedTasks) {
        if (!task.cloudTracked) {
          continue;
        }
        final deletedTask = task.copyWith(
          updatedAt: nowIso,
          clientUpdatedAt: nowIso,
          deletedAt: nowIso,
        );
        pendingMutations = _syncQueueStore.enqueue(
          pendingMutations,
          _taskMutation(deletedTask, SyncOperation.delete),
        );
      }
    }

    await _applyState(
      _currentState.copyWith(
        entries: nextEntries,
        tasks: nextTasks,
        pendingMutations: pendingMutations,
      ),
    );
    unawaited(_syncIfPossible(silent: true));
  }

  Future<void> completeTask(String taskId) async {
    final task = _tasks.where((item) => item.id == taskId).firstOrNull;
    if (task == null || task.isDeleted) {
      return;
    }

    final nowIso = DateTime.now().toUtc().toIso8601String();
    final completedTask = task.copyWith(
      status: TaskStatus.completed,
      completedAt: nowIso,
      updatedAt: nowIso,
      clientUpdatedAt: nowIso,
    );

    var pendingMutations = List<SyncMutation>.from(_pendingMutations);
    if (completedTask.cloudTracked) {
      pendingMutations = _syncQueueStore.enqueue(
        pendingMutations,
        _taskMutation(completedTask, SyncOperation.upsert),
      );
    }

    await _applyState(
      _currentState.copyWith(
        tasks: _tasks
            .map((item) => item.id == taskId ? completedTask : item)
            .toList(),
        pendingMutations: pendingMutations,
      ),
    );
    unawaited(_syncIfPossible(silent: true));
  }

  Future<void> deleteTask(String taskId) async {
    final task = _tasks.where((item) => item.id == taskId).firstOrNull;
    if (task == null) {
      return;
    }

    final nowIso = DateTime.now().toUtc().toIso8601String();
    var pendingMutations = List<SyncMutation>.from(_pendingMutations);
    late final List<TaskRecord> nextTasks;
    if (task.cloudTracked) {
      final deletedTask = task.copyWith(
        updatedAt: nowIso,
        clientUpdatedAt: nowIso,
        deletedAt: nowIso,
      );
      nextTasks = _tasks
          .map((item) => item.id == taskId ? deletedTask : item)
          .toList();
      pendingMutations = _syncQueueStore.enqueue(
        pendingMutations,
        _taskMutation(deletedTask, SyncOperation.delete),
      );
    } else {
      nextTasks = _tasks.where((item) => item.id != taskId).toList();
    }

    await _applyState(
      _currentState.copyWith(
        tasks: nextTasks,
        pendingMutations: pendingMutations,
      ),
    );
    unawaited(_syncIfPossible(silent: true));
  }

  Future<void> signInToCloud() async {
    if (_isAuthenticating) {
      return;
    }

    _isAuthenticating = true;
    _cloudError = '';
    notifyListeners();

    try {
      final session = isDevLoginEnabled
          ? await _authService.signInWithDevLogin()
          : await _authService.signInWithWeChat();
      _accountDeletionStatus = AccountDeletionStatus.none();
      await _applyState(
        _currentState.copyWith(authSession: session),
        shouldNotify: false,
      );
      _lastSyncedAt = null;
      await syncNow();
    } catch (error) {
      _cloudError = _humanizeCloudError(error);
      notifyListeners();
      rethrow;
    } finally {
      _isAuthenticating = false;
      notifyListeners();
    }
  }

  Future<void> sendPhoneCode(String phone) async {
    if (_isAuthenticating) {
      return;
    }

    _isAuthenticating = true;
    _cloudError = '';
    notifyListeners();

    try {
      await _authService.sendPhoneCode(phone);
    } catch (error) {
      _cloudError = _humanizeCloudError(error);
      notifyListeners();
      rethrow;
    } finally {
      _isAuthenticating = false;
      notifyListeners();
    }
  }

  Future<void> signInWithPhone({
    required String phone,
    required String code,
  }) async {
    if (_isAuthenticating) {
      return;
    }

    _isAuthenticating = true;
    _cloudError = '';
    notifyListeners();

    try {
      final session = await _authService.signInWithPhone(
        phone: phone,
        code: code,
      );
      _accountDeletionStatus = AccountDeletionStatus.none();
      await _applyState(
        _currentState.copyWith(authSession: session),
        shouldNotify: false,
      );
      _lastSyncedAt = null;
      await syncNow();
    } catch (error) {
      _cloudError = _humanizeCloudError(error);
      notifyListeners();
      rethrow;
    } finally {
      _isAuthenticating = false;
      notifyListeners();
    }
  }

  Future<void> linkPhone({required String phone, required String code}) async {
    if (_isAuthenticating || _authSession == null) {
      return;
    }

    _isAuthenticating = true;
    _cloudError = '';
    notifyListeners();

    try {
      final session = await _authService.linkPhone(
        session: _authSession!,
        phone: phone,
        code: code,
      );
      _accountDeletionStatus = AccountDeletionStatus.none();
      await _applyState(
        _currentState.copyWith(authSession: session),
        shouldNotify: false,
      );
      _lastSyncedAt = null;
      await syncNow();
    } catch (error) {
      _cloudError = _humanizeCloudError(error);
      notifyListeners();
      rethrow;
    } finally {
      _isAuthenticating = false;
      notifyListeners();
    }
  }

  Future<void> linkWeChat() async {
    if (_isAuthenticating || _authSession == null) {
      return;
    }

    _isAuthenticating = true;
    _cloudError = '';
    notifyListeners();

    try {
      final session = await _authService.linkWeChat(session: _authSession!);
      _accountDeletionStatus = AccountDeletionStatus.none();
      await _applyState(
        _currentState.copyWith(authSession: session),
        shouldNotify: false,
      );
      _lastSyncedAt = null;
      await syncNow();
    } catch (error) {
      _cloudError = _humanizeCloudError(error);
      notifyListeners();
      rethrow;
    } finally {
      _isAuthenticating = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    if (_isAuthenticating || _isSyncing) {
      throw Exception('当前还有登录或同步进行中，请稍后再试。');
    }

    _cloudError = '';
    _lastSyncedAt = null;
    _accountDeletionStatus = AccountDeletionStatus.none();

    final signedOutEntries = _entries
        .map((entry) => entry.copyWith(cloudTracked: false))
        .toList();
    final signedOutTasks = _tasks
        .map((task) => task.copyWith(cloudTracked: false))
        .toList();

    await _applyState(
      StoredAppState(
        entries: signedOutEntries,
        tasks: signedOutTasks,
        pendingMutations: const <SyncMutation>[],
        lastSyncedVersion: 0,
        authSession: null,
        mediaCacheIndex: _mediaCacheIndex,
      ),
      shouldNotify: false,
    );
    notifyListeners();
  }

  Future<AccountDeletionStatus> loadAccountDeletionStatus() async {
    if (_authSession == null) {
      _accountDeletionStatus = AccountDeletionStatus.none();
      notifyListeners();
      return _accountDeletionStatus;
    }

    try {
      final status = await _authService.loadAccountDeletionStatus(
        session: _authSession!,
      );
      _accountDeletionStatus = status;
      notifyListeners();
      return status;
    } catch (error) {
      _cloudError = _humanizeCloudError(error);
      notifyListeners();
      rethrow;
    }
  }

  Future<void> sendAccountDeletionPhoneCode() async {
    if (_isAuthenticating || _authSession == null) {
      return;
    }

    _isAuthenticating = true;
    _cloudError = '';
    notifyListeners();

    try {
      await _authService.sendAccountDeletionPhoneCode(session: _authSession!);
    } catch (error) {
      _cloudError = _humanizeCloudError(error);
      notifyListeners();
      rethrow;
    } finally {
      _isAuthenticating = false;
      notifyListeners();
    }
  }

  Future<AccountDeletionStatus> requestAccountDeletionWithPhone({
    required String code,
  }) async {
    if (_isAuthenticating || _authSession == null) {
      return _accountDeletionStatus;
    }

    _isAuthenticating = true;
    _cloudError = '';
    notifyListeners();

    try {
      final status = await _authService.requestAccountDeletionWithPhone(
        session: _authSession!,
        code: code,
      );
      await _resetAfterAccountDeletion(status);
      return status;
    } catch (error) {
      _cloudError = _humanizeCloudError(error);
      notifyListeners();
      rethrow;
    } finally {
      _isAuthenticating = false;
      notifyListeners();
    }
  }

  Future<AccountDeletionStatus> requestAccountDeletionWithWeChat() async {
    if (_isAuthenticating || _authSession == null) {
      return _accountDeletionStatus;
    }

    _isAuthenticating = true;
    _cloudError = '';
    notifyListeners();

    try {
      final status = await _authService.requestAccountDeletionWithWeChat(
        session: _authSession!,
      );
      await _resetAfterAccountDeletion(status);
      return status;
    } catch (error) {
      _cloudError = _humanizeCloudError(error);
      notifyListeners();
      rethrow;
    } finally {
      _isAuthenticating = false;
      notifyListeners();
    }
  }

  Future<void> syncNow() async {
    if (_isSyncing ||
        _isInitialCloudBootstrapInFlight ||
        _authSession == null) {
      return;
    }

    _isSyncing = true;
    _cloudError = '';
    notifyListeners();

    try {
      final result = await _syncService.synchronize(_currentState);
      _lastSyncedAt = DateTime.now().toUtc();
      final rebasedState = SyncStateRebaser.rebase(
        latestState: _currentState,
        syncedState: result.state,
        processedMutationIds: result.processedMutationIds,
      );
      await _applyState(rebasedState, shouldNotify: false);
      notifyListeners();
    } catch (error) {
      if (await _handleInvalidSessionError(error)) {
        return;
      }
      _cloudError = _humanizeCloudError(error);
      notifyListeners();
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  Future<void> _syncIfPossible({required bool silent}) async {
    if (_authSession == null ||
        _isSyncing ||
        _isInitialCloudBootstrapInFlight) {
      return;
    }

    if (silent) {
      await _performSilentSync();
      return;
    }

    await syncNow();
  }

  Future<void> _runInitialCloudBootstrap() async {
    if (_authSession == null) {
      _isInitialCloudBootstrapInFlight = false;
      _hasCompletedInitialCloudBootstrap = true;
      notifyListeners();
      return;
    }

    try {
      await _performSilentSync();
    } finally {
      _isInitialCloudBootstrapInFlight = false;
      _hasCompletedInitialCloudBootstrap = true;
      notifyListeners();
    }
  }

  Future<void> _performSilentSync() async {
    if (_authSession == null || _isSyncing) {
      return;
    }

    try {
      final result = await _syncService.synchronize(_currentState);
      _lastSyncedAt = DateTime.now().toUtc();
      final rebasedState = SyncStateRebaser.rebase(
        latestState: _currentState,
        syncedState: result.state,
        processedMutationIds: result.processedMutationIds,
      );
      await _applyState(rebasedState, shouldNotify: false);
      notifyListeners();
    } catch (error) {
      if (await _handleInvalidSessionError(error)) {
        return;
      }
      // Silent sync failures should not interrupt local usage.
    }
  }

  Future<void> _resetAfterAccountDeletion(AccountDeletionStatus status) async {
    _lastSyncedAt = null;
    _accountDeletionStatus = status;
    _cloudError = status.message;
    try {
      await _mediaRepository.clearAllLocalMedia();
    } catch (_) {
      // Local media cleanup failure should not block account deletion flow.
    }
    await _applyState(StoredAppState.empty(), shouldNotify: false);
  }

  Future<CalendarSyncResult> addTaskToPhoneCalendar({
    required String noteText,
    required String dueAt,
  }) {
    return _calendarService.addTaskToPhoneCalendar(
      noteText: noteText,
      dueAt: dueAt,
      title: _calendarService.buildCalendarTitle(noteText),
    );
  }

  void goToRecord() {
    _selectedTabIndex = 0;
    notifyListeners();
  }

  void goToTimeline() {
    _selectedTabIndex = 1;
    notifyListeners();
  }

  void goToTasks({String focusTaskId = ''}) {
    _selectedTabIndex = 2;
    _focusTaskId = focusTaskId;
    notifyListeners();
  }

  void goToMe() {
    _selectedTabIndex = 3;
    notifyListeners();
  }

  Map<String, int> get stats {
    final taskRecords = _buildTaskRecords();
    return <String, int>{
      'entryCount': entries.length,
      'pendingTaskCount': taskRecords
          .where((task) => task.status == TaskStatus.pending)
          .length,
      'overdueTaskCount': taskRecords
          .where((task) => task.status == TaskStatus.overdue)
          .length,
      'completedTaskCount': taskRecords
          .where((task) => task.status == TaskStatus.completed)
          .length,
    };
  }

  List<TimelineEntryRecord> get timelineEntries {
    final tasksByEntryId = <String, TaskRecord>{
      for (final task in tasks) task.entryId: task,
    };
    return entries
        .map(
          (entry) =>
              TimelineEntryRecord(entry: entry, task: tasksByEntryId[entry.id]),
        )
        .toList();
  }

  List<TaskViewRecord> get upcomingTasks => _buildTaskRecords()
      .where((task) => task.status == TaskStatus.pending)
      .toList();

  List<TaskViewRecord> get overdueTasks => _buildTaskRecords()
      .where((task) => task.status == TaskStatus.overdue)
      .toList();

  List<TaskViewRecord> get completedTasks => _buildTaskRecords()
      .where((task) => task.status == TaskStatus.completed)
      .toList();

  Future<void> _applyState(
    StoredAppState state, {
    bool shouldNotify = true,
  }) async {
    _entries = state.entries;
    _tasks = state.tasks;
    _pendingMutations = state.pendingMutations;
    _lastSyncedVersion = state.lastSyncedVersion;
    _authSession = state.authSession;
    _mediaCacheIndex = state.mediaCacheIndex;
    await _storageService.saveState(state);
    if (shouldNotify) {
      notifyListeners();
    }
  }

  StoredAppState _reconcileState(StoredAppState state) {
    var changed = false;
    final nextTasks = state.tasks.map((task) {
      if (task.isDeleted) {
        return task;
      }
      if (task.status == TaskStatus.pending &&
          farmer_date.isPastDate(task.dueAt)) {
        changed = true;
        return task.copyWith(
          status: TaskStatus.overdue,
          updatedAt: DateTime.now().toUtc().toIso8601String(),
          clientUpdatedAt: DateTime.now().toUtc().toIso8601String(),
        );
      }
      return task;
    }).toList();

    if (!changed) {
      return state;
    }

    return state.copyWith(tasks: nextTasks);
  }

  StoredAppState _sanitizeStoredState(StoredAppState state) {
    final session = state.authSession;
    if (session == null) {
      return state;
    }
    if (session.hasUsableAccessToken || session.hasUsableRefreshToken) {
      return state;
    }
    return state.copyWith(clearAuthSession: true);
  }

  SyncMutation _entryMutation(EntryRecord entry, SyncOperation operation) {
    return SyncMutation(
      id: _uuid.v4(),
      entityType: SyncEntityType.entry,
      operation: operation,
      entityId: entry.id,
      payload: entry.toCloudJson(),
      clientUpdatedAt: entry.clientUpdatedAt,
    );
  }

  SyncMutation _taskMutation(TaskRecord task, SyncOperation operation) {
    return SyncMutation(
      id: _uuid.v4(),
      entityType: SyncEntityType.task,
      operation: operation,
      entityId: task.id,
      payload: task.toCloudJson(),
      clientUpdatedAt: task.clientUpdatedAt,
    );
  }

  StoredAppState get _currentState => StoredAppState(
    entries: _entries,
    tasks: _tasks,
    pendingMutations: _pendingMutations,
    lastSyncedVersion: _lastSyncedVersion,
    authSession: _authSession,
    mediaCacheIndex: _mediaCacheIndex,
  );

  List<EntryRecord> _sortedEntries(List<EntryRecord> entries) {
    final copy = List<EntryRecord>.from(entries);
    copy.sort((left, right) => right.createdAt.compareTo(left.createdAt));
    return copy;
  }

  List<TaskRecord> _sortedTasks(List<TaskRecord> tasks) {
    final copy = List<TaskRecord>.from(tasks);
    copy.sort((left, right) {
      if (left.status == TaskStatus.completed &&
          right.status == TaskStatus.completed) {
        return (right.completedAt ?? '').compareTo(left.completedAt ?? '');
      }
      return left.dueAt.compareTo(right.dueAt);
    });
    return copy;
  }

  List<TaskViewRecord> _buildTaskRecords() {
    final entriesById = <String, EntryRecord>{
      for (final entry in entries) entry.id: entry,
    };

    return _sortedTasks(tasks).map((task) {
      final entry = entriesById[task.entryId];
      return TaskViewRecord(
        task: task,
        noteText: entry?.noteText ?? '这条原记录已删除',
        photoSource: entry?.localPhotoPath ?? '',
        entryCreatedAt: entry?.createdAt ?? task.dueAt,
      );
    }).toList();
  }

  bool _taskListsEqual(List<TaskRecord> left, List<TaskRecord> right) {
    if (left.length != right.length) {
      return false;
    }
    for (var index = 0; index < left.length; index += 1) {
      final leftTask = left[index];
      final rightTask = right[index];
      if (leftTask.id != rightTask.id ||
          leftTask.status != rightTask.status ||
          leftTask.deletedAt != rightTask.deletedAt ||
          leftTask.clientUpdatedAt != rightTask.clientUpdatedAt) {
        return false;
      }
    }
    return true;
  }

  Future<bool> _handleInvalidSessionError(Object error) async {
    if (!_isInvalidSessionError(error)) {
      return false;
    }

    _lastSyncedAt = null;
    _cloudError = '登录状态已失效，请重新登录云端。';
    await _applyState(
      _currentState.copyWith(clearAuthSession: true),
      shouldNotify: false,
    );
    notifyListeners();
    return true;
  }

  bool _isInvalidSessionError(Object error) {
    if (error is AuthServiceException) {
      return _isInvalidSessionFailure(
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      );
    }
    if (error is SyncServiceException) {
      return _isInvalidSessionFailure(
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      );
    }
    if (error is MediaRepositoryException) {
      return _isInvalidSessionFailure(
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      );
    }
    return false;
  }

  bool _isInvalidSessionFailure({
    required String code,
    required String message,
    required int? statusCode,
  }) {
    if (statusCode == 401) {
      return true;
    }

    final normalizedCode = code.trim().toLowerCase();
    if (normalizedCode == 'session_invalid') {
      return true;
    }

    final normalizedMessage = message.trim().toLowerCase();
    return normalizedMessage.contains('invalid access token') ||
        normalizedMessage.contains('access token expired') ||
        normalizedMessage.contains('invalid refresh token') ||
        normalizedMessage.contains('refresh token expired');
  }

  String _humanizeCloudError(Object error) {
    if (error is AuthServiceException) {
      return error.message;
    }
    if (error is SyncServiceException) {
      return error.message;
    }
    if (error is MediaRepositoryException) {
      return error.message;
    }
    return '云同步暂时失败了，但本机数据已经保留。稍后再试即可。';
  }
}

extension on Iterable<EntryRecord> {
  EntryRecord? get firstOrNull => isEmpty ? null : first;
}

extension on Iterable<TaskRecord> {
  TaskRecord? get firstOrNull => isEmpty ? null : first;
}
