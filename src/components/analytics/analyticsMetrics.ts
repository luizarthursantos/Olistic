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

function interpolateBodyEntries(entries: BodyEntry[]): BodyEntry[] {
  if (entries.length < 2) return entries;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const result: BodyEntry[] = [];

  const n = (v: unknown): number => { const x = Number(v); return isFinite(x) ? x : 0; };
  const lerp = (a: number, b: number, t: number) => Math.round((a + t * (b - a)) * 100) / 100;

  for (let i = 0; i < sorted.length; i++) {
    result.push(sorted[i]);
    if (i < sorted.length - 1) {
      const curr = sorted[i];
      const next = sorted[i + 1];
      const d1 = new Date(curr.date + 'T12:00:00');
      const d2 = new Date(next.date + 'T12:00:00');
      const daysBetween = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

      for (let day = 1; day < daysBetween; day++) {
        const t = day / daysBetween;
        const interpDate = new Date(d1.getTime() + day * 24 * 60 * 60 * 1000);
        const dateStr = interpDate.toISOString().split('T')[0];
        result.push({
          id: `interp-${dateStr}`,
          date: dateStr,
          weightKg: lerp(n(curr.weightKg), n(next.weightKg), t),
          waistCm: lerp(n(curr.waistCm), n(next.waistCm), t),
          neckCm: lerp(n(curr.neckCm), n(next.neckCm), t),
          activityLevel: curr.activityLevel,
        });
      }
    }
  }
  return result;
}

export function getMetricData(
  key: string,
  state: MetricDataState,
  exerciseId?: string
): { date: string; value: number }[] {
  const { bodyEntries, mealEntries, macroTargets, workoutSessions, settings } = state;
  const age = calcAge(settings.birthday);
  const n = (v: unknown): number => { const x = Number(v); return isFinite(x) ? x : 0; };

  // Use raw body entries — chart lines connect points directly (linear interpolation)
  const entries = bodyEntries;

  switch (key) {
    case 'weight':
      return entries.map((e) => ({ date: e.date, value: n(e.weightKg) }));

    case 'body_fat_pct':
      return entries.map((e) => ({
        date: e.date,
        value: calcBodyFatNavy(settings.sex, n(e.waistCm), n(e.neckCm), n(settings.heightCm)),
      }));

    case 'body_fat_kg':
      return entries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, n(e.waistCm), n(e.neckCm), n(settings.heightCm));
        return { date: e.date, value: Math.round(n(e.weightKg) * bf / 100 * 10) / 10 };
      });

    case 'lean_mass_pct':
      return entries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, n(e.waistCm), n(e.neckCm), n(settings.heightCm));
        return { date: e.date, value: Math.round((100 - bf) * 10) / 10 };
      });

    case 'lean_mass_kg':
      return entries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, n(e.waistCm), n(e.neckCm), n(settings.heightCm));
        return { date: e.date, value: Math.round(n(e.weightKg) * (1 - bf / 100) * 10) / 10 };
      });

    case 'waist':
      return entries.map((e) => ({ date: e.date, value: n(e.waistCm) }));

    case 'neck':
      return entries.map((e) => ({ date: e.date, value: n(e.neckCm) }));

    case 'ffmi':
      return entries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, n(e.waistCm), n(e.neckCm), n(settings.heightCm));
        return { date: e.date, value: calcFFMI(n(e.weightKg), bf, n(settings.heightCm)) };
      });

    case 'target_ffmi':
      return entries.map((e) => ({ date: e.date, value: n(settings.targetFFMI) }));

    case 'target_body_fat_pct':
      return entries.map((e) => ({ date: e.date, value: n(settings.targetBodyFatPct) }));

    case 'fat_to_lose_pct':
      return entries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, n(e.waistCm), n(e.neckCm), n(settings.heightCm));
        return { date: e.date, value: Math.max(0, Math.round((bf - n(settings.targetBodyFatPct)) * 10) / 10) };
      });

    case 'fat_to_lose_kg':
      return entries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, n(e.waistCm), n(e.neckCm), n(settings.heightCm));
        const currentFatKg = n(e.weightKg) * bf / 100;
        const targetFatKg = n(e.weightKg) * n(settings.targetBodyFatPct) / 100;
        return { date: e.date, value: Math.max(0, Math.round((currentFatKg - targetFatKg) * 10) / 10) };
      });

    case 'lean_to_gain_pct': {
      return entries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, n(e.waistCm), n(e.neckCm), n(settings.heightCm));
        const currentLeanPct = 100 - bf;
        const targetLeanPct = 100 - n(settings.targetBodyFatPct);
        return { date: e.date, value: Math.max(0, Math.round((targetLeanPct - currentLeanPct) * 10) / 10) };
      });
    }

    case 'lean_to_gain_kg': {
      return entries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, n(e.waistCm), n(e.neckCm), n(settings.heightCm));
        const currentFFMI = calcFFMI(n(e.weightKg), bf, n(settings.heightCm));
        const delta = n(settings.targetFFMI) - currentFFMI;
        const heightM = n(settings.heightCm) / 100;
        return { date: e.date, value: Math.max(0, Math.round(delta * heightM * heightM * 10) / 10) };
      });
    }

    case 'bmr':
      return entries.map((e) => ({
        date: e.date,
        value: calcBMR(settings.sex, n(e.weightKg), n(settings.heightCm), age),
      }));

    case 'tdee':
      return entries.map((e) => {
        const bmr = calcBMR(settings.sex, n(e.weightKg), n(settings.heightCm), age);
        const workoutCal = workoutSessions
          .filter((s) => s.date === e.date && s.completed)
          .reduce((sum, s) => sum + n(s.estimatedCalories), 0);
        return { date: e.date, value: calcTDEE(bmr, e.activityLevel) + workoutCal };
      });

    case 'caloric_balance': {
      return entries.map((e) => {
        const bmr = calcBMR(settings.sex, n(e.weightKg), n(settings.heightCm), age);
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
