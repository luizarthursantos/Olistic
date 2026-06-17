export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'slightly_active' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
export type UnitSystem = 'metric' | 'imperial';
export type ThemeMode = 'light' | 'dark';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type AiProvider = 'claude' | 'gemini';

export interface UserSettings {
  birthday: string; // ISO date
  sex: Sex;
  heightCm: number;
  targetBodyFatPct: number;
  targetFFMI: number;
  targetCaloricDelta: number; // positive = surplus, negative = deficit
  activityLevel: ActivityLevel;
  unitSystem: UnitSystem;
  theme: ThemeMode;
  onboardingComplete: boolean;
  claudeApiKey: string;
  geminiApiKey: string;
  aiProvider: AiProvider;
  chartLineAlpha: number; // 0-100, line opacity % when moving average enabled
  proteinPerKg: number;
  fatPerKg: number;
  fiberPerKg: number;
  sugarLimitG: number;
}

export interface BodyEntry {
  id: string;
  date: string; // ISO date
  weightKg: number;
  waistCm: number;
  neckCm: number;
  activityLevel: ActivityLevel;
}

export interface MacroTargets {
  id: string;
  date: string; // ISO date - forward filled
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
  fiberG: number;
}

export interface FoodItem {
  id: string;
  name: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
  fiberG: number;
  servingSize: number;
}

export interface MealEntry {
  id: string;
  date: string;
  mealType: MealType;
  name: string;
  quantityG?: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
  fiberG: number;
  calories: number;
  foodItemId?: string;
}

export interface Exercise {
  id: string;
  name: string;
  icon: string;
  isCardio: boolean;
  isCustom: boolean;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  color: string;
  exercises: WorkoutExerciseTemplate[];
}

export interface WorkoutExerciseTemplate {
  exerciseId: string;
  sets: number;
  defaultReps: number;
  defaultLoadKg: number;
  notes: string;
}

export interface WorkoutSession {
  id: string;
  templateId: string;
  date: string;
  startTime: string;
  endTime?: string;
  completed: boolean;
  exercises: WorkoutExerciseSession[];
  estimatedCalories: number;
}

export interface WorkoutExerciseSession {
  exerciseId: string;
  sets: WorkoutSet[];
  cardioMinutes?: number;
  estimatedCalories?: number;
}

export interface WorkoutSet {
  reps: number;
  loadKg: number;
  completed: boolean;
}

export interface AnalyticsChart {
  id: string;
  title: string;
  metrics: AnalyticsMetric[];
  dateRange: DateRangeOption;
  movingAverageDays: number;
  showMovingAverage: boolean;
  includeZeroLeft?: boolean;
  includeZeroRight?: boolean;
}

export interface AnalyticsMetric {
  key: string;
  label: string;
  color: string;
  axis: 'left' | 'right';
  chartType?: 'line' | 'bar';
  exerciseId?: string; // for one rep max
}

export type DateRangeOption = '1M' | '2M' | '3M' | '6M' | '12M' | '36M' | 'ALL';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  slightly_active: 1.3,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (office job)',
  slightly_active: 'Slightly Active (1-2 days/week)',
  lightly_active: 'Lightly Active (1-3 days/week)',
  moderately_active: 'Moderately Active (3-5 days/week)',
  very_active: 'Very Active (6-7 days/week)',
  extra_active: 'Extra Active (athlete)',
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
