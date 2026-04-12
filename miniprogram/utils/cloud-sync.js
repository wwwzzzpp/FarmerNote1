const cloudAuth = require('./cloud-auth');
const cloudConfig = require('./cloud-config');
const cloudMedia = require('./cloud-media');
const requestUtils = require('./cloud-request');

function cloneState(state) {
  return {
    entries: Array.isArray(state.entries) ? state.entries.map((entry) => ({ ...entry })) : [],
    tasks: Array.isArray(state.tasks) ? state.tasks.map((task) => ({ ...task })) : [],
    pendingMutations: Array.isArray(state.pendingMutations)
      ? state.pendingMutations.map((mutation) => ({
          ...mutation,
          payload: mutation && mutation.payload ? { ...mutation.payload } : {},
        }))
      : [],
    lastSyncedVersion: Number(state.lastSyncedVersion || 0),
    authSession: state.authSession ? { ...state.authSession, userProfile: { ...state.authSession.userProfile } } : null,
    mediaCacheIndex: state.mediaCacheIndex ? { ...state.mediaCacheIndex } : {},
  };
}

function removeMutationIds(queue, mutationIds) {
  const idSet = new Set(mutationIds);
  return queue.filter((mutation) => !idSet.has(mutation.id));
}

function buildEntriesById(entries) {
  const map = Object.create(null);
  entries.forEach((entry) => {
    map[entry.id] = entry;
  });
  return map;
}

function buildTasksById(tasks) {
  const map = Object.create(null);
  tasks.forEach((task) => {
    map[task.id] = task;
  });
  return map;
}

function buildPushMutations(state) {
  const entriesById = buildEntriesById(state.entries);
  const tasksById = buildTasksById(state.tasks);

  return state.pendingMutations.map((mutation) => {
    let payload = mutation.payload || {};

    if (mutation.entityType === 'entry' && entriesById[mutation.entityId]) {
      payload = toCloudEntry(entriesById[mutation.entityId]);
    }

    if (mutation.entityType === 'task' && tasksById[mutation.entityId]) {
      payload = toCloudTask(tasksById[mutation.entityId]);
    }

    return {
      entityType: mutation.entityType,
      operation: mutation.operation,
      payload,
      clientMutationId: mutation.id,
      clientUpdatedAt: mutation.clientUpdatedAt,
    };
  });
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

function normalizeEntry(entry, existingEntry, mediaCacheIndex) {
  const photoObjectPath = String((entry && entry.photoObjectPath) || '');
  const localPhotoPath =
    photoObjectPath &&
    existingEntry &&
    existingEntry.photoObjectPath === photoObjectPath &&
    existingEntry.localPhotoPath
      ? existingEntry.localPhotoPath
      : mediaCacheIndex[photoObjectPath] || '';

  return {
    id: String((entry && entry.id) || ''),
    noteText: String((entry && entry.noteText) || ''),
    photoObjectPath,
    localPhotoPath,
    createdAt: String((entry && entry.createdAt) || new Date().toISOString()),
    updatedAt: String(
      (entry && entry.updatedAt) || (entry && entry.createdAt) || new Date().toISOString()
    ),
    clientUpdatedAt: String(
      (entry && entry.clientUpdatedAt) ||
        (entry && entry.updatedAt) ||
        (entry && entry.createdAt) ||
        new Date().toISOString()
    ),
    deletedAt: entry && entry.deletedAt ? String(entry.deletedAt) : null,
    sourcePlatform: String((entry && entry.sourcePlatform) || 'mini_program'),
    syncVersion: Number((entry && entry.syncVersion) || 0),
    cloudTracked: true,
  };
}

function normalizeTask(task) {
  return {
    id: String((task && task.id) || ''),
    entryId: String((task && task.entryId) || ''),
    dueAt: String((task && task.dueAt) || ''),
    status: String((task && task.status) || 'pending'),
    completedAt: task && task.completedAt ? String(task.completedAt) : null,
    createdAt: String((task && task.createdAt) || new Date().toISOString()),
    updatedAt: String((task && task.updatedAt) || (task && task.createdAt) || new Date().toISOString()),
    clientUpdatedAt: String(
      (task && task.clientUpdatedAt) ||
        (task && task.updatedAt) ||
        (task && task.createdAt) ||
        new Date().toISOString()
    ),
    deletedAt: task && task.deletedAt ? String(task.deletedAt) : null,
    syncVersion: Number((task && task.syncVersion) || 0),
    cloudTracked: true,
  };
}

async function uploadPendingPhotos(state) {
  const nextState = cloneState(state);

  for (let index = 0; index < nextState.pendingMutations.length; index += 1) {
    const mutation = nextState.pendingMutations[index];
    if (mutation.entityType !== 'entry' || mutation.operation !== 'upsert') {
      continue;
    }

    const entry = nextState.entries.find((item) => item.id === mutation.entityId);
    if (!entry || !entry.cloudTracked || !entry.localPhotoPath || entry.photoObjectPath) {
      if (entry && entry.photoObjectPath && entry.localPhotoPath) {
        nextState.mediaCacheIndex[entry.photoObjectPath] = entry.localPhotoPath;
      }
      continue;
    }

    const objectPath = await cloudMedia.uploadPhoto(nextState.authSession, entry.localPhotoPath);
    entry.photoObjectPath = objectPath;
    nextState.mediaCacheIndex[objectPath] = entry.localPhotoPath;
  }

  return nextState;
}

function mergePulledState(state, payload) {
  const nextState = cloneState(state);
  const entriesById = buildEntriesById(nextState.entries);
  const tasksById = buildTasksById(nextState.tasks);

  (payload.entries || []).forEach((entry) => {
    const normalized = normalizeEntry(entry, entriesById[entry.id], nextState.mediaCacheIndex);
    entriesById[normalized.id] = normalized;
    if (normalized.photoObjectPath && normalized.localPhotoPath) {
      nextState.mediaCacheIndex[normalized.photoObjectPath] = normalized.localPhotoPath;
    }
  });

  (payload.tasks || []).forEach((task) => {
    const normalized = normalizeTask(task);
    tasksById[normalized.id] = normalized;
  });

  nextState.entries = Object.keys(entriesById).map((id) => entriesById[id]);
  nextState.tasks = Object.keys(tasksById).map((id) => tasksById[id]);
  nextState.lastSyncedVersion = Number(payload.nextSyncedVersion || nextState.lastSyncedVersion || 0);

  return nextState;
}

async function hydrateRemotePhotos(state) {
  const nextState = cloneState(state);

  for (let index = 0; index < nextState.entries.length; index += 1) {
    const entry = nextState.entries[index];
    if (entry.deletedAt || !entry.photoObjectPath) {
      continue;
    }

    const localExists = await cloudMedia.hasUsableLocalPhoto(entry.localPhotoPath);
    if (localExists) {
      nextState.mediaCacheIndex[entry.photoObjectPath] = entry.localPhotoPath;
      continue;
    }

    const localPhotoPath = await cloudMedia.ensureDownloadedPhoto(
      nextState.authSession,
      entry.photoObjectPath
    );
    entry.localPhotoPath = localPhotoPath;
    nextState.mediaCacheIndex[entry.photoObjectPath] = localPhotoPath;
  }

  return nextState;
}

async function authorizedPost(session, endpoint, data) {
  return requestUtils.requestJson({
    url: cloudConfig.getFunctionUrl(endpoint),
    method: 'POST',
    data,
    header: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

async function syncState(state) {
  if (!cloudConfig.isConfigured() || !state || !state.authSession) {
    return {
      state,
    };
  }

  let workingState = cloneState(state);
  if (cloudAuth.shouldRefreshSession(workingState.authSession)) {
    workingState.authSession = await cloudAuth.refreshSession(workingState.authSession);
  }

  workingState = await uploadPendingPhotos(workingState);

  if (workingState.pendingMutations.length) {
    const pushPayload = buildPushMutations(workingState);
    const pushResult = await authorizedPost(workingState.authSession, 'sync-push', {
      mutations: pushPayload,
    });
    workingState.pendingMutations = removeMutationIds(workingState.pendingMutations, [
      ...(pushResult.appliedMutationIds || []),
      ...(pushResult.ignoredMutationIds || []),
    ]);
  }

  let hasMore = true;
  while (hasMore) {
    const pullResult = await authorizedPost(workingState.authSession, 'sync-pull', {
      lastSyncedVersion: Number(workingState.lastSyncedVersion || 0),
      limit: 100,
    });

    workingState = mergePulledState(workingState, pullResult);
    hasMore = !!pullResult.hasMore;
  }

  workingState = await hydrateRemotePhotos(workingState);

  return {
    state: workingState,
  };
}

module.exports = {
  syncState,
};
