import 'package:flutter/material.dart';

import '../../app/farmernote_controller.dart';
import '../../services/crop_plan_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_utils.dart' as farmer_date;
import '../../widgets/farmer_ui.dart';
import 'plan_detail_screen.dart';

class PlanScreen extends StatelessWidget {
  const PlanScreen({required this.controller, super.key});

  final FarmerNoteController controller;

  @override
  Widget build(BuildContext context) {
    final planCards = controller.planHomeCards;
    final isCompact = MediaQuery.sizeOf(context).width < 380;

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: controller.isSignedIn ? controller.syncNow : () async {},
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
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
                    const Text(
                      'PLAN',
                      style: TextStyle(
                        fontSize: 12,
                        letterSpacing: 2,
                        color: Color(0xFF6D674F),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '按作物生命周期，一步一步把农事做稳。',
                      style: TextStyle(
                        fontSize: isCompact ? 24 : 26,
                        height: 1.25,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHero,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'v1 先做河南/黄淮海的小麦、玉米。先设播种日期，再看这一季该做什么。',
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.7,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              ...planCards.map(
                (card) => _PlanCard(
                  card: card,
                  onPickAnchorDate: () => _pickAnchorDate(context, card),
                  onOpenDetail: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => PlanDetailScreen(
                          controller: controller,
                          cropCode: card.cropCode,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickAnchorDate(
    BuildContext context,
    CropPlanHomeCardView card,
  ) async {
    final initialDate = card.hasAnchorDate
        ? _tryParseDate(card.anchorDate) ?? DateTime.now()
        : DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(2024),
      lastDate: DateTime(2035),
      helpText: '设置${card.cropName}播种日期',
    );
    if (picked == null) {
      return;
    }

    await controller.setCropPlanAnchor(
      cropCode: card.cropCode,
      anchorDate: farmer_date.formatDateInput(picked),
    );
    if (context.mounted) {
      showAppSnackBar(context, '播种日期已更新');
    }
  }

  DateTime? _tryParseDate(String value) {
    try {
      return DateTime.parse(value);
    } catch (_) {
      return null;
    }
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({
    required this.card,
    required this.onPickAnchorDate,
    required this.onOpenDetail,
  });

  final CropPlanHomeCardView card;
  final Future<void> Function() onPickAnchorDate;
  final VoidCallback onOpenDetail;

  @override
  Widget build(BuildContext context) {
    final tone = !card.hasAnchorDate
        ? FarmerChipTone.neutral
        : card.completedActionCount == card.totalActionCount
        ? FarmerChipTone.success
        : FarmerChipTone.warning;

    return ScreenSectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      card.cropName,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      card.regionName,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              StatusChip(label: card.stageLabel, tone: tone),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: <Widget>[
              Expanded(
                child: _MetaCell(
                  label: '播种日期',
                  value: card.hasAnchorDate ? card.anchorDate : '尚未设置',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetaCell(label: '当前进度', value: card.progressLabel),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFE7E0CF),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFD4C7A7)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text(
                  '现在最该关注',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF706955),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  card.nextActionLabel,
                  style: const TextStyle(
                    fontSize: 18,
                    height: 1.5,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF3F3A2C),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  card.stageCaption,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.6,
                    color: Color(0xFF6A6451),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: <Widget>[
              Expanded(
                child: FarmerButton(
                  label: card.hasAnchorDate ? '调整播种日期' : '设置播种日期',
                  tone: FarmerButtonTone.ghost,
                  small: true,
                  onPressed: () async {
                    await onPickAnchorDate();
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FarmerButton(
                  label: card.ctaLabel,
                  tone: FarmerButtonTone.secondary,
                  small: true,
                  onPressed: onOpenDetail,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MetaCell extends StatelessWidget {
  const _MetaCell({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F0E4),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE1D7BE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
