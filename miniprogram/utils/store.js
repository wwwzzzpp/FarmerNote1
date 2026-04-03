const dateUtils = require('./date');

const STORAGE_KEY = 'farmernote_miniprogram_state_v1';

function getDefaultState() {
  return {
    entries: [],
    tasks: [],
  };
}

function sanitizeEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry) => entry && typeof entry === 'object' && entry.id && entry.noteText)
    .map((entry) => ({
      id: String(entry.id),
      noteText: String(entry.noteText),
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString(),
      updatedAt:
        typeof entry.updatedAt === 'string'
          ? entry.updatedAt
          : typeof entry.createdAt === 'string'
            ? entry.createdAt
            : new Date().toISOString(),
    }));
}

function sanitizeTasks(tasks) {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks
    .filter((task) => task && typeof task === 'object' && task.id && task.entryId && task.dueAt)
    .map((task) => ({
      id: String(task.id),
      entryId: String(task.entryId),
      dueAt: String(task.dueAt),
      status:
        task.status === 'completed' || task.status === 'overdue' || task.status === 'pending'
          ? task.status
          : 'pending',
      completedAt: typeof task.completedAt === 'string' ? task.completedAt : null,
    }));
}

function sanitizeState(rawState) {
  if (!rawState || typeof rawState !== 'object') {
    return getDefaultState();
  }

  return {
    entries: sanitizeEntries(rawState.entries),
    tasks: sanitizeTasks(rawState.tasks),
  };
}

function persistState(state) {
  wx.setStorageSync(STORAGE_KEY, state);
  return state;
}

function reconcileState(state) {
  let changed = false;
  const tasks = state.tasks.map((task) => {
    if (task.status === 'pending' && dateUtils.isPastDate(task.dueAt)) {
      changed = true;
      return {
        ...task,
        status: 'overdue',
      };
    }

    return task;
  });

  return {
    changed,
    state: changed
      ? {
          entries: state.entries,
          tasks,
        }
      : state,
  };
}

function loadState() {
  const stored = sanitizeState(wx.getStorageSync(STORAGE_KEY));
  const reconciled = reconcileState(stored);

  if (reconciled.changed) {
    persistState(reconciled.state);
  }

  return reconciled.state;
}

function sortEntries(entries) {
  return [...entries].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function sortTasks(tasks) {
  return [...tasks].sort((left, right) => {
    if (left.status === 'completed' && right.status === 'completed') {
      return (right.completedAt || '').localeCompare(left.completedAt || '');
    }

    return left.dueAt.localeCompare(right.dueAt);
  });
}

function buildTaskRecords(state) {
  const entriesById = Object.create(null);
  state.entries.forEach((entry) => {
    entriesById[entry.id] = entry;
  });

  return sortTasks(state.tasks).map((task) => {
    const entry = entriesById[task.entryId];
    return {
      ...task,
      noteText: entry ? entry.noteText : '这条原记录已删除',
      entryCreatedAt: entry ? entry.createdAt : task.dueAt,
    };
  });
}

function getStats() {
  const state = loadState();
  const taskRecords = buildTaskRecords(state);

  return {
    entryCount: state.entries.length,
    pendingTaskCount: taskRecords.filter((task) => task.status === 'pending').length,
    overdueTaskCount: taskRecords.filter((task) => task.status === 'overdue').length,
    completedTaskCount: taskRecords.filter((task) => task.status === 'completed').length,
  };
}

function getTimelineEntries() {
  const state = loadState();
  const taskByEntryId = Object.create(null);

  state.tasks.forEach((task) => {
    taskByEntryId[task.entryId] = task;
  });

  return sortEntries(state.entries).map((entry) => ({
    ...entry,
    task: taskByEntryId[entry.id] || null,
  }));
}

function getTaskSections() {
  const state = loadState();
  const taskRecords = buildTaskRecords(state);

  return {
    upcomingTasks: taskRecords.filter((task) => task.status === 'pending'),
    overdueTasks: taskRecords.filter((task) => task.status === 'overdue'),
    completedTasks: taskRecords.filter((task) => task.status === 'completed'),
  };
}

function getTaskById(taskId) {
  const state = loadState();
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    return null;
  }

  const entry = state.entries.find((item) => item.id === task.entryId);

  return {
    ...task,
    noteText: entry ? entry.noteText : '这条原记录已删除',
    entryCreatedAt: entry ? entry.createdAt : task.dueAt,
  };
}

function createEntry(input) {
  const state = loadState();
  const nowIso = new Date().toISOString();
  const noteText = String(input.noteText || '').trim();

  if (!noteText) {
    throw new Error('请输入巡田记录内容。');
  }

  const entry = {
    id: dateUtils.createId('entry'),
    noteText,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  state.entries.unshift(entry);

  let task = null;

  if (input.dueAt) {
    task = {
      id: dateUtils.createId('task'),
      entryId: entry.id,
      dueAt: String(input.dueAt),
      status: dateUtils.isPastDate(input.dueAt) ? 'overdue' : 'pending',
      completedAt: null,
    };

    state.tasks.push(task);
  }

  persistState(state);

  return {
    entry,
    task,
  };
}

function deleteEntry(entryId) {
  const state = loadState();

  persistState({
    entries: state.entries.filter((entry) => entry.id !== entryId),
    tasks: state.tasks.filter((task) => task.entryId !== entryId),
  });
}

function completeTask(taskId) {
  const state = loadState();
  const nowIso = new Date().toISOString();

  persistState({
    entries: state.entries,
    tasks: state.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: 'completed',
            completedAt: nowIso,
          }
        : task
    ),
  });
}

function deleteTask(taskId) {
  const state = loadState();

  persistState({
    entries: state.entries,
    tasks: state.tasks.filter((task) => task.id !== taskId),
  });
}

function rescheduleTask(taskId, nextDueAt) {
  const state = loadState();

  persistState({
    entries: state.entries,
    tasks: state.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            dueAt: nextDueAt,
            status: dateUtils.isPastDate(nextDueAt) ? 'overdue' : 'pending',
            completedAt: null,
          }
        : task
    ),
  });
}

module.exports = {
  STORAGE_KEY,
  completeTask,
  createEntry,
  deleteEntry,
  deleteTask,
  getStats,
  getTaskById,
  getTaskSections,
  getTimelineEntries,
  loadState,
  rescheduleTask,
};
