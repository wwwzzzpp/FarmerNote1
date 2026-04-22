import 'package:flutter/material.dart';

import '../../app/farmernote_controller.dart';
import '../../models/task_view_record.dart';
import '../../widgets/farmer_ui.dart';
import 'task_module.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({required this.controller, super.key});

  final FarmerNoteController controller;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: controller.isSignedIn ? controller.syncNow : () async {},
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              TaskModule(
                title: '待办提醒',
                caption: '在这里处理所有挂了时间的巡田动作。',
                upcomingTasks: controller.upcomingTasks,
                overdueTasks: controller.overdueTasks,
                completedTasks: controller.completedTasks,
                isInitialLoading: controller.isTasksInitialLoading,
                focusTaskId: controller.focusTaskId,
                onCompleteTask: (task) async {
                  await controller.completeTask(task.id);
                  if (context.mounted) {
                    showAppSnackBar(context, '已完成');
                  }
                },
                onDeleteTask: (task) => _confirmDelete(context, task),
              ),
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
