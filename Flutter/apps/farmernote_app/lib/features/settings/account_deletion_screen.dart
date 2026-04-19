import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/farmernote_controller.dart';
import '../../config/legal_config.dart';
import '../../models/account_deletion_status.dart';
import '../../theme/app_theme.dart';
import '../../widgets/farmer_ui.dart';

class AccountDeletionScreen extends StatefulWidget {
  const AccountDeletionScreen({required this.controller, super.key});

  final FarmerNoteController controller;

  @override
  State<AccountDeletionScreen> createState() => _AccountDeletionScreenState();
}

class _AccountDeletionScreenState extends State<AccountDeletionScreen> {
  final TextEditingController _codeController = TextEditingController();

  Timer? _countdownTimer;
  bool _isLoadingStatus = true;
  int _sendCountdown = 0;

  @override
  void initState() {
    super.initState();
    _refreshStatus();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _refreshStatus() async {
    if (!widget.controller.isSignedIn) {
      setState(() {
        _isLoadingStatus = false;
      });
      return;
    }

    try {
      await widget.controller.loadAccountDeletionStatus();
    } catch (_) {
      // The controller already keeps the user-facing message.
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingStatus = false;
        });
      }
    }
  }

  void _startSendCountdown() {
    _countdownTimer?.cancel();
    setState(() {
      _sendCountdown = 60;
    });
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_sendCountdown <= 1) {
        timer.cancel();
        setState(() {
          _sendCountdown = 0;
        });
        return;
      }
      setState(() {
        _sendCountdown -= 1;
      });
    });
  }

  Future<void> _handleSendCode() async {
    if (_sendCountdown > 0 || widget.controller.isAuthenticating) {
      return;
    }

    try {
      await widget.controller.sendAccountDeletionPhoneCode();
      _startSendCountdown();
      if (mounted) {
        showAppSnackBar(context, '注销验证码已发送');
      }
    } catch (_) {
      if (mounted) {
        showAppSnackBar(context, widget.controller.cloudStatusDetail);
      }
    }
  }

  Future<void> _handleConfirmPhoneDeletion() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) {
      showAppSnackBar(context, '先输入验证码');
      return;
    }

    try {
      final status = await widget.controller.requestAccountDeletionWithPhone(
        code: code,
      );
      if (!mounted) {
        return;
      }
      await _showDeletionRequestedDialog(status);
    } catch (_) {
      if (mounted) {
        showAppSnackBar(context, widget.controller.cloudStatusDetail);
      }
    }
  }

  Future<void> _handleConfirmWeChatDeletion() async {
    try {
      final status = await widget.controller.requestAccountDeletionWithWeChat();
      if (!mounted) {
        return;
      }
      await _showDeletionRequestedDialog(status);
    } catch (_) {
      if (mounted) {
        showAppSnackBar(context, widget.controller.cloudStatusDetail);
      }
    }
  }

  Future<void> _showDeletionRequestedDialog(
    AccountDeletionStatus status,
  ) async {
    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('注销申请已提交'),
          content: Text(
            status.message.isNotEmpty
                ? status.message
                : '账号已进入 ${LegalConfig.deletionWindowDays} 天待删除窗口。',
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('知道了'),
            ),
          ],
        );
      },
    );
    if (!mounted) {
      return;
    }
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.controller.authSession;
    final status = widget.controller.accountDeletionStatus;

    return Scaffold(
      appBar: AppBar(
        title: const Text('注销账号'),
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
                  children: const <Widget>[
                    Text(
                      '不可撤销操作',
                      style: TextStyle(
                        fontSize: 12,
                        letterSpacing: 1.4,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    SizedBox(height: 12),
                    Text(
                      '提交后会立即退出登录，并进入 15 天待删除窗口。',
                      style: TextStyle(
                        fontSize: 24,
                        height: 1.2,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHero,
                      ),
                    ),
                    SizedBox(height: 12),
                    Text(
                      '冷静期结束后，云端账号、身份绑定、记录、待办和媒体对象会被彻底删除。',
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.7,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              if (_isLoadingStatus)
                const LoadingStateCard(
                  title: '正在检查账号状态…',
                  body: '先确认你的当前账号是否已经提交过注销申请。',
                )
              else if (session == null)
                const ScreenSectionCard(
                  child: Text(
                    '当前还没登录云端账号。登录后，这里才会显示注销入口。',
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.7,
                      color: AppColors.textSecondary,
                    ),
                  ),
                )
              else if (status.isPending)
                _PendingDeletionCard(status: status)
              else ...<Widget>[
                ScreenSectionCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const Text(
                        '确认方式',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        widget.controller.hasLinkedPhone
                            ? '当前账号已绑定手机号 ${widget.controller.maskedPhone}，请先获取注销验证码。'
                            : widget.controller.hasLinkedWeChat
                            ? '当前账号没有绑定手机号，需要再次完成一次微信授权确认。'
                            : '当前账号没有可用的注销确认方式，请联系客服处理。',
                        style: const TextStyle(
                          fontSize: 14,
                          height: 1.7,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (widget.controller.hasLinkedPhone)
                  ScreenSectionCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          children: <Widget>[
                            Expanded(
                              child: TextField(
                                controller: _codeController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  hintText: '输入注销验证码',
                                  filled: true,
                                  fillColor: Color(0xFFFAF6ED),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.all(
                                      Radius.circular(16),
                                    ),
                                    borderSide: BorderSide(
                                      color: Color(0xFFD6CCB5),
                                    ),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.all(
                                      Radius.circular(16),
                                    ),
                                    borderSide: BorderSide(
                                      color: Color(0xFFD6CCB5),
                                    ),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.all(
                                      Radius.circular(16),
                                    ),
                                    borderSide: BorderSide(
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            SizedBox(
                              width: 128,
                              child: FarmerButton(
                                label: _sendCountdown > 0
                                    ? '$_sendCountdown 秒'
                                    : '发送验证码',
                                tone: FarmerButtonTone.ghost,
                                small: true,
                                loading:
                                    widget.controller.isAuthenticating &&
                                    _sendCountdown == 0,
                                onPressed:
                                    widget.controller.isAuthenticating ||
                                        _sendCountdown > 0
                                    ? null
                                    : _handleSendCode,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: FarmerButton(
                            label: '确认注销账号',
                            tone: FarmerButtonTone.danger,
                            loading: widget.controller.isAuthenticating,
                            onPressed: widget.controller.isAuthenticating
                                ? null
                                : _handleConfirmPhoneDeletion,
                          ),
                        ),
                      ],
                    ),
                  ),
                if (!widget.controller.hasLinkedPhone &&
                    widget.controller.hasLinkedWeChat)
                  ScreenSectionCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          widget.controller.canUseWeChatLogin
                              ? '请使用当前绑定的微信再次确认注销。'
                              : '当前构建暂未开放 Flutter 微信授权确认。如果这是一个仅绑定微信的账号，请先在小程序发起注销或联系客服。',
                          style: const TextStyle(
                            fontSize: 14,
                            height: 1.7,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        if (widget.controller.canUseWeChatLogin) ...<Widget>[
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: FarmerButton(
                              label: '使用微信确认注销',
                              tone: FarmerButtonTone.danger,
                              loading: widget.controller.isAuthenticating,
                              onPressed: widget.controller.isAuthenticating
                                  ? null
                                  : _handleConfirmWeChatDeletion,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _PendingDeletionCard extends StatelessWidget {
  const _PendingDeletionCard({required this.status});

  final AccountDeletionStatus status;

  @override
  Widget build(BuildContext context) {
    return ScreenSectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            '当前账号已提交注销',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          Text(
            status.message.isNotEmpty ? status.message : '账号已进入待删除窗口。',
            style: const TextStyle(
              fontSize: 14,
              height: 1.7,
              color: AppColors.textSecondary,
            ),
          ),
          if (status.scheduledFor.trim().isNotEmpty) ...<Widget>[
            const SizedBox(height: 10),
            Text(
              '预计彻底删除时间：${status.scheduledFor}',
              style: const TextStyle(
                fontSize: 14,
                height: 1.7,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
