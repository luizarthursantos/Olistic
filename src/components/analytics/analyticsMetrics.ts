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

export function getMetricData(
  key: string,
  state: MetricDataState,
  exerciseId?: string
): { date: string; value: number }[] {
  const { bodyEntries, mealEntries, macroTargets, workoutSessions, settings } = state;
  const age = calcAge(settings.birthday);

  switch (key) {
    case 'weight':
      return bodyEntries.map((e) => ({ date: e.date, value: e.weightKg }));

    case 'body_fat_pct':
      return bodyEntries.map((e) => ({
        date: e.date,
        value: calcBodyFatNavy(settings.sex, e.waistCm, e.neckCm, settings.heightCm),
      }));

    case 'body_fat_kg':
      return bodyEntries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, e.waistCm, e.neckCm, settings.heightCm);
        return { date: e.date, value: Math.round(e.weightKg * bf / 100 * 10) / 10 };
      });

    case 'lean_mass_pct':
      return bodyEntries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, e.waistCm, e.neckCm, settings.heightCm);
        return { date: e.date, value: Math.round((100 - bf) * 10) / 10 };
      });

    case 'lean_mass_kg':
      return bodyEntries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, e.waistCm, e.neckCm, settings.heightCm);
        return { date: e.date, value: Math.round(e.weightKg * (1 - bf / 100) * 10) / 10 };
      });

    case 'waist':
      return bodyEntries.map((e) => ({ date: e.date, value: e.waistCm }));

    case 'neck':
      return bodyEntries.map((e) => ({ date: e.date, value: e.neckCm }));

    case 'ffmi':
      return bodyEntries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, e.waistCm, e.neckCm, settings.heightCm);
        return { date: e.date, value: calcFFMI(e.weightKg, bf, settings.heightCm) };
      });

    case 'fat_to_lose_pct':
      return bodyEntries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, e.waistCm, e.neckCm, settings.heightCm);
        return { date: e.date, value: Math.max(0, Math.round((bf - settings.targetBodyFatPct) * 10) / 10) };
      });

    case 'fat_to_lose_kg':
      return bodyEntries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, e.waistCm, e.neckCm, settings.heightCm);
        const currentFatKg = e.weightKg * bf / 100;
        const targetFatKg = e.weightKg * settings.targetBodyFatPct / 100;
        return { date: e.date, value: Math.max(0, Math.round((currentFatKg - targetFatKg) * 10) / 10) };
      });

    case 'lean_to_gain_pct': {
      return bodyEntries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, e.waistCm, e.neckCm, settings.heightCm);
        const currentLeanPct = 100 - bf;
        const targetLeanPct = 100 - settings.targetBodyFatPct;
        return { date: e.date, value: Math.max(0, Math.round((targetLeanPct - currentLeanPct) * 10) / 10) };
      });
    }

    case 'lean_to_gain_kg': {
      return bodyEntries.map((e) => {
        const bf = calcBodyFatNavy(settings.sex, e.waistCm, e.neckCm, settings.heightCm);
        const currentFFMI = calcFFMI(e.weightKg, bf, settings.heightCm);
        const delta = settings.targetFFMI - currentFFMI;
        const heightM = settings.heightCm / 100;
        return { date: e.date, value: Math.max(0, Math.round(delta * heightM * heightM * 10) / 10) };
      });
    }

    case 'bmr':
      return bodyEntries.map((e) => ({
        date: e.date,
        value: calcBMR(settings.sex, e.weightKg, settings.heightCm, age),
      }));

    case 'tdee':
      return bodyEntries.map((e) => {
        const bmr = calcBMR(settings.sex, e.weightKg, settings.heightCm, age);
        const workoutCal = workoutSessions
          .filter((s) => s.date === e.date && s.completed)
          .reduce((sum, s) => sum + s.estimatedCalories, 0);
        return { date: e.date, value: calcTDEE(bmr, e.activityLevel) + workoutCal };
      });

    case 'caloric_balance': {
      return bodyEntries.map((e) => {
        const bmr = calcBMR(settings.sex, e.weightKg, settings.heightCm, age);
        const tdee = calcTDEE(bmr, e.activityLevel);
        const workoutCal = workoutSessions
          .filter((s) => s.date === e.date && s.completed)
          .reduce((sum, s) => sum + s.estimatedCalories, 0);
        const totalExpenditure = tdee + workoutCal;
        const consumed = mealEntries
          .filter((m) => m.date === e.date)
          .reduce((sum, m) => sum + m.calories, 0);
        return { date: e.date, value: consumed - totalExpenditure };
      });
    }

    case 'food_calories': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + m.calories; });
      return Object.entries(byDate).map(([date, value]) => ({ date, value }));
    }

    case 'food_protein': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + m.proteinG; });
      return Object.entries(byDate).map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
    }

    case 'food_carbs': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + m.carbsG; });
      return Object.entries(byDate).map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
    }

    case 'food_fat': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + m.fatG; });
      return Object.entries(byDate).map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
    }

    case 'food_sugar': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + m.sugarG; });
      return Object.entries(byDate).map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
    }

    case 'food_fiber': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + m.fiberG; });
      return Object.entries(byDate).map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
    }

    case 'food_target_calories': {
      const sorted = [...macroTargets].sort((a, b) => a.date.localeCompare(b.date));
      return sorted.map((t) => ({ date: t.date, value: t.calories }));
    }

    case 'food_target_protein':
      return [...macroTargets].sort((a, b) => a.date.localeCompare(b.date)).map((t) => ({ date: t.date, value: t.proteinG }));

    case 'food_target_carbs':
      return [...macroTargets].sort((a, b) => a.date.localeCompare(b.date)).map((t) => ({ date: t.date, value: t.carbsG }));

    case 'food_target_fat':
      return [...macroTargets].sort((a, b) => a.date.localeCompare(b.date)).map((t) => ({ date: t.date, value: t.fatG }));

    case 'food_delta_calories': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + m.calories; });
      const sortedTargets = [...macroTargets].sort((a, b) => b.date.localeCompare(a.date));
      return Object.entries(byDate).map(([date, consumed]) => {
        const target = sortedTargets.find((t) => t.date <= date);
        return { date, value: consumed - (target?.calories || 0) };
      });
    }

    case 'food_delta_protein': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + m.proteinG; });
      const sortedTargets = [...macroTargets].sort((a, b) => b.date.localeCompare(a.date));
      return Object.entries(byDate).map(([date, consumed]) => {
        const target = sortedTargets.find((t) => t.date <= date);
        return { date, value: Math.round((consumed - (target?.proteinG || 0)) * 10) / 10 };
      });
    }

    case 'food_delta_carbs': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + m.carbsG; });
      const sortedTargets = [...macroTargets].sort((a, b) => b.date.localeCompare(a.date));
      return Object.entries(byDate).map(([date, consumed]) => {
        const target = sortedTargets.find((t) => t.date <= date);
        return { date, value: Math.round((consumed - (target?.carbsG || 0)) * 10) / 10 };
      });
    }

    case 'food_delta_fat': {
      const byDate: Record<string, number> = {};
      mealEntries.forEach((m) => { byDate[m.date] = (byDate[m.date] || 0) + m.fatG; });
      const sortedTargets = [...macroTargets].sort((a, b) => b.date.localeCompare(a.date));
      return Object.entries(byDate).map(([date, consumed]) => {
        const target = sortedTargets.find((t) => t.date <= date);
        return { date, value: Math.round((consumed - (target?.fatG || 0)) * 10) / 10 };
      });
    }

    case 'workout_calories': {
      const byDate: Record<string, number> = {};
      workoutSessions.filter((s) => s.completed).forEach((s) => {
        byDate[s.date] = (byDate[s.date] || 0) + s.estimatedCalories;
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
