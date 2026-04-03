import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ReminderPicker } from '@/components/reminder-picker';
import {
  AppButton,
  EmptyState,
  ScreenView,
  SectionCard,
  SectionHeader,
  StatusChip,
} from '@/components/ui-shell';
import { Colors, Spacing } from '@/constants/theme';
import { useAppData } from '@/context/app-data-context';
import type { TaskRecord } from '@/types/models';
import { formatFriendlyDateTime, formatRelativeReminder, getSuggestedReminderDate } from '@/utils/date';

export default function TasksScreen() {
  const {
    upcomingTasks,
    overdueTasks,
    completedTasks,
    notificationPermission,
    completeTask,
    deleteTask,
    rescheduleTask,
    retryTaskNotification,
    retryTaskCalendar,
  } = useAppData();
  const params = useLocalSearchParams<{ focusTaskId?: string }>();
  const router = useRouter();
  const focusTaskId = typeof params.focusTaskId === 'string' ? params.focusTaskId : undefined;
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState<Date | null>(getSuggestedReminderDate());
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const hasTasks = useMemo(
    () => upcomingTasks.length + overdueTasks.length + completedTasks.length > 0,
    [completedTasks.length, overdueTasks.length, upcomingTasks.length]
  );

  function startEditing(task: TaskRecord) {
    setEditingTaskId(task.id);
    setDraftDate(new Date(task.dueAt));
  }

  async function handleComplete(task: TaskRecord) {
    setBusyTaskId(task.id);
    try {
      await completeTask(task.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '处理失败，请稍后再试。';
      Alert.alert('无法完成任务', message);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleDelete(task: TaskRecord) {
    setBusyTaskId(task.id);
    try {
      await deleteTask(task.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除失败，请稍后再试。';
      Alert.alert('无法删除待办', message);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleReschedule(task: TaskRecord) {
    if (!draftDate) {
      Alert.alert('还没选时间', '先给这条待办挑一个新的时间。');
      return;
    }

    setBusyTaskId(task.id);
    try {
      await rescheduleTask(task.id, draftDate.toISOString());
      setEditingTaskId(null);
      setDraftDate(getSuggestedReminderDate());
    } catch (error) {
      const message = error instanceof Error ? error.message : '改时间失败，请稍后再试。';
      Alert.alert('无法更新时间', message);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleRetryNotification(task: TaskRecord) {
    setBusyTaskId(task.id);
    try {
      await retryTaskNotification(task.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '重试失败，请稍后再试。';
      Alert.alert('提醒重建失败', message);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleRetryCalendar(task: TaskRecord) {
    setBusyTaskId(task.id);
    try {
      await retryTaskCalendar(task.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '重试失败，请稍后再试。';
      Alert.alert('日历同步失败', message);
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <ScreenView
      title="待办提醒"
      subtitle="这里会汇总所有挂了时间的巡田记录。可以完成、改时间，也可以补建提醒和日历事件。">
      {!hasTasks ? (
        <EmptyState
          title="还没有定时任务"
          body="在“记录”页打开“设置提醒”，这边就会自动接住。"
        />
      ) : null}

      <TaskSection
        title="即将到来"
        subtitle="未来的巡田动作"
        tasks={upcomingTasks}
        focusTaskId={focusTaskId}
        editingTaskId={editingTaskId}
        draftDate={draftDate}
        busyTaskId={busyTaskId}
        notificationPermission={notificationPermission}
        onEdit={startEditing}
        onCancelEdit={() => setEditingTaskId(null)}
        onDraftDateChange={setDraftDate}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onReschedule={handleReschedule}
        onRetryNotification={handleRetryNotification}
        onRetryCalendar={handleRetryCalendar}
        onOpenEntry={(task) =>
          router.push({
            pathname: '/timeline',
            params: { focusEntryId: task.entryId },
          })
        }
      />

      <TaskSection
        title="已逾期"
        subtitle="时间到了但还没处理"
        tasks={overdueTasks}
        focusTaskId={focusTaskId}
        editingTaskId={editingTaskId}
        draftDate={draftDate}
        busyTaskId={busyTaskId}
        notificationPermission={notificationPermission}
        onEdit={startEditing}
        onCancelEdit={() => setEditingTaskId(null)}
        onDraftDateChange={setDraftDate}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onReschedule={handleReschedule}
        onRetryNotification={handleRetryNotification}
        onRetryCalendar={handleRetryCalendar}
        onOpenEntry={(task) =>
          router.push({
            pathname: '/timeline',
            params: { focusEntryId: task.entryId },
          })
        }
      />

      <TaskSection
        title="已完成"
        subtitle="已经处理完的提醒"
        tasks={completedTasks}
        focusTaskId={focusTaskId}
        editingTaskId={editingTaskId}
        draftDate={draftDate}
        busyTaskId={busyTaskId}
        notificationPermission={notificationPermission}
        onEdit={startEditing}
        onCancelEdit={() => setEditingTaskId(null)}
        onDraftDateChange={setDraftDate}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onReschedule={handleReschedule}
        onRetryNotification={handleRetryNotification}
        onRetryCalendar={handleRetryCalendar}
        onOpenEntry={(task) =>
          router.push({
            pathname: '/timeline',
            params: { focusEntryId: task.entryId },
          })
        }
      />
    </ScreenView>
  );
}

type TaskSectionProps = {
  title: string;
  subtitle: string;
  tasks: TaskRecord[];
  focusTaskId?: string;
  editingTaskId: string | null;
  draftDate: Date | null;
  busyTaskId: string | null;
  notificationPermission: 'granted' | 'denied' | 'undetermined' | 'unsupported';
  onEdit: (task: TaskRecord) => void;
  onCancelEdit: () => void;
  onDraftDateChange: (value: Date) => void;
  onComplete: (task: TaskRecord) => void;
  onDelete: (task: TaskRecord) => void;
  onReschedule: (task: TaskRecord) => void;
  onRetryNotification: (task: TaskRecord) => void;
  onRetryCalendar: (task: TaskRecord) => void;
  onOpenEntry: (task: TaskRecord) => void;
};

function TaskSection({
  title,
  subtitle,
  tasks,
  focusTaskId,
  editingTaskId,
  draftDate,
  busyTaskId,
  notificationPermission,
  onEdit,
  onCancelEdit,
  onDraftDateChange,
  onComplete,
  onDelete,
  onReschedule,
  onRetryNotification,
  onRetryCalendar,
  onOpenEntry,
}: TaskSectionProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionStack}>
      <SectionHeader title={title} subtitle={`${tasks.length} 条 · ${subtitle}`} />

      {tasks.map((task) => {
        const isBusy = busyTaskId === task.id;
        const isEditing = editingTaskId === task.id;
        const notificationWarning =
          task.status === 'pending' && !task.notificationId
            ? notificationPermission === 'denied'
              ? '提醒未授权'
              : notificationPermission === 'granted'
                ? '提醒待补建'
                : notificationPermission === 'unsupported'
                  ? '当前平台不支持本地提醒'
                  : '提醒尚未确认'
            : null;

        const calendarWarning =
          task.calendarSyncStatus === 'permission_denied'
            ? '系统日历权限未开'
            : task.calendarSyncStatus === 'failed'
              ? '系统日历同步失败'
              : task.calendarSyncStatus === 'unsupported'
                ? '当前平台不支持系统日历'
                : null;

        return (
          <SectionCard
            key={task.id}
            tone={task.id === focusTaskId ? 'accent' : 'default'}
            style={task.id === focusTaskId ? styles.focusedTaskCard : undefined}>
            <View style={styles.taskHeader}>
              <View style={styles.taskHeaderText}>
                <Text style={styles.taskDue}>{formatRelativeReminder(task.dueAt)}</Text>
                <Text style={styles.taskMeta}>
                  记录于 {formatFriendlyDateTime(task.entryCreatedAt)}
                </Text>
              </View>
              <StatusChip
                label={
                  task.status === 'completed'
                    ? '已完成'
                    : task.status === 'overdue'
                      ? '已逾期'
                      : '待处理'
                }
                tone={
                  task.status === 'completed'
                    ? 'success'
                    : task.status === 'overdue'
                      ? 'danger'
                      : 'warning'
                }
              />
            </View>

            <Text style={styles.taskNote}>{task.noteText}</Text>

            {(notificationWarning || calendarWarning) && task.status !== 'completed' ? (
              <View style={styles.warningStack}>
                {notificationWarning ? (
                  <View style={styles.warningRow}>
                    <StatusChip label={notificationWarning} tone="danger" />
                    {notificationPermission !== 'unsupported' ? (
                      <Pressable
                        onPress={() => onRetryNotification(task)}
                        style={({ pressed }) => [
                          styles.smallLinkButton,
                          pressed ? styles.smallLinkPressed : null,
                        ]}>
                        <Text style={styles.smallLinkText}>重试提醒</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {calendarWarning ? (
                  <View style={styles.warningRow}>
                    <StatusChip label={calendarWarning} tone="warning" />
                    {task.calendarSyncStatus !== 'unsupported' ? (
                      <Pressable
                        onPress={() => onRetryCalendar(task)}
                        style={({ pressed }) => [
                          styles.smallLinkButton,
                          pressed ? styles.smallLinkPressed : null,
                        ]}>
                        <Text style={styles.smallLinkText}>重试日历</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.actionsRow}>
              {task.status !== 'completed' ? (
                <AppButton
                  label={isBusy ? '处理中…' : '完成'}
                  onPress={() => onComplete(task)}
                  variant="primary"
                  compact
                  disabled={isBusy}
                />
              ) : null}

              {task.status !== 'completed' ? (
                <AppButton
                  label="改时间"
                  onPress={() => onEdit(task)}
                  variant="secondary"
                  compact
                  disabled={isBusy}
                />
              ) : null}

              <AppButton
                label="查看原记录"
                onPress={() => onOpenEntry(task)}
                variant="ghost"
                compact
                disabled={isBusy}
              />

              <AppButton
                label="删除"
                onPress={() => onDelete(task)}
                variant="danger"
                compact
                disabled={isBusy}
              />
            </View>

            {isEditing ? (
              <View style={styles.editorBlock}>
                <ReminderPicker
                  enabled
                  value={draftDate}
                  onToggle={() => undefined}
                  onChange={onDraftDateChange}
                  helperText="改完时间后，旧通知会取消，新通知会重新安排，系统日历事件也会更新。"
                  locked
                />

                <View style={styles.editorButtons}>
                  <AppButton
                    label={isBusy ? '正在更新…' : '保存新时间'}
                    onPress={() => onReschedule(task)}
                    compact
                    disabled={isBusy}
                  />
                  <AppButton
                    label="取消"
                    onPress={onCancelEdit}
                    variant="ghost"
                    compact
                    disabled={isBusy}
                  />
                </View>
              </View>
            ) : null}
          </SectionCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionStack: {
    gap: Spacing.three,
  },
  focusedTaskCard: {
    borderColor: Colors.leaf,
    borderWidth: 1.5,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  taskHeaderText: {
    flex: 1,
  },
  taskDue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
  },
  taskMeta: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.inkMuted,
  },
  taskNote: {
    marginTop: Spacing.three,
    fontSize: 15,
    lineHeight: 24,
    color: Colors.ink,
  },
  warningStack: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  smallLinkButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  smallLinkPressed: {
    opacity: 0.75,
  },
  smallLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.leaf,
  },
  actionsRow: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  editorBlock: {
    marginTop: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  editorButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
