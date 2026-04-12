import 'package:flutter/material.dart';

import '../../app/farmernote_controller.dart';
import '../../models/task_record.dart';
import '../../models/task_view_record.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_utils.dart' as farmer_date;
import '../../widgets/farmer_ui.dart';
import '../../widgets/stored_photo.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({required this.controller, super.key});

  final FarmerNoteController controller;

  @override
  Widget build(BuildContext context) {
    final upcomingTasks = controller.upcomingTasks;
    final overdueTasks = controller.overdueTasks;
    final completedTasks = controller.completedTasks;
    final isCompact = MediaQuery.sizeOf(context).width < 380;
    final hasTasks =
        upcomingTasks.isNotEmpty ||
        overdueTasks.isNotEmpty ||
        completedTasks.isNotEmpty;

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
                      'TASKS',
                      style: TextStyle(
                        fontSize: 12,
                        letterSpacing: 2,
                        color: Color(0xFF6D674F),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '待办提醒',
                      style: TextStyle(
                        fontSize: isCompact ? 24 : 26,
                        height: 1.25,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHero,
                      ),
                    ),
                  ],
                ),
              ),
              if (!hasTasks)
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
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
                ...upcomingTasks.map(
                  (task) => _TaskCard(
                    task: task,
                    isFocused: task.id == controller.focusTaskId,
                    onComplete: () async {
                      await controller.completeTask(task.id);
                      if (context.mounted) {
                        showAppSnackBar(context, '已完成');
                      }
                    },
                    onDelete: () => _confirmDelete(context, task),
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
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
                ...overdueTasks.map(
                  (task) => _TaskCard(
                    task: task,
                    isFocused: task.id == controller.focusTaskId,
                    onComplete: () async {
                      await controller.completeTask(task.id);
                      if (context.mounted) {
                        showAppSnackBar(context, '已完成');
                      }
                    },
                    onDelete: () => _confirmDelete(context, task),
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
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
                ...completedTasks.map(
                  (task) => _TaskCard(
                    task: task,
                    isFocused: task.id == controller.focusTaskId,
                    onDelete: () => _confirmDelete(context, task),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, TaskViewRecord task) async {
    final confirmed =
        await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('删除待办'),
            content: const Text('删除后，这条任务会被移除，但原记录仍会保留在时间线里。'),
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

    await controller.deleteTask(task.id);
    if (context.mounted) {
      showAppSnackBar(context, '已删除');
    }
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
