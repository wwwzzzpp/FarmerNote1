import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import React, {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  deleteTaskById,
  getTaskById,
  insertEntry,
  insertTask,
  listTasks,
  listTimelineEntries,
  persistTaskState,
  reconcileOverdueTasks,
} from '@/db/repository';
import { removeCalendarEvent, upsertCalendarEvent } from '@/services/calendar';
import {
  cancelScheduledTaskNotification,
  getNotificationPermissionState,
  scheduleTaskNotification,
} from '@/services/notifications';
import type {
  CalendarSyncStatus,
  CreateEntryInput,
  CreateEntryResult,
  NotificationPermissionState,
  TaskRecord,
  TaskState,
  TimelineEntry,
} from '@/types/models';
import { createId, isPastDate } from '@/utils/date';

type AppDataContextValue = {
  timelineEntries: TimelineEntry[];
  upcomingTasks: TaskRecord[];
  overdueTasks: TaskRecord[];
  completedTasks: TaskRecord[];
  notificationPermission: NotificationPermissionState;
  isLoading: boolean;
  stats: {
    entryCount: number;
    pendingTaskCount: number;
    overdueTaskCount: number;
    completedTaskCount: number;
  };
  refresh: () => Promise<void>;
  createEntry: (input: CreateEntryInput) => Promise<CreateEntryResult>;
  completeTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  rescheduleTask: (taskId: string, nextDueAt: string) => Promise<void>;
  retryTaskNotification: (taskId: string) => Promise<void>;
  retryTaskCalendar: (taskId: string) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function sortTasks(tasks: TaskRecord[]) {
  return [...tasks].sort((left, right) => {
    if (left.status === 'completed' && right.status === 'completed') {
      return (right.completedAt ?? '').localeCompare(left.completedAt ?? '');
    }

    return left.dueAt.localeCompare(right.dueAt);
  });
}

function toTaskState(task: TaskRecord, overrides: Partial<TaskState>): TaskState {
  return {
    id: task.id,
    entryId: task.entryId,
    dueAt: overrides.dueAt ?? task.dueAt,
    status: overrides.status ?? task.status,
    completedAt:
      overrides.completedAt === undefined ? task.completedAt : overrides.completedAt,
    notificationId:
      overrides.notificationId === undefined ? task.notificationId : overrides.notificationId,
    calendarEventId:
      overrides.calendarEventId === undefined ? task.calendarEventId : overrides.calendarEventId,
    calendarSyncStatus:
      overrides.calendarSyncStatus === undefined
        ? task.calendarSyncStatus
        : overrides.calendarSyncStatus,
  };
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>('undetermined');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    await reconcileOverdueTasks(db, new Date().toISOString());

    const [nextTimeline, nextTasks, permission] = await Promise.all([
      listTimelineEntries(db),
      listTasks(db),
      getNotificationPermissionState(),
    ]);

    startTransition(() => {
      setTimelineEntries(nextTimeline);
      setTasks(nextTasks);
      setNotificationPermission(permission);
      setIsLoading(false);
    });
  }, [db]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  const createEntry = useCallback(
    async (input: CreateEntryInput) => {
      const noteText = input.noteText.trim();

      if (!noteText) {
        throw new Error('请输入巡田记录内容。');
      }

      const nowIso = new Date().toISOString();
      const entryId = createId('entry');

      await insertEntry(db, {
        id: entryId,
        noteText,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      let result: CreateEntryResult = {
        entryId,
        taskId: null,
        taskStatus: null,
        notificationPermission,
        calendarSyncStatus: null,
      };

      if (input.dueAt) {
        const taskId = createId('task');
        const dueInPast = isPastDate(input.dueAt);
        let taskState: TaskState = {
          id: taskId,
          entryId,
          dueAt: input.dueAt,
          status: dueInPast ? 'overdue' : 'pending',
          completedAt: null,
          notificationId: null,
          calendarEventId: null,
          calendarSyncStatus: dueInPast ? 'skipped' : 'pending',
        };

        let notificationState: NotificationPermissionState = notificationPermission;

        if (!dueInPast) {
          const [notificationResult, calendarResult] = await Promise.all([
            scheduleTaskNotification({
              taskId,
              entryId,
              noteText,
              dueAt: input.dueAt,
            }),
            upsertCalendarEvent({
              noteText,
              dueAt: input.dueAt,
              taskId,
            }),
          ]);

          notificationState = notificationResult.permissionState;
          taskState = {
            ...taskState,
            notificationId: notificationResult.notificationId,
            calendarEventId: calendarResult.calendarEventId,
            calendarSyncStatus: calendarResult.syncStatus,
          };
        }

        await insertTask(db, taskState);

        result = {
          entryId,
          taskId,
          taskStatus: taskState.status,
          notificationPermission: notificationState,
          calendarSyncStatus: taskState.calendarSyncStatus,
        };
      }

      await refresh();
      return result;
    },
    [db, notificationPermission, refresh]
  );

  const completeTask = useCallback(
    async (taskId: string) => {
      const task = await getTaskById(db, taskId);
      if (!task) {
        return;
      }

      await cancelScheduledTaskNotification(task.notificationId);

      const dueInFuture = !isPastDate(task.dueAt);
      let nextCalendarEventId = task.calendarEventId;
      let nextCalendarStatus: CalendarSyncStatus = task.calendarSyncStatus;

      if (dueInFuture && task.calendarEventId) {
        await removeCalendarEvent(task.calendarEventId);
        nextCalendarEventId = null;
        nextCalendarStatus = 'removed';
      }

      await persistTaskState(
        db,
        toTaskState(task, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          notificationId: null,
          calendarEventId: nextCalendarEventId,
          calendarSyncStatus: nextCalendarStatus,
        })
      );

      await refresh();
    },
    [db, refresh]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const task = await getTaskById(db, taskId);
      if (!task) {
        return;
      }

      await cancelScheduledTaskNotification(task.notificationId);
      await removeCalendarEvent(task.calendarEventId);
      await deleteTaskById(db, task.id);
      await refresh();
    },
    [db, refresh]
  );

  const rescheduleTask = useCallback(
    async (taskId: string, nextDueAt: string) => {
      const task = await getTaskById(db, taskId);
      if (!task) {
        return;
      }

      await cancelScheduledTaskNotification(task.notificationId);

      const dueInPast = isPastDate(nextDueAt);
      let nextState = toTaskState(task, {
        dueAt: nextDueAt,
        status: dueInPast ? 'overdue' : 'pending',
        completedAt: null,
        notificationId: null,
        calendarSyncStatus: dueInPast ? 'skipped' : task.calendarSyncStatus,
      });

      if (dueInPast) {
        if (task.calendarEventId) {
          await removeCalendarEvent(task.calendarEventId);
        }

        nextState = {
          ...nextState,
          calendarEventId: null,
          calendarSyncStatus: 'skipped',
        };
      } else {
        const [notificationResult, calendarResult] = await Promise.all([
          scheduleTaskNotification({
            taskId: task.id,
            entryId: task.entryId,
            noteText: task.noteText,
            dueAt: nextDueAt,
          }),
          upsertCalendarEvent({
            existingEventId: task.calendarEventId,
            noteText: task.noteText,
            dueAt: nextDueAt,
            taskId: task.id,
          }),
        ]);

        nextState = {
          ...nextState,
          notificationId: notificationResult.notificationId,
          calendarEventId: calendarResult.calendarEventId,
          calendarSyncStatus: calendarResult.syncStatus,
        };
      }

      await persistTaskState(db, nextState);
      await refresh();
    },
    [db, refresh]
  );

  const retryTaskNotification = useCallback(
    async (taskId: string) => {
      const task = await getTaskById(db, taskId);
      if (!task || task.status !== 'pending' || isPastDate(task.dueAt)) {
        return;
      }

      await cancelScheduledTaskNotification(task.notificationId);
      const notificationResult = await scheduleTaskNotification({
        taskId: task.id,
        entryId: task.entryId,
        noteText: task.noteText,
        dueAt: task.dueAt,
      });

      await persistTaskState(
        db,
        toTaskState(task, { notificationId: notificationResult.notificationId })
      );
      await refresh();
    },
    [db, refresh]
  );

  const retryTaskCalendar = useCallback(
    async (taskId: string) => {
      const task = await getTaskById(db, taskId);
      if (!task || task.status !== 'pending' || isPastDate(task.dueAt)) {
        return;
      }

      const calendarResult = await upsertCalendarEvent({
        existingEventId: task.calendarEventId,
        noteText: task.noteText,
        dueAt: task.dueAt,
        taskId: task.id,
      });

      await persistTaskState(
        db,
        toTaskState(task, {
          calendarEventId: calendarResult.calendarEventId,
          calendarSyncStatus: calendarResult.syncStatus,
        })
      );
      await refresh();
    },
    [db, refresh]
  );

  const value = useMemo<AppDataContextValue>(() => {
    const upcomingTasks = sortTasks(tasks.filter((task) => task.status === 'pending'));
    const overdueTasks = sortTasks(tasks.filter((task) => task.status === 'overdue'));
    const completedTasks = sortTasks(tasks.filter((task) => task.status === 'completed'));

    return {
      timelineEntries,
      upcomingTasks,
      overdueTasks,
      completedTasks,
      notificationPermission,
      isLoading,
      stats: {
        entryCount: timelineEntries.length,
        pendingTaskCount: upcomingTasks.length,
        overdueTaskCount: overdueTasks.length,
        completedTaskCount: completedTasks.length,
      },
      refresh,
      createEntry,
      completeTask,
      deleteTask,
      rescheduleTask,
      retryTaskNotification,
      retryTaskCalendar,
    };
  }, [
    completeTask,
    createEntry,
    deleteTask,
    isLoading,
    notificationPermission,
    refresh,
    rescheduleTask,
    retryTaskCalendar,
    retryTaskNotification,
    tasks,
    timelineEntries,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider.');
  }

  return context;
}
