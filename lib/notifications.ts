import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { CleaningSchedule, FeedingSchedule, LightingSchedule } from '@/types/database';
import { CLEANING_TASK_LABELS } from '@/types/database';
import { lightingOffTime, parseTime, toExpoWeekday } from '@/lib/time';

// Scheduled local notifications only exist on iOS/Android; on web every call is a no-op.
export const notificationsSupported = Platform.OS !== 'web';

if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export type NotificationStatus = 'granted' | 'denied' | 'unsupported';

export async function getNotificationStatus(): Promise<NotificationStatus> {
  if (!notificationsSupported) return 'unsupported';
  const current = await Notifications.getPermissionsAsync();
  return current.granted ? 'granted' : 'denied';
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function scheduleWeekly(title: string, body: string, weekday: number, hour: number, minute: number) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: toExpoWeekday(weekday),
      hour,
      minute,
    },
  });
}

/** Returns comma-joined ids (one weekly trigger per selected day), or null when not scheduled. */
export async function scheduleFeedingNotifications(
  schedule: Pick<FeedingSchedule, 'time_of_day' | 'days_of_week' | 'food_type'>,
  tankName: string
): Promise<string | null> {
  if (!(await ensureNotificationPermission())) return null;
  const { hour, minute } = parseTime(schedule.time_of_day);
  const body = schedule.food_type ? `Čas na kŕmenie: ${schedule.food_type}` : 'Čas nakŕmiť ryby';
  const ids: string[] = [];
  for (const weekday of schedule.days_of_week) {
    ids.push(await scheduleWeekly(`🐟 Kŕmenie – ${tankName}`, body, weekday, hour, minute));
  }
  return ids.join(',');
}

export async function scheduleCleaningNotification(
  schedule: Pick<CleaningSchedule, 'task_type' | 'next_due_at'>,
  tankName: string
): Promise<string | null> {
  if (!(await ensureNotificationPermission())) return null;
  const dueDate = new Date(schedule.next_due_at);
  if (dueDate.getTime() <= Date.now()) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `🧽 ${CLEANING_TASK_LABELS[schedule.task_type]} – ${tankName}`,
      body: 'Dnes je naplánovaná údržba akvária.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dueDate },
  });
}

export async function scheduleLightingNotifications(
  schedule: Pick<LightingSchedule, 'start_time' | 'duration_minutes' | 'days_of_week'>,
  tankName: string
): Promise<{ onId: string; offId: string } | null> {
  if (!(await ensureNotificationPermission())) return null;
  const start = parseTime(schedule.start_time);
  const onIds: string[] = [];
  const offIds: string[] = [];
  for (const weekday of schedule.days_of_week) {
    onIds.push(
      await scheduleWeekly(
        `💡 Zapnúť svetlo – ${tankName}`,
        'Je čas zapnúť osvetlenie akvária.',
        weekday,
        start.hour,
        start.minute
      )
    );
    const off = lightingOffTime(schedule.start_time, schedule.duration_minutes, weekday);
    offIds.push(
      await scheduleWeekly(
        `🌙 Vypnúť svetlo – ${tankName}`,
        'Je čas vypnúť osvetlenie akvária.',
        off.weekday,
        off.hour,
        off.minute
      )
    );
  }
  return { onId: onIds.join(','), offId: offIds.join(',') };
}

export async function cancelNotificationGroup(idString: string | null | undefined) {
  if (!notificationsSupported || !idString) return;
  await Promise.all(
    idString.split(',').map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)
    )
  );
}
