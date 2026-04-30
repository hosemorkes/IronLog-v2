/** Ответ GET /api/auth/me */

export interface CurrentUserDto {
  id: string;
  email: string;
  username: string;
}

/** GET /api/user/progress */

export interface WeeklyDayTonnageDto {
  date: string;
  day_label: string;
  tonnage_kg: number;
  is_today: boolean;
}

export interface UserProgressDto {
  total_lifetime_tonnage_kg: number;
  weekly_tonnage_by_day: WeeklyDayTonnageDto[];
  workout_streak_days: number;
  workouts_completed_total: number;
  workouts_completed_this_month: number;
  active_session_id: string | null;
}

/** GET /api/user/progress/recent-prs */

export interface RecentPrItemDto {
  exercise_id: string;
  exercise_name: string;
  set_num: number;
  reps_done: number;
  weight_kg: number | null;
  volume_kg: number;
  achieved_at: string;
}

export interface RecentPrListDto {
  items: RecentPrItemDto[];
}

/** GET /api/user/achievements */

export interface UserAchievementFeedItemDto {
  achievement_id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  unlocked_at: string;
}

export interface UserAchievementFeedDto {
  items: UserAchievementFeedItemDto[];
}
