import 'package:flutter/material.dart';

import '../../app/farmernote_controller.dart';
import '../../models/crop_plan_action_progress.dart';
import '../../theme/app_theme.dart';
import '../../widgets/farmer_ui.dart';

class PlanActionDetailScreen extends StatelessWidget {
  const PlanActionDetailScreen({
    required this.controller,
    required this.planInstanceId,
    required this.actionId,
    super.key,
  });

  final FarmerNoteController controller;
  final String planInstanceId;
  final String actionId;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final detail = controller.buildCropPlanActionDetail(
          planInstanceId: planInstanceId,
          actionId: actionId,
        );

        return Scaffold(
          appBar: AppBar(title: const Text('动作详情')),
          body: detail == null
              ? const SafeArea(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: ScreenSectionCard(
                      margin: EdgeInsets.zero,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            '这个动作暂时没找到',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          SizedBox(height: 12),
                          Text(
                            '可能是当前计划还没设置完成，或者动作模板已经更新。',
                            style: TextStyle(
                              fontSize: 15,
                              height: 1.7,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              : SafeArea(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        ScreenSectionCard(
                          margin: EdgeInsets.zero,
                          backgroundColor: AppColors.hero,
                          borderColor: AppColors.borderDark,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text(
                                detail.cropLabel,
                                style: const TextStyle(
                                  fontSize: 12,
                                  letterSpacing: 1.6,
                                  color: Color(0xFF6D674F),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                detail.name,
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textHero,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                '${detail.stageName} · ${detail.milestoneName}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        ScreenSectionCard(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: <Widget>[
                                    const Text(
                                      '为什么做',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      detail.goal,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        height: 1.7,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              StatusChip(
                                label:
                                    detail.status ==
                                        CropPlanActionStatus.completed
                                    ? '已完成'
                                    : '待处理',
                                tone:
                                    detail.status ==
                                        CropPlanActionStatus.completed
                                    ? FarmerChipTone.success
                                    : FarmerChipTone.warning,
                              ),
                            ],
                          ),
                        ),
                        ScreenSectionCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              const Text(
                                '做到什么算合格',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                detail.executionStandard,
                                style: const TextStyle(
                                  fontSize: 14,
                                  height: 1.7,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        ScreenSectionCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              const Text(
                                '怎么做',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 10),
                              ...detail.steps.asMap().entries.map(
                                (entry) => _DetailListItem(
                                  marker: '${entry.key + 1}',
                                  text: entry.value,
                                ),
                              ),
                            ],
                          ),
                        ),
                        ScreenSectionCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              const Text(
                                '注意什么',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 10),
                              ...detail.cautions.map(
                                (item) =>
                                    _DetailListItem(marker: '!', text: item),
                              ),
                            ],
                          ),
                        ),
                        if (detail.recentEntry != null)
                          ScreenSectionCard(
                            backgroundColor: AppColors.successBg,
                            borderColor: const Color(0xFFC6D6BE),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                const Text(
                                  '最近关联 Note',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  detail.recentEntry!.createdAtLabel,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  detail.recentEntry!.noteText,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    height: 1.7,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 14),
                                FarmerButton(
                                  label: '去时间线查看',
                                  tone: FarmerButtonTone.ghost,
                                  small: true,
                                  onPressed: () {
                                    controller.goToTimeline();
                                    Navigator.of(
                                      context,
                                    ).popUntil((route) => route.isFirst);
                                  },
                                ),
                              ],
                            ),
                          ),
                        ScreenSectionCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              const Text(
                                '下一步操作',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                '建议提醒时间：${detail.recommendedReminderDate} ${detail.recommendedReminderTime}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  height: 1.7,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 16),
                              FarmerButton(
                                label:
                                    detail.status ==
                                        CropPlanActionStatus.completed
                                    ? '取消完成'
                                    : '标记完成',
                                tone: FarmerButtonTone.primary,
                                small: true,
                                onPressed: () async {
                                  await controller.toggleCropPlanActionProgress(
                                    planInstanceId: detail.planInstanceId,
                                    actionId: detail.actionId,
                                  );
                                  if (context.mounted) {
                                    showAppSnackBar(context, '状态已更新');
                                  }
                                },
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: <Widget>[
                                  Expanded(
                                    child: FarmerButton(
                                      label: '记一条 Note',
                                      tone: FarmerButtonTone.secondary,
                                      small: true,
                                      onPressed: () {
                                        controller.startRecordDraftFromPlan(
                                          planInstanceId: detail.planInstanceId,
                                          actionId: detail.actionId,
                                          withReminder: false,
                                        );
                                        Navigator.of(
                                          context,
                                        ).popUntil((route) => route.isFirst);
                                      },
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: FarmerButton(
                                      label: '带提醒去记录',
                                      tone: FarmerButtonTone.ghost,
                                      small: true,
                                      onPressed: () {
                                        controller.startRecordDraftFromPlan(
                                          planInstanceId: detail.planInstanceId,
                                          actionId: detail.actionId,
                                          withReminder: true,
                                        );
                                        Navigator.of(
                                          context,
                                        ).popUntil((route) => route.isFirst);
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
        );
      },
    );
  }
}

class _DetailListItem extends StatelessWidget {
  const _DetailListItem({required this.marker, required this.text});

  final String marker;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: const Color(0xFFEAE1CB),
              borderRadius: BorderRadius.circular(999),
            ),
            alignment: Alignment.center,
            child: Text(
              marker,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Color(0xFF554F3D),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 14,
                height: 1.7,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
