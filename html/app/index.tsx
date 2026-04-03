import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ReminderPicker } from '@/components/reminder-picker';
import { AppButton, ScreenView, SectionCard, StatusChip } from '@/components/ui-shell';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { formatFriendlyDateTime, getSuggestedReminderDate } from '@/utils/date';

export default function RecordScreen() {
  const { createEntry, stats, notificationPermission, isLoading } = useAppData();
  const [noteText, setNoteText] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderAt, setReminderAt] = useState<Date | null>(getSuggestedReminderDate());
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const statsCards = useMemo(
    () => [
      { label: '总记录', value: stats.entryCount.toString() },
      { label: '待办中', value: stats.pendingTaskCount.toString() },
      { label: '已逾期', value: stats.overdueTaskCount.toString() },
    ],
    [stats]
  );

  async function handleSave() {
    if (!noteText.trim()) {
      Alert.alert('还没有内容', '先写下这次巡田看到了什么，再保存。');
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);

    try {
      const result = await createEntry({
        noteText,
        dueAt: reminderEnabled && reminderAt ? reminderAt.toISOString() : null,
      });

      setNoteText('');
      setReminderEnabled(false);
      setReminderAt(getSuggestedReminderDate());

      if (!result.taskId) {
        setFeedbackMessage('记录已保存到本机时间线。');
      } else if (result.taskStatus === 'overdue') {
        setFeedbackMessage('记录已保存，任务时间已过，已自动放进逾期待办。');
      } else if (result.notificationPermission === 'denied') {
        setFeedbackMessage('记录已保存，系统日历已尝试同步，但提醒权限还没打开。');
      } else if (result.calendarSyncStatus === 'permission_denied') {
        setFeedbackMessage('记录已保存，本地提醒已建立，但系统日历权限还没打开。');
      } else if (result.calendarSyncStatus === 'failed') {
        setFeedbackMessage('记录已保存，本地提醒已建立，日历同步稍后可在待办页重试。');
      } else {
        setFeedbackMessage('记录、提醒和日历事件都已保存。');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败，请稍后重试。';
      Alert.alert('保存失败', message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenView
      title="随手记一条巡田记录"
      subtitle="不登录，不上云，直接保存在这台手机里。需要定时处理的事，就顺手挂一个提醒。">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SectionCard tone="accent">
          <Text style={styles.heroTitle}>今天田里看到啥，先记下来。</Text>
          <Text style={styles.heroBody}>
            记录会自动串成时间线。带提醒的记录会同时出现在待办里，并尝试写入系统日历。
          </Text>

          <View style={styles.statsRow}>
            {statsCards.map((item) => (
              <View key={item.label} style={styles.statCard}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>本次记录</Text>
            <StatusChip label={isLoading ? '正在读取' : '本机保存'} tone={isLoading ? 'neutral' : 'success'} />
          </View>

          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder="例如：东南角麦苗偏黄，沟边有积水，下午三点去补看。"
            placeholderTextColor={Colors.inkMuted}
            multiline
            textAlignVertical="top"
            style={styles.textInput}
          />

          <Text style={styles.helperText}>
            支持只记文字。后面想加照片、地块字段、病虫害表单，也可以在这个基础上继续扩。
          </Text>
        </SectionCard>

        <ReminderPicker
          enabled={reminderEnabled}
          value={reminderAt}
          onToggle={(enabled) => {
            setReminderEnabled(enabled);
            if (enabled && !reminderAt) {
              setReminderAt(getSuggestedReminderDate());
            }
          }}
          onChange={setReminderAt}
          helperText="第一版只支持单次提醒。保存后会尝试建立 App 本地通知，并单向写入系统日历。"
        />

        {reminderEnabled && reminderAt ? (
          <SectionCard tone="muted">
            <Text style={styles.previewTitle}>这条提醒会在以下时间触发</Text>
            <Text style={styles.previewTime}>{formatFriendlyDateTime(reminderAt.toISOString())}</Text>
            <Text style={styles.helperText}>
              {notificationPermission === 'denied'
                ? '当前通知权限还没打开，保存后记录仍会入库，但提醒需要到待办页重试。'
                : '如果时间已经过去，系统不会安排通知，这条记录会直接归到逾期里。'}
            </Text>
          </SectionCard>
        ) : null}

        {feedbackMessage ? (
          <SectionCard tone="success">
            <Text style={styles.feedbackTitle}>刚刚保存成功</Text>
            <Text style={styles.feedbackBody}>{feedbackMessage}</Text>
          </SectionCard>
        ) : null}

        <AppButton
          label={isSaving ? '正在保存…' : '保存这条记录'}
          onPress={() => {
            void handleSave();
          }}
          disabled={isSaving}
        />
      </KeyboardAvoidingView>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    color: Colors.ink,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.inkMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.leaf,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.inkMuted,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
  },
  textInput: {
    minHeight: 180,
    marginTop: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.ink,
  },
  helperText: {
    marginTop: Spacing.three,
    fontSize: 13,
    lineHeight: 21,
    color: Colors.inkMuted,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.inkMuted,
  },
  previewTime: {
    marginTop: Spacing.two,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: Colors.ink,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.leafDark,
  },
  feedbackBody: {
    marginTop: Spacing.one,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.ink,
  },
});
