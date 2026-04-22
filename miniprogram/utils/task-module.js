const dateUtils = require('./date');
const DEFAULT_PAGE_SIZE = 10;

function normalizePositiveInt(value, fallbackValue) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return Math.floor(parsed);
}

function getEmptyTaskModuleViewState() {
  return {
    upcomingTasks: [],
    overdueTasks: [],
    completedTasks: [],
    hasTasks: false,
    hasUpcomingTasks: false,
    hasOverdueTasks: false,
    hasCompletedTasks: false,
    isInitialLoading: false,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 0,
    visibleCount: 0,
    hasMore: false,
    loadMoreLabel: '',
  };
}

function buildTaskViewModel(task, focusTaskId) {
  let statusLabel = '待处理';
  let statusClass = 'status-chip--warning';

  if (task.status === 'overdue') {
    statusLabel = '已逾期';
    statusClass = 'status-chip--danger';
  } else if (task.status === 'completed') {
    statusLabel = '已完成';
    statusClass = 'status-chip--success';
  }

  return {
    id: task.id,
    noteText: task.noteText,
    photoPath: task.photoPath || '',
    hasPhoto: !!task.photoPath,
    dueLabel: dateUtils.formatRelativeReminder(task.dueAt),
    dueCompactLabel: dateUtils.formatCompactDateTime(task.dueAt),
    focusClass: task.id === focusTaskId ? 'task-card--focused' : '',
    statusLabel,
    statusClass,
    canComplete: task.status !== 'completed',
    completedCompactLabel:
      task.status === 'completed' && task.completedAt
        ? dateUtils.formatCompactDateTime(task.completedAt)
        : '',
  };
}

function buildTaskModuleViewState(sections, options) {
  const settings = options || {};
  const focusTaskId = settings.focusTaskId || '';
  const safeSections = sections || {};
  const pageSize = normalizePositiveInt(settings.pageSize, DEFAULT_PAGE_SIZE);
  const requestedPage = normalizePositiveInt(settings.page, 1);
  const flattenedTasks = [];

  ['upcomingTasks', 'overdueTasks', 'completedTasks'].forEach((sectionKey) => {
    (safeSections[sectionKey] || []).forEach((task) => {
      flattenedTasks.push({
        sectionKey,
        task,
      });
    });
  });

  let page = requestedPage;
  const focusTaskIndex = flattenedTasks.findIndex((item) => item.task.id === focusTaskId);
  if (focusTaskIndex >= 0) {
    page = Math.max(page, Math.ceil((focusTaskIndex + 1) / pageSize));
  }

  const visibleCount = Math.min(flattenedTasks.length, page * pageSize);
  const visibleSections = {
    upcomingTasks: [],
    overdueTasks: [],
    completedTasks: [],
  };

  flattenedTasks.slice(0, visibleCount).forEach((item) => {
    visibleSections[item.sectionKey].push(item.task);
  });

  const upcomingTasks = visibleSections.upcomingTasks.map((task) =>
    buildTaskViewModel(task, focusTaskId)
  );
  const overdueTasks = visibleSections.overdueTasks.map((task) =>
    buildTaskViewModel(task, focusTaskId)
  );
  const completedTasks = visibleSections.completedTasks.map((task) =>
    buildTaskViewModel(task, focusTaskId)
  );
  const totalCount = flattenedTasks.length;
  const hasTasks = totalCount > 0;
  const hasMore = visibleCount < totalCount;
  const remainingCount = Math.max(0, totalCount - visibleCount);

  return {
    upcomingTasks,
    overdueTasks,
    completedTasks,
    hasTasks,
    hasUpcomingTasks: upcomingTasks.length > 0,
    hasOverdueTasks: overdueTasks.length > 0,
    hasCompletedTasks: completedTasks.length > 0,
    isInitialLoading: settings.isInitialLoading === true,
    page,
    pageSize,
    totalCount,
    visibleCount,
    hasMore,
    loadMoreLabel: hasMore
      ? `再加载 ${Math.min(pageSize, remainingCount)} 条`
      : '',
  };
}

module.exports = {
  getEmptyTaskModuleViewState,
  buildTaskModuleViewState,
};
