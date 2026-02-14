import {
  UserSettings,
  BodyEntry,
  MacroTargets,
  MealEntry,
  Exercise,
  WorkoutSession,
} from '../../types';
import {
  calcBodyFatNavy,
  calcFFMI,
  calcBMR,
  calcTDEE,
  calcAge,
  getBestOneRepMax,
} from '../../utils/calculations';

export interface MetricDefinition {
  key: string;
  label: string;
  category: 'body' | 'food' | 'workout';
  unit: string;
  needsExercise?: boolean;
}

export const AVAILABLE_METRICS: MetricDefinition[] = [
  // Body
  { key: 'weight', label: 'Weight', category: 'body', unit: 'kg' },
  { key: 'body_fat_pct', label: 'Body Fat %', category: 'body', unit: '%' },
  { key: 'body_fat_kg', label: 'Body Fat (kg)', category: 'body', unit: 'kg' },
  { key: 'lean_mass_pct', label: 'Lean Mass %', category: 'body', unit: '%' },
  { key: 'lean_mass_kg', label: 'Lean Mass (kg)', category: 'body', unit: 'kg' },
  { key: 'waist', label: 'Waist Circumference', category: 'body', unit: 'cm' },
  { key: 'neck', label: 'Neck Circumference', category: 'body', unit: 'cm' },
  { key: 'ffmi', label: 'FFMI', category: 'body', unit: '' },
  { key: 'target_ffmi', label: 'Target FFMI', category: 'body', unit: '' },
  { key: 'target_body_fat_pct', label: 'Target Body Fat %', category: 'body', unit: '%' },
  { key: 'fat_to_lose_pct', label: 'Fat to Lose %', category: 'body', unit: '%' },
  { key: 'fat_to_lose_kg', label: 'Fat to Lose (kg)', category: 'body', unit: 'kg' },
  { key: 'weight_to_lose', label: 'Weight to Lose', category: 'body', unit: 'kg' },
  { key: 'lean_to_gain_pct', label: 'Lean Mass to Gain %', category: 'body', unit: '%' },
  { key: 'lean_to_gain_kg', label: 'Lean Mass to Gain (kg)', category: 'body', unit: 'kg' },
  { key: 'bmr', label: 'Basal Metabolic Rate', category: 'body', unit: 'kcal' },
  { key: 'tdee', label: 'Total Caloric Expenditure', category: 'body', unit: 'kcal' },
  { key: 'caloric_balance', label: 'Caloric Balance', category: 'body', unit: 'kcal' },
  // Food
  { key: 'food_calories', label: 'Calories', category: 'food', unit: 'kcal' },
  { key: 'food_protein', label: 'Protein', category: 'food', unit: 'g' },
  { key: 'food_carbs', label: 'Carbs', category: 'food', unit: 'g' },
  { key: 'food_fat', label: 'Fat', category: 'food', unit: 'g' },
  { key: 'food_sugar', label: 'Sugar', category: 'food', unit: 'g' },
  { key: 'food_fiber', label: 'Fiber', category: 'food', unit: 'g' },
  { key: 'food_target_calories', label: 'Target Calories', category: 'food', unit: 'kcal' },
  { key: 'food_target_protein', label: 'Target Protein', category: 'food', unit: 'g' },
  { key: 'food_target_carbs', label: 'Target Carbs', category: 'food', unit: 'g' },
  { key: 'food_target_fat', label: 'Target Fat', category: 'food', unit: 'g' },
  { key: 'food_delta_calories', label: 'Delta Calories', category: 'food', unit: 'kcal' },
  { key: 'food_delta_protein', label: 'Delta Protein', category: 'food', unit: 'g' },
  { key: 'food_delta_carbs', label: 'Delta Carbs', category: 'food', unit: 'g' },
  { key: 'food_delta_fat', label: 'Delta Fat', category: 'food', unit: 'g' },
  // Workout
  { key: 'workout_calories', label: 'Active Calories', category: 'workout', unit: 'kcal' },
  { key: 'one_rep_max', label: 'One Rep Max', category: 'workout', unit: 'kg', needsExercise: true },
];

interface MetricDataState {
  bodyEntries: BodyEntry[];
  mealEntries: MealEntry[];
  macroTargets: MacroTargets[];
  workoutSessions: WorkoutSession[];
  settings: UserSettings;
  exercises: Exercise[];
}

export function getMetricData(
  key: string,
  state: MetricDataState,
  exerciseId?: string
): { date: string; value: number }[] {
  const { bodyEntries, mealEntries, macroTargets, workoutSessions, settings } = state;
  const age = calcAge(settings.birthday);
  const n = (v: unknown): number => { const x = Number(v); return isFinite(x) ? x : 0; };

  const entries = bodyEntries;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // Helper: only include entries that have the required field(s) — for raw metrics
  const has = (e: BodyEntry, ...fields: (keyof BodyEntry)[]) =>
    fields.every((f) => n(e[f]) > 0);

  // Interpolate a missing field from surrounding entries that have it
  const interpolate = (date: string, field: 'weightKg' | 'waistCm' | 'neckCm'): number => {
    const before = sorted.filter((e) => e.date <= date && n(e[field]) > 0).pop();
    const after = sorted.find((e) => e.date >= date && n(e[field]) > 0);
    if (before && after && before.date !== after.date) {
      const d1 = new Date(before.date + 'T12:00:00').getTime();
      const d2 = new Date(after.date + 'T12:00:00').getTime();
      const dt = new Date(date + 'T12:00:00').getTime();
      const t = (dt - d1) / (d2 - d1);
      return Math.round((n(before[field]) + t * (n(after[field]) - n(before[field]))) * 10) / 10;
    }
    return n(before?.[field]) || n(after?.[field]) || 0;
  };

  // Resolve a field: use own value if present, otherwise interpolate
  const resolve = (e: BodyEntry, field: 'weightKg' | 'waistCm' | 'neckCm'): number => {
    const v = n(e[field]);
    return v > 0 ? v : interpolate(e.date, field);
  };

  switch (key) {
    // --- Raw metrics: only plot entries with actual data, connectNulls bridges gaps ---
    case 'weight':
      return entries.filter((e) => has(e, 'weightKg')).map((e) => ({ date: e.date, value: n(e.weightKg) }));

    case 'waist':
      return entries.filter((e) => has(e, 'waistCm')).map((e) => ({ date: e.date, value: n(e.waistCm) }));

    case 'neck':
      return entries.filter((e) => has(e, 'neckCm')).map((e) => ({ date: e.date, value: n(e.neckCm) }));

    // --- Calculated metrics: interpolate underlying fields, plot for every entry ---
    case 'body_fat_pct':
      return entries.filter((e) => resolve(e, 'waistCm') > 0 && resolve(e, 'neckCm') > 0).map((e) => ({
        date: e.date,
        value: calcBodyFatNavy(settings.sex, resolve(e, 'waistCm'), resolve(e, 'neckCm'), n(settings.heightCm)),
      }));

    case 'body_fat_kg':
      return entries.filter((e) => resolve(e, 'weightKg') > 0 && resolve(e, 'waistCm') > 0 && resolve(e, 'neckCm') > 0).map((e) => {
        const bf = calcBodyFatNavy(settings.sex, resolve(e, 'waistCm'), resolve(e, 'neckCm'), n(settings.heightCm));
        return { date: e.date, value: Math.round(resolve(e, 'weightKg') * bf / 100 * 10) / 10 };
      });

    case 'lean_mass_pct':
      return entries.filter((e) => resolve(e, 'waistCm') > 0 && resolve(e, 'neckCm') > 0).map((e) => {
        const bf = calcBodyFatNavy(settings.sex, resolve(e, 'waistCm'), resolve(e, 'neckCm'), n(settings.heightCm));
        return { date: e.date, value: Math.round((100 - bf) * 10) / 10 };
      });

    case 'lean_mass_kg':
      return entries.filter((e) => resolve(e, 'weightKg') > 0 && resolve(e, 'waistCm') > 0 && resolve(e, 'neckCm') > 0).map((e) => {
        const bf = calcBodyFatNavy(settings.sex, resolve(e, 'waistCm'), resolve(e, 'neckCm'), n(settings.heightCm));
        return { date: e.date, value: Math.round(resolve(e, 'weightKg') * (1 - bf / 100) * 10) / 10 };
      });

    case 'ffmi':
      return entries.filter((e) => resolve(e, 'weightKg') > 0 && resolve(e, 'waistCm') > 0 && resolve(e, 'neckCm') > 0).map((e) => {
        const bf = calcBodyFatNavy(settings.sex, resolve(e, 'waistCm'), resolve(e, 'neckCm'), n(settings.heightCm));
        return { date: e.date, value: calcFFMI(resolve(e, 'weightKg'), bf, n(settings.heightCm)) };
      });

    case 'target_ffmi':
      return entries.map((e) => ({ date: e.date, value: n(settings.targetFFMI) }));

    case 'target_body_fat_pct':
      return entries.map((e) => ({ date: e.date, value: n(settings.targetBodyFatPct) }));

    case 'fat_to_lose_pct':
      return entries.filter((e) => resolve(e, 'waistCm') > 0 && resolve(e, 'neckCm') > 0).map((e) => {
        const bf = calcBodyFatNavy(settings.sex, resolve(e, 'waistCm'), resolve(e, 'neckCm'), n(settings.heightCm));
        return { date: e.date, value: Math.max(0, Math.round((bf - n(settings.targetBodyFatPct)) * 10) / 10) };
      });

    case 'fat_to_lose_kg':
      return entries.filter((e) => resolve(e, 'weightKg') > 0 && resolve(e, 'waistCm') > 0 && resolve(e, 'neckCm') > 0).map((e) => {
        const bf = calcBodyFatNavy(settings.sex, resolve(e, 'waistCm'), resolve(e, 'neckCm'), n(settings.heightCm));
        const currentFatKg = resolve(e, 'weightKg') * bf / 100;
        const targetFatKg = resolve(e, 'weightKg') * n(settings.targetBodyFatPct) / 100;
        return { date: e.date, value: Math.max(0, Math.round((currentFatKg - targetFatKg) * 10) / 10) };
      });

    case 'weight_to_lose':
      return entries.filter((e) => resolve(e, 'weightKg') > 0 && resolve(e, 'waistCm') > 0 && resolve(e, 'neckCm') > 0).map((e) => {
        const w = resolve(e, 'weightKg');
        const bf = calcBodyFatNavy(settings.sex, resolve(e, 'waistCm'), resolve(e, 'neckCm'), n(settings.heightCm));
        const leanKg = w * (1 - bf / 100);
        const targetWeight = leanKg / (1 - n(settings.targetBodyFatPct) / 100);
        return { date: e.date, value: Math.max(0, Math.round((w - targetWeight) * 10) / 10) };
      });

    case 'lean_to_gain_pct':
      return entries.filter((e) => resolve(e, 'waistCm') > 0 && resolve(e, 'neckCm') > 0).map((e) => {
        const bf = calcBodyFatNavy(settings.sex, resolve(e, 'waistCm'), resolve(e, 'neckCm'), n(settings.heightCm));
        const currentLeanPct = 100 - bf;
        const targetLeanPct = 100 - n(settings.targetBodyFatPct);
        return { date: e.date, value: Math.max(0, Math.round((targetLeanPct - currentLeanPct) * 10) / 10) };
      });

    case 'lean_to_gain_kg':
      return entries.filter((e) => resolve(e, 'weightKg') > 0 && resolve(e, 'waistCm') > 0 && resolve(e, 'neckCm') > 0).map((e) => {
        const bf = calcBodyFatNavy(settings.sex, resolve(e, 'waistCm'), resolve(e, 'neckCm'), n(settings.heightCm));
        const currentFFMI = calcFFMI(resolve(e, 'weightKg'), bf, n(settings.heightCm));
        const delta = n(settings.targetFFMI) - currentFFMI;
        const heightM = n(settings.heightCm) / 100;
        return { date: e.date, value: Math.max(0, Math.round(delta * heightM * heightM * 10) / 10) };
      });

    case 'bmr':
      return entries.filter((e) => resolve(e, 'weightKg') > 0).map((e) => ({
        date: e.date,
        value: calcBMR(settings.sex, resolve(e, 'weightKg'), n(settings.heightCm), age),
      }));

    case 'tdee':
      return entries.filter((e) => resolve(e, 'weightKg') > 0).map((e) => {
        const bmr = calcBMR(settings.sex, resolve(e, 'weightKg'), n(settings.heightCm), age);
        const workoutCal = workoutSessions
          .filter((s) => s.date === e.date && s.completed)
          .reduce((sum, s) => sum + n(s.estimatedCalories), 0);
        return { date: e.date, value: calcTDEE(bmr, e.activityLevel) + workoutCal };
      });

    case 'caloric_balance': {
      // Only include dates where meals were actually logged, otherwise
      // consumed=0 produces a misleading large negative balance.
      const mealDates = new Set(mealEntries.map((m) => m.date));
      return entries.filter((e) => resolve(e, 'weightKg') > 0 && mealDates.has(e.date)).map((e) => {
        const bmr = calcBMR(settings.sex, resolve(e, 'weightKg'), n(settings.heightCm), age);
        const tdee = calcTDEE(bmr, e.activityLevel);
        const workoutCal = workoutSessions
          .filter((s) => s.date === e.date && s.completed)
          .reduce((sum, s) => sum + n(s.estimatedCalories), 0);
        const totalExpenditure = tdee + workoutCal;
        const consumed = mealEntries
          .filter((m) => m.date === e.date)
          .reduce((sum, m) => sum + n(m.calories), 0);
        return { date: e.date, value: consumed - totalExpenditure };
      });
    }

    case 'food_calories': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + n(m.calories); });
      return Object.entries(byDate).map(([date, value]) => ({ date, value }));
    }

    case 'food_protein': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + n(m.proteinG); });
      return Object.entries(byDate).map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
    }

    case 'food_carbs': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + n(m.carbsG); });
      return Object.entries(byDate).map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
    }

    case 'food_fat': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + n(m.fatG); });
      return Object.entries(byDate).map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
    }

    case 'food_sugar': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + n(m.sugarG); });
      return Object.entries(byDate).map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
    }

    case 'food_fiber': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + n(m.fiberG); });
      return Object.entries(byDate).map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
    }

    case 'food_target_calories': {
      const sorted = [...macroTargets].sort((a, b) => a.date.localeCompare(b.date));
      return sorted.map((t) => ({ date: t.date, value: n(t.calories) }));
    }

    case 'food_target_protein':
      return [...macroTargets].sort((a, b) => a.date.localeCompare(b.date)).map((t) => ({ date: t.date, value: n(t.proteinG) }));

    case 'food_target_carbs':
      return [...macroTargets].sort((a, b) => a.date.localeCompare(b.date)).map((t) => ({ date: t.date, value: n(t.carbsG) }));

    case 'food_target_fat':
      return [...macroTargets].sort((a, b) => a.date.localeCompare(b.date)).map((t) => ({ date: t.date, value: n(t.fatG) }));

    case 'food_delta_calories': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + n(m.calories); });
      const sortedTargets = [...macroTargets].sort((a, b) => b.date.localeCompare(a.date));
      return Object.entries(byDate).map(([date, consumed]) => {
        const target = sortedTargets.find((t) => t.date <= date);
        return { date, value: consumed - n(target?.calories) };
      });
    }

    case 'food_delta_protein': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + n(m.proteinG); });
      const sortedTargets = [...macroTargets].sort((a, b) => b.date.localeCompare(a.date));
      return Object.entries(byDate).map(([date, consumed]) => {
        const target = sortedTargets.find((t) => t.date <= date);
        return { date, value: Math.round((consumed - n(target?.proteinG)) * 10) / 10 };
      });
    }

    case 'food_delta_carbs': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + n(m.carbsG); });
      const sortedTargets = [...macroTargets].sort((a, b) => b.date.localeCompare(a.date));
      return Object.entries(byDate).map(([date, consumed]) => {
        const target = sortedTargets.find((t) => t.date <= date);
        return { date, value: Math.round((consumed - n(target?.carbsG)) * 10) / 10 };
      });
    }

    case 'food_delta_fat': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + n(m.fatG); });
      const sortedTargets = [...macroTargets].sort((a, b) => b.date.localeCompare(a.date));
      return Object.entries(byDate).map(([date, consumed]) => {
        const target = sortedTargets.find((t) => t.date <= date);
        return { date, value: Math.round((consumed - n(target?.fatG)) * 10) / 10 };
      });
    }

    case 'workout_calories': {
      const byDate: Record<string, number> = {};
      workoutSessions.filter((s) => s.completed).forEach((s) => {
        byDate[s.date] = (byDate[s.date] || 0) + n(s.estimatedCalories);
      });
      return Object.entries(byDate).map(([date, value]) => ({ date, value }));
    }

    case 'one_rep_max': {
      if (!exerciseId) return [];
      const byDate: Record<string, number> = {};
      workoutSessions.filter((s) => s.completed).forEach((s) => {
        const exSession = s.exercises.find((e) => e.exerciseId === exerciseId);
        if (exSession) {
          const orm = getBestOneRepMax(exSession.sets);
          if (orm > 0) {
            byDate[s.date] = Math.max(byDate[s.date] || 0, orm);
          }
        }
      });
      return Object.entries(byDate).map(([date, value]) => ({ date, value }));
    }

    default:
      return [];
  }
}
