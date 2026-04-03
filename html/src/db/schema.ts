import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'farmer-note.db';
const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    await db.execAsync('PRAGMA foreign_keys = ON;');
    return;
  }

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY NOT NULL,
      noteText TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      entryId TEXT NOT NULL UNIQUE,
      dueAt TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'overdue', 'completed')),
      completedAt TEXT,
      notificationId TEXT,
      calendarEventId TEXT,
      calendarSyncStatus TEXT NOT NULL CHECK (
        calendarSyncStatus IN (
          'pending',
          'synced',
          'permission_denied',
          'unsupported',
          'failed',
          'removed',
          'skipped'
        )
      ),
      FOREIGN KEY (entryId) REFERENCES entries(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(dueAt ASC);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

    PRAGMA user_version = ${DATABASE_VERSION};
  `);
}
