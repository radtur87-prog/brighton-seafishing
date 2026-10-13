import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { CleaningSchedule, FeedingSchedule, LightingSchedule } from '@/types/database';
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

/**
 * Naplánuje pripomienku zapnutia a vypnutia osvetlenia pre každý vybraný deň.
 * Ak dĺžka svietenia presiahne polnoc, "vypnúť" notifikácia sa posunie na
 * nasledujúci deň v týždni.
 */
export async function scheduleLightingNotifications(
  schedule: Pick<LightingSchedule, 'start_time' | 'duration_minutes' | 'days_of_week'>,
  tankName: string
): Promise<{ onId: string; offId: string }> {
  const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = startTotalMinutes + schedule.duration_minutes;
  const dayOffset = Math.floor(endTotalMinutes / 1440);
  const endMinutesOfDay = endTotalMinutes % 1440;
  const endHour = Math.floor(endMinutesOfDay / 60);
  const endMinute = endMinutesOfDay % 60;

  const onIds: string[] = [];
  const offIds: string[] = [];

  for (const weekday of schedule.days_of_week) {
    const onId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `💡 Zapnúť svetlo – ${tankName}`,
        body: 'Je čas zapnúť osvetlenie akvária.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: expoWeekday(weekday),
        hour: startHour,
        minute: startMinute,
      },
    });
    onIds.push(onId);

    const offWeekday = (weekday + dayOffset) % 7;
    const offId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🌙 Vypnúť svetlo – ${tankName}`,
        body: 'Je čas vypnúť osvetlenie akvária.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: expoWeekday(offWeekday),
        hour: endHour,
        minute: endMinute,
      },
    });
    offIds.push(offId);
  }

  return { onId: onIds.join(','), offId: offIds.join(',') };
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
