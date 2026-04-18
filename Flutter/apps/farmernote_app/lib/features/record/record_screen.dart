import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/farmernote_controller.dart';
import '../../models/calendar_sync_result.dart';
import '../../models/task_record.dart';
import '../../services/media_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/date_utils.dart' as farmer_date;
import '../../utils/reminder_intent_parser.dart';
import '../../widgets/farmer_ui.dart';
import '../../widgets/stored_photo.dart';

class RecordScreen extends StatefulWidget {
  const RecordScreen({required this.controller, super.key});

  final FarmerNoteController controller;

  @override
  State<RecordScreen> createState() => _RecordScreenState();
}

class _RecordScreenState extends State<RecordScreen> {
  final TextEditingController _noteController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _phoneCodeController = TextEditingController();
  final ReminderIntentParser _parser = ReminderIntentParser();
  final MediaService _mediaService = MediaService();

  Timer? _analysisTimer;
  Timer? _phoneCodeTimer;
  String _lastAcceptedNoteText = '';
  int _lastLineLimitToastAt = 0;
  int _phoneCodeCountdown = 0;
  bool _updatingText = false;
  bool _reminderEnabled = false;
  String _reminderDate = '';
  String _reminderTime = '';
  bool _smartReminderVisible = false;
  String _smartReminderTag = '';
  FarmerChipTone _smartReminderTone = FarmerChipTone.neutral;
  String _smartReminderMessage = '';
  String _smartReminderMatchedText = '';
  bool _manualReminderEdited = false;
  bool _autoReminderApplied = false;
  String _previewTimeText = '';
  String _previewHint = '';
  String _feedbackMessage = '';
  String _photoLocalPath = '';
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _noteController.addListener(_handleNoteControllerChanged);
    final suggestion = farmer_date.getSuggestedReminderParts();
    _reminderDate = suggestion.date;
    _reminderTime = suggestion.time;
  }

  @override
  void dispose() {
    _analysisTimer?.cancel();
    _phoneCodeTimer?.cancel();
    _noteController.dispose();
    _phoneController.dispose();
    _phoneCodeController.dispose();
    super.dispose();
  }

  void _handleNoteControllerChanged() {
    if (_updatingText) {
      return;
    }

    final normalized = _noteController.text.replaceAll('\r\n', '\n');
    final lineCount = normalized.isEmpty ? 0 : normalized.split('\n').length;

    if (lineCount > 2) {
      _analysisTimer?.cancel();
      _applyNoteText(_lastAcceptedNoteText);
      if (_lastAcceptedNoteText.trim().isNotEmpty) {
        _scheduleReminderAnalysis(_lastAcceptedNoteText);
      } else {
        _clearSmartReminder(
          resetManualEdited: true,
          resetAutoReminder: true,
          resetReminderFields: true,
        );
      }

      final now = DateTime.now().millisecondsSinceEpoch;
      if (now - _lastLineLimitToastAt > 1200) {
        _lastLineLimitToastAt = now;
        showAppSnackBar(context, '最多输入两行');
      }
      return;
    }

    if (normalized != _noteController.text) {
      _applyNoteText(normalized);
      return;
    }

    _lastAcceptedNoteText = normalized;

    if (normalized.trim().isEmpty) {
      _analysisTimer?.cancel();
      _clearSmartReminder(
        resetManualEdited: true,
        resetAutoReminder: true,
        resetReminderFields: true,
      );
      setState(() {});
      return;
    }

    setState(() {});
    _scheduleReminderAnalysis(normalized);
  }

  void _applyNoteText(String value) {
    _updatingText = true;
    _noteController.value = TextEditingValue(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
    _updatingText = false;
  }

  void _scheduleReminderAnalysis(String noteText) {
    _analysisTimer?.cancel();
    _analysisTimer = Timer(const Duration(milliseconds: 700), () {
      _runReminderAnalysis(noteText);
    });
  }

  void _clearSmartReminder({
    bool resetManualEdited = false,
    bool resetAutoReminder = false,
    bool resetReminderFields = false,
  }) {
    final nextDraft = farmer_date.getSuggestedReminderParts();
    setState(() {
      _smartReminderVisible = false;
      _smartReminderTag = '';
      _smartReminderTone = FarmerChipTone.neutral;
      _smartReminderMessage = '';
      _smartReminderMatchedText = '';

      if (resetManualEdited) {
        _manualReminderEdited = false;
      }
      if (resetAutoReminder) {
        _autoReminderApplied = false;
      }
      if (resetReminderFields) {
        _reminderEnabled = false;
        _reminderDate = nextDraft.date;
        _reminderTime = nextDraft.time;
        _previewTimeText = '';
        _previewHint = '';
      }
    });
    if (resetReminderFields) {
      _updatePreview();
    }
  }

  void _runReminderAnalysis(String noteText) {
    final text = noteText.trim();
    if (text.isEmpty) {
      _clearSmartReminder(
        resetManualEdited: true,
        resetAutoReminder: true,
        resetReminderFields: true,
      );
      return;
    }

    final result = _parser.parse(text, reference: DateTime.now());
    if (!result.needsReminder) {
      _clearSmartReminder(
        resetAutoReminder: true,
        resetReminderFields: _autoReminderApplied && !_manualReminderEdited,
      );
      return;
    }

    final dueDate = farmer_date.toDate(result.dueAt).toLocal();
    if (_manualReminderEdited) {
      setState(() {
        _smartReminderVisible = true;
        _smartReminderTag = '手动优先';
        _smartReminderTone = FarmerChipTone.warning;
        _smartReminderMessage =
            '识别到“${result.matchedText.isNotEmpty ? result.matchedText : '待处理时间'}”，但你已经手动改过提醒时间，系统不再自动覆盖。';
        _smartReminderMatchedText = result.matchedText;
        _autoReminderApplied = false;
      });
      return;
    }

    setState(() {
      _reminderEnabled = true;
      _reminderDate = farmer_date.formatDateInput(dueDate);
      _reminderTime = farmer_date.formatTimeInput(dueDate);
      _smartReminderVisible = true;
      _smartReminderTag = result.confidence == 'high' ? '自动填充' : '智能建议';
      _smartReminderTone = result.confidence == 'high'
          ? FarmerChipTone.success
          : FarmerChipTone.warning;
      _smartReminderMessage = result.message;
      _smartReminderMatchedText = result.matchedText;
      _autoReminderApplied = true;
    });
    _updatePreview();
  }

  void _setManualOverrideMessage(String message) {
    setState(() {
      _manualReminderEdited = true;
      _autoReminderApplied = false;
      if (_smartReminderMatchedText.isNotEmpty) {
        _smartReminderVisible = true;
        _smartReminderTag = '手动优先';
        _smartReminderTone = FarmerChipTone.warning;
        _smartReminderMessage = message;
      }
    });
  }

  void _updatePreview() {
    if (!_reminderEnabled) {
      setState(() {
        _previewTimeText = '';
        _previewHint = '';
      });
      return;
    }

    try {
      final dueAt = farmer_date
          .combineDateAndTime(_reminderDate, _reminderTime)
          .toUtc()
          .toIso8601String();
      final dueInPast = farmer_date.isPastDate(dueAt);
      setState(() {
        _previewTimeText = farmer_date.formatFriendlyDateTime(dueAt);
        _previewHint = dueInPast
            ? '这个时间已经过去了。保存后它会直接进入“已逾期”，不会出现在“即将到来”里。'
            : '保存后它会出现在待办里，并自动尝试写入手机日历提醒。Flutter 端会按当前平台能力处理。';
      });
    } catch (_) {
      setState(() {
        _previewTimeText = '';
        _previewHint = '';
      });
    }
  }

  Future<void> _pickPhoto() async {
    try {
      final photoLocalPath = await _mediaService.chooseCameraPhotoPath();
      if (!mounted) {
        return;
      }
      setState(() {
        _photoLocalPath = photoLocalPath;
      });
    } on MediaServiceException catch (error) {
      if (error.code == 'cancel') {
        return;
      }
      if (!mounted) {
        return;
      }
      showAppSnackBar(context, '拍照失败');
    }
  }

  Future<void> _handleSave() async {
    if (_isSaving) {
      return;
    }

    final noteText = _noteController.text.trim();
    if (noteText.isEmpty) {
      showAppSnackBar(context, '先写点内容');
      return;
    }

    var dueAt = '';
    if (_reminderEnabled) {
      try {
        dueAt = farmer_date
            .combineDateAndTime(_reminderDate, _reminderTime)
            .toUtc()
            .toIso8601String();
      } catch (_) {
        showAppSnackBar(context, '提醒时间不完整');
        return;
      }
    }

    setState(() {
      _isSaving = true;
    });

    try {
      final result = await widget.controller.createEntry(
        noteText: noteText,
        dueAt: dueAt,
        photoLocalPath: _photoLocalPath,
      );

      final suggestion = farmer_date.getSuggestedReminderParts();
      var feedbackMessage = _photoLocalPath.isNotEmpty
          ? '文字和现场照片都已保存到本机时间线。'
          : '记录已保存到本机时间线。';
      if (widget.controller.isSignedIn && result.entry.cloudTracked) {
        feedbackMessage = _photoLocalPath.isNotEmpty
            ? '记录、照片都已保存，并已加入云同步队列。'
            : '记录已保存，并已加入云同步队列。';
      }
      if (result.task?.status == TaskStatus.overdue) {
        feedbackMessage = _photoLocalPath.isNotEmpty
            ? '记录、照片都已保存，提醒时间已经过去，已自动放进逾期待办。'
            : '记录已保存，提醒时间已经过去，已自动放进逾期待办。';
      } else if (result.task != null) {
        feedbackMessage = _photoLocalPath.isNotEmpty
            ? '记录、照片和待办都已保存，正在尝试写入手机日历提醒。'
            : '记录和待办都已保存，正在尝试写入手机日历提醒。';
      }

      _analysisTimer?.cancel();
      _lastAcceptedNoteText = '';
      _applyNoteText('');
      setState(() {
        _reminderEnabled = false;
        _reminderDate = suggestion.date;
        _reminderTime = suggestion.time;
        _smartReminderVisible = false;
        _smartReminderTag = '';
        _smartReminderTone = FarmerChipTone.neutral;
        _smartReminderMessage = '';
        _smartReminderMatchedText = '';
        _manualReminderEdited = false;
        _autoReminderApplied = false;
        _previewTimeText = '';
        _previewHint = '';
        _feedbackMessage = feedbackMessage;
        _photoLocalPath = '';
      });

      if (mounted) {
        showAppSnackBar(context, '已保存');
      }

      if (result.task?.status == TaskStatus.pending) {
        await _trySyncPhoneCalendar(
          noteText: noteText,
          dueAt: dueAt,
          hasPhoto: result.entry.hasPhoto,
        );
      }
    } catch (_) {
      if (mounted) {
        showAppSnackBar(context, '保存失败，请重试');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  Future<void> _trySyncPhoneCalendar({
    required String noteText,
    required String dueAt,
    required bool hasPhoto,
  }) async {
    final baseLabel = hasPhoto ? '记录、照片和待办都已保存' : '记录和待办都已保存';
    final result = await widget.controller.addTaskToPhoneCalendar(
      noteText: noteText,
      dueAt: dueAt,
    );

    if (!mounted) {
      return;
    }

    switch (result.code) {
      case CalendarSyncCode.success:
        setState(() {
          _feedbackMessage = '$baseLabel，手机日历提醒也已写入。';
        });
        showAppSnackBar(context, '已写入日历');
        break;
      case CalendarSyncCode.unsupported:
        setState(() {
          _feedbackMessage = '$baseLabel，但当前平台不支持写入手机系统日历。';
        });
        break;
      case CalendarSyncCode.cancel:
        setState(() {
          _feedbackMessage = '$baseLabel，但你刚刚取消了写入手机日历。';
        });
        break;
      case CalendarSyncCode.permissionDenied:
        setState(() {
          _feedbackMessage = '$baseLabel，但应用还没有拿到系统日历权限。';
        });
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('日历权限未开启'),
            content: const Text('这条记录已经保存。要让手机日历提醒生效，请允许应用写入系统日历后再试一次。'),
            actions: <Widget>[
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('知道了'),
              ),
            ],
          ),
        );
        break;
      case CalendarSyncCode.failed:
        final detail = result.detail.trim();
        setState(() {
          _feedbackMessage = detail.isNotEmpty
              ? '$baseLabel，但$detail'
              : '$baseLabel，但写入手机日历失败了。';
        });
        break;
    }
  }

  void _startPhoneCodeCountdown() {
    _phoneCodeTimer?.cancel();
    setState(() {
      _phoneCodeCountdown = 60;
    });

    _phoneCodeTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_phoneCodeCountdown <= 1) {
        timer.cancel();
        setState(() {
          _phoneCodeCountdown = 0;
        });
        return;
      }

      setState(() {
        _phoneCodeCountdown -= 1;
      });
    });
  }

  Future<void> _handleCloudPrimaryAction() async {
    if (!widget.controller.canTriggerPrimaryCloudAction) {
      return;
    }

    try {
      if (widget.controller.isSignedIn) {
        await widget.controller.syncNow();
      } else {
        await widget.controller.signInToCloud();
        if (mounted) {
          showAppSnackBar(context, '已登录云端');
        }
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      showAppSnackBar(context, widget.controller.cloudStatusDetail);
    }
  }

  Future<void> _handleSendPhoneCode() async {
    if (_phoneCodeCountdown > 0) {
      return;
    }

    try {
      await widget.controller.sendPhoneCode(_phoneController.text);
      _startPhoneCodeCountdown();
      if (mounted) {
        showAppSnackBar(context, '验证码已发送');
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      showAppSnackBar(context, widget.controller.cloudStatusDetail);
    }
  }

  Future<void> _handlePhoneSubmit() async {
    try {
      if (widget.controller.isSignedIn) {
        await widget.controller.linkPhone(
          phone: _phoneController.text,
          code: _phoneCodeController.text,
        );
        _phoneCodeController.clear();
        if (mounted) {
          showAppSnackBar(context, '手机号已绑定');
        }
      } else {
        await widget.controller.signInWithPhone(
          phone: _phoneController.text,
          code: _phoneCodeController.text,
        );
        _phoneCodeController.clear();
        if (mounted) {
          showAppSnackBar(context, '已登录云端');
        }
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      showAppSnackBar(context, widget.controller.cloudStatusDetail);
    }
  }

  Future<void> _handleLinkWeChat() async {
    try {
      await widget.controller.linkWeChat();
      if (mounted) {
        showAppSnackBar(context, '微信已绑定');
      }
    } catch (_) {
      if (!mounted) {
        return;
      }
      showAppSnackBar(context, widget.controller.cloudStatusDetail);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stats = widget.controller.stats;
    final isCompact = MediaQuery.sizeOf(context).width < 380;
    final showCloudActionButtons =
        widget.controller.shouldShowPrimaryCloudButton ||
        widget.controller.canLinkWeChat;
    final showCloudSupportPanel = widget.controller.shouldShowPhoneAuthPanel;
    final showCloudExtraContent =
        showCloudActionButtons || showCloudSupportPanel;

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: widget.controller.isSignedIn
            ? widget.controller.syncNow
            : () async {},
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
                      'FARMER NOTE',
                      style: TextStyle(
                        fontSize: 12,
                        letterSpacing: 2,
                        color: Color(0xFF6D674F),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '今天田里看到啥，先记下来。',
                      style: TextStyle(
                        fontSize: isCompact ? 24 : 26,
                        height: 1.25,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHero,
                      ),
                    ),
                    SizedBox(height: isCompact ? 16 : 18),
                    Row(
                      children: <Widget>[
                        _StatCard(
                          label: '总记录',
                          value: '${stats['entryCount'] ?? 0}',
                        ),
                        SizedBox(width: isCompact ? 10 : 12),
                        _StatCard(
                          label: '待办中',
                          value: '${stats['pendingTaskCount'] ?? 0}',
                        ),
                        SizedBox(width: isCompact ? 10 : 12),
                        _StatCard(
                          label: '已逾期',
                          value: '${stats['overdueTaskCount'] ?? 0}',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              ScreenSectionCard(
                padding: EdgeInsets.symmetric(
                  horizontal: isCompact ? 16 : 18,
                  vertical: isCompact ? 14 : 16,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      widget.controller.cloudStatusHeadline,
                      style: TextStyle(
                        fontSize: isCompact ? 17 : 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      widget.controller.cloudStatusDetail,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.55,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    if (showCloudExtraContent) const SizedBox(height: 14),
                    if (showCloudActionButtons)
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: <Widget>[
                          if (widget.controller.shouldShowPrimaryCloudButton)
                            SizedBox(
                              width: isCompact ? 150 : 168,
                              child: FarmerButton(
                                label:
                                    widget.controller.cloudPrimaryActionLabel,
                                loading:
                                    widget.controller.isSyncing ||
                                    widget.controller.isAuthenticating,
                                onPressed:
                                    widget
                                        .controller
                                        .canTriggerPrimaryCloudAction
                                    ? _handleCloudPrimaryAction
                                    : null,
                              ),
                            ),
                          if (widget.controller.canLinkWeChat)
                            SizedBox(
                              width: isCompact ? 126 : 138,
                              child: FarmerButton(
                                label: '绑定微信',
                                tone: FarmerButtonTone.ghost,
                                small: true,
                                loading: widget.controller.isAuthenticating,
                                onPressed: _handleLinkWeChat,
                              ),
                            ),
                        ],
                      ),
                    if (showCloudSupportPanel) ...<Widget>[
                      if (showCloudActionButtons) const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3EFE4),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: const Color(0xFFD8CFBA)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            TextField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              decoration: const InputDecoration(
                                hintText: '输入中国大陆手机号，例如 13800138000',
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
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 14,
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: <Widget>[
                                Expanded(
                                  child: TextField(
                                    controller: _phoneCodeController,
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(
                                      hintText: '输入验证码',
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
                                      contentPadding: EdgeInsets.symmetric(
                                        horizontal: 14,
                                        vertical: 14,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                SizedBox(
                                  width: isCompact ? 112 : 126,
                                  child: FarmerButton(
                                    label: _phoneCodeCountdown > 0
                                        ? '$_phoneCodeCountdown 秒'
                                        : '发送验证码',
                                    tone: FarmerButtonTone.ghost,
                                    small: true,
                                    loading:
                                        widget.controller.isAuthenticating &&
                                        _phoneCodeCountdown == 0,
                                    onPressed:
                                        (widget.controller.isAuthenticating ||
                                            _phoneCodeCountdown > 0)
                                        ? null
                                        : _handleSendPhoneCode,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: FarmerButton(
                                label: widget.controller.canLinkPhone
                                    ? '绑定手机号'
                                    : '手机号验证码登录',
                                tone: FarmerButtonTone.secondary,
                                loading: widget.controller.isAuthenticating,
                                onPressed: widget.controller.isAuthenticating
                                    ? null
                                    : _handlePhoneSubmit,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              ScreenSectionCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const Text(
                      '提示词中可以包含：提醒我、提醒一下、提醒下、记得、别忘、定时、到时、到时候、闹钟。',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 18),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3EFE4),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFD6CCB5)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          TextField(
                            controller: _noteController,
                            maxLines: 2,
                            minLines: 2,
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                              isCollapsed: true,
                              hintText: '提醒我东南角麦苗偏黄，沟边有积水。\n下午三点再去补看。',
                            ),
                            style: TextStyle(
                              fontSize: isCompact ? 17 : 18,
                              height: 1.7,
                            ),
                          ),
                          if (_photoLocalPath.isNotEmpty) ...<Widget>[
                            const SizedBox(height: 14),
                            GestureDetector(
                              onTap: () =>
                                  _showPhotoPreview(context, _photoLocalPath),
                              child: StoredPhoto(
                                source: _photoLocalPath,
                                width: double.infinity,
                                height: 180,
                                borderRadius: BorderRadius.circular(18),
                              ),
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              '已附带现场照片，点图可放大查看。',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF756F61),
                              ),
                            ),
                          ],
                          const SizedBox(height: 16),
                          Row(
                            children: <Widget>[
                              FarmerButton(
                                label: _photoLocalPath.isNotEmpty
                                    ? '重拍照片'
                                    : '拍照记录',
                                tone: FarmerButtonTone.secondary,
                                small: true,
                                onPressed: _pickPhoto,
                              ),
                              if (_photoLocalPath.isNotEmpty) ...<Widget>[
                                const SizedBox(width: 12),
                                FarmerButton(
                                  label: '删除照片',
                                  tone: FarmerButtonTone.ghost,
                                  small: true,
                                  onPressed: () {
                                    setState(() {
                                      _photoLocalPath = '';
                                    });
                                  },
                                ),
                              ],
                              const Spacer(),
                              SizedBox(
                                width: isCompact ? 136 : 144,
                                child: FarmerButton(
                                  label: '保存这条记录',
                                  loading: _isSaving,
                                  onPressed: _handleSave,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: Text(
                            '需要定时处理吗？',
                            style: TextStyle(
                              fontSize: isCompact ? 15 : 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Switch(
                          value: _reminderEnabled,
                          activeThumbColor: AppColors.primary,
                          onChanged: (value) {
                            _setManualOverrideMessage(
                              '识别到“$_smartReminderMatchedText”，但你选择了手动控制提醒。',
                            );
                            setState(() {
                              _reminderEnabled = value;
                            });
                            _updatePreview();
                          },
                        ),
                      ],
                    ),
                    if (_smartReminderVisible) ...<Widget>[
                      const SizedBox(height: 18),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECE6D6),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: const Color(0xFFD4C9AF)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: <Widget>[
                                      Text(
                                        '系统识别到定时处理',
                                        style: TextStyle(
                                          fontSize: isCompact ? 15 : 16,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF4F4937),
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        _smartReminderMessage,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          height: 1.65,
                                          color: Color(0xFF655F50),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                StatusChip(
                                  label: _smartReminderTag,
                                  tone: _smartReminderTone,
                                ),
                              ],
                            ),
                            if (_smartReminderMatchedText
                                .isNotEmpty) ...<Widget>[
                              const SizedBox(height: 10),
                              Text(
                                '命中内容：$_smartReminderMatchedText',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF756F61),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                    if (_reminderEnabled) ...<Widget>[
                      const SizedBox(height: 18),
                      _PickerField(
                        label: '日期',
                        value: _reminderDate,
                        onTap: () async {
                          final now = DateTime.now();
                          final initial =
                              DateTime.tryParse(
                                '$_reminderDate ${_reminderTime.isEmpty ? '09:00:00' : '$_reminderTime:00'}',
                              ) ??
                              now;
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: initial,
                            firstDate: DateTime(2020),
                            lastDate: DateTime(2100),
                          );
                          if (picked == null) {
                            return;
                          }
                          _setManualOverrideMessage(
                            '识别到“$_smartReminderMatchedText”，但当前时间已按你的手动修改为准。',
                          );
                          setState(() {
                            _reminderDate = farmer_date.formatDateInput(picked);
                          });
                          _updatePreview();
                        },
                      ),
                      const SizedBox(height: 12),
                      _PickerField(
                        label: '时间',
                        value: _reminderTime,
                        onTap: () async {
                          final parts = _reminderTime.split(':');
                          final initial = TimeOfDay(
                            hour: parts.isNotEmpty
                                ? int.tryParse(parts[0]) ?? 9
                                : 9,
                            minute: parts.length > 1
                                ? int.tryParse(parts[1]) ?? 0
                                : 0,
                          );
                          final picked = await showTimePicker(
                            context: context,
                            initialTime: initial,
                          );
                          if (picked == null) {
                            return;
                          }
                          _setManualOverrideMessage(
                            '识别到“$_smartReminderMatchedText”，但当前时间已按你的手动修改为准。',
                          );
                          setState(() {
                            _reminderTime =
                                '${farmer_date.pad(picked.hour)}:${farmer_date.pad(picked.minute)}';
                          });
                          _updatePreview();
                        },
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        '保存后会自动尝试把这条任务写入手机系统日历。如果当前平台或权限不支持，记录本身仍会正常保存。',
                        style: TextStyle(
                          fontSize: 13,
                          height: 1.7,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (_previewTimeText.isNotEmpty)
                ScreenSectionCard(
                  backgroundColor: AppColors.surfaceMuted,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const Text(
                        '这条提醒会出现在待办里',
                        style: TextStyle(
                          fontSize: 13,
                          color: Color(0xFF655F50),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _previewTimeText,
                        style: TextStyle(
                          fontSize: isCompact ? 22 : 24,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _previewHint,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.7,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              if (_feedbackMessage.isNotEmpty)
                ScreenSectionCard(
                  backgroundColor: AppColors.surfaceSuccess,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const Text(
                        '刚刚保存成功',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _feedbackMessage,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.7,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
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

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 380;

    return Expanded(
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: isCompact ? 12 : 14,
          vertical: isCompact ? 9 : 10,
        ),
        decoration: BoxDecoration(
          color: AppColors.heroStat,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFD0C6AB)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.ideographic,
          children: <Widget>[
            Text(
              value,
              style: TextStyle(
                fontSize: isCompact ? 19 : 20,
                fontWeight: FontWeight.w700,
                color: Color(0xFF504B38),
              ),
            ),
            SizedBox(width: isCompact ? 4 : 6),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: isCompact ? 11 : 12,
                  color: const Color(0xFF6B654F),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PickerField extends StatelessWidget {
  const _PickerField({
    required this.label,
    required this.value,
    required this.onTap,
  });

  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 380;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(
              color: const Color(0xFFF0EBDF),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFD6CCB5)),
            ),
            child: Text(
              value,
              style: TextStyle(
                fontSize: isCompact ? 17 : 18,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
