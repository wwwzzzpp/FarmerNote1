import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import { formatFriendlyDateTime, formatRelativeReminder, truncateText } from '@/utils/date';
import {
  EmptyState,
  ScreenView,
  SectionCard,
  SectionHeader,
  StatusChip,
} from '@/components/ui-shell';

export default function TimelineScreen() {
  const { timelineEntries } = useAppData();
  const router = useRouter();
  const params = useLocalSearchParams<{ focusEntryId?: string }>();
  const focusEntryId = typeof params.focusEntryId === 'string' ? params.focusEntryId : undefined;

  return (
    <ScreenView
      title="巡田时间线"
      subtitle="所有记录都按时间倒序排好，带提醒的记录会显示当前处理状态。">
      <SectionHeader
        title="最近记录"
        subtitle={timelineEntries.length > 0 ? `共 ${timelineEntries.length} 条` : '还没有记录'}
      />

      {timelineEntries.length === 0 ? (
        <EmptyState
          title="时间线还是空的"
          body="先去“记录”页写下第一条巡田观察，这里就会自动出现。"
        />
      ) : null}

      {timelineEntries.map((entry) => {
        const isFocused = entry.id === focusEntryId;
        const statusTone =
          entry.task?.status === 'completed'
            ? 'success'
            : entry.task?.status === 'overdue'
              ? 'danger'
              : entry.task?.status === 'pending'
                ? 'warning'
                : 'neutral';

        const statusLabel =
          entry.task?.status === 'completed'
            ? '已完成'
            : entry.task?.status === 'overdue'
              ? '已逾期'
              : entry.task?.status === 'pending'
                ? '待办'
                : '纯记录';

        return (
          <SectionCard
            key={entry.id}
            tone={isFocused ? 'accent' : 'default'}
            style={isFocused ? styles.focusedCard : undefined}>
            <View style={styles.entryHeader}>
              <View style={styles.entryHeaderText}>
                <Text style={styles.entryTime}>{formatFriendlyDateTime(entry.createdAt)}</Text>
                <Text style={styles.entrySubline}>
                  更新时间：{formatFriendlyDateTime(entry.updatedAt)}
                </Text>
              </View>
              <StatusChip label={statusLabel} tone={statusTone} />
            </View>

            <Text style={styles.entryBody}>{entry.noteText}</Text>

            {entry.task ? (
              <View style={styles.taskSummary}>
                <View style={styles.taskSummaryLine}>
                  <Text style={styles.taskSummaryLabel}>提醒时间</Text>
                  <Text style={styles.taskSummaryValue}>
                    {formatRelativeReminder(entry.task.dueAt)}
                  </Text>
                </View>
                <View style={styles.taskSummaryLine}>
                  <Text style={styles.taskSummaryLabel}>日历同步</Text>
                  <Text style={styles.taskSummaryValue}>
                    {entry.task.calendarSyncStatus === 'synced'
                      ? '已写入系统日历'
                      : entry.task.calendarSyncStatus === 'permission_denied'
                        ? '权限未开'
                        : entry.task.calendarSyncStatus === 'failed'
                          ? '稍后重试'
                          : entry.task.calendarSyncStatus === 'unsupported'
                            ? '当前平台不支持'
                            : entry.task.calendarSyncStatus === 'removed'
                              ? '已移除'
                              : '未写入'}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/tasks',
                      params: { focusTaskId: entry.task?.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.linkButton,
                    pressed ? styles.linkButtonPressed : null,
                  ]}>
                  <Text style={styles.linkButtonText}>
                    打开待办：{truncateText(entry.noteText, 16)}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </SectionCard>
        );
      })}
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  focusedCard: {
    borderColor: Colors.leaf,
    borderWidth: 1.5,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  entryHeaderText: {
    flex: 1,
  },
  entryTime: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
  entrySubline: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.inkMuted,
  },
  entryBody: {
    marginTop: Spacing.three,
    fontSize: 16,
    lineHeight: 26,
    color: Colors.ink,
  },
  taskSummary: {
    marginTop: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  taskSummaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  taskSummaryLabel: {
    fontSize: 13,
    color: Colors.inkMuted,
  },
  taskSummaryValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
  },
  linkButton: {
    marginTop: Spacing.one,
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  linkButtonPressed: {
    opacity: 0.8,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.leaf,
  },
});
