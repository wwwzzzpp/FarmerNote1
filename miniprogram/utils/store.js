const cloudAuth = require('./cloud-auth');
const cloudConfig = require('./cloud-config');
const cloudMedia = require('./cloud-media');
const cloudSync = require('./cloud-sync');
const cropPlanUtils = require('./crop-plan');
const dateUtils = require('./date');
const STORAGE_KEY = 'farmernote_miniprogram_state_v1';

let syncInFlight = null;
let signInInFlight = null;
let lastSyncError = '';
let lastSyncAt = '';
let backgroundSyncTimer = null;
let lastSuccessfulSyncAtMs = 0;

const PASSIVE_SYNC_COOLDOWN_MS = 45 * 1000;
const BACKGROUND_SYNC_DEBOUNCE_MS = 1200;

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function getDefaultState() {
  return {
    entries: [],
    tasks: [],
    cropPlanInstances: [],
    cropPlanActionProgresses: [],
    pendingMutations: [],
    lastSyncedVersion: 0,
    authSession: null,
    mediaCacheIndex: {},
  };
}

function getEmptyAccountDeletionStatus() {
  return {
    status: 'none',
    requestedAt: '',
    scheduledFor: '',
    confirmedBy: '',
    message: '',
  };
}

function detachCloudState(state) {
  const nextState = state || getDefaultState();
  return {
    ...nextState,
    entries: sanitizeEntries(nextState.entries).map((entry) => ({
      ...entry,
      cloudTracked: false,
    })),
    tasks: sanitizeTasks(nextState.tasks).map((task) => ({
      ...task,
      cloudTracked: false,
    })),
    cropPlanInstances: sanitizeCropPlanInstances(nextState.cropPlanInstances).map((plan) => ({
      ...plan,
      cloudTracked: false,
    })),
    cropPlanActionProgresses: sanitizeCropPlanActionProgresses(
      nextState.cropPlanActionProgresses
    ).map((progress) => ({
      ...progress,
      cloudTracked: false,
    })),
    pendingMutations: [],
    lastSyncedVersion: 0,
    authSession: null,
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
      planInstanceId:
        typeof entry.planInstanceId === 'string' && entry.planInstanceId.trim()
          ? entry.planInstanceId.trim()
          : '',
      planActionId:
        typeof entry.planActionId === 'string' && entry.planActionId.trim()
          ? entry.planActionId.trim()
          : '',
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

function sanitizeCropPlanInstances(planInstances) {
  if (!Array.isArray(planInstances)) {
    return [];
  }

  return planInstances
    .filter(
      (plan) =>
        plan &&
        typeof plan === 'object' &&
        plan.id &&
        plan.cropCode &&
        plan.regionCode &&
        plan.anchorDate
    )
    .map((plan) => ({
      id: String(plan.id),
      cropCode: String(plan.cropCode),
      regionCode: String(plan.regionCode),
      anchorDate: String(plan.anchorDate),
      status: String(plan.status || 'active') === 'active' ? 'active' : 'active',
      createdAt: typeof plan.createdAt === 'string' ? plan.createdAt : new Date().toISOString(),
      updatedAt:
        typeof plan.updatedAt === 'string'
          ? plan.updatedAt
          : typeof plan.createdAt === 'string'
          ? plan.createdAt
          : new Date().toISOString(),
      clientUpdatedAt:
        typeof plan.clientUpdatedAt === 'string'
          ? plan.clientUpdatedAt
          : typeof plan.updatedAt === 'string'
          ? plan.updatedAt
          : typeof plan.createdAt === 'string'
          ? plan.createdAt
          : new Date().toISOString(),
      deletedAt: typeof plan.deletedAt === 'string' ? plan.deletedAt : null,
      syncVersion: Number(plan.syncVersion || 0),
      cloudTracked: plan.cloudTracked === true,
    }));
}

function sanitizeCropPlanActionProgresses(progressRecords) {
  if (!Array.isArray(progressRecords)) {
    return [];
  }

  return progressRecords
    .filter(
      (progress) =>
        progress &&
        typeof progress === 'object' &&
        progress.id &&
        progress.planInstanceId &&
        progress.actionId
    )
    .map((progress) => ({
      id: String(progress.id),
      planInstanceId: String(progress.planInstanceId),
      actionId: String(progress.actionId),
      status:
        String(progress.status || 'pending') === 'completed' ? 'completed' : 'pending',
      completedAt: typeof progress.completedAt === 'string' ? progress.completedAt : null,
      createdAt:
        typeof progress.createdAt === 'string' ? progress.createdAt : new Date().toISOString(),
      updatedAt:
        typeof progress.updatedAt === 'string'
          ? progress.updatedAt
          : typeof progress.createdAt === 'string'
          ? progress.createdAt
          : new Date().toISOString(),
      clientUpdatedAt:
        typeof progress.clientUpdatedAt === 'string'
          ? progress.clientUpdatedAt
          : typeof progress.updatedAt === 'string'
          ? progress.updatedAt
          : typeof progress.createdAt === 'string'
          ? progress.createdAt
          : new Date().toISOString(),
      deletedAt: typeof progress.deletedAt === 'string' ? progress.deletedAt : null,
      syncVersion: Number(progress.syncVersion || 0),
      cloudTracked: progress.cloudTracked === true,
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
      entityType:
        mutation.entityType === 'task'
          ? 'task'
          : mutation.entityType === 'plan_instance'
          ? 'plan_instance'
          : mutation.entityType === 'plan_action_progress'
          ? 'plan_action_progress'
          : 'entry',
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
    cropPlanInstances: sanitizeCropPlanInstances(rawState.cropPlanInstances),
    cropPlanActionProgresses: sanitizeCropPlanActionProgresses(rawState.cropPlanActionProgresses),
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

function getActiveCropPlanInstances(state) {
  return state.cropPlanInstances.filter((plan) => !plan.deletedAt);
}

function getActiveCropPlanActionProgresses(state) {
  return state.cropPlanActionProgresses.filter((progress) => !progress.deletedAt);
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

function getAccountProfileSummary() {
  const state = loadState();
  const session = state.authSession;
  const isSignedIn = !!session;
  const displayName =
    session && session.userProfile ? String(session.userProfile.displayName || '').trim() : '';
  const maskedPhone =
    session && session.userProfile ? String(session.userProfile.maskedPhone || '').trim() : '';
  const hasPhone = hasLinkedProvider(session, 'phone');
  const hasWeChat = hasLinkedProvider(session, 'wechat');

  let title = '当前未登录云端';
  if (displayName) {
    title = displayName;
  } else if (maskedPhone) {
    title = maskedPhone;
  } else if (isSignedIn) {
    title = '云端账号';
  }

  let detail = '未登录时，设置页仍可查看协议与官网地址。';
  if (isSignedIn && hasPhone && hasWeChat) {
    detail = '当前账号已绑定手机号和微信。';
  } else if (isSignedIn && hasPhone) {
    detail = '当前账号已绑定手机号，后续还可补绑微信。';
  } else if (isSignedIn && hasWeChat) {
    detail = '当前账号已绑定微信，后续还可补绑手机号。';
  } else if (isSignedIn) {
    detail = '当前账号还没有完成登录方式绑定。';
  }

  return {
    isSignedIn,
    title,
    detail,
    hasPhone,
    hasWeChat,
    maskedPhone,
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

function getCropPlanCards() {
  const state = loadState();
  const planInstances = getActiveCropPlanInstances(state);
  const progressRecords = getActiveCropPlanActionProgresses(state);
  const entries = getActiveEntries(state);

  return cropPlanUtils.getCatalog().crops.map((cropTemplate) =>
    cropPlanUtils.buildPlanCard({
      cropTemplate,
      planInstance: cropPlanUtils.getActivePlanInstance(planInstances, cropTemplate.cropCode),
      progressRecords,
      entries,
      reference: new Date(),
    })
  );
}

function getCropPlanDetail(cropCode) {
  const state = loadState();
  const cropTemplate = cropPlanUtils.getCropTemplate(cropCode);
  if (!cropTemplate) {
    return null;
  }

  const planInstance = cropPlanUtils.getActivePlanInstance(
    getActiveCropPlanInstances(state),
    cropCode
  );

  return cropPlanUtils.buildPlanDetail({
    cropTemplate,
    planInstance,
    progressRecords: getActiveCropPlanActionProgresses(state),
    entries: getActiveEntries(state),
    reference: new Date(),
  });
}

function getCropPlanActionDetail(planInstanceId, actionId) {
  const state = loadState();
  const planInstance = getActiveCropPlanInstances(state).find((plan) => plan.id === planInstanceId);
  if (!planInstance) {
    return null;
  }

  const cropTemplate = cropPlanUtils.getCropTemplate(planInstance.cropCode);
  if (!cropTemplate) {
    return null;
  }

  return cropPlanUtils.buildActionDetail({
    cropTemplate,
    planInstance,
    progressRecords: getActiveCropPlanActionProgresses(state),
    entries: getActiveEntries(state),
    actionId,
    reference: new Date(),
  });
}

function setCropPlanAnchor(cropCode, anchorDate) {
  const state = loadState();
  const cropTemplate = cropPlanUtils.getCropTemplate(cropCode);
  if (!cropTemplate) {
    throw new Error('暂不支持这个作物计划。');
  }

  const normalizedAnchorDate = dateUtils.formatDateInput(cropPlanUtils.parseAnchorDate(anchorDate));
  const nowIso = new Date().toISOString();
  const shouldTrackCloud = !!state.authSession && cloudConfig.isConfigured();
  const existingPlan = cropPlanUtils.getActivePlanInstance(
    getActiveCropPlanInstances(state),
    cropCode
  );

  const nextPlan = existingPlan
    ? {
        ...existingPlan,
        anchorDate: normalizedAnchorDate,
        updatedAt: nowIso,
        clientUpdatedAt: nowIso,
        cloudTracked: existingPlan.cloudTracked || shouldTrackCloud,
      }
    : {
        id: dateUtils.createId('plan'),
        cropCode: cropTemplate.cropCode,
        regionCode: cropPlanUtils.getCatalog().regionCode,
        anchorDate: normalizedAnchorDate,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
        clientUpdatedAt: nowIso,
        deletedAt: null,
        syncVersion: 0,
        cloudTracked: shouldTrackCloud,
      };

  let pendingMutations = state.pendingMutations;
  if (nextPlan.cloudTracked) {
    pendingMutations = enqueueMutation(
      pendingMutations,
      buildPlanInstanceMutation(nextPlan, 'upsert')
    );
  }

  persistState({
    ...state,
    cropPlanInstances: existingPlan
      ? state.cropPlanInstances.map((plan) => (plan.id === nextPlan.id ? nextPlan : plan))
      : [nextPlan, ...state.cropPlanInstances],
    pendingMutations,
  });

  triggerBackgroundSync();
  return nextPlan;
}

function toggleCropPlanActionProgress(planInstanceId, actionId) {
  const state = loadState();
  const planInstance = getActiveCropPlanInstances(state).find((plan) => plan.id === planInstanceId);
  if (!planInstance) {
    throw new Error('当前作物计划不存在。');
  }

  const nowIso = new Date().toISOString();
  const shouldTrackCloud = !!state.authSession && cloudConfig.isConfigured();
  const existingProgress = getActiveCropPlanActionProgresses(state).find(
    (progress) => progress.planInstanceId === planInstanceId && progress.actionId === actionId
  );

  const nextProgress = existingProgress
    ? {
        ...existingProgress,
        status: existingProgress.status === 'completed' ? 'pending' : 'completed',
        completedAt: existingProgress.status === 'completed' ? null : nowIso,
        updatedAt: nowIso,
        clientUpdatedAt: nowIso,
        cloudTracked: existingProgress.cloudTracked || shouldTrackCloud,
      }
    : {
        id: dateUtils.createId('plan_progress'),
        planInstanceId,
        actionId,
        status: 'completed',
        completedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        clientUpdatedAt: nowIso,
        deletedAt: null,
        syncVersion: 0,
        cloudTracked: shouldTrackCloud,
      };

  let pendingMutations = state.pendingMutations;
  if (nextProgress.cloudTracked) {
    pendingMutations = enqueueMutation(
      pendingMutations,
      buildPlanActionProgressMutation(nextProgress, 'upsert')
    );
  }

  persistState({
    ...state,
    cropPlanActionProgresses: existingProgress
      ? state.cropPlanActionProgresses.map((progress) =>
          progress.id === nextProgress.id ? nextProgress : progress
        )
      : [nextProgress, ...state.cropPlanActionProgresses],
    pendingMutations,
  });

  triggerBackgroundSync();
  return nextProgress;
}

function buildCropPlanRecordDraft(planInstanceId, actionId, withReminder) {
  const state = loadState();
  const planInstance = getActiveCropPlanInstances(state).find((plan) => plan.id === planInstanceId);
  if (!planInstance) {
    throw new Error('当前作物计划不存在。');
  }

  const cropTemplate = cropPlanUtils.getCropTemplate(planInstance.cropCode);
  if (!cropTemplate) {
    throw new Error('当前作物模板不存在。');
  }

  const actionContext = cropPlanUtils
    .buildActionContexts(cropTemplate)
    .find((item) => item.action.id === actionId);
  if (!actionContext) {
    throw new Error('当前动作不存在。');
  }

  return cropPlanUtils.buildNoteDraft(planInstance, actionContext, withReminder, new Date());
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
    planInstanceId: entry.planInstanceId || null,
    planActionId: entry.planActionId || null,
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

function toCloudPlanInstance(plan) {
  return {
    id: plan.id,
    cropCode: plan.cropCode,
    regionCode: plan.regionCode,
    anchorDate: plan.anchorDate,
    status: plan.status,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    clientUpdatedAt: plan.clientUpdatedAt,
    deletedAt: plan.deletedAt || null,
  };
}

function toCloudPlanActionProgress(progress) {
  return {
    id: progress.id,
    planInstanceId: progress.planInstanceId,
    actionId: progress.actionId,
    status: progress.status,
    completedAt: progress.completedAt || null,
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt,
    clientUpdatedAt: progress.clientUpdatedAt,
    deletedAt: progress.deletedAt || null,
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

function buildPlanInstanceMutation(plan, operation) {
  return {
    id: dateUtils.createId('mutation'),
    entityType: 'plan_instance',
    operation,
    entityId: plan.id,
    payload: toCloudPlanInstance(plan),
    clientUpdatedAt: plan.clientUpdatedAt,
  };
}

function buildPlanActionProgressMutation(progress, operation) {
  return {
    id: dateUtils.createId('mutation'),
    entityType: 'plan_action_progress',
    operation,
    entityId: progress.id,
    payload: toCloudPlanActionProgress(progress),
    clientUpdatedAt: progress.clientUpdatedAt,
  };
}

function promoteLocalStateForCloud(state) {
  if (!state || !state.authSession || !cloudConfig.isConfigured()) {
    return state;
  }

  let changed = false;
  let pendingMutations = sanitizeMutations(state.pendingMutations);

  const entries = sanitizeEntries(state.entries).map((entry) => {
    if (entry.deletedAt || entry.cloudTracked) {
      return entry;
    }

    const nextEntry = {
      ...entry,
      cloudTracked: true,
    };
    pendingMutations = enqueueMutation(
      pendingMutations,
      buildEntryMutation(nextEntry, 'upsert')
    );
    changed = true;
    return nextEntry;
  });

  const tasks = sanitizeTasks(state.tasks).map((task) => {
    if (task.deletedAt || task.cloudTracked) {
      return task;
    }

    const nextTask = {
      ...task,
      cloudTracked: true,
    };
    pendingMutations = enqueueMutation(
      pendingMutations,
      buildTaskMutation(nextTask, 'upsert')
    );
    changed = true;
    return nextTask;
  });

  const cropPlanInstances = sanitizeCropPlanInstances(state.cropPlanInstances).map((plan) => {
    if (plan.deletedAt || plan.cloudTracked) {
      return plan;
    }

    const nextPlan = {
      ...plan,
      cloudTracked: true,
    };
    pendingMutations = enqueueMutation(
      pendingMutations,
      buildPlanInstanceMutation(nextPlan, 'upsert')
    );
    changed = true;
    return nextPlan;
  });

  const cropPlanActionProgresses = sanitizeCropPlanActionProgresses(
    state.cropPlanActionProgresses
  ).map((progress) => {
    if (progress.deletedAt || progress.cloudTracked) {
      return progress;
    }

    const nextProgress = {
      ...progress,
      cloudTracked: true,
    };
    pendingMutations = enqueueMutation(
      pendingMutations,
      buildPlanActionProgressMutation(nextProgress, 'upsert')
    );
    changed = true;
    return nextProgress;
  });

  if (!changed) {
    return state;
  }

  return {
    ...state,
    entries,
    tasks,
    cropPlanInstances,
    cropPlanActionProgresses,
    pendingMutations,
  };
}

function shouldSyncState(state, options) {
  const settings = options || {};
  if (!cloudConfig.isConfigured() || !state || !state.authSession) {
    return false;
  }

  if (settings.force) {
    return true;
  }

  if ((state.pendingMutations || []).length > 0) {
    return true;
  }

  if (Number(state.lastSyncedVersion || 0) <= 0) {
    return true;
  }

  if (!lastSuccessfulSyncAtMs) {
    return true;
  }

  return Date.now() - lastSuccessfulSyncAtMs >= PASSIVE_SYNC_COOLDOWN_MS;
}

function triggerBackgroundSync() {
  if (!cloudConfig.isConfigured()) {
    return;
  }

  const state = loadState();
  if (!state.authSession || syncInFlight) {
    return;
  }

  if (backgroundSyncTimer) {
    return;
  }

  backgroundSyncTimer = setTimeout(() => {
    backgroundSyncTimer = null;
    void syncIfNeeded({ reason: 'background_mutation' }).catch(() => {});
  }, BACKGROUND_SYNC_DEBOUNCE_MS);
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
    planInstanceId: String(input.planInstanceId || ''),
    planActionId: String(input.planActionId || ''),
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
    cropPlanInstances: state.cropPlanInstances,
    cropPlanActionProgresses: state.cropPlanActionProgresses,
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

function canUseWeChatLogin() {
  return cloudConfig.isWeChatLoginEnabled();
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
    : canUseWeChatLogin()
    ? '微信登录'
    : '';

  let headline = '当前处于本机模式';
  if (!cloudConfig.isConfigured()) {
    headline = '当前还没接入云端环境';
  } else if (signInInFlight) {
    headline = cloudConfig.isDevLoginEnabled()
      ? '正在接入临时联调账号'
      : canUseWeChatLogin()
      ? '正在通过微信登录云端'
      : '正在登录云端';
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
  } else if (!canUseWeChatLogin()) {
    headline = '当前优先使用手机号登录';
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
    detail = canUseWeChatLogin()
      ? '当前账号已绑定手机号，但还没绑定微信。补上微信后，小程序和 Flutter 都能直接用微信进到同一个账号。'
      : '当前账号已绑定手机号。等小程序微信登录入口重新开放后，再补绑微信即可。';
  } else if (isSignedIn && state.pendingMutations.length > 0) {
    detail = `还有 ${state.pendingMutations.length} 条新变更待上传。本机记录会先和云端合并，再按差异继续同步。`;
  } else if (isSignedIn && lastSyncAt) {
    detail = `云端和本机已对齐，上次同步时间 ${lastSyncAt}。`;
  } else if (isSignedIn) {
    detail = '本机记录会先和云端合并，后续只同步新增或变更的数据，保持小程序和 Flutter 端同账号互通。';
  } else if (!canUseWeChatLogin()) {
    detail = '未登录时，记录、图片、时间线和待办都会只保存在这台手机里。当前先用手机号验证码登录，后续再开放微信入口。';
  }

  return {
    isConfigured: cloudConfig.isConfigured(),
    isSignedIn,
    isBusy: !!syncInFlight || !!signInInFlight,
    actionLabel: primaryActionLabel,
    primaryActionLabel,
    canUseWeChatLogin: canUseWeChatLogin(),
    shouldShowPrimaryAction:
      !isSignedIn &&
      (cloudConfig.isDevLoginEnabled() || canUseWeChatLogin()),
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
    canLinkWeChat:
      isSignedIn &&
      !hasWeChat &&
      !cloudConfig.isDevLoginEnabled() &&
      canUseWeChatLogin(),
    hasPhone,
    hasWeChat,
  };
}

async function signInToCloud() {
  if (signInInFlight) {
    return signInInFlight;
  }

  if (!cloudConfig.isDevLoginEnabled() && !canUseWeChatLogin()) {
    throw new Error('当前小程序暂未开放微信登录入口，请先使用手机号验证码登录。');
  }

  signInInFlight = (async () => {
    const session = cloudConfig.isDevLoginEnabled()
      ? await cloudAuth.loginForDevelopment()
      : await cloudAuth.loginWithWeChat();
    const nextState = promoteLocalStateForCloud({
      ...loadState(),
      authSession: session,
    });
    persistState(nextState);
    lastSuccessfulSyncAtMs = 0;
    lastSyncError = '';
    await syncNow({ force: true });
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
    const nextState = promoteLocalStateForCloud({
      ...loadState(),
      authSession: session,
    });
    persistState(nextState);
    lastSuccessfulSyncAtMs = 0;
    lastSyncError = '';
    await syncNow({ force: true });
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
    const nextState = promoteLocalStateForCloud({
      ...state,
      authSession: session,
    });
    persistState(nextState);
    lastSuccessfulSyncAtMs = 0;
    lastSyncError = '';
    await syncNow({ force: true });
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
    const nextState = promoteLocalStateForCloud({
      ...state,
      authSession: session,
    });
    persistState(nextState);
    lastSuccessfulSyncAtMs = 0;
    lastSyncError = '';
    await syncNow({ force: true });
    return session;
  })();

  try {
    return await signInInFlight;
  } finally {
    signInInFlight = null;
  }
}

async function syncNow(options) {
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    const syncOptions = options === undefined ? { force: true } : options || {};
    const stateSnapshot = loadState();
    if (!shouldSyncState(stateSnapshot, syncOptions)) {
      return stateSnapshot;
    }

    try {
      const result = await cloudSync.syncState(stateSnapshot);
      const latestState = loadState();
      const rebasedState = cloudSync.rebaseSyncedState(
        latestState,
        result.state,
        result.processedMutationIds || []
      );
      persistState(rebasedState);
      lastSyncError = '';
      const now = new Date();
      lastSuccessfulSyncAtMs = now.getTime();
      lastSyncAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
        now.getHours()
      )}:${pad(now.getMinutes())}`;
      return rebasedState;
    } catch (error) {
      if (cloudAuth.isSessionInvalidError(error)) {
        const latestState = loadState();
        const nextState = {
          ...latestState,
          authSession: null,
        };
        persistState(nextState);
        lastSyncError = '登录状态已失效，请重新登录云端。';
        lastSyncAt = '';
        lastSuccessfulSyncAtMs = 0;
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
    const latestState = loadState();
    if (latestState.authSession && latestState.pendingMutations.length > 0) {
      triggerBackgroundSync();
    }
  }
}

async function syncIfNeeded(options) {
  return syncNow({
    ...(options || {}),
    force: false,
  });
}

function signOutFromCloud() {
  if (signInInFlight || syncInFlight) {
    throw new Error('当前还有登录或同步进行中，请稍后再试。');
  }

  if (backgroundSyncTimer) {
    clearTimeout(backgroundSyncTimer);
    backgroundSyncTimer = null;
  }

  const state = loadState();
  persistState(detachCloudState(state));
  lastSyncAt = '';
  lastSyncError = '';
  lastSuccessfulSyncAtMs = 0;
  return getAccountProfileSummary();
}

async function clearAllLocalMedia(state) {
  const localPhotoPaths = state.entries
    .map((entry) => String(entry.localPhotoPath || '').trim())
    .filter(Boolean);
  const uniquePaths = [...new Set(localPhotoPaths)];

  await Promise.all(
    uniquePaths.map((filePath) =>
      cloudMedia.removeLocalPhoto(filePath).catch(() => {})
    )
  );
}

async function resetAfterAccountDeletion(status) {
  const state = loadState();
  await clearAllLocalMedia(state);
  if (backgroundSyncTimer) {
    clearTimeout(backgroundSyncTimer);
    backgroundSyncTimer = null;
  }
  persistState(getDefaultState());
  lastSyncAt = '';
  lastSyncError =
    (status && status.message) || '账号已申请注销，将在 15 天内彻底删除。';
  lastSuccessfulSyncAtMs = 0;
  return getEmptyAccountDeletionStatus();
}

async function loadAccountDeletionStatus() {
  const state = loadState();
  if (!cloudConfig.isConfigured() || !state.authSession) {
    return getEmptyAccountDeletionStatus();
  }

  return cloudAuth.loadAccountDeletionStatus(state.authSession);
}

async function sendAccountDeletionPhoneCode() {
  const state = loadState();
  if (!cloudConfig.isConfigured() || !state.authSession) {
    throw new Error('当前还没有登录云端账号。');
  }

  return cloudAuth.sendAccountDeletionPhoneCode(state.authSession);
}

async function requestAccountDeletionWithPhone(code) {
  const state = loadState();
  if (!cloudConfig.isConfigured() || !state.authSession) {
    throw new Error('当前还没有登录云端账号。');
  }

  const status = await cloudAuth.requestAccountDeletionWithPhone(state.authSession, code);
  await resetAfterAccountDeletion(status);
  return status;
}

async function requestAccountDeletionWithWeChat() {
  const state = loadState();
  if (!cloudConfig.isConfigured() || !state.authSession) {
    throw new Error('当前还没有登录云端账号。');
  }

  const status = await cloudAuth.requestAccountDeletionWithWeChat(state.authSession);
  await resetAfterAccountDeletion(status);
  return status;
}

module.exports = {
  STORAGE_KEY,
  buildCropPlanRecordDraft,
  completeTask,
  createEntry,
  deleteEntry,
  deleteTask,
  getAccountProfileSummary,
  getCropPlanActionDetail,
  getCropPlanCards,
  getCropPlanDetail,
  getCloudStatus,
  getStats,
  getTaskSections,
  getTimelineEntries,
  canUseWeChatLogin,
  isCloudConfigured,
  isSignedInToCloud,
  linkPhoneToCloud,
  linkWeChatToCloud,
  loadAccountDeletionStatus,
  loadState,
  requestAccountDeletionWithPhone,
  requestAccountDeletionWithWeChat,
  sendAccountDeletionPhoneCode,
  sendPhoneCodeToCloud,
  setCropPlanAnchor,
  signOutFromCloud,
  signInToCloud,
  signInToCloudWithPhone,
  syncIfNeeded,
  syncNow,
  toggleCropPlanActionProgress,
};
