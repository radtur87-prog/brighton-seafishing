export type WaterType = 'freshwater' | 'brackish' | 'saltwater' | 'pond';

export type CleaningTaskType =
  | 'water_change'
  | 'filter_clean'
  | 'glass_clean'
  | 'gravel_vacuum'
  | 'other';

export type AnalysisStatus = 'pending' | 'done' | 'error';
export type RiskLevel = 'ok' | 'watch' | 'urgent';

export interface Tank {
  id: string;
  user_id: string;
  name: string;
  volume_liters: number | null;
  water_type: WaterType;
  notes: string | null;
  created_at: string;
}

export interface Fish {
  id: string;
  tank_id: string;
  species: string;
  nickname: string | null;
  color: string | null;
  count: number;
  added_at: string;
}

export interface FeedingSchedule {
  id: string;
  tank_id: string;
  time_of_day: string; // 'HH:mm:ss'
  days_of_week: number[]; // 0=Sunday .. 6=Saturday
  food_type: string | null;
  amount_note: string | null;
  enabled: boolean;
  notification_id: string | null;
  created_at: string;
}

export interface CleaningSchedule {
  id: string;
  tank_id: string;
  task_type: CleaningTaskType;
  interval_days: number;
  last_done_at: string | null;
  next_due_at: string;
  enabled: boolean;
  notification_id: string | null;
  created_at: string;
}

export interface LightingSchedule {
  id: string;
  tank_id: string;
  start_time: string; // 'HH:mm:ss'
  duration_minutes: number;
  days_of_week: number[]; // 0=Sunday .. 6=Saturday
  enabled: boolean;
  notification_on_id: string | null;
  notification_off_id: string | null;
  created_at: string;
}

export interface TaskLog {
  id: string;
  tank_id: string;
  task_type: string;
  done_at: string;
  note: string | null;
}

export interface PhotoFinding {
  label: string;
  severity: RiskLevel;
  detail: string;
}

export interface PhotoAnalysis {
  id: string;
  tank_id: string | null;
  user_id: string;
  photo_path: string;
  status: AnalysisStatus;
  summary: string | null;
  risk_level: RiskLevel | null;
  findings: PhotoFinding[] | null;
  error_message: string | null;
  created_at: string;
}

export const CLEANING_TASK_LABELS: Record<CleaningTaskType, string> = {
  water_change: 'Výmena vody',
  filter_clean: 'Čistenie filtra',
  glass_clean: 'Čistenie skla',
  gravel_vacuum: 'Vysávanie dna',
  other: 'Iná úloha',
};

export const DAY_LABELS = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
