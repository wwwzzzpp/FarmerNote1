import 'package:flutter/widgets.dart';

import '../models/calendar_sync_result.dart';
import '../models/entry_record.dart';
import '../models/stored_app_state.dart';
import '../models/task_record.dart';
import '../models/task_view_record.dart';
import '../models/timeline_entry_record.dart';
import '../services/app_storage_service.dart';
import '../services/calendar_service.dart';
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
  }) : _storageService = storageService ?? AppStorageService(),
       _calendarService = calendarService ?? CalendarService();

  final AppStorageService _storageService;
  final CalendarService _calendarService;

  List<EntryRecord> _entries = <EntryRecord>[];
  List<TaskRecord> _tasks = <TaskRecord>[];
  bool _isReady = false;
  int _selectedTabIndex = 0;
  String _focusTaskId = '';

  bool get isReady => _isReady;
  int get selectedTabIndex => _selectedTabIndex;
  String get focusTaskId => _focusTaskId;

  List<EntryRecord> get entries =>
      List<EntryRecord>.unmodifiable(_sortedEntries(_entries));
  List<TaskRecord> get tasks =>
      List<TaskRecord>.unmodifiable(_sortedTasks(_tasks));

  Future<void> initialize() async {
    WidgetsBinding.instance.addObserver(this);
    final stored = await _storageService.loadState();
    await _applyState(_reconcileState(stored), shouldNotify: false);
    _isReady = true;
    notifyListeners();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      reconcileOverdueTasks();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> reconcileOverdueTasks() async {
    final reconciled = _reconcileState(
      StoredAppState(entries: _entries, tasks: _tasks),
    );
    if (reconciled.tasks != _tasks) {
      await _applyState(reconciled);
    }
  }

  Future<SaveEntryResult> createEntry({
    required String noteText,
    required String dueAt,
    required String photoDataUri,
  }) async {
    final trimmed = noteText.trim();
    if (trimmed.isEmpty) {
      throw Exception('请输入巡田记录内容。');
    }

    final nowIso = DateTime.now().toUtc().toIso8601String();
    final entry = EntryRecord(
      id: farmer_date.createId('entry'),
      noteText: trimmed,
      photoDataUri: photoDataUri,
      createdAt: nowIso,
      updatedAt: nowIso,
    );

    TaskRecord? task;
    if (dueAt.isNotEmpty) {
      task = TaskRecord(
        id: farmer_date.createId('task'),
        entryId: entry.id,
        dueAt: dueAt,
        status: farmer_date.isPastDate(dueAt)
            ? TaskStatus.overdue
            : TaskStatus.pending,
        completedAt: null,
      );
    }

    await _applyState(
      StoredAppState(
        entries: <EntryRecord>[entry, ..._entries],
        tasks: task == null ? _tasks : <TaskRecord>[..._tasks, task],
      ),
    );

    return SaveEntryResult(entry: entry, task: task);
  }

  Future<void> deleteEntry(String entryId) async {
    await _applyState(
      StoredAppState(
        entries: _entries.where((entry) => entry.id != entryId).toList(),
        tasks: _tasks.where((task) => task.entryId != entryId).toList(),
      ),
    );
  }

  Future<void> completeTask(String taskId) async {
    final nowIso = DateTime.now().toUtc().toIso8601String();
    await _applyState(
      StoredAppState(
        entries: _entries,
        tasks: _tasks
            .map(
              (task) => task.id == taskId
                  ? task.copyWith(
                      status: TaskStatus.completed,
                      completedAt: nowIso,
                    )
                  : task,
            )
            .toList(),
      ),
    );
  }

  Future<void> deleteTask(String taskId) async {
    await _applyState(
      StoredAppState(
        entries: _entries,
        tasks: _tasks.where((task) => task.id != taskId).toList(),
      ),
    );
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

  Map<String, int> get stats {
    final taskRecords = _buildTaskRecords();
    return <String, int>{
      'entryCount': _entries.length,
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
      for (final task in _tasks) task.entryId: task,
    };
    return _sortedEntries(_entries)
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
    await _storageService.saveState(state);
    if (shouldNotify) {
      notifyListeners();
    }
  }

  StoredAppState _reconcileState(StoredAppState state) {
    var changed = false;
    final nextTasks = state.tasks.map((task) {
      if (task.status == TaskStatus.pending &&
          farmer_date.isPastDate(task.dueAt)) {
        changed = true;
        return task.copyWith(status: TaskStatus.overdue);
      }
      return task;
    }).toList();

    if (!changed) {
      return state;
    }

    return state.copyWith(tasks: nextTasks);
  }

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
      for (final entry in _entries) entry.id: entry,
    };

    return _sortedTasks(_tasks).map((task) {
      final entry = entriesById[task.entryId];
      return TaskViewRecord(
        task: task,
        noteText: entry?.noteText ?? '这条原记录已删除',
        photoDataUri: entry?.photoDataUri ?? '',
        entryCreatedAt: entry?.createdAt ?? task.dueAt,
      );
    }).toList();
  }
}
