// Mini program runtime does not reliably treat packaged JSON as a CommonJS module.
// Keep the JSON source for cross-platform assets, and load the generated JS mirror here.
const catalog = require('../data/crop_plan_catalog.js');
const dateUtils = require('./date');

const DAY_MS = 24 * 60 * 60 * 1000;

function toStartOfDay(value) {
  const date = dateUtils.toDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function parseAnchorDate(value) {
  const parts = String(value || '')
    .split('-')
    .map((part) => parseInt(part, 10));

  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error('播种日期格式不正确。');
  }

  const candidate = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  if (
    candidate.getFullYear() !== parts[0] ||
    candidate.getMonth() !== parts[1] - 1 ||
    candidate.getDate() !== parts[2]
  ) {
    throw new Error('播种日期格式不正确。');
  }

  return candidate;
}

function diffDays(left, right) {
  return Math.floor((toStartOfDay(left).getTime() - toStartOfDay(right).getTime()) / DAY_MS);
}

function buildActionContexts(cropTemplate) {
  const contexts = [];

  cropTemplate.stages.forEach((stage, stageIndex) => {
    stage.milestones.forEach((milestone, milestoneIndex) => {
      milestone.actions.forEach((action, actionIndex) => {
        contexts.push({
          crop: cropTemplate,
          stage,
          milestone,
          action,
          orderKey: `${String(stageIndex).padStart(2, '0')}-${String(milestoneIndex).padStart(
            2,
            '0'
          )}-${String(actionIndex).padStart(2, '0')}`,
        });
      });
    });
  });

  return contexts;
}

function getCatalog() {
  return catalog;
}

function getCropTemplate(cropCode) {
  return catalog.crops.find((crop) => crop.cropCode === cropCode) || null;
}

function getActivePlanInstance(planInstances, cropCode) {
  return (
    [...(planInstances || [])]
      .filter(
        (plan) =>
          plan &&
          !plan.deletedAt &&
          plan.cropCode === cropCode &&
          String(plan.status || 'active') === 'active'
      )
      .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))[0] ||
    null
  );
}

function buildProgressIndex(progressRecords, planInstanceId) {
  return (progressRecords || [])
    .filter((item) => item && !item.deletedAt && item.planInstanceId === planInstanceId)
    .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
    .reduce((result, item) => {
      if (!result[item.actionId]) {
        result[item.actionId] = item;
      }
      return result;
    }, {});
}

function getRelativeDay(planInstance, reference) {
  if (!planInstance || !planInstance.anchorDate) {
    return null;
  }

  return diffDays(reference || new Date(), parseAnchorDate(planInstance.anchorDate));
}

function getStageStatus(relativeDay, stage) {
  if (relativeDay == null) {
    return 'setup';
  }
  if (relativeDay < stage.offsetStartDays) {
    return 'upcoming';
  }
  if (relativeDay > stage.offsetEndDays) {
    return 'passed';
  }
  return 'current';
}

function getCurrentStage(cropTemplate, relativeDay) {
  if (relativeDay == null) {
    return null;
  }

  return (
    cropTemplate.stages.find(
      (stage) => relativeDay >= stage.offsetStartDays && relativeDay <= stage.offsetEndDays
    ) || null
  );
}

function getNextStage(cropTemplate, relativeDay) {
  if (relativeDay == null) {
    return cropTemplate.stages[0] || null;
  }

  return cropTemplate.stages.find((stage) => relativeDay < stage.offsetStartDays) || null;
}

function getCompletedActionCount(progressIndex) {
  return Object.keys(progressIndex || {}).filter(
    (actionId) => String(progressIndex[actionId].status || 'pending') === 'completed'
  ).length;
}

function getLatestLinkedEntry(entries, planInstanceId, actionId) {
  return (
    [...(entries || [])]
      .filter(
        (entry) =>
          entry &&
          !entry.deletedAt &&
          entry.planInstanceId === planInstanceId &&
          entry.planActionId === actionId
      )
      .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))[0] ||
    null
  );
}

function getRecommendedReminderDate(planInstance, actionContext, reference) {
  const anchorDate = parseAnchorDate(planInstance.anchorDate);
  const stageStartDate = dateUtils.addDays(anchorDate, Number(actionContext.stage.offsetStartDays || 0));
  const candidateDate = dateUtils.addDays(
    stageStartDate,
    -Math.max(0, Number(actionContext.action.leadDays || 0))
  );
  const candidate = new Date(
    candidateDate.getFullYear(),
    candidateDate.getMonth(),
    candidateDate.getDate(),
    8,
    0,
    0,
    0
  );
  const now = reference ? dateUtils.toDate(reference) : new Date();

  if (candidate.getTime() <= now.getTime()) {
    return dateUtils.getSuggestedReminderDate(now);
  }

  return candidate;
}

function buildNoteDraft(planInstance, actionContext, withReminder, reference) {
  if (!planInstance) {
    return null;
  }

  const recommendedDate = getRecommendedReminderDate(planInstance, actionContext, reference);

  return {
    planInstanceId: planInstance.id,
    planActionId: actionContext.action.id,
    noteText: `${actionContext.crop.cropName}-${actionContext.stage.name}-${actionContext.milestone.name}-${actionContext.action.name}：今天田间观察/执行情况...`,
    reminderEnabled: !!withReminder,
    reminderDate: dateUtils.formatDateInput(recommendedDate),
    reminderTime: dateUtils.formatTimeInput(recommendedDate),
  };
}

function buildPlanCard(input) {
  const cropTemplate = input.cropTemplate;
  const planInstance = input.planInstance;
  const progressIndex = planInstance
    ? buildProgressIndex(input.progressRecords, planInstance.id)
    : {};
  const actionContexts = buildActionContexts(cropTemplate);
  const totalActionCount = actionContexts.length;
  const completedActionCount = getCompletedActionCount(progressIndex);
  const relativeDay = planInstance ? getRelativeDay(planInstance, input.reference) : null;
  const currentStage = getCurrentStage(cropTemplate, relativeDay);
  const nextStage = getNextStage(cropTemplate, relativeDay);
  const nextActionContext =
    actionContexts.find(
      (item) => String((progressIndex[item.action.id] && progressIndex[item.action.id].status) || 'pending') !== 'completed'
    ) || null;

  if (!planInstance) {
    return {
      cropCode: cropTemplate.cropCode,
      cropName: cropTemplate.cropName,
      regionName: catalog.regionName,
      hasAnchorDate: false,
      anchorDate: '',
      stageLabel: '先设置播种日期',
      stageCaption: `用${cropTemplate.anchorLabel}生成这一季的个人时间轴`,
      progressLabel: `0/${totalActionCount} 个动作完成`,
      nextActionLabel: '设置播种日期后，会显示当前阶段和下一关键动作',
      ctaLabel: '开始设置',
      completedActionCount,
      totalActionCount,
    };
  }

  let stageLabel = currentStage ? currentStage.name : '等待进入关键窗口';
  let stageCaption = `播种后第 ${relativeDay} 天`;

  if (!currentStage && nextStage) {
    stageLabel = nextStage.name;
    stageCaption = `距离阶段开始还有 ${Math.max(0, nextStage.offsetStartDays - relativeDay)} 天`;
  } else if (!currentStage && !nextStage) {
    stageLabel = '本季主要窗口已走完';
    stageCaption = '可以回看这一季记录，准备复盘下一季';
  }

  return {
    cropCode: cropTemplate.cropCode,
    cropName: cropTemplate.cropName,
    regionName: catalog.regionName,
    hasAnchorDate: true,
    anchorDate: planInstance.anchorDate,
    planInstanceId: planInstance.id,
    stageLabel,
    stageCaption,
    progressLabel: `${completedActionCount}/${totalActionCount} 个动作完成`,
    nextActionLabel: nextActionContext
      ? `${nextActionContext.milestone.name} · ${nextActionContext.action.name}`
      : '当前模板里的动作都已处理',
    ctaLabel: '查看详情',
    completedActionCount,
    totalActionCount,
  };
}

function buildPlanDetail(input) {
  const cropTemplate = input.cropTemplate;
  const planInstance = input.planInstance;
  if (!planInstance) {
    return null;
  }

  const progressIndex = buildProgressIndex(input.progressRecords, planInstance.id);
  const relativeDay = getRelativeDay(planInstance, input.reference);
  const totalActionCount = buildActionContexts(cropTemplate).length;
  const completedActionCount = getCompletedActionCount(progressIndex);

  const stages = cropTemplate.stages.map((stage) => {
    const stageStatus = getStageStatus(relativeDay, stage);
    const milestones = stage.milestones.map((milestone) => {
      const actions = milestone.actions.map((action) => {
        const progress = progressIndex[action.id] || null;
        const linkedEntry = getLatestLinkedEntry(input.entries, planInstance.id, action.id);

        return {
          id: action.id,
          name: action.name,
          executionStandard: action.executionStandard,
          steps: action.steps || [],
          cautions: action.cautions || [],
          leadDays: Number(action.leadDays || 0),
          keywords: action.keywords || [],
          status: progress && progress.status === 'completed' ? 'completed' : 'pending',
          statusLabel: progress && progress.status === 'completed' ? '已完成' : '待处理',
          hasRecentEntry: !!linkedEntry,
          recentEntryId: linkedEntry ? linkedEntry.id : '',
          recentEntryText: linkedEntry ? linkedEntry.noteText : '',
          recentEntryCreatedAt: linkedEntry ? linkedEntry.createdAt : '',
        };
      });

      const completedActions = actions.filter((action) => action.status === 'completed').length;

      return {
        id: milestone.id,
        name: milestone.name,
        goal: milestone.goal,
        completedActions,
        totalActions: actions.length,
        progressLabel: `${completedActions}/${actions.length} 个小动作完成`,
        status: completedActions === actions.length ? 'completed' : actions.some((action) => action.status === 'completed') ? 'in_progress' : 'pending',
        actions,
      };
    });

    const stageActionCount = milestones.reduce((total, milestone) => total + milestone.totalActions, 0);
    const stageCompletedCount = milestones.reduce((total, milestone) => total + milestone.completedActions, 0);

    return {
      id: stage.id,
      name: stage.name,
      offsetStartDays: stage.offsetStartDays,
      offsetEndDays: stage.offsetEndDays,
      windowLabel: `播后第 ${stage.offsetStartDays} 到 ${stage.offsetEndDays} 天`,
      status: stageStatus,
      statusLabel:
        stageStatus === 'current'
          ? '当前阶段'
          : stageStatus === 'passed'
          ? '已过窗口'
          : '即将到来',
      completedActions: stageCompletedCount,
      totalActions: stageActionCount,
      milestones,
    };
  });

  return {
    cropCode: cropTemplate.cropCode,
    cropName: cropTemplate.cropName,
    regionName: catalog.regionName,
    planInstanceId: planInstance.id,
    anchorDate: planInstance.anchorDate,
    relativeDay,
    progressLabel: `${completedActionCount}/${totalActionCount} 个动作完成`,
    stages,
  };
}

function buildActionDetail(input) {
  const cropTemplate = input.cropTemplate;
  const planInstance = input.planInstance;
  if (!planInstance) {
    return null;
  }

  const progressIndex = buildProgressIndex(input.progressRecords, planInstance.id);
  const actionContext = buildActionContexts(cropTemplate).find(
    (item) => item.action.id === input.actionId
  );

  if (!actionContext) {
    return null;
  }

  const progress = progressIndex[input.actionId] || null;
  const linkedEntry = getLatestLinkedEntry(input.entries, planInstance.id, input.actionId);
  const recommendedDate = getRecommendedReminderDate(planInstance, actionContext, input.reference);

  return {
    cropCode: cropTemplate.cropCode,
    cropName: cropTemplate.cropName,
    cropLabel: `${cropTemplate.cropName} · ${catalog.regionName}`,
    planInstanceId: planInstance.id,
    actionId: actionContext.action.id,
    stageId: actionContext.stage.id,
    stageName: actionContext.stage.name,
    milestoneId: actionContext.milestone.id,
    milestoneName: actionContext.milestone.name,
    goal: actionContext.milestone.goal,
    name: actionContext.action.name,
    executionStandard: actionContext.action.executionStandard,
    steps: actionContext.action.steps || [],
    cautions: actionContext.action.cautions || [],
    keywords: actionContext.action.keywords || [],
    status: progress && progress.status === 'completed' ? 'completed' : 'pending',
    statusLabel: progress && progress.status === 'completed' ? '已完成' : '待处理',
    recommendedReminderDate: dateUtils.formatDateInput(recommendedDate),
    recommendedReminderTime: dateUtils.formatTimeInput(recommendedDate),
    noteDraft: buildNoteDraft(planInstance, actionContext, false, input.reference),
    reminderDraft: buildNoteDraft(planInstance, actionContext, true, input.reference),
    recentEntry: linkedEntry
      ? {
          id: linkedEntry.id,
          noteText: linkedEntry.noteText,
          createdAt: linkedEntry.createdAt,
          createdAtLabel: dateUtils.formatFriendlyDateTime(linkedEntry.createdAt),
        }
      : null,
  };
}

module.exports = {
  buildActionContexts,
  buildActionDetail,
  buildNoteDraft,
  buildPlanCard,
  buildPlanDetail,
  diffDays,
  getActivePlanInstance,
  getCatalog,
  getCropTemplate,
  getRecommendedReminderDate,
  parseAnchorDate,
  toStartOfDay,
};
