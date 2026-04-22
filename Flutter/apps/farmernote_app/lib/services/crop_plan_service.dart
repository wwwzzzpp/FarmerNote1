import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import '../models/crop_plan_action_progress.dart';
import '../models/crop_plan_catalog.dart';
import '../models/crop_plan_instance.dart';
import '../models/entry_record.dart';
import '../models/plan_record_draft.dart';
import '../utils/date_utils.dart' as farmer_date;

enum CropPlanStageStatus { current, upcoming, passed, setup }

class CropPlanHomeCardView {
  const CropPlanHomeCardView({
    required this.cropCode,
    required this.cropName,
    required this.regionName,
    required this.hasAnchorDate,
    required this.anchorDate,
    required this.planInstanceId,
    required this.stageLabel,
    required this.stageCaption,
    required this.progressLabel,
    required this.nextActionLabel,
    required this.ctaLabel,
    required this.completedActionCount,
    required this.totalActionCount,
  });

  final String cropCode;
  final String cropName;
  final String regionName;
  final bool hasAnchorDate;
  final String anchorDate;
  final String planInstanceId;
  final String stageLabel;
  final String stageCaption;
  final String progressLabel;
  final String nextActionLabel;
  final String ctaLabel;
  final int completedActionCount;
  final int totalActionCount;
}

class CropPlanLinkedEntryView {
  const CropPlanLinkedEntryView({
    required this.id,
    required this.noteText,
    required this.createdAt,
    required this.createdAtLabel,
  });

  final String id;
  final String noteText;
  final String createdAt;
  final String createdAtLabel;
}

class CropPlanActionView {
  const CropPlanActionView({
    required this.id,
    required this.name,
    required this.executionStandard,
    required this.steps,
    required this.cautions,
    required this.leadDays,
    required this.keywords,
    required this.status,
    required this.hasRecentEntry,
    required this.recentEntry,
  });

  final String id;
  final String name;
  final String executionStandard;
  final List<String> steps;
  final List<String> cautions;
  final int leadDays;
  final List<String> keywords;
  final CropPlanActionStatus status;
  final bool hasRecentEntry;
  final CropPlanLinkedEntryView? recentEntry;
}

class CropPlanMilestoneView {
  const CropPlanMilestoneView({
    required this.id,
    required this.name,
    required this.goal,
    required this.completedActions,
    required this.totalActions,
    required this.progressLabel,
    required this.actions,
  });

  final String id;
  final String name;
  final String goal;
  final int completedActions;
  final int totalActions;
  final String progressLabel;
  final List<CropPlanActionView> actions;
}

class CropPlanStageView {
  const CropPlanStageView({
    required this.id,
    required this.name,
    required this.windowLabel,
    required this.status,
    required this.statusLabel,
    required this.completedActions,
    required this.totalActions,
    required this.milestones,
  });

  final String id;
  final String name;
  final String windowLabel;
  final CropPlanStageStatus status;
  final String statusLabel;
  final int completedActions;
  final int totalActions;
  final List<CropPlanMilestoneView> milestones;
}

class CropPlanDetailView {
  const CropPlanDetailView({
    required this.cropCode,
    required this.cropName,
    required this.regionName,
    required this.planInstanceId,
    required this.anchorDate,
    required this.relativeDay,
    required this.progressLabel,
    required this.stages,
  });

  final String cropCode;
  final String cropName;
  final String regionName;
  final String planInstanceId;
  final String anchorDate;
  final int relativeDay;
  final String progressLabel;
  final List<CropPlanStageView> stages;
}

class CropPlanActionDetailView {
  const CropPlanActionDetailView({
    required this.cropCode,
    required this.cropName,
    required this.cropLabel,
    required this.planInstanceId,
    required this.actionId,
    required this.stageName,
    required this.milestoneName,
    required this.goal,
    required this.name,
    required this.executionStandard,
    required this.steps,
    required this.cautions,
    required this.keywords,
    required this.status,
    required this.recommendedReminderDate,
    required this.recommendedReminderTime,
    required this.noteDraft,
    required this.reminderDraft,
    required this.recentEntry,
  });

  final String cropCode;
  final String cropName;
  final String cropLabel;
  final String planInstanceId;
  final String actionId;
  final String stageName;
  final String milestoneName;
  final String goal;
  final String name;
  final String executionStandard;
  final List<String> steps;
  final List<String> cautions;
  final List<String> keywords;
  final CropPlanActionStatus status;
  final String recommendedReminderDate;
  final String recommendedReminderTime;
  final PlanRecordDraft noteDraft;
  final PlanRecordDraft reminderDraft;
  final CropPlanLinkedEntryView? recentEntry;
}

class CropPlanService {
  static const String _catalogAssetPath = 'assets/crop_plan_catalog.json';

  CropPlanCatalog? _catalog;

  Future<CropPlanCatalog> loadCatalog() async {
    if (_catalog != null) {
      return _catalog!;
    }

    final raw = await rootBundle.loadString(_catalogAssetPath);
    final decoded = jsonDecode(raw);
    if (decoded is Map<String, dynamic>) {
      _catalog = CropPlanCatalog.fromJson(decoded);
      return _catalog!;
    }
    if (decoded is Map) {
      _catalog = CropPlanCatalog.fromJson(decoded.cast<String, dynamic>());
      return _catalog!;
    }
    throw const FormatException('作物计划模板格式不正确。');
  }

  CropPlanCatalog get catalog {
    final value = _catalog;
    if (value == null) {
      throw StateError('Crop plan catalog has not been loaded.');
    }
    return value;
  }

  CropTemplate? getCropTemplate(String cropCode) => catalog.findCrop(cropCode);

  CropPlanInstance? getActivePlanInstance(
    List<CropPlanInstance> planInstances,
    String cropCode,
  ) {
    final matches =
        planInstances
            .where(
              (plan) =>
                  !plan.isDeleted &&
                  plan.cropCode == cropCode &&
                  plan.status == CropPlanInstanceStatus.active,
            )
            .toList()
          ..sort((left, right) => right.updatedAt.compareTo(left.updatedAt));

    return matches.isEmpty ? null : matches.first;
  }

  Map<String, CropPlanActionProgress> buildProgressIndex(
    List<CropPlanActionProgress> progressRecords,
    String planInstanceId,
  ) {
    final filtered =
        progressRecords
            .where(
              (progress) =>
                  !progress.isDeleted &&
                  progress.planInstanceId == planInstanceId,
            )
            .toList()
          ..sort((left, right) => right.updatedAt.compareTo(left.updatedAt));

    final index = <String, CropPlanActionProgress>{};
    for (final progress in filtered) {
      index.putIfAbsent(progress.actionId, () => progress);
    }
    return index;
  }

  DateTime parseAnchorDate(String value) {
    final parts = value.split('-').map(int.parse).toList();
    if (parts.length != 3) {
      throw const FormatException('播种日期格式不正确。');
    }
    final candidate = DateTime(parts[0], parts[1], parts[2]);
    if (candidate.year != parts[0] ||
        candidate.month != parts[1] ||
        candidate.day != parts[2]) {
      throw const FormatException('播种日期格式不正确。');
    }
    return DateTime(candidate.year, candidate.month, candidate.day);
  }

  int? getRelativeDay(CropPlanInstance? planInstance, {DateTime? reference}) {
    if (planInstance == null || planInstance.anchorDate.isEmpty) {
      return null;
    }
    final base = parseAnchorDate(planInstance.anchorDate);
    return _diffDays(reference ?? DateTime.now(), base);
  }

  CropPlanStageStatus getStageStatus(int? relativeDay, StageTemplate stage) {
    if (relativeDay == null) {
      return CropPlanStageStatus.setup;
    }
    if (relativeDay < stage.offsetStartDays) {
      return CropPlanStageStatus.upcoming;
    }
    if (relativeDay > stage.offsetEndDays) {
      return CropPlanStageStatus.passed;
    }
    return CropPlanStageStatus.current;
  }

  StageTemplate? getCurrentStage(CropTemplate cropTemplate, int? relativeDay) {
    if (relativeDay == null) {
      return null;
    }
    for (final stage in cropTemplate.stages) {
      if (relativeDay >= stage.offsetStartDays &&
          relativeDay <= stage.offsetEndDays) {
        return stage;
      }
    }
    return null;
  }

  StageTemplate? getNextStage(CropTemplate cropTemplate, int? relativeDay) {
    if (relativeDay == null) {
      return cropTemplate.stages.isEmpty ? null : cropTemplate.stages.first;
    }
    for (final stage in cropTemplate.stages) {
      if (relativeDay < stage.offsetStartDays) {
        return stage;
      }
    }
    return null;
  }

  CropPlanLinkedEntryView? getLatestLinkedEntry(
    List<EntryRecord> entries,
    String planInstanceId,
    String actionId,
  ) {
    final matches =
        entries
            .where(
              (entry) =>
                  !entry.isDeleted &&
                  entry.planInstanceId == planInstanceId &&
                  entry.planActionId == actionId,
            )
            .toList()
          ..sort((left, right) => right.createdAt.compareTo(left.createdAt));
    if (matches.isEmpty) {
      return null;
    }
    final entry = matches.first;
    return CropPlanLinkedEntryView(
      id: entry.id,
      noteText: entry.noteText,
      createdAt: entry.createdAt,
      createdAtLabel: farmer_date.formatFriendlyDateTime(entry.createdAt),
    );
  }

  DateTime getRecommendedReminderDate(
    CropPlanInstance planInstance,
    ActionContext actionContext, {
    DateTime? reference,
  }) {
    final anchorDate = parseAnchorDate(planInstance.anchorDate);
    final stageStart = anchorDate.add(
      Duration(days: actionContext.stage.offsetStartDays),
    );
    final candidateDate = stageStart.subtract(
      Duration(days: actionContext.action.leadDays),
    );
    final candidate = DateTime(
      candidateDate.year,
      candidateDate.month,
      candidateDate.day,
      8,
    );
    final now = (reference ?? DateTime.now()).toLocal();
    if (!candidate.isAfter(now)) {
      return farmer_date.getSuggestedReminderDate(reference: now);
    }
    return candidate;
  }

  PlanRecordDraft buildRecordDraft(
    CropPlanInstance planInstance,
    ActionContext actionContext, {
    required bool withReminder,
    DateTime? reference,
  }) {
    final recommended = getRecommendedReminderDate(
      planInstance,
      actionContext,
      reference: reference,
    );
    final sourceLabel =
        '${actionContext.crop.cropName}-${actionContext.stage.name}-${actionContext.milestone.name}-${actionContext.action.name}';
    return PlanRecordDraft(
      id: '${planInstance.id}:${actionContext.action.id}:${withReminder ? 'reminder' : 'note'}:${DateTime.now().microsecondsSinceEpoch}',
      noteText: '$sourceLabel：今天田间观察/执行情况...',
      reminderEnabled: withReminder,
      reminderDate: farmer_date.formatDateInput(recommended),
      reminderTime: farmer_date.formatTimeInput(recommended),
      planInstanceId: planInstance.id,
      planActionId: actionContext.action.id,
      sourceLabel: sourceLabel,
    );
  }

  List<CropPlanHomeCardView> buildHomeCards({
    required List<CropPlanInstance> planInstances,
    required List<CropPlanActionProgress> progressRecords,
    required List<EntryRecord> entries,
    DateTime? reference,
  }) {
    return catalog.crops.map((cropTemplate) {
      final planInstance = getActivePlanInstance(
        planInstances,
        cropTemplate.cropCode,
      );
      final actionContexts = cropTemplate.buildActionContexts();
      final totalActionCount = actionContexts.length;
      if (planInstance == null) {
        return CropPlanHomeCardView(
          cropCode: cropTemplate.cropCode,
          cropName: cropTemplate.cropName,
          regionName: catalog.regionName,
          hasAnchorDate: false,
          anchorDate: '',
          planInstanceId: '',
          stageLabel: '先设置播种日期',
          stageCaption: '用播种日期生成这一季的个人时间轴',
          progressLabel: '0/$totalActionCount 个动作完成',
          nextActionLabel: '设置播种日期后，会显示当前阶段和下一关键动作',
          ctaLabel: '开始设置',
          completedActionCount: 0,
          totalActionCount: totalActionCount,
        );
      }

      final progressIndex = buildProgressIndex(
        progressRecords,
        planInstance.id,
      );
      final completedActionCount = progressIndex.values
          .where((item) => item.status == CropPlanActionStatus.completed)
          .length;
      final relativeDay = getRelativeDay(planInstance, reference: reference);
      final currentStage = getCurrentStage(cropTemplate, relativeDay);
      final nextStage = getNextStage(cropTemplate, relativeDay);
      ActionContext? nextAction;
      for (final context in actionContexts) {
        final status =
            progressIndex[context.action.id]?.status ??
            CropPlanActionStatus.pending;
        if (status != CropPlanActionStatus.completed) {
          nextAction = context;
          break;
        }
      }

      var stageLabel = currentStage?.name ?? '等待进入关键窗口';
      var stageCaption = '播种后第 ${relativeDay ?? 0} 天';
      if (currentStage == null && nextStage != null && relativeDay != null) {
        stageLabel = nextStage.name;
        stageCaption = '距离阶段开始还有 ${nextStage.offsetStartDays - relativeDay} 天';
      } else if (currentStage == null && nextStage == null) {
        stageLabel = '本季主要窗口已走完';
        stageCaption = '可以回看这一季记录，准备复盘下一季';
      }

      return CropPlanHomeCardView(
        cropCode: cropTemplate.cropCode,
        cropName: cropTemplate.cropName,
        regionName: catalog.regionName,
        hasAnchorDate: true,
        anchorDate: planInstance.anchorDate,
        planInstanceId: planInstance.id,
        stageLabel: stageLabel,
        stageCaption: stageCaption,
        progressLabel: '$completedActionCount/$totalActionCount 个动作完成',
        nextActionLabel: nextAction == null
            ? '当前模板里的动作都已处理'
            : '${nextAction.milestone.name} · ${nextAction.action.name}',
        ctaLabel: '查看详情',
        completedActionCount: completedActionCount,
        totalActionCount: totalActionCount,
      );
    }).toList();
  }

  CropPlanDetailView? buildPlanDetail({
    required CropTemplate cropTemplate,
    required CropPlanInstance? planInstance,
    required List<CropPlanActionProgress> progressRecords,
    required List<EntryRecord> entries,
    DateTime? reference,
  }) {
    if (planInstance == null) {
      return null;
    }

    final progressIndex = buildProgressIndex(progressRecords, planInstance.id);
    final relativeDay = getRelativeDay(planInstance, reference: reference) ?? 0;
    final actionContexts = cropTemplate.buildActionContexts();
    final completedActionCount = progressIndex.values
        .where((item) => item.status == CropPlanActionStatus.completed)
        .length;

    final stages = cropTemplate.stages.map((stage) {
      final milestones = stage.milestones.map((milestone) {
        final actions = milestone.actions.map((action) {
          final progress = progressIndex[action.id];
          final linkedEntry = getLatestLinkedEntry(
            entries,
            planInstance.id,
            action.id,
          );
          return CropPlanActionView(
            id: action.id,
            name: action.name,
            executionStandard: action.executionStandard,
            steps: action.steps,
            cautions: action.cautions,
            leadDays: action.leadDays,
            keywords: action.keywords,
            status: progress?.status ?? CropPlanActionStatus.pending,
            hasRecentEntry: linkedEntry != null,
            recentEntry: linkedEntry,
          );
        }).toList();

        final completedActions = actions
            .where((action) => action.status == CropPlanActionStatus.completed)
            .length;
        return CropPlanMilestoneView(
          id: milestone.id,
          name: milestone.name,
          goal: milestone.goal,
          completedActions: completedActions,
          totalActions: actions.length,
          progressLabel: '$completedActions/${actions.length} 个小动作完成',
          actions: actions,
        );
      }).toList();

      final completedActions = milestones.fold<int>(
        0,
        (total, milestone) => total + milestone.completedActions,
      );
      final totalActions = milestones.fold<int>(
        0,
        (total, milestone) => total + milestone.totalActions,
      );
      final status = getStageStatus(relativeDay, stage);
      return CropPlanStageView(
        id: stage.id,
        name: stage.name,
        windowLabel: '播后第 ${stage.offsetStartDays} 到 ${stage.offsetEndDays} 天',
        status: status,
        statusLabel: switch (status) {
          CropPlanStageStatus.current => '当前阶段',
          CropPlanStageStatus.passed => '已过窗口',
          CropPlanStageStatus.upcoming => '即将到来',
          CropPlanStageStatus.setup => '待设置',
        },
        completedActions: completedActions,
        totalActions: totalActions,
        milestones: milestones,
      );
    }).toList();

    return CropPlanDetailView(
      cropCode: cropTemplate.cropCode,
      cropName: cropTemplate.cropName,
      regionName: catalog.regionName,
      planInstanceId: planInstance.id,
      anchorDate: planInstance.anchorDate,
      relativeDay: relativeDay,
      progressLabel: '$completedActionCount/${actionContexts.length} 个动作完成',
      stages: stages,
    );
  }

  CropPlanActionDetailView? buildActionDetail({
    required CropTemplate cropTemplate,
    required CropPlanInstance? planInstance,
    required List<CropPlanActionProgress> progressRecords,
    required List<EntryRecord> entries,
    required String actionId,
    DateTime? reference,
  }) {
    if (planInstance == null) {
      return null;
    }

    final actionContext = cropTemplate.buildActionContexts().firstWhere(
      (context) => context.action.id == actionId,
      orElse: () => const ActionContext(
        crop: CropTemplate(
          cropCode: '',
          cropName: '',
          anchorLabel: '',
          stages: <StageTemplate>[],
        ),
        stage: StageTemplate(
          id: '',
          name: '',
          offsetStartDays: 0,
          offsetEndDays: 0,
          milestones: <MilestoneTemplate>[],
        ),
        milestone: MilestoneTemplate(
          id: '',
          name: '',
          goal: '',
          actions: <ActionTemplate>[],
        ),
        action: ActionTemplate(
          id: '',
          name: '',
          executionStandard: '',
          steps: <String>[],
          cautions: <String>[],
          leadDays: 0,
          keywords: <String>[],
        ),
        orderKey: '',
      ),
    );
    if (actionContext.action.id.isEmpty) {
      return null;
    }

    final progressIndex = buildProgressIndex(progressRecords, planInstance.id);
    final status =
        progressIndex[actionId]?.status ?? CropPlanActionStatus.pending;
    final linkedEntry = getLatestLinkedEntry(
      entries,
      planInstance.id,
      actionId,
    );
    final recommended = getRecommendedReminderDate(
      planInstance,
      actionContext,
      reference: reference,
    );

    return CropPlanActionDetailView(
      cropCode: cropTemplate.cropCode,
      cropName: cropTemplate.cropName,
      cropLabel: '${cropTemplate.cropName} · ${catalog.regionName}',
      planInstanceId: planInstance.id,
      actionId: actionId,
      stageName: actionContext.stage.name,
      milestoneName: actionContext.milestone.name,
      goal: actionContext.milestone.goal,
      name: actionContext.action.name,
      executionStandard: actionContext.action.executionStandard,
      steps: actionContext.action.steps,
      cautions: actionContext.action.cautions,
      keywords: actionContext.action.keywords,
      status: status,
      recommendedReminderDate: farmer_date.formatDateInput(recommended),
      recommendedReminderTime: farmer_date.formatTimeInput(recommended),
      noteDraft: buildRecordDraft(
        planInstance,
        actionContext,
        withReminder: false,
        reference: reference,
      ),
      reminderDraft: buildRecordDraft(
        planInstance,
        actionContext,
        withReminder: true,
        reference: reference,
      ),
      recentEntry: linkedEntry,
    );
  }

  int _diffDays(DateTime left, DateTime right) {
    final leftDay = DateTime(left.year, left.month, left.day);
    final rightDay = DateTime(right.year, right.month, right.day);
    return leftDay.difference(rightDay).inDays;
  }
}
