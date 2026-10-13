import { supabase } from '@/lib/supabase';
import type {
  CleaningSchedule,
  CleaningTaskType,
  FeedingSchedule,
  Fish,
  LightingSchedule,
  PhotoAnalysis,
  Tank,
  TaskLog,
  WaterType,
} from '@/types/database';

export async function fetchTanks(): Promise<Tank[]> {
  const { data, error } = await supabase
    .from('tanks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTank(input: {
  name: string;
  volume_liters: number | null;
  water_type: WaterType;
  notes?: string | null;
}): Promise<Tank> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Nie si prihlásený/á.');

  const { data, error } = await supabase
    .from('tanks')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTank(tankId: string): Promise<void> {
  const { error } = await supabase.from('tanks').delete().eq('id', tankId);
  if (error) throw error;
}

export async function fetchFish(tankId: string): Promise<Fish[]> {
  const { data, error } = await supabase
    .from('fish')
    .select('*')
    .eq('tank_id', tankId)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addFish(input: {
  tank_id: string;
  species: string;
  nickname?: string | null;
  color?: string | null;
  count: number;
}): Promise<Fish> {
  const { data, error } = await supabase.from('fish').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFish(fishId: string): Promise<void> {
  const { error } = await supabase.from('fish').delete().eq('id', fishId);
  if (error) throw error;
}

export async function fetchFeedingSchedules(tankId?: string): Promise<FeedingSchedule[]> {
  let query = supabase.from('feeding_schedules').select('*').order('time_of_day');
  if (tankId) query = query.eq('tank_id', tankId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createFeedingSchedule(input: {
  tank_id: string;
  time_of_day: string;
  days_of_week: number[];
  food_type?: string | null;
  amount_note?: string | null;
}): Promise<FeedingSchedule> {
  const { data, error } = await supabase
    .from('feeding_schedules')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFeedingScheduleNotification(
  id: string,
  notification_id: string | null
): Promise<void> {
  const { error } = await supabase
    .from('feeding_schedules')
    .update({ notification_id })
    .eq('id', id);
  if (error) throw error;
}

export async function setFeedingScheduleEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from('feeding_schedules').update({ enabled }).eq('id', id);
  if (error) throw error;
}

export async function deleteFeedingSchedule(id: string): Promise<void> {
  const { error } = await supabase.from('feeding_schedules').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchCleaningSchedules(tankId?: string): Promise<CleaningSchedule[]> {
  let query = supabase.from('cleaning_schedules').select('*').order('next_due_at');
  if (tankId) query = query.eq('tank_id', tankId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createCleaningSchedule(input: {
  tank_id: string;
  task_type: CleaningTaskType;
  interval_days: number;
  next_due_at: string;
}): Promise<CleaningSchedule> {
  const { data, error } = await supabase
    .from('cleaning_schedules')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCleaningScheduleNotification(
  id: string,
  notification_id: string | null
): Promise<void> {
  const { error } = await supabase
    .from('cleaning_schedules')
    .update({ notification_id })
    .eq('id', id);
  if (error) throw error;
}

export async function markCleaningDone(schedule: CleaningSchedule): Promise<CleaningSchedule> {
  const now = new Date();
  const nextDue = new Date(now.getTime() + schedule.interval_days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('cleaning_schedules')
    .update({ last_done_at: now.toISOString(), next_due_at: nextDue.toISOString() })
    .eq('id', schedule.id)
    .select()
    .single();
  if (error) throw error;

  await supabase.from('task_logs').insert({
    tank_id: schedule.tank_id,
    task_type: schedule.task_type,
    done_at: now.toISOString(),
  });

  return data;
}

export async function deleteCleaningSchedule(id: string): Promise<void> {
  const { error } = await supabase.from('cleaning_schedules').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchLightingSchedules(tankId?: string): Promise<LightingSchedule[]> {
  let query = supabase.from('lighting_schedules').select('*').order('start_time');
  if (tankId) query = query.eq('tank_id', tankId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createLightingSchedule(input: {
  tank_id: string;
  start_time: string;
  duration_minutes: number;
  days_of_week: number[];
}): Promise<LightingSchedule> {
  const { data, error } = await supabase
    .from('lighting_schedules')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLightingScheduleNotifications(
  id: string,
  notification_on_id: string | null,
  notification_off_id: string | null
): Promise<void> {
  const { error } = await supabase
    .from('lighting_schedules')
    .update({ notification_on_id, notification_off_id })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteLightingSchedule(id: string): Promise<void> {
  const { error } = await supabase.from('lighting_schedules').delete().eq('id', id);
  if (error) throw error;
}

export async function logFeedingDone(tankId: string): Promise<TaskLog> {
  const { data, error } = await supabase
    .from('task_logs')
    .insert({ tank_id: tankId, task_type: 'feeding', done_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchRecentTaskLogs(limit = 20): Promise<TaskLog[]> {
  const { data, error } = await supabase
    .from('task_logs')
    .select('*')
    .order('done_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchPhotoAnalyses(tankId?: string): Promise<PhotoAnalysis[]> {
  let query = supabase.from('photo_analyses').select('*').order('created_at', { ascending: false });
  if (tankId) query = query.eq('tank_id', tankId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createPendingPhotoAnalysis(input: {
  tank_id: string | null;
  photo_path: string;
}): Promise<PhotoAnalysis> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Nie si prihlásený/á.');

  const { data, error } = await supabase
    .from('photo_analyses')
    .insert({ ...input, user_id: userData.user.id, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
