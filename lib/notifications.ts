import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { CleaningSchedule, FeedingSchedule } from '@/types/database';
import { CLEANING_TASK_LABELS } from '@/types/database';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Zruší predošlú naplánovanú notifikáciu, ak existuje. */
export async function cancelScheduledNotification(notificationId: string | null | undefined) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // notifikácia už neexistuje – nič sa nedeje
  }
}

/**
 * Naplánuje opakovanú pripomienku kŕmenia pre každý vybraný deň v týždni.
 * expo-notifications vie plánovať iba jeden kalendárový trigger naraz, preto
 * pre viacero dní vytvoríme viac triggerov a id-čka spojíme čiarkou.
 */
export async function scheduleFeedingNotifications(
  schedule: Pick<FeedingSchedule, 'time_of_day' | 'days_of_week' | 'food_type'>,
  tankName: string
): Promise<string> {
  const [hour, minute] = schedule.time_of_day.split(':').map(Number);
  const ids: string[] = [];

  for (const weekday of schedule.days_of_week) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🐟 Kŕmenie – ${tankName}`,
        body: schedule.food_type ? `Čas na kŕmenie: ${schedule.food_type}` : 'Čas nakŕmiť ryby',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: expoWeekday(weekday),
        hour,
        minute,
      },
    });
    ids.push(id);
  }

  return ids.join(',');
}

/** Naplánuje jednorazovú pripomienku na konkrétny dátum (budúce čistenie). */
export async function scheduleCleaningNotification(
  schedule: Pick<CleaningSchedule, 'task_type' | 'next_due_at'>,
  tankName: string
): Promise<string> {
  const dueDate = new Date(schedule.next_due_at);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `🧽 ${CLEANING_TASK_LABELS[schedule.task_type]} – ${tankName}`,
      body: 'Dnes je naplánovaná údržba akvária.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dueDate,
    },
  });
}

export async function cancelNotificationGroup(idString: string | null | undefined) {
  if (!idString) return;
  await Promise.all(idString.split(',').map((id) => cancelScheduledNotification(id)));
}

/** JS Date.getDay(): 0=Nedeľa..6=Sobota. expo-notifications WEEKLY trigger: 1=Nedeľa..7=Sobota. */
function expoWeekday(jsWeekday: number): number {
  return jsWeekday + 1;
}

export function isAndroid() {
  return Platform.OS === 'android';
}
