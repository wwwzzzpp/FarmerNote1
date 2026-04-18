import 'package:flutter/material.dart';

import '../../app/farmernote_controller.dart';
import '../../models/task_record.dart';
import '../../models/timeline_entry_record.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_utils.dart' as farmer_date;
import '../../widgets/farmer_ui.dart';
import '../../widgets/stored_photo.dart';

class TimelineScreen extends StatelessWidget {
  const TimelineScreen({required this.controller, super.key});

  final FarmerNoteController controller;

  @override
  Widget build(BuildContext context) {
    final entries = controller.timelineEntries;
    final groups = _groupEntriesByDay(entries, DateTime.now());
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
                      'TIMELINE',
                      style: TextStyle(
                        fontSize: 12,
                        letterSpacing: 2,
                        color: Color(0xFF6D674F),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '巡田时间线',
                      style: TextStyle(
                        fontSize: isCompact ? 24 : 26,
                        height: 1.25,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHero,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFE8D8),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '共 ${entries.length} 条',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF5F5843),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (controller.isTimelineInitialLoading)
                const LoadingStateCard(
                  title: '正在加载时间线…',
                  body: '先把本机和云端记录对齐，请稍等。',
                )
              else if (entries.isEmpty)
                const ScreenSectionCard(
                  child: Column(
                    children: <Widget>[
                      Text(
                        '时间线还是空的',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(height: 12),
                      Text(
                        '先去“记录”页写下第一条巡田观察，这里就会自动出现。',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15,
                          height: 1.7,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ...groups.map(
                (group) => Container(
                  margin: const EdgeInsets.only(top: 20),
                  padding: const EdgeInsets.fromLTRB(18, 18, 18, 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE7E0CF),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: const Color(0xFFD0C5AB)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(left: 10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    group.dayLabel,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF4D4938),
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    group.dayCaption,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: Color(0xFF756F5D),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF4F0E6),
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(
                                color: const Color(0xFFD9CFB8),
                              ),
                            ),
                            child: Text(
                              group.countLabel,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF635D49),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      ...group.entries.map(
                        (entry) => _TimelineCard(
                          entry: entry,
                          onOpenTask: entry.task == null
                              ? null
                              : () => controller.goToTasks(
                                  focusTaskId: entry.task!.id,
                                ),
                          onDelete: () => _confirmDelete(context, entry),
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
  }

  Future<void> _confirmDelete(
    BuildContext context,
    TimelineEntryRecord entry,
  ) async {
    final hasTask = entry.task != null;
    final confirmed =
        await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('删除记录'),
            content: Text(hasTask ? '删除后，这条记录和它关联的待办都会一起移除。' : '确定删除这条记录吗？'),
            actions: <Widget>[
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('取消'),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('删除'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed) {
      return;
    }

    await controller.deleteEntry(entry.entry.id);
    if (context.mounted) {
      showAppSnackBar(context, '已删除');
    }
  }
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({
    required this.entry,
    required this.onDelete,
    this.onOpenTask,
  });

  final TimelineEntryRecord entry;
  final VoidCallback? onOpenTask;
  final Future<void> Function() onDelete;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 380;

    final (statusLabel, tone, dotColor) = switch (entry.task?.status) {
      TaskStatus.pending => (
        '待办',
        FarmerChipTone.warning,
        const Color(0xFFEFC767),
      ),
      TaskStatus.overdue => (
        '已逾期',
        FarmerChipTone.danger,
        const Color(0xFFE59898),
      ),
      TaskStatus.completed => (
        '已完成',
        FarmerChipTone.success,
        const Color(0xFF96A076),
      ),
      null => ('纯记录', FarmerChipTone.neutral, const Color(0xFFBFB8A5)),
    };

    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.only(top: 24, right: 14),
            child: Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 3),
              ),
            ),
          ),
          Expanded(
            child: ScreenSectionCard(
              margin: EdgeInsets.zero,
              borderColor: Colors.transparent,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          _formatTimelineClock(entry.entry.createdAt),
                          style: TextStyle(
                            fontSize: isCompact ? 16 : 17,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      StatusChip(label: statusLabel, tone: tone),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    entry.entry.noteText,
                    style: TextStyle(
                      fontSize: isCompact ? 18 : 19,
                      height: 1.7,
                    ),
                  ),
                  if (entry.entry.localPhotoPath.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 16),
                    GestureDetector(
                      onTap: () => _showPhotoPreview(
                        context,
                        entry.entry.localPhotoPath,
                      ),
                      child: StoredPhoto(
                        source: entry.entry.localPhotoPath,
                        width: 220,
                        height: 164,
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: <Widget>[
                      if (onOpenTask != null)
                        SizedBox(
                          width: isCompact ? 124 : 132,
                          child: FarmerButton(
                            label: '打开待办',
                            tone: FarmerButtonTone.secondary,
                            small: true,
                            onPressed: onOpenTask,
                          ),
                        ),
                      SizedBox(
                        width: isCompact ? 124 : 132,
                        child: FarmerButton(
                          label: '删除记录',
                          tone: FarmerButtonTone.danger,
                          small: true,
                          onPressed: () => onDelete(),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTimelineClock(String value) {
    final date = farmer_date.toDate(value).toLocal();
    return '${farmer_date.pad(date.hour)}:${farmer_date.pad(date.minute)}';
  }

  void _showPhotoPreview(BuildContext context, String source) {
    showDialog<void>(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: InteractiveViewer(
          child: StoredPhoto(
            source: source,
            fit: BoxFit.contain,
            borderRadius: BorderRadius.circular(24),
          ),
        ),
      ),
    );
  }
}

class _TimelineDayGroup {
  const _TimelineDayGroup({
    required this.dayLabel,
    required this.dayCaption,
    required this.countLabel,
    required this.entries,
  });

  final String dayLabel;
  final String dayCaption;
  final String countLabel;
  final List<TimelineEntryRecord> entries;
}

List<_TimelineDayGroup> _groupEntriesByDay(
  List<TimelineEntryRecord> entries,
  DateTime reference,
) {
  final orderedKeys = <String>[];
  final groupedEntries = <String, List<TimelineEntryRecord>>{};
  final groupedMeta = <String, ({String dayLabel, String dayCaption})>{};

  for (final entry in entries) {
    final date = farmer_date.toDate(entry.entry.createdAt).toLocal();
    final key =
        '${date.year}-${farmer_date.pad(date.month)}-${farmer_date.pad(date.day)}';
    if (!groupedEntries.containsKey(key)) {
      orderedKeys.add(key);
      groupedEntries[key] = <TimelineEntryRecord>[];
      groupedMeta[key] = _formatDayGroupMeta(date, reference);
    }
    groupedEntries[key]!.add(entry);
  }

  return orderedKeys
      .map(
        (key) => _TimelineDayGroup(
          dayLabel: groupedMeta[key]!.dayLabel,
          dayCaption: groupedMeta[key]!.dayCaption,
          countLabel: '${groupedEntries[key]!.length} 条',
          entries: groupedEntries[key]!,
        ),
      )
      .toList();
}

({String dayLabel, String dayCaption}) _formatDayGroupMeta(
  DateTime value,
  DateTime reference,
) {
  final baseDay = DateTime(reference.year, reference.month, reference.day);
  final targetDay = DateTime(value.year, value.month, value.day);
  final diffDays = targetDay.difference(baseDay).inDays;

  String relativeLabel = '';
  if (diffDays == 0) {
    relativeLabel = '今天';
  } else if (diffDays == -1) {
    relativeLabel = '昨天';
  } else if (diffDays == 1) {
    relativeLabel = '明天';
  }

  const weekdays = <String>['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  return (
    dayLabel: relativeLabel.isNotEmpty
        ? relativeLabel
        : '${value.month}月${value.day}日',
    dayCaption:
        '${value.year}年${value.month}月${value.day}日 · ${weekdays[value.weekday - 1]}',
  );
}
