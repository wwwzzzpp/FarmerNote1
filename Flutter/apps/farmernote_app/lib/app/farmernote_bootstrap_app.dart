import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import '../features/legal/consent_gate_screen.dart';
import '../services/startup_consent_service.dart';
import '../widgets/farmer_ui.dart';
import 'farmernote_app.dart';
import 'farmernote_controller.dart';

typedef FarmerNoteControllerInitializer =
    Future<FarmerNoteController> Function();

class FarmerNoteBootstrapApp extends StatefulWidget {
  const FarmerNoteBootstrapApp({
    this.startupConsentService,
    this.controllerInitializer,
    super.key,
  });

  final StartupConsentService? startupConsentService;
  final FarmerNoteControllerInitializer? controllerInitializer;

  @override
  State<FarmerNoteBootstrapApp> createState() => _FarmerNoteBootstrapAppState();
}

class _FarmerNoteBootstrapAppState extends State<FarmerNoteBootstrapApp> {
  late final StartupConsentService _startupConsentService =
      widget.startupConsentService ?? StartupConsentService();

  FarmerNoteController? _controller;
  bool _isCheckingConsent = true;
  bool _isGrantingConsent = false;
  bool _hasAcceptedConsent = false;
  String _startupError = '';

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    try {
      final accepted = await _startupConsentService.hasAcceptedConsent();
      if (!mounted) {
        return;
      }
      setState(() {
        _hasAcceptedConsent = accepted;
        _isCheckingConsent = false;
      });
      if (accepted) {
        await _initializeController();
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isCheckingConsent = false;
        _startupError = '启动时没有读到协议确认状态，请重试一次。';
      });
    }
  }

  Future<void> _initializeController() async {
    if (_controller != null) {
      return;
    }

    setState(() {
      _startupError = '';
    });

    final initializer = widget.controllerInitializer ?? _defaultInitializer;
    try {
      final controller = await initializer();
      if (!mounted) {
        controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _startupError = '初始化本地数据失败了，请重试一次。';
      });
    }
  }

  Future<FarmerNoteController> _defaultInitializer() async {
    tz_data.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Shanghai'));
    final controller = FarmerNoteController();
    await controller.initialize();
    return controller;
  }

  Future<void> _handleAcceptConsent() async {
    if (_isGrantingConsent) {
      return;
    }

    setState(() {
      _isGrantingConsent = true;
      _startupError = '';
    });

    try {
      await _startupConsentService.acceptConsent();
      if (!mounted) {
        return;
      }
      setState(() {
        _hasAcceptedConsent = true;
      });
      await _initializeController();
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _startupError = '写入协议确认状态失败了，请重试一次。';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isGrantingConsent = false;
        });
      }
    }
  }

  void _handleDecline() {
    SystemNavigator.pop();
  }

  @override
  Widget build(BuildContext context) {
    return FarmerNoteShell(child: _buildHome());
  }

  Widget _buildHome() {
    if (_isCheckingConsent) {
      return const Scaffold(
        body: Center(
          child: LoadingStateCard(
            title: '正在检查启动状态…',
            body: 'FarmerNote 会先确认你是否已经完成协议同意，再决定是否恢复本地数据。',
          ),
        ),
      );
    }

    if (!_hasAcceptedConsent) {
      return ConsentGateScreen(
        isSubmitting: _isGrantingConsent,
        onAccept: _handleAcceptConsent,
        onDecline: _handleDecline,
      );
    }

    if (_controller == null) {
      if (_startupError.isNotEmpty) {
        return Scaffold(
          body: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  LoadingStateCard(title: '暂时没准备好', body: _startupError),
                  const SizedBox(height: 14),
                  FarmerButton(
                    label: '重新初始化',
                    onPressed: _initializeController,
                  ),
                ],
              ),
            ),
          ),
        );
      }
      return Scaffold(
        body: Center(
          child: LoadingStateCard(
            title: _startupError.isEmpty ? '正在准备 FarmerNote…' : '暂时没准备好',
            body: _startupError.isEmpty
                ? '协议确认完成后，系统才会恢复本地业务状态与云端会话。'
                : _startupError,
          ),
        ),
      );
    }

    return AnimatedBuilder(
      animation: _controller!,
      builder: (context, _) {
        return FarmerNoteScaffold(controller: _controller!);
      },
    );
  }
}
