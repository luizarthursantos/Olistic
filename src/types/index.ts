export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'slightly_active' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
export type UnitSystem = 'metric' | 'imperial';
export type ThemeMode = 'light' | 'dark';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type AiProvider = 'claude' | 'gemini';
/**
 * A Claude model id. Plain string rather than a fixed union: the list can be
 * extended at runtime from the Models API, so any id the API offers is valid.
 */
export type ClaudeModel = string;

export interface ClaudeModelOption {
  id: ClaudeModel;
  label: string;
}

/** Built-in choices, used until the list has been refreshed from the API. */
export const CLAUDE_MODEL_LABELS: Record<ClaudeModel, string> = {
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-sonnet-5': 'Claude Sonnet 5',
  'claude-opus-5': 'Claude Opus 5',
  'claude-haiku-4-5': 'Claude Haiku 4.5',
};

export const DEFAULT_CLAUDE_MODEL_OPTIONS: ClaudeModelOption[] =
  Object.entries(CLAUDE_MODEL_LABELS).map(([id, label]) => ({ id, label }));

/** The models offered in Settings: the refreshed list if there is one. */
export function getClaudeModelOptions(settings: Pick<UserSettings, 'claudeModels'>): ClaudeModelOption[] {
  return settings.claudeModels?.length ? settings.claudeModels : DEFAULT_CLAUDE_MODEL_OPTIONS;
}

export function getClaudeModelLabel(settings: Pick<UserSettings, 'claudeModels'>, id: ClaudeModel): string {
  return getClaudeModelOptions(settings).find((m) => m.id === id)?.label ?? CLAUDE_MODEL_LABELS[id] ?? id;
}

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
  claudeModel: ClaudeModel;
  /** Model list after "Check for new models"; absent until first refreshed. */
  claudeModels?: ClaudeModelOption[];
  chartLineAlpha: number; // 0-100, line opacity % when moving average enabled
  proteinPerKg: number;
  fatPerKg: number;
  fiberPerKg: number;
  sugarLimitG: number;
  /** How many past days the exported 1RM report covers. */
  report1rmDays: number;
}

export interface BodyEntry {
  id: string;
  date: string; // ISO date
  weightKg: number;
  waistCm: number;
  neckCm: number;
  /** Optional: entries logged before biceps tracking existed have none. */
  bicepsCm?: number;
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

/**
 * One food inside a saved meal. The food's macros are copied in (per
 * `servingSize` grams) rather than referenced, so editing or deleting the food
 * in the library never changes or breaks a meal that was saved with it.
 */
export interface SavedMealItem {
  foodItemId?: string;
  name: string;
  servingSize: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
  fiberG: number;
  /** How much of the food the meal contains. */
  quantityG: number;
}

/** A named set of foods that can be logged together in one tap. */
export interface SavedMeal {
  id: string;
  name: string;
  items: SavedMealItem[];
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
  /**
   * Retired from the workout list but kept so past sessions can still resolve
   * their name. Deleting a template instead orphans its history.
   */
  archived?: boolean;
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
  /**
   * Copied from the template when the session starts. Held on the session so
   * it survives replacing the exercise, which would otherwise break the
   * template lookup that used to resolve it.
   */
  note?: string;
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
