import type { SQLiteDatabase } from 'expo-sqlite';

import type { TaskRecord, TaskState, TimelineEntry } from '@/types/models';

type TimelineRow = {
  entryId: string;
  noteText: string;
  entryCreatedAt: string;
  entryUpdatedAt: string;
  taskId: string | null;
  dueAt: string | null;
  taskStatus: TaskState['status'] | null;
  completedAt: string | null;
  notificationId: string | null;
  calendarEventId: string | null;
  calendarSyncStatus: TaskState['calendarSyncStatus'] | null;
};

type TaskRow = {
  taskId: string;
  entryId: string;
  noteText: string;
  entryCreatedAt: string;
  dueAt: string;
  taskStatus: TaskState['status'];
  completedAt: string | null;
  notificationId: string | null;
  calendarEventId: string | null;
  calendarSyncStatus: TaskState['calendarSyncStatus'];
};

const TIMELINE_QUERY = `
  SELECT
    e.id AS entryId,
    e.noteText AS noteText,
    e.createdAt AS entryCreatedAt,
    e.updatedAt AS entryUpdatedAt,
    t.id AS taskId,
    t.dueAt AS dueAt,
    t.status AS taskStatus,
    t.completedAt AS completedAt,
    t.notificationId AS notificationId,
    t.calendarEventId AS calendarEventId,
    t.calendarSyncStatus AS calendarSyncStatus
  FROM entries e
  LEFT JOIN tasks t ON t.entryId = e.id
  ORDER BY e.createdAt DESC
`;

const TASKS_QUERY = `
  SELECT
    t.id AS taskId,
    t.entryId AS entryId,
    e.noteText AS noteText,
    e.createdAt AS entryCreatedAt,
    t.dueAt AS dueAt,
    t.status AS taskStatus,
    t.completedAt AS completedAt,
    t.notificationId AS notificationId,
    t.calendarEventId AS calendarEventId,
    t.calendarSyncStatus AS calendarSyncStatus
  FROM tasks t
  INNER JOIN entries e ON e.id = t.entryId
  ORDER BY
    CASE t.status
      WHEN 'pending' THEN 0
      WHEN 'overdue' THEN 1
      ELSE 2
    END ASC,
    CASE
      WHEN t.status = 'completed' THEN COALESCE(t.completedAt, t.dueAt)
      ELSE t.dueAt
    END ASC
`;

function mapTaskRow(row: TaskRow): TaskRecord {
  return {
    id: row.taskId,
    entryId: row.entryId,
    noteText: row.noteText,
    entryCreatedAt: row.entryCreatedAt,
    dueAt: row.dueAt,
    status: row.taskStatus,
    completedAt: row.completedAt,
    notificationId: row.notificationId,
    calendarEventId: row.calendarEventId,
    calendarSyncStatus: row.calendarSyncStatus,
  };
}

export async function listTimelineEntries(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<TimelineRow>(TIMELINE_QUERY);

  return rows.map<TimelineEntry>((row) => ({
    id: row.entryId,
    noteText: row.noteText,
    createdAt: row.entryCreatedAt,
    updatedAt: row.entryUpdatedAt,
    task:
      row.taskId && row.dueAt && row.taskStatus && row.calendarSyncStatus
        ? {
            id: row.taskId,
            entryId: row.entryId,
            dueAt: row.dueAt,
            status: row.taskStatus,
            completedAt: row.completedAt,
            notificationId: row.notificationId,
            calendarEventId: row.calendarEventId,
            calendarSyncStatus: row.calendarSyncStatus,
          }
        : null,
  }));
}

export async function listTasks(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<TaskRow>(TASKS_QUERY);
  return rows.map(mapTaskRow);
}

export async function getTaskById(db: SQLiteDatabase, taskId: string) {
  const row = await db.getFirstAsync<TaskRow>(
    `
      SELECT
        t.id AS taskId,
        t.entryId AS entryId,
        e.noteText AS noteText,
        e.createdAt AS entryCreatedAt,
        t.dueAt AS dueAt,
        t.status AS taskStatus,
        t.completedAt AS completedAt,
        t.notificationId AS notificationId,
        t.calendarEventId AS calendarEventId,
        t.calendarSyncStatus AS calendarSyncStatus
      FROM tasks t
      INNER JOIN entries e ON e.id = t.entryId
      WHERE t.id = ?
    `,
    taskId
  );

  return row ? mapTaskRow(row) : null;
}

export async function insertEntry(
  db: SQLiteDatabase,
  entry: {
    id: string;
    noteText: string;
    createdAt: string;
    updatedAt: string;
  }
) {
  await db.runAsync(
    `
      INSERT INTO entries (id, noteText, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
    `,
    entry.id,
    entry.noteText,
    entry.createdAt,
    entry.updatedAt
  );
}

export async function insertTask(db: SQLiteDatabase, task: TaskState) {
  await db.runAsync(
    `
      INSERT INTO tasks (
        id,
        entryId,
        dueAt,
        status,
        completedAt,
        notificationId,
        calendarEventId,
        calendarSyncStatus
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    task.id,
    task.entryId,
    task.dueAt,
    task.status,
    task.completedAt,
    task.notificationId,
    task.calendarEventId,
    task.calendarSyncStatus
  );
}

export async function persistTaskState(db: SQLiteDatabase, task: TaskState) {
  await db.runAsync(
    `
      UPDATE tasks
      SET
        dueAt = ?,
        status = ?,
        completedAt = ?,
        notificationId = ?,
        calendarEventId = ?,
        calendarSyncStatus = ?
      WHERE id = ?
    `,
    task.dueAt,
    task.status,
    task.completedAt,
    task.notificationId,
    task.calendarEventId,
    task.calendarSyncStatus,
    task.id
  );
}

export async function deleteTaskById(db: SQLiteDatabase, taskId: string) {
  await db.runAsync('DELETE FROM tasks WHERE id = ?', taskId);
}

export async function reconcileOverdueTasks(db: SQLiteDatabase, referenceIso: string) {
  await db.runAsync(
    `
      UPDATE tasks
      SET status = 'overdue'
      WHERE status = 'pending' AND dueAt <= ?
    `,
    referenceIso
  );
}
