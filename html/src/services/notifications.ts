import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { NotificationPermissionState } from '@/types/models';
import { truncateText } from '@/utils/date';

export const REMINDER_CHANNEL_ID = 'farm-reminders';

export type NotificationScheduleResult = {
  notificationId: string | null;
  permissionState: NotificationPermissionState;
};

function mapPermissionState(status: { granted: boolean; status: string }): NotificationPermissionState {
  if (status.granted) {
    return 'granted';
  }

  if (status.status === 'denied') {
    return 'denied';
  }

  return 'undetermined';
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: '巡田提醒',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
    enableVibrate: true,
  });
}

export async function getNotificationPermissionState() {
  if (Platform.OS === 'web') {
    return 'unsupported' as const;
  }

  const settings = await Notifications.getPermissionsAsync();
  return mapPermissionState(settings);
}

export async function scheduleTaskNotification(params: {
  taskId: string;
  entryId: string;
  noteText: string;
  dueAt: string;
}): Promise<NotificationScheduleResult> {
  if (Platform.OS === 'web') {
    return { notificationId: null, permissionState: 'unsupported' };
  }

  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  let permission = mapPermissionState(current);

  if (permission !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
    permission = mapPermissionState(requested);
  }

  if (permission !== 'granted') {
    return {
      notificationId: null,
      permissionState: permission,
    };
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '巡田提醒',
      body: truncateText(params.noteText.replace(/\s+/g, ' ').trim(), 60),
      sound: 'default',
      data: {
        entryId: params.entryId,
        taskId: params.taskId,
        url: `/tasks?focusTaskId=${params.taskId}`,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(params.dueAt),
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
    },
  });

  return {
    notificationId,
    permissionState: 'granted',
  };
}

export async function cancelScheduledTaskNotification(notificationId: string | null) {
  if (!notificationId || Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Best effort cancel so user actions don't fail on a stale ID.
  }
}
