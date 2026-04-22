import 'package:flutter/material.dart';

import '../../app/farmernote_controller.dart';
import '../../models/crop_plan_action_progress.dart';
import '../../services/crop_plan_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/farmer_ui.dart';
import 'plan_action_detail_screen.dart';

class PlanDetailScreen extends StatelessWidget {
  const PlanDetailScreen({
    required this.controller,
    required this.cropCode,
    super.key,
  });

  final FarmerNoteController controller;
  final String cropCode;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final detail = controller.buildCropPlanDetail(cropCode);
        return Scaffold(
          appBar: AppBar(title: const Text('计划详情')),
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
                            '还没有生成这个作物计划',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          SizedBox(height: 12),
                          Text(
                            '先回到计划首页设置播种日期，这里才会按阶段展开个人化时间轴。',
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
                                detail.regionName,
                                style: const TextStyle(
                                  fontSize: 12,
                                  letterSpacing: 1.6,
                                  color: Color(0xFF6D674F),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                '${detail.cropName}计划',
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textHero,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                '播种日期 ${detail.anchorDate} · ${detail.progressLabel}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        ...detail.stages.map(
                          (stage) => ScreenSectionCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: <Widget>[
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: <Widget>[
                                          Text(
                                            stage.name,
                                            style: const TextStyle(
                                              fontSize: 20,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.textPrimary,
                                            ),
                                          ),
                                          const SizedBox(height: 8),
                                          Text(
                                            stage.windowLabel,
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    StatusChip(
                                      label: stage.statusLabel,
                                      tone: switch (stage.status) {
                                        CropPlanStageStatus.current =>
                                          FarmerChipTone.warning,
                                        CropPlanStageStatus.passed =>
                                          FarmerChipTone.success,
                                        CropPlanStageStatus.upcoming ||
                                        CropPlanStageStatus.setup =>
                                          FarmerChipTone.neutral,
                                      },
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                ...stage.milestones.map(
                                  (milestone) => Container(
                                    width: double.infinity,
                                    margin: const EdgeInsets.only(bottom: 16),
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF6F1E6),
                                      borderRadius: BorderRadius.circular(18),
                                      border: Border.all(
                                        color: const Color(0xFFE1D7BF),
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: <Widget>[
                                        Row(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: <Widget>[
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: <Widget>[
                                                  Text(
                                                    milestone.name,
                                                    style: const TextStyle(
                                                      fontSize: 18,
                                                      fontWeight:
                                                          FontWeight.w700,
                                                      color:
                                                          AppColors.textPrimary,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 8),
                                                  Text(
                                                    milestone.goal,
                                                    style: const TextStyle(
                                                      fontSize: 13,
                                                      height: 1.6,
                                                      color: AppColors
                                                          .textSecondary,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            Text(
                                              milestone.progressLabel,
                                              style: const TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w700,
                                                color: Color(0xFF6F6854),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 16),
                                        ...milestone.actions.map(
                                          (action) => Container(
                                            margin: const EdgeInsets.only(
                                              bottom: 12,
                                            ),
                                            padding: const EdgeInsets.only(
                                              top: 12,
                                            ),
                                            decoration: const BoxDecoration(
                                              border: Border(
                                                top: BorderSide(
                                                  color: Color(0xFFE8DFCA),
                                                ),
                                              ),
                                            ),
                                            child: Row(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: <Widget>[
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment:
                                                        CrossAxisAlignment
                                                            .start,
                                                    children: <Widget>[
                                                      Text(
                                                        action.name,
                                                        style: const TextStyle(
                                                          fontSize: 16,
                                                          fontWeight:
                                                              FontWeight.w700,
                                                          color: AppColors
                                                              .textPrimary,
                                                        ),
                                                      ),
                                                      const SizedBox(height: 6),
                                                      Text(
                                                        action
                                                            .executionStandard,
                                                        style: const TextStyle(
                                                          fontSize: 13,
                                                          height: 1.6,
                                                          color: AppColors
                                                              .textSecondary,
                                                        ),
                                                      ),
                                                      if (action
                                                              .hasRecentEntry &&
                                                          action.recentEntry !=
                                                              null) ...<Widget>[
                                                        const SizedBox(
                                                          height: 10,
                                                        ),
                                                        Container(
                                                          padding:
                                                              const EdgeInsets.all(
                                                                12,
                                                              ),
                                                          decoration: BoxDecoration(
                                                            color: const Color(
                                                              0xFFEBE4D2,
                                                            ),
                                                            borderRadius:
                                                                BorderRadius.circular(
                                                                  14,
                                                                ),
                                                          ),
                                                          child: Column(
                                                            crossAxisAlignment:
                                                                CrossAxisAlignment
                                                                    .start,
                                                            children: <Widget>[
                                                              const Text(
                                                                '最近关联 Note',
                                                                style: TextStyle(
                                                                  fontSize: 12,
                                                                  color: Color(
                                                                    0xFF736C58,
                                                                  ),
                                                                ),
                                                              ),
                                                              const SizedBox(
                                                                height: 6,
                                                              ),
                                                              Text(
                                                                action
                                                                    .recentEntry!
                                                                    .noteText,
                                                                style: const TextStyle(
                                                                  fontSize: 13,
                                                                  height: 1.6,
                                                                  color: Color(
                                                                    0xFF504A3A,
                                                                  ),
                                                                ),
                                                              ),
                                                            ],
                                                          ),
                                                        ),
                                                      ],
                                                    ],
                                                  ),
                                                ),
                                                const SizedBox(width: 12),
                                                Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.end,
                                                  children: <Widget>[
                                                    StatusChip(
                                                      label:
                                                          action.status ==
                                                              CropPlanActionStatus
                                                                  .completed
                                                          ? '已完成'
                                                          : '待处理',
                                                      tone:
                                                          action.status ==
                                                              CropPlanActionStatus
                                                                  .completed
                                                          ? FarmerChipTone
                                                                .success
                                                          : FarmerChipTone
                                                                .warning,
                                                    ),
                                                    const SizedBox(height: 10),
                                                    FarmerButton(
                                                      label: '查看动作',
                                                      tone: FarmerButtonTone
                                                          .secondary,
                                                      small: true,
                                                      onPressed: () {
                                                        Navigator.of(
                                                          context,
                                                        ).push(
                                                          MaterialPageRoute<
                                                            void
                                                          >(
                                                            builder: (_) =>
                                                                PlanActionDetailScreen(
                                                                  controller:
                                                                      controller,
                                                                  planInstanceId:
                                                                      detail
                                                                          .planInstanceId,
                                                                  actionId:
                                                                      action.id,
                                                                ),
                                                          ),
                                                        );
                                                      },
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
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
