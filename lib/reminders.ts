import type { CleaningSchedule, CleaningTaskType, FeedingSchedule, LightingSchedule } from '@/types/database';
import {
  createCleaningSchedule,
  createFeedingSchedule,
  createLightingSchedule,
  deleteCleaningSchedule,
  deleteFeedingSchedule,
  deleteLightingSchedule,
  deleteTank,
  fetchCleaningSchedules,
  fetchFeedingSchedules,
  fetchLightingSchedules,
  markCleaningDone,
  updateCleaningScheduleNotification,
  updateFeedingScheduleNotification,
  updateLightingScheduleNotifications,
} from '@/lib/queries';
import {
  cancelNotificationGroup,
  scheduleCleaningNotification,
  scheduleFeedingNotifications,
  scheduleLightingNotifications,
} from '@/lib/notifications';

// A reminder that fails to schedule must never block saving the plan itself.
async function optional<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function addFeedingSchedule(
  input: Parameters<typeof createFeedingSchedule>[0],
  tankName: string
): Promise<FeedingSchedule> {
  const schedule = await createFeedingSchedule(input);
  const notificationId = await optional(() => scheduleFeedingNotifications(schedule, tankName));
  if (notificationId) {
    await updateFeedingScheduleNotification(schedule.id, notificationId);
    return { ...schedule, notification_id: notificationId };
  }
  return schedule;
}

export async function removeFeedingSchedule(schedule: FeedingSchedule): Promise<void> {
  await cancelNotificationGroup(schedule.notification_id);
  await deleteFeedingSchedule(schedule.id);
}

export async function addCleaningSchedule(
  input: { tank_id: string; task_type: CleaningTaskType; interval_days: number; next_due_at: string },
  tankName: string
): Promise<CleaningSchedule> {
  const schedule = await createCleaningSchedule(input);
  const notificationId = await optional(() => scheduleCleaningNotification(schedule, tankName));
  if (notificationId) {
    await updateCleaningScheduleNotification(schedule.id, notificationId);
    return { ...schedule, notification_id: notificationId };
  }
  return schedule;
}

export async function removeCleaningSchedule(schedule: CleaningSchedule): Promise<void> {
  await cancelNotificationGroup(schedule.notification_id);
  await deleteCleaningSchedule(schedule.id);
}

export async function completeCleaning(schedule: CleaningSchedule, tankName: string): Promise<CleaningSchedule> {
  await cancelNotificationGroup(schedule.notification_id);
  const updated = await markCleaningDone(schedule);
  const notificationId = await optional(() => scheduleCleaningNotification(updated, tankName));
  await updateCleaningScheduleNotification(updated.id, notificationId);
  return { ...updated, notification_id: notificationId };
}

export async function addLightingSchedule(
  input: Parameters<typeof createLightingSchedule>[0],
  tankName: string
): Promise<LightingSchedule> {
  const schedule = await createLightingSchedule(input);
  const ids = await optional(() => scheduleLightingNotifications(schedule, tankName));
  if (ids) {
    await updateLightingScheduleNotifications(schedule.id, ids.onId, ids.offId);
    return { ...schedule, notification_on_id: ids.onId, notification_off_id: ids.offId };
  }
  return schedule;
}

export async function removeLightingSchedule(schedule: LightingSchedule): Promise<void> {
  await cancelNotificationGroup(schedule.notification_on_id);
  await cancelNotificationGroup(schedule.notification_off_id);
  await deleteLightingSchedule(schedule.id);
}

/** Deleting a tank cascades its schedules in the DB; cancel their device reminders first. */
export async function removeTank(tankId: string): Promise<void> {
  const [feedings, cleanings, lightings] = await Promise.all([
    fetchFeedingSchedules(tankId),
    fetchCleaningSchedules(tankId),
    fetchLightingSchedules(tankId),
  ]);
  await Promise.all([
    ...feedings.map((f) => cancelNotificationGroup(f.notification_id)),
    ...cleanings.map((c) => cancelNotificationGroup(c.notification_id)),
    ...lightings.flatMap((l) => [
      cancelNotificationGroup(l.notification_on_id),
      cancelNotificationGroup(l.notification_off_id),
    ]),
  ]);
  await deleteTank(tankId);
}
