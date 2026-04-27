import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../widgets/farmer_ui.dart';
import 'legal_document_screen.dart';
import 'legal_documents.dart';

class ConsentGateScreen extends StatelessWidget {
  final bool isSubmitting;

  final Future<void> Function() onAccept;
  final VoidCallback onDecline;
  const ConsentGateScreen({
    required this.isSubmitting,
    required this.onAccept,
    required this.onDecline,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 620),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  ScreenSectionCard(
                    margin: EdgeInsets.zero,
                    backgroundColor: AppColors.hero,
                    borderColor: AppColors.borderDark,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const <Widget>[
                        Text(
                          '首次启动需先完成协议确认',
                          style: TextStyle(
                            fontSize: 12,
                            letterSpacing: 1.4,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        SizedBox(height: 12),
                        Text(
                          '继续使用前，请先阅读《隐私政策》和《用户协议》。',
                          style: TextStyle(
                            fontSize: 28,
                            height: 1.18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textHero,
                          ),
                        ),
                        SizedBox(height: 12),
                        Text(
                          '在你明确同意前，App 不会初始化第三方插件，不会恢复本地业务状态，也不会请求摄像头、日历等权限。',
                          style: TextStyle(
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
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        const Text(
                          '你可以先查看完整说明：',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Wrap(
                          spacing: 12,
                          runSpacing: 12,
                          children: <Widget>[
                            FarmerButton(
                              label: '查看隐私政策',
                              tone: FarmerButtonTone.secondary,
                              small: true,
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) => const LegalDocumentScreen(
                                      type: LegalDocumentType.privacy,
                                    ),
                                  ),
                                );
                              },
                            ),
                            FarmerButton(
                              label: '查看用户协议',
                              tone: FarmerButtonTone.ghost,
                              small: true,
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) => const LegalDocumentScreen(
                                      type: LegalDocumentType.terms,
                                    ),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                  ScreenSectionCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        SizedBox(
                          width: double.infinity,
                          child: FarmerButton(
                            label: '同意并继续',
                            loading: isSubmitting,
                            onPressed: isSubmitting ? null : onAccept,
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: FarmerButton(
                            label: '不同意并退出',
                            tone: FarmerButtonTone.ghost,
                            onPressed: isSubmitting ? null : onDecline,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
