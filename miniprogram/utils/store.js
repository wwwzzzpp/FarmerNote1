const cloudAuth = require('./cloud-auth');
const cloudConfig = require('./cloud-config');
const cloudMedia = require('./cloud-media');
const cloudSync = require('./cloud-sync');
const dateUtils = require('./date');
const STORAGE_KEY = 'farmernote_miniprogram_state_v1';

let syncInFlight = null;
let signInInFlight = null;
let lastSyncError = '';
let lastSyncAt = '';

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function getDefaultState() {
  return {
    entries: [],
    tasks: [],
    pendingMutations: [],
    lastSyncedVersion: 0,
    authSession: null,
    mediaCacheIndex: {},
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
      photoObjectPath: typeof entry.photoObjectPath === 'string' ? entry.photoObjectPath : '',
      localPhotoPath:
        typeof entry.localPhotoPath === 'string'
          ? entry.localPhotoPath
          : typeof entry.photoPath === 'string'
          ? entry.photoPath
          : '',
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString(),
      updatedAt:
        typeof entry.updatedAt === 'string'
          ? entry.updatedAt
          : typeof entry.createdAt === 'string'
          ? entry.createdAt
          : new Date().toISOString(),
      clientUpdatedAt:
        typeof entry.clientUpdatedAt === 'string'
          ? entry.clientUpdatedAt
          : typeof entry.updatedAt === 'string'
          ? entry.updatedAt
          : typeof entry.createdAt === 'string'
          ? entry.createdAt
          : new Date().toISOString(),
      deletedAt: typeof entry.deletedAt === 'string' ? entry.deletedAt : null,
      sourcePlatform:
        typeof entry.sourcePlatform === 'string' ? entry.sourcePlatform : 'mini_program',
      syncVersion: Number(entry.syncVersion || 0),
      cloudTracked: entry.cloudTracked === true,
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
      createdAt: typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString(),
      updatedAt:
        typeof task.updatedAt === 'string'
          ? task.updatedAt
          : typeof task.createdAt === 'string'
          ? task.createdAt
          : new Date().toISOString(),
      clientUpdatedAt:
        typeof task.clientUpdatedAt === 'string'
          ? task.clientUpdatedAt
          : typeof task.updatedAt === 'string'
          ? task.updatedAt
          : typeof task.createdAt === 'string'
          ? task.createdAt
          : new Date().toISOString(),
      deletedAt: typeof task.deletedAt === 'string' ? task.deletedAt : null,
      syncVersion: Number(task.syncVersion || 0),
      cloudTracked: task.cloudTracked === true,
    }));
}

function sanitizeMutations(mutations) {
  if (!Array.isArray(mutations)) {
    return [];
  }

  return mutations
    .filter(
      (mutation) =>
        mutation &&
        typeof mutation === 'object' &&
        mutation.id &&
        mutation.entityId &&
        mutation.entityType
    )
    .map((mutation) => ({
      id: String(mutation.id),
      entityType: mutation.entityType === 'task' ? 'task' : 'entry',
      operation: mutation.operation === 'delete' ? 'delete' : 'upsert',
      entityId: String(mutation.entityId),
      payload: mutation.payload && typeof mutation.payload === 'object' ? { ...mutation.payload } : {},
      clientUpdatedAt:
        typeof mutation.clientUpdatedAt === 'string'
          ? mutation.clientUpdatedAt
          : new Date().toISOString(),
    }));
}

function sanitizeAuthSession(authSession) {
  if (!authSession || typeof authSession !== 'object') {
    return null;
  }

  const linkedProviders =
    authSession.userProfile && Array.isArray(authSession.userProfile.linkedProviders)
      ? authSession.userProfile.linkedProviders
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      : [];

  return {
    accessToken: String(authSession.accessToken || ''),
    refreshToken: String(authSession.refreshToken || ''),
    accessExpiresAt: String(authSession.accessExpiresAt || ''),
    refreshExpiresAt: String(authSession.refreshExpiresAt || ''),
    userProfile: {
      id: String((authSession.userProfile && authSession.userProfile.id) || ''),
      unionId: String((authSession.userProfile && authSession.userProfile.unionId) || ''),
      displayName: String((authSession.userProfile && authSession.userProfile.displayName) || ''),
      avatarUrl: String((authSession.userProfile && authSession.userProfile.avatarUrl) || ''),
      linkedProviders,
      maskedPhone: String((authSession.userProfile && authSession.userProfile.maskedPhone) || ''),
    },
  };
}

function sanitizeState(rawState) {
  if (!rawState || typeof rawState !== 'object') {
    return getDefaultState();
  }

  const mediaCacheIndex =
    rawState.mediaCacheIndex && typeof rawState.mediaCacheIndex === 'object'
      ? Object.keys(rawState.mediaCacheIndex).reduce((result, key) => {
          result[key] = String(rawState.mediaCacheIndex[key] || '');
          return result;
        }, {})
      : {};

  return {
    entries: sanitizeEntries(rawState.entries),
    tasks: sanitizeTasks(rawState.tasks),
    pendingMutations: sanitizeMutations(rawState.pendingMutations),
    lastSyncedVersion: Number(rawState.lastSyncedVersion || 0),
    authSession: sanitizeAuthSession(rawState.authSession),
    mediaCacheIndex,
  };
}

function persistState(state) {
  wx.setStorageSync(STORAGE_KEY, state);
  return state;
}

function reconcileState(state) {
  let changed = false;
  const nowIso = new Date().toISOString();
  const tasks = state.tasks.map((task) => {
    if (!task.deletedAt && task.status === 'pending' && dateUtils.isPastDate(task.dueAt)) {
      changed = true;
      return {
        ...task,
        status: 'overdue',
        updatedAt: nowIso,
        clientUpdatedAt: nowIso,
      };
    }

    return task;
  });

  return {
    changed,
    state: changed
      ? {
          ...state,
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

function getActiveEntries(state) {
  return state.entries.filter((entry) => !entry.deletedAt);
}

function getActiveTasks(state) {
  return state.tasks.filter((task) => !task.deletedAt);
}

function buildTaskRecords(state) {
  const entriesById = Object.create(null);
  getActiveEntries(state).forEach((entry) => {
    entriesById[entry.id] = entry;
  });

  return sortTasks(getActiveTasks(state)).map((task) => {
    const entry = entriesById[task.entryId];
    return {
      ...task,
      noteText: entry ? entry.noteText : '这条原记录已删除',
      photoPath: entry ? entry.localPhotoPath : '',
      entryCreatedAt: entry ? entry.createdAt : task.dueAt,
    };
  });
}

function getStats() {
  const state = loadState();
  const taskRecords = buildTaskRecords(state);

  return {
    entryCount: getActiveEntries(state).length,
    pendingTaskCount: taskRecords.filter((task) => task.status === 'pending').length,
    overdueTaskCount: taskRecords.filter((task) => task.status === 'overdue').length,
    completedTaskCount: taskRecords.filter((task) => task.status === 'completed').length,
  };
}

function getTimelineEntries() {
  const state = loadState();
  const taskByEntryId = Object.create(null);

  getActiveTasks(state).forEach((task) => {
    taskByEntryId[task.entryId] = task;
  });

  return sortEntries(getActiveEntries(state)).map((entry) => ({
    ...entry,
    photoPath: entry.localPhotoPath,
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

function toCloudEntry(entry) {
  return {
    id: entry.id,
    noteText: entry.noteText,
    photoObjectPath: entry.photoObjectPath || '',
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    clientUpdatedAt: entry.clientUpdatedAt,
    deletedAt: entry.deletedAt || null,
    sourcePlatform: entry.sourcePlatform || 'mini_program',
  };
}

function toCloudTask(task) {
  return {
    id: task.id,
    entryId: task.entryId,
    dueAt: task.dueAt,
    status: task.status,
    completedAt: task.completedAt || null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    clientUpdatedAt: task.clientUpdatedAt,
    deletedAt: task.deletedAt || null,
  };
}

function enqueueMutation(queue, mutation) {
  const mutationKey = `${mutation.entityType}:${mutation.entityId}`;
  const existing = {};
  queue.forEach((item) => {
    existing[`${item.entityType}:${item.entityId}`] = item;
  });
  existing[mutationKey] = mutation;
  return Object.keys(existing)
    .map((key) => existing[key])
    .sort((left, right) => left.clientUpdatedAt.localeCompare(right.clientUpdatedAt));
}

function buildEntryMutation(entry, operation) {
  return {
    id: dateUtils.createId('mutation'),
    entityType: 'entry',
    operation,
    entityId: entry.id,
    payload: toCloudEntry(entry),
    clientUpdatedAt: entry.clientUpdatedAt,
  };
}

function buildTaskMutation(task, operation) {
  return {
    id: dateUtils.createId('mutation'),
    entityType: 'task',
    operation,
    entityId: task.id,
    payload: toCloudTask(task),
    clientUpdatedAt: task.clientUpdatedAt,
  };
}

function triggerBackgroundSync() {
  if (!cloudConfig.isConfigured()) {
    return;
  }

  const state = loadState();
  if (!state.authSession || syncInFlight) {
    return;
  }

  void syncNow().catch(() => {});
}

function createEntry(input) {
  const state = loadState();
  const nowIso = new Date().toISOString();
  const noteText = String(input.noteText || '').trim();
  const shouldTrackCloud = !!state.authSession && cloudConfig.isConfigured();

  if (!noteText) {
    throw new Error('请输入巡田记录内容。');
  }

  const entry = {
    id: dateUtils.createId('entry'),
    noteText,
    photoObjectPath: '',
    localPhotoPath: String(input.photoPath || ''),
    createdAt: nowIso,
    updatedAt: nowIso,
    clientUpdatedAt: nowIso,
    deletedAt: null,
    sourcePlatform: 'mini_program',
    syncVersion: 0,
    cloudTracked: shouldTrackCloud,
  };

  let task = null;
  let pendingMutations = state.pendingMutations;

  if (entry.cloudTracked) {
    pendingMutations = enqueueMutation(pendingMutations, buildEntryMutation(entry, 'upsert'));
  }

  if (input.dueAt) {
    task = {
      id: dateUtils.createId('task'),
      entryId: entry.id,
      dueAt: String(input.dueAt),
      status: dateUtils.isPastDate(input.dueAt) ? 'overdue' : 'pending',
      completedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      clientUpdatedAt: nowIso,
      deletedAt: null,
      syncVersion: 0,
      cloudTracked: shouldTrackCloud,
    };

    if (task.cloudTracked) {
      pendingMutations = enqueueMutation(pendingMutations, buildTaskMutation(task, 'upsert'));
    }
  }

  persistState({
    ...state,
    entries: [entry, ...state.entries],
    tasks: task ? [...state.tasks, task] : state.tasks,
    pendingMutations,
  });

  triggerBackgroundSync();

  return {
    entry,
    task,
  };
}

function deleteEntry(entryId) {
  const state = loadState();
  const entry = state.entries.find((item) => item.id === entryId);

  if (!entry) {
    return;
  }

  if (entry.localPhotoPath) {
    void cloudMedia.removeLocalPhoto(entry.localPhotoPath);
  }

  const nowIso = new Date().toISOString();
  let pendingMutations = state.pendingMutations;
  let nextEntries = state.entries;
  let nextTasks = state.tasks;

  if (entry.cloudTracked) {
    const deletedEntry = {
      ...entry,
      localPhotoPath: '',
      updatedAt: nowIso,
      clientUpdatedAt: nowIso,
      deletedAt: nowIso,
    };

    nextEntries = state.entries.map((item) => (item.id === entryId ? deletedEntry : item));
    pendingMutations = enqueueMutation(pendingMutations, buildEntryMutation(deletedEntry, 'delete'));

    nextTasks = state.tasks.map((task) => {
      if (task.entryId !== entryId) {
        return task;
      }

      const deletedTask = {
        ...task,
        updatedAt: nowIso,
        clientUpdatedAt: nowIso,
        deletedAt: nowIso,
      };

      pendingMutations = enqueueMutation(pendingMutations, buildTaskMutation(deletedTask, 'delete'));
      return deletedTask;
    });
  } else {
    nextEntries = state.entries.filter((item) => item.id !== entryId);
    nextTasks = state.tasks.filter((task) => task.entryId !== entryId);
  }

  persistState({
    ...state,
    entries: nextEntries,
    tasks: nextTasks,
    pendingMutations,
  });

  triggerBackgroundSync();
}

function completeTask(taskId) {
  const state = loadState();
  const task = state.tasks.find((item) => item.id === taskId);
  const nowIso = new Date().toISOString();

  if (!task || task.deletedAt) {
    return;
  }

  const completedTask = {
    ...task,
    status: 'completed',
    completedAt: nowIso,
    updatedAt: nowIso,
    clientUpdatedAt: nowIso,
  };

  let pendingMutations = state.pendingMutations;
  if (completedTask.cloudTracked) {
    pendingMutations = enqueueMutation(
      pendingMutations,
      buildTaskMutation(completedTask, 'upsert')
    );
  }

  persistState({
    ...state,
    tasks: state.tasks.map((item) => (item.id === taskId ? completedTask : item)),
    pendingMutations,
  });

  triggerBackgroundSync();
}

function deleteTask(taskId) {
  const state = loadState();
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  const nowIso = new Date().toISOString();
  let nextTasks = state.tasks;
  let pendingMutations = state.pendingMutations;

  if (task.cloudTracked) {
    const deletedTask = {
      ...task,
      updatedAt: nowIso,
      clientUpdatedAt: nowIso,
      deletedAt: nowIso,
    };

    nextTasks = state.tasks.map((item) => (item.id === taskId ? deletedTask : item));
    pendingMutations = enqueueMutation(pendingMutations, buildTaskMutation(deletedTask, 'delete'));
  } else {
    nextTasks = state.tasks.filter((item) => item.id !== taskId);
  }

  persistState({
    ...state,
    tasks: nextTasks,
    pendingMutations,
  });

  triggerBackgroundSync();
}

function isSignedInToCloud() {
  const state = loadState();
  return !!state.authSession;
}

function isCloudConfigured() {
  return cloudConfig.isConfigured();
}

function hasLinkedProvider(session, provider) {
  const linkedProviders =
    session &&
    session.userProfile &&
    Array.isArray(session.userProfile.linkedProviders)
      ? session.userProfile.linkedProviders
      : [];
  if (linkedProviders.indexOf(provider) >= 0) {
    return true;
  }

  if (provider === 'wechat') {
    return !!(
      session &&
      session.userProfile &&
      String(session.userProfile.unionId || '').trim()
    );
  }
  if (provider === 'phone') {
    return !!(
      session &&
      session.userProfile &&
      String(session.userProfile.maskedPhone || '').trim()
    );
  }

  return linkedProviders.indexOf(provider) >= 0;
}

function getCloudStatus() {
  const state = loadState();
  const isSignedIn = !!state.authSession;
  const displayName =
    state.authSession &&
    state.authSession.userProfile &&
    String(state.authSession.userProfile.displayName || '').trim();
  const maskedPhone =
    state.authSession &&
    state.authSession.userProfile &&
    String(state.authSession.userProfile.maskedPhone || '').trim();
  const hasPhone = hasLinkedProvider(state.authSession, 'phone');
  const hasWeChat = hasLinkedProvider(state.authSession, 'wechat');
  const primaryActionLabel = isSignedIn
    ? state.pendingMutations.length > 0
      ? '立即同步'
      : '检查云端更新'
    : cloudConfig.isDevLoginEnabled()
    ? '临时登录'
    : '微信登录';

  let headline = '当前处于本机模式';
  if (!cloudConfig.isConfigured()) {
    headline = '当前还没接入云端环境';
  } else if (signInInFlight) {
    headline = cloudConfig.isDevLoginEnabled() ? '正在接入临时联调账号' : '正在通过微信登录云端';
  } else if (syncInFlight) {
    headline = '正在同步 FarmerNote 云端数据';
  } else if (isSignedIn) {
    if (displayName) {
      headline = `已登录 ${displayName}`;
    } else if (hasPhone && maskedPhone) {
      headline = `已登录 ${maskedPhone}`;
    } else {
      headline = '已登录云端账号';
    }
  } else if (cloudConfig.isDevLoginEnabled()) {
    headline = '当前可用临时联调登录';
  }

  let detail = '未登录时，记录、图片、时间线和待办都会只保存在这台手机里。';
  if (!cloudConfig.isConfigured()) {
    detail = '先在 cloud-config.js 里配置 Supabase Functions 地址，再去微信后台补上合法 request 域名。';
  } else if (lastSyncError) {
    detail = lastSyncError;
  } else if (!isSignedIn && cloudConfig.isDevLoginEnabled()) {
    detail =
      '当前会走临时联调账号登录。只要小程序和 Flutter 使用同一个 debug key，就会同步到同一个 Supabase 测试用户。';
  } else if (isSignedIn && !hasPhone) {
    detail = '当前账号已接入云端，但还没绑定手机号。补上手机号后，小程序和 Flutter 都能用微信或验证码进入同一个账号。';
  } else if (isSignedIn && !hasWeChat) {
    detail = '当前账号已绑定手机号，但还没绑定微信。补上微信后，小程序和 Flutter 都能直接用微信进到同一个账号。';
  } else if (isSignedIn && state.pendingMutations.length > 0) {
    detail = `还有 ${state.pendingMutations.length} 条新变更待上传。当前版本只同步登录后产生的新数据，不会自动迁移旧本地记录。`;
  } else if (isSignedIn && lastSyncAt) {
    detail = `云端和本机已对齐，上次同步时间 ${lastSyncAt}。`;
  } else if (isSignedIn) {
    detail = '新创建的记录会自动同步到云端，并提供给同账号的小程序和 Flutter 端共享。';
  }

  return {
    isConfigured: cloudConfig.isConfigured(),
    isSignedIn,
    isBusy: !!syncInFlight || !!signInInFlight,
    actionLabel: primaryActionLabel,
    primaryActionLabel,
    secondaryActionLabel:
      !isSignedIn && !cloudConfig.isDevLoginEnabled() ? '手机号验证码登录' : '',
    headline,
    detail,
    linkedProviders:
      state.authSession && state.authSession.userProfile
        ? state.authSession.userProfile.linkedProviders || []
        : [],
    maskedPhone,
    canLinkPhone: isSignedIn && !hasPhone && !cloudConfig.isDevLoginEnabled(),
    canLinkWeChat: isSignedIn && !hasWeChat && !cloudConfig.isDevLoginEnabled(),
    hasPhone,
    hasWeChat,
  };
}

async function signInToCloud() {
  if (signInInFlight) {
    return signInInFlight;
  }

  signInInFlight = (async () => {
    const session = cloudConfig.isDevLoginEnabled()
      ? await cloudAuth.loginForDevelopment()
      : await cloudAuth.loginWithWeChat();
    const state = loadState();
    persistState({
      ...state,
      authSession: session,
    });
    lastSyncError = '';
    await syncNow();
    return session;
  })();

  try {
    return await signInInFlight;
  } finally {
    signInInFlight = null;
  }
}

async function sendPhoneCodeToCloud(phone) {
  return cloudAuth.sendPhoneCode(phone);
}

async function signInToCloudWithPhone(phone, code) {
  if (signInInFlight) {
    return signInInFlight;
  }

  signInInFlight = (async () => {
    const session = await cloudAuth.loginWithPhone(phone, code);
    const state = loadState();
    persistState({
      ...state,
      authSession: session,
    });
    lastSyncError = '';
    await syncNow();
    return session;
  })();

  try {
    return await signInInFlight;
  } finally {
    signInInFlight = null;
  }
}

async function linkPhoneToCloud(phone, code) {
  const state = loadState();
  if (!cloudConfig.isConfigured() || !state.authSession) {
    throw new Error('当前还没有登录云端账号。');
  }

  if (signInInFlight) {
    return signInInFlight;
  }

  signInInFlight = (async () => {
    const session = await cloudAuth.linkPhone(state.authSession, phone, code);
    const nextState = {
      ...state,
      authSession: session,
    };
    persistState(nextState);
    lastSyncError = '';
    await syncNow();
    return session;
  })();

  try {
    return await signInInFlight;
  } finally {
    signInInFlight = null;
  }
}

async function linkWeChatToCloud() {
  const state = loadState();
  if (!cloudConfig.isConfigured() || !state.authSession) {
    throw new Error('当前还没有登录云端账号。');
  }

  if (signInInFlight) {
    return signInInFlight;
  }

  signInInFlight = (async () => {
    const session = await cloudAuth.linkWithWeChat(state.authSession);
    const nextState = {
      ...state,
      authSession: session,
    };
    persistState(nextState);
    lastSyncError = '';
    await syncNow();
    return session;
  })();

  try {
    return await signInInFlight;
  } finally {
    signInInFlight = null;
  }
}

async function syncNow() {
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    const state = loadState();
    if (!cloudConfig.isConfigured() || !state.authSession) {
      return state;
    }

    try {
      const result = await cloudSync.syncState(state);
      persistState(result.state);
      lastSyncError = '';
      const now = new Date();
      lastSyncAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
        now.getHours()
      )}:${pad(now.getMinutes())}`;
      return result.state;
    } catch (error) {
      if (cloudAuth.isSessionInvalidError(error)) {
        const nextState = {
          ...state,
          authSession: null,
        };
        persistState(nextState);
        lastSyncError = '登录状态已失效，请重新登录云端。';
        lastSyncAt = '';
        return nextState;
      }

      lastSyncError =
        (error && error.message) || '云同步暂时失败了，但本机数据已经保留。稍后再试即可。';
      throw error;
    }
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

module.exports = {
  STORAGE_KEY,
  completeTask,
  createEntry,
  deleteEntry,
  deleteTask,
  getCloudStatus,
  getStats,
  getTaskSections,
  getTimelineEntries,
  isCloudConfigured,
  isSignedInToCloud,
  linkPhoneToCloud,
  linkWeChatToCloud,
  loadState,
  sendPhoneCodeToCloud,
  signInToCloud,
  signInToCloudWithPhone,
  syncNow,
};
