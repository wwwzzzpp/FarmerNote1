import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

enum FarmerChipTone { success, warning, danger, neutral }

enum FarmerButtonTone { primary, secondary, ghost, danger }

class ScreenSectionCard extends StatelessWidget {
  const ScreenSectionCard({
    required this.child,
    this.backgroundColor = AppColors.surface,
    this.borderColor = AppColors.border,
    this.margin = const EdgeInsets.only(top: 16),
    this.padding,
    super.key,
  });

  final Widget child;
  final Color backgroundColor;
  final Color borderColor;
  final EdgeInsets margin;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 380;

    return Container(
      width: double.infinity,
      margin: margin,
      padding: padding ?? EdgeInsets.all(isCompact ? 18 : 20),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: borderColor),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color.fromRGBO(96, 82, 58, 0.06),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip({required this.label, required this.tone, super.key});

  final String label;
  final FarmerChipTone tone;

  @override
  Widget build(BuildContext context) {
    final palette = switch (tone) {
      FarmerChipTone.success => (AppColors.successBg, AppColors.success),
      FarmerChipTone.warning => (AppColors.warningBg, AppColors.warning),
      FarmerChipTone.danger => (AppColors.dangerBg, AppColors.danger),
      FarmerChipTone.neutral => (AppColors.neutralBg, AppColors.neutral),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: palette.$1,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: palette.$2,
        ),
      ),
    );
  }
}

class LoadingStateCard extends StatelessWidget {
  const LoadingStateCard({required this.title, required this.body, super.key});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 380;

    return ScreenSectionCard(
      child: Column(
        children: <Widget>[
          SizedBox(
            width: isCompact ? 28 : 32,
            height: isCompact ? 28 : 32,
            child: const CircularProgressIndicator(
              strokeWidth: 2.4,
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF7A805D)),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: isCompact ? 20 : 22,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            body,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 15,
              height: 1.7,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class FarmerButton extends StatelessWidget {
  const FarmerButton({
    required this.label,
    required this.onPressed,
    this.tone = FarmerButtonTone.primary,
    this.small = false,
    this.loading = false,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final FarmerButtonTone tone;
  final bool small;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 380;

    final palette = switch (tone) {
      FarmerButtonTone.primary => (
        AppColors.primary,
        AppColors.primaryDark,
        Colors.white,
      ),
      FarmerButtonTone.secondary => (
        AppColors.secondarySurface,
        AppColors.secondaryBorder,
        const Color(0xFF4F573B),
      ),
      FarmerButtonTone.ghost => (
        AppColors.ghostSurface,
        AppColors.ghostBorder,
        const Color(0xFF6B6656),
      ),
      FarmerButtonTone.danger => (
        AppColors.dangerSurface,
        AppColors.dangerBorder,
        const Color(0xFFC23939),
      ),
    };

    return SizedBox(
      height: small ? (isCompact ? 40 : 44) : (isCompact ? 48 : 52),
      child: TextButton(
        onPressed: loading ? null : onPressed,
        style: TextButton.styleFrom(
          padding: EdgeInsets.symmetric(horizontal: small ? 12 : 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(small ? 15 : 18),
            side: BorderSide(color: palette.$2),
          ),
          backgroundColor: palette.$1,
          foregroundColor: palette.$3,
          textStyle: TextStyle(
            fontSize: small ? (isCompact ? 12 : 13) : (isCompact ? 14 : 15),
            fontWeight: FontWeight.w700,
          ),
        ),
        child: loading
            ? SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(palette.$3),
                ),
              )
            : Text(label, textAlign: TextAlign.center),
      ),
    );
  }
}

class BottomPillNavigation extends StatelessWidget {
  const BottomPillNavigation({
    required this.currentIndex,
    required this.onTap,
    super.key,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 380;

    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: Theme(
          data: Theme.of(context).copyWith(
            navigationBarTheme: NavigationBarThemeData(
              height: isCompact ? 68 : 72,
              backgroundColor: const Color(0xFFD4CCB5),
              indicatorColor: const Color(0xFFFAF6ED),
              labelTextStyle: WidgetStateProperty.resolveWith<TextStyle?>((states) {
                final isSelected = states.contains(WidgetState.selected);
                return TextStyle(
                  fontSize: isCompact ? 11 : 12,
                  fontWeight: FontWeight.w700,
                  color: isSelected
                      ? const Color(0xFF383425)
                      : const Color(0xFF625D4B),
                );
              }),
              iconTheme: WidgetStateProperty.resolveWith<IconThemeData?>((states) {
                final isSelected = states.contains(WidgetState.selected);
                return IconThemeData(
                  size: isCompact ? 20 : 22,
                  color: isSelected
                      ? const Color(0xFF383425)
                      : const Color(0xFF625D4B),
                );
              }),
            ),
          ),
          child: NavigationBar(
            selectedIndex: currentIndex,
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            onDestinationSelected: (index) {
              FocusManager.instance.primaryFocus?.unfocus();
              onTap(index);
            },
            destinations: const <NavigationDestination>[
              NavigationDestination(
                icon: Icon(Icons.edit_note_outlined),
                selectedIcon: Icon(Icons.edit_note_rounded),
                label: '记录',
              ),
              NavigationDestination(
                icon: Icon(Icons.timeline_outlined),
                selectedIcon: Icon(Icons.timeline_rounded),
                label: '时间线',
              ),
              NavigationDestination(
                icon: Icon(Icons.checklist_rtl_outlined),
                selectedIcon: Icon(Icons.checklist_rtl_rounded),
                label: '待办',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline_rounded),
                selectedIcon: Icon(Icons.person_rounded),
                label: '我',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

void showAppSnackBar(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}
