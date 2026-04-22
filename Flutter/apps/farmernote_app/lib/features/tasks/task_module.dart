import 'package:flutter/material.dart';

import '../../models/task_record.dart';
import '../../models/task_view_record.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_utils.dart' as farmer_date;
import '../../widgets/farmer_ui.dart';
import '../../widgets/stored_photo.dart';

class TaskModule extends StatelessWidget {
  const TaskModule({
    required this.upcomingTasks,
    required this.overdueTasks,
    required this.completedTasks,
    required this.isInitialLoading,
    required this.onCompleteTask,
    required this.onDeleteTask,
    this.hasMore = false,
    this.visibleCount = 0,
    this.totalCount = 0,
    this.onLoadMore,
    this.focusTaskId = '',
    this.title = '待办模块',
    this.caption = '你设置过时间的记录，会汇总到这里，方便直接继续处理。',
    this.headerActionLabel,
    this.onHeaderAction,
    super.key,
  });

  final List<TaskViewRecord> upcomingTasks;
  final List<TaskViewRecord> overdueTasks;
  final List<TaskViewRecord> completedTasks;
  final bool isInitialLoading;
  final bool hasMore;
  final int visibleCount;
  final int totalCount;
  final VoidCallback? onLoadMore;
  final String focusTaskId;
  final String title;
  final String caption;
  final String? headerActionLabel;
  final VoidCallback? onHeaderAction;
  final Future<void> Function(TaskViewRecord task) onCompleteTask;
  final Future<void> Function(TaskViewRecord task) onDeleteTask;

  @override
  Widget build(BuildContext context) {
    final hasTasks =
        upcomingTasks.isNotEmpty ||
        overdueTasks.isNotEmpty ||
        completedTasks.isNotEmpty;
    final isCompact = MediaQuery.sizeOf(context).width < 380;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        ScreenSectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                title,
                style: TextStyle(
                  fontSize: isCompact ? 19 : 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                caption,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.7,
                  color: AppColors.textSecondary,
                ),
              ),
              if (hasTasks) ...<Widget>[
                const SizedBox(height: 10),
                Text(
                  '已显示 $visibleCount / $totalCount 条',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
              if (headerActionLabel != null &&
                  onHeaderAction != null) ...<Widget>[
                const SizedBox(height: 14),
                SizedBox(
                  width: isCompact ? 132 : 144,
                  child: FarmerButton(
                    label: headerActionLabel!,
                    tone: FarmerButtonTone.ghost,
                    small: true,
                    onPressed: onHeaderAction,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (isInitialLoading)
          const LoadingStateCard(title: '正在加载待办…', body: '先把本机和云端提醒对齐，请稍等。')
        else if (!hasTasks)
          const ScreenSectionCard(
            child: Column(
              children: <Widget>[
                Text(
                  '还没有定时任务',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(height: 12),
                Text(
                  '在“记录”页打开提醒时间，这里就会自动接住。',
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
        if (upcomingTasks.isNotEmpty) ...<Widget>[
          const SizedBox(height: 24),
          const Text(
            '即将到来',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: Color(0xFF59533F),
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            '未来的巡田动作',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          ...upcomingTasks.map(
            (task) => _TaskCard(
              task: task,
              isFocused: task.id == focusTaskId,
              onComplete: () => onCompleteTask(task),
              onDelete: () => onDeleteTask(task),
            ),
          ),
        ],
        if (overdueTasks.isNotEmpty) ...<Widget>[
          const SizedBox(height: 24),
          const Text(
            '已逾期',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: Color(0xFF59533F),
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            '时间到了但还没处理',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          ...overdueTasks.map(
            (task) => _TaskCard(
              task: task,
              isFocused: task.id == focusTaskId,
              onComplete: () => onCompleteTask(task),
              onDelete: () => onDeleteTask(task),
            ),
          ),
        ],
        if (completedTasks.isNotEmpty) ...<Widget>[
          const SizedBox(height: 24),
          const Text(
            '已完成',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: Color(0xFF59533F),
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            '已经处理完的提醒',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          ...completedTasks.map(
            (task) => _TaskCard(
              task: task,
              isFocused: task.id == focusTaskId,
              onDelete: () => onDeleteTask(task),
            ),
          ),
        ],
        if (hasMore && onLoadMore != null) ...<Widget>[
          const SizedBox(height: 20),
          ScreenSectionCard(
            backgroundColor: AppColors.surfaceMuted,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text(
                  '待办还没看完',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  '继续下滑会自动加载更多，你也可以点下面按钮继续展开。',
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.7,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: 144,
                  child: FarmerButton(
                    label:
                        '再加载 ${totalCount - visibleCount > 10 ? 10 : totalCount - visibleCount} 条',
                    tone: FarmerButtonTone.ghost,
                    small: true,
                    onPressed: onLoadMore,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({
    required this.task,
    required this.isFocused,
    required this.onDelete,
    this.onComplete,
  });

  final TaskViewRecord task;
  final bool isFocused;
  final Future<void> Function() onDelete;
  final Future<void> Function()? onComplete;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 380;

    final (statusLabel, tone) = switch (task.status) {
      TaskStatus.pending => ('待处理', FarmerChipTone.warning),
      TaskStatus.overdue => ('已逾期', FarmerChipTone.danger),
      TaskStatus.completed => ('已完成', FarmerChipTone.success),
    };

    return ScreenSectionCard(
      backgroundColor: AppColors.surface,
      borderColor: isFocused ? const Color(0xFFB7AD8C) : Colors.transparent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: Text(
                  farmer_date.formatRelativeReminder(task.dueAt),
                  style: TextStyle(
                    fontSize: isCompact ? 17 : 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              StatusChip(label: statusLabel, tone: tone),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            task.noteText,
            style: TextStyle(
              fontSize: isCompact ? 18 : 19,
              height: 1.7,
              color: AppColors.textPrimary,
            ),
          ),
          if (task.hasPhoto) ...<Widget>[
            const SizedBox(height: 14),
            GestureDetector(
              onTap: () => _showPhotoPreview(context, task.photoSource),
              child: StoredPhoto(
                source: task.photoSource,
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
              if (onComplete != null)
                SizedBox(
                  width: isCompact ? 124 : 132,
                  child: FarmerButton(
                    label: '完成',
                    tone: FarmerButtonTone.primary,
                    small: true,
                    onPressed: () => onComplete!.call(),
                  ),
                ),
              SizedBox(
                width: isCompact ? 124 : 132,
                child: FarmerButton(
                  label: '删除任务',
                  tone: FarmerButtonTone.danger,
                  small: true,
                  onPressed: () => onDelete(),
                ),
              ),
            ],
          ),
        ],
      ),
    );
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
