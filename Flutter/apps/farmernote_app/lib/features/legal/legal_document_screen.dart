import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../config/legal_config.dart';
import '../../theme/app_theme.dart';
import '../../widgets/farmer_ui.dart';
import 'legal_documents.dart';

class LegalDocumentScreen extends StatelessWidget {
  final LegalDocumentType type;

  const LegalDocumentScreen({required this.type, super.key});

  @override
  Widget build(BuildContext context) {
    final document = legalDocumentFor(type);

    return Scaffold(
      appBar: AppBar(
        title: Text(document.title),
        backgroundColor: AppColors.surface,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
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
                    const SizedBox(height: 12),
                    Text(
                      document.title,
                      style: const TextStyle(
                        fontSize: 28,
                        height: 1.15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHero,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      document.summary,
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const Text(
                      '公开网页地址',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      document.publicUrl,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.6,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    FarmerButton(
                      label: '复制网页地址',
                      tone: FarmerButtonTone.secondary,
                      small: true,
                      onPressed: () async {
                        await Clipboard.setData(
                          ClipboardData(text: document.publicUrl),
                        );
                        if (context.mounted) {
                          showAppSnackBar(context, '链接已复制');
                        }
                      },
                    ),
                  ],
                ),
              ),
              for (final section in document.sections)
                ScreenSectionCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        section.title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      for (final paragraph in section.paragraphs) ...<Widget>[
                        const SizedBox(height: 10),
                        Text(
                          paragraph,
                          style: const TextStyle(
                            fontSize: 14,
                            height: 1.7,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                      if (section.bullets.isNotEmpty) ...<Widget>[
                        const SizedBox(height: 10),
                        for (final bullet in section.bullets) ...<Widget>[
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              '• $bullet',
                              style: const TextStyle(
                                fontSize: 14,
                                height: 1.7,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                        ],
                      ],
                      if (section.note.trim().isNotEmpty) ...<Widget>[
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1ECE1),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: const Color(0xFFD8CFBA)),
                          ),
                          child: Text(
                            section.note,
                            style: const TextStyle(
                              fontSize: 14,
                              height: 1.7,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ScreenSectionCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const <Widget>[
                    Text(
                      '公开支持方式',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(height: 10),
                    Text(
                      LegalConfig.supportContact,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 8),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
