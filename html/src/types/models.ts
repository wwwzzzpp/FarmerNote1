export type TaskStatus = 'pending' | 'overdue' | 'completed';

export type CalendarSyncStatus =
  | 'pending'
  | 'synced'
  | 'permission_denied'
  | 'unsupported'
  | 'failed'
  | 'removed'
  | 'skipped';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export type TaskState = {
  id: string;
  entryId: string;
  dueAt: string;
  status: TaskStatus;
  completedAt: string | null;
  notificationId: string | null;
  calendarEventId: string | null;
  calendarSyncStatus: CalendarSyncStatus;
};

export type TaskRecord = TaskState & {
  noteText: string;
  entryCreatedAt: string;
};

export type TimelineEntry = {
  id: string;
  noteText: string;
  createdAt: string;
  updatedAt: string;
  task: TaskState | null;
};

export type CreateEntryInput = {
  noteText: string;
  dueAt: string | null;
};

export type CreateEntryResult = {
  entryId: string;
  taskId: string | null;
  taskStatus: TaskStatus | null;
  notificationPermission: NotificationPermissionState;
  calendarSyncStatus: CalendarSyncStatus | null;
};
