import 'package:flutter/material.dart';

import '../features/record/record_screen.dart';
import '../features/tasks/tasks_screen.dart';
import '../features/timeline/timeline_screen.dart';
import '../theme/app_theme.dart';
import '../widgets/farmer_ui.dart';
import 'farmernote_controller.dart';

class FarmerNoteShell extends StatelessWidget {
  const FarmerNoteShell({required this.child, super.key});

  static const double _appTextScale = 0.94;

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: '初芽巡田',
      theme: buildAppTheme(),
      builder: (context, child) {
        if (child == null) {
          return const SizedBox.shrink();
        }

        return MediaQuery.withClampedTextScaling(
          minScaleFactor: _appTextScale,
          maxScaleFactor: _appTextScale,
          child: child,
        );
      },
      home: child,
    );
  }
}

class FarmerNoteApp extends StatelessWidget {
  const FarmerNoteApp({required this.controller, super.key});

  final FarmerNoteController controller;

  @override
  Widget build(BuildContext context) {
    return FarmerNoteShell(
      child: AnimatedBuilder(
        animation: controller,
        builder: (context, _) {
          if (!controller.isReady) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }

          return FarmerNoteScaffold(controller: controller);
        },
      ),
    );
  }
}

class FarmerNoteScaffold extends StatelessWidget {
  const FarmerNoteScaffold({required this.controller, super.key});

  final FarmerNoteController controller;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: controller.selectedTabIndex,
        children: <Widget>[
          RecordScreen(controller: controller),
          TimelineScreen(controller: controller),
          TasksScreen(controller: controller),
        ],
      ),
      bottomNavigationBar: BottomPillNavigation(
        currentIndex: controller.selectedTabIndex,
        onTap: (index) {
          switch (index) {
            case 0:
              controller.goToRecord();
              break;
            case 1:
              controller.goToTimeline();
              break;
            case 2:
              controller.goToTasks();
              break;
          }
        },
      ),
    );
  }
}
