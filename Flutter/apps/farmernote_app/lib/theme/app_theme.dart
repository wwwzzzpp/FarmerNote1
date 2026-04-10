import 'package:flutter/material.dart';

class AppColors {
  static const Color pageBackground = Color(0xFFEFE9DD);
  static const Color surface = Color(0xFFF8F4EA);
  static const Color surfaceMuted = Color(0xFFF2EDE1);
  static const Color surfaceSuccess = Color(0xFFECE6D6);
  static const Color hero = Color(0xFFD9D1B8);
  static const Color heroStat = Color(0xFFE7E0CA);
  static const Color border = Color(0xFFD8CFBA);
  static const Color borderDark = Color(0xFFC7BEA4);
  static const Color primary = Color(0xFF6F7751);
  static const Color primaryDark = Color(0xFF636A48);
  static const Color secondarySurface = Color(0xFFE5DFCD);
  static const Color secondaryBorder = Color(0xFFCFC5AA);
  static const Color ghostSurface = Color(0xFFF1ECE1);
  static const Color ghostBorder = Color(0xFFDDD4C2);
  static const Color dangerSurface = Color(0xFFF8EBEB);
  static const Color dangerBorder = Color(0xFFEBD2D2);
  static const Color textPrimary = Color(0xFF111827);
  static const Color textSecondary = Color(0xFF736D5E);
  static const Color textHero = Color(0xFF3D3A2F);
  static const Color success = Color(0xFF5A6440);
  static const Color successBg = Color(0xFFE2E5D3);
  static const Color warning = Color(0xFF8A6513);
  static const Color warningBg = Color(0xFFF3E3B3);
  static const Color danger = Color(0xFFB42318);
  static const Color dangerBg = Color(0xFFFFE8E8);
  static const Color neutral = Color(0xFF6A6554);
  static const Color neutralBg = Color(0xFFEBE7DA);
}

ThemeData buildAppTheme() {
  final base = ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: AppColors.pageBackground,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
      primary: AppColors.primary,
      surface: AppColors.surface,
    ),
  );

  return base.copyWith(
    scaffoldBackgroundColor: AppColors.pageBackground,
    textTheme: base.textTheme.apply(
      bodyColor: AppColors.textPrimary,
      displayColor: AppColors.textPrimary,
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
