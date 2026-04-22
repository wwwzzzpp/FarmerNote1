import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../app/farmernote_controller.dart';
import '../../config/legal_config.dart';
import '../../theme/app_theme.dart';
import '../../widgets/farmer_ui.dart';
import '../legal/legal_document_screen.dart';
import '../legal/legal_documents.dart';
import 'account_deletion_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({required this.controller, super.key});

  final FarmerNoteController controller;

  String _accountTitle() {
    final profile = controller.authSession?.userProfile;
    if (profile == null) {
      return '当前未登录云端';
    }
    final displayName = profile.displayName.trim();
    if (displayName.isNotEmpty) {
      return displayName;
    }
    if (profile.maskedPhone.trim().isNotEmpty) {
      return profile.maskedPhone;
    }
    return '云端账号';
  }

  String _accountDetail() {
    if (!controller.isSignedIn) {
      return '未登录时，设置页仍可查看协议与官网地址。';
    }
    if (controller.hasLinkedPhone && controller.hasLinkedWeChat) {
      return '当前账号已绑定手机号和微信。';
    }
    if (controller.hasLinkedPhone) {
      return '当前账号已绑定手机号，后续还可补绑微信。';
    }
    if (controller.hasLinkedWeChat) {
      return '当前账号已绑定微信，后续还可补绑手机号。';
    }
    return '当前账号还没有完成登录方式绑定。';
  }

  Future<void> _confirmSignOut(BuildContext context) async {
    final confirmed =
        await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('退出登录'),
            content: const Text('退出后会清掉当前登录态与待同步队列，现有记录仍保留在本机，继续以本地模式使用。'),
            actions: <Widget>[
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('取消'),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('退出登录'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed || !context.mounted) {
      return;
    }

    try {
      await controller.signOut();
      if (context.mounted) {
        showAppSnackBar(context, '已退出登录');
      }
    } catch (error) {
      if (context.mounted) {
        showAppSnackBar(
          context,
          error.toString().replaceFirst('Exception: ', ''),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Text(
              '我',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textSecondary,
              ),
            ),
            ScreenSectionCard(
              margin: const EdgeInsets.only(top: 12),
              backgroundColor: AppColors.hero,
              borderColor: AppColors.borderDark,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Text(
                    '账号与合规',
                    style: TextStyle(
                      fontSize: 12,
                      letterSpacing: 1.4,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _accountTitle(),
                    style: const TextStyle(
                      fontSize: 26,
                      height: 1.15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHero,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _accountDetail(),
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
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  _SettingsTile(
                    title: '隐私政策',
                    subtitle: '查看 App、小程序和云同步服务统一隐私说明',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const LegalDocumentScreen(
                            type: LegalDocumentType.privacy,
                          ),
                        ),
                      );
                    },
                  ),
                  _SettingsTile(
                    title: '用户协议',
                    subtitle: '查看服务范围、账号规则与注销机制',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const LegalDocumentScreen(
                            type: LegalDocumentType.terms,
                          ),
                        ),
                      );
                    },
                  ),
                  _SettingsTile(
                    title: '账号注销',
                    subtitle: '登录后可直接发起注销申请，并查看 15 天删除窗口说明',
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) =>
                              AccountDeletionScreen(controller: controller),
                        ),
                      );
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
                    '官网与公开链接',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    LegalConfig.websiteBaseUrl,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.7,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  FarmerButton(
                    label: '复制官网地址',
                    tone: FarmerButtonTone.secondary,
                    small: true,
                    onPressed: () async {
                      await Clipboard.setData(
                        const ClipboardData(text: LegalConfig.websiteBaseUrl),
                      );
                      if (context.mounted) {
                        showAppSnackBar(context, '官网地址已复制');
                      }
                    },
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    '公开支持方式',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    LegalConfig.supportContact,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.7,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    LegalConfig.supportHint,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.7,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            ScreenSectionCard(
              child: Row(
                children: const <Widget>[
                  Expanded(
                    child: Text(
                      '当前版本',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Text(
                    'v${LegalConfig.appVersion}',
                    style: TextStyle(
                      fontSize: 15,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            if (controller.isSignedIn)
              ScreenSectionCard(
                child: SizedBox(
                  width: double.infinity,
                  child: FarmerButton(
                    label: '退出登录',
                    tone: FarmerButtonTone.danger,
                    small: true,
                    onPressed: () => _confirmSignOut(context),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        height: 1.6,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
