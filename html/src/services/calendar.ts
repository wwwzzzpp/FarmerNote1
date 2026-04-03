import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

import type { CalendarSyncStatus } from '@/types/models';
import { truncateText } from '@/utils/date';

let cachedCalendarId: string | null = null;

export type CalendarSyncResult = {
  calendarEventId: string | null;
  syncStatus: CalendarSyncStatus;
};

async function ensureCalendarPermission() {
  if (Platform.OS === 'web') {
    return 'unsupported' as const;
  }

  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.granted) {
    return 'granted' as const;
  }

  const requested = await Calendar.requestCalendarPermissionsAsync();
  return requested.granted ? 'granted' : 'denied';
}

async function getWritableCalendarId() {
  if (cachedCalendarId) {
    return cachedCalendarId;
  }

  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    cachedCalendarId = defaultCalendar.id;
    return cachedCalendarId;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((calendar) => calendar.allowsModifications);

  if (writable) {
    cachedCalendarId = writable.id;
    return cachedCalendarId;
  }

  const newCalendarId = await Calendar.createCalendarAsync({
    title: 'FarmerNote',
    color: '#4C7C3D',
    entityType: Calendar.EntityTypes.EVENT,
    source: {
      isLocalAccount: true,
      name: 'FarmerNote',
      type: Calendar.SourceType.LOCAL,
    },
    name: 'farmernote-local',
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  cachedCalendarId = newCalendarId;
  return cachedCalendarId;
}

function buildEventDetails(params: { noteText: string; dueAt: string; taskId: string }) {
  const startDate = new Date(params.dueAt);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    title: `巡田任务：${truncateText(params.noteText.replace(/\s+/g, ' ').trim(), 20)}`,
    notes: params.noteText,
    startDate,
    endDate,
    timeZone,
    endTimeZone: timeZone,
    allDay: false,
    availability: Calendar.Availability.BUSY,
    alarms: [{ relativeOffset: 0 }],
    url: `farmernote1://tasks?focusTaskId=${params.taskId}`,
  };
}

export async function upsertCalendarEvent(params: {
  existingEventId?: string | null;
  noteText: string;
  dueAt: string;
  taskId: string;
}): Promise<CalendarSyncResult> {
  if (Platform.OS === 'web') {
    return { calendarEventId: null, syncStatus: 'unsupported' };
  }

  const permission = await ensureCalendarPermission();
  if (permission !== 'granted') {
    return {
      calendarEventId: params.existingEventId ?? null,
      syncStatus: permission === 'unsupported' ? 'unsupported' : 'permission_denied',
    };
  }

  try {
    const calendarId = await getWritableCalendarId();
    const details = buildEventDetails(params);

    if (params.existingEventId) {
      try {
        await Calendar.updateEventAsync(params.existingEventId, details);
        return {
          calendarEventId: params.existingEventId,
          syncStatus: 'synced',
        };
      } catch {
        // Fall back to creating a fresh event if the stored ID is no longer valid.
      }
    }

    const calendarEventId = await Calendar.createEventAsync(calendarId, details);
    return {
      calendarEventId,
      syncStatus: 'synced',
    };
  } catch {
    return {
      calendarEventId: params.existingEventId ?? null,
      syncStatus: 'failed',
    };
  }
}

export async function removeCalendarEvent(calendarEventId: string | null) {
  if (!calendarEventId || Platform.OS === 'web') {
    return;
  }

  try {
    await Calendar.deleteEventAsync(calendarEventId);
  } catch {
    // Ignore stale event IDs so task actions can continue.
  }
}
