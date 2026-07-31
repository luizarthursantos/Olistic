import { ActivityLevel, ACTIVITY_MULTIPLIERS, BodyEntry, WorkoutSet } from '../types';

/**
 * Format a Date as YYYY-MM-DD in the local timezone
 */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Navy Method body fat calculation
 */
export function calcBodyFatNavy(
  sex: 'male' | 'female',
  waistCm: number,
  neckCm: number,
  heightCm: number
): number {
  if (!waistCm || !neckCm || !heightCm || waistCm <= neckCm) return 0;

  if (sex === 'male') {
    // Male: 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
    const bf =
      495 /
        (1.0324 -
          0.19077 * Math.log10(waistCm - neckCm) +
          0.15456 * Math.log10(heightCm)) -
      450;
    return Math.max(0, Math.round(bf * 10) / 10);
  } else {
    // Female: 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450
    // Since we don't have hip measurement, we use a simplified version
    const bf =
      495 /
        (1.29579 -
          0.35004 * Math.log10(waistCm - neckCm) +
          0.221 * Math.log10(heightCm)) -
      450;
    return Math.max(0, Math.round(bf * 10) / 10);
  }
}

/**
 * Calculate FFMI (Fat-Free Mass Index)
 */
export function calcFFMI(weightKg: number, bodyFatPct: number, heightCm: number): number {
  const heightM = heightCm / 100;
  const leanMassKg = weightKg * (1 - bodyFatPct / 100);
  const ffmi = leanMassKg / (heightM * heightM);
  // Normalized FFMI (adjusted to 1.8m). Two decimals: FFMI moves slowly, so a
  // single decimal hides real week-to-week change.
  return Math.round((ffmi + 6.1 * (1.8 - heightM)) * 100) / 100;
}

/**
 * Basal Metabolic Rate (Mifflin-St Jeor)
 */
export function calcBMR(
  sex: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  ageYears: number
): number {
  if (sex === 'male') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5);
  } else {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161);
  }
}

/**
 * Total Daily Energy Expenditure
 */
export function calcTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Calculate calories from macros
 */
export function calcCaloriesFromMacros(
  proteinG: number,
  carbsG: number,
  fatG: number,
  fiberG: number = 0
): number {
  return Math.round(proteinG * 4 + carbsG * 4 + fatG * 9 + fiberG * 2);
}

/**
 * Calculate age from birthday
 */
export function calcAge(birthday: string): number {
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Estimate workout calories (rough estimate based on duration and intensity)
 */
export function estimateWorkoutCalories(
  weightKg: number,
  durationMinutes: number,
  isCardio: boolean
): number {
  // MET values: weightlifting ~3.5, running ~8, walking ~3.5
  const met = isCardio ? 7 : 3.5;
  return Math.round((met * weightKg * durationMinutes) / 60);
}

/**
 * Estimate cardio calories
 */
export function estimateCardioCalories(
  weightKg: number,
  minutes: number,
  exerciseName: string
): number {
  const met = exerciseName.toLowerCase().includes('run') ? 8 : 3.5;
  return Math.round((met * weightKg * minutes) / 60);
}

/**
 * Epley formula for 1RM
 */
export function calcOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps === 0 || weight === 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

/**
 * Get best 1RM from sets
 */
export function getBestOneRepMax(sets: WorkoutSet[]): number {
  return Math.max(0, ...sets.filter(s => s.completed).map(s => calcOneRepMax(s.loadKg, s.reps)));
}

/**
 * Calculate moving average
 */
export function movingAverage(data: { date: string; value: number }[], windowDays: number): { date: string; value: number }[] {
  if (data.length === 0) return [];
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((point, i) => {
    const cutoff = new Date(point.date);
    cutoff.setDate(cutoff.getDate() - windowDays);
    const cutoffStr = toLocalDateStr(cutoff);
    const window = sorted.filter(
      (p, j) => j <= i && p.date >= cutoffStr
    );
    const avg = window.reduce((sum, p) => sum + p.value, 0) / window.length;
    return { date: point.date, value: Math.round(avg * 100) / 100 };
  });
}

/**
 * Get the most recent body entry for a given date or before
 */
export function getLatestBodyEntry(entries: BodyEntry[], beforeDate: string): BodyEntry | undefined {
  return entries
    .filter(e => e.date <= beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

/**
 * Convert kg to lbs
 */
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

/**
 * Convert lbs to kg
 */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462 * 10) / 10;
}

/**
 * Convert cm to inches
 */
export function cmToIn(cm: number): number {
  return Math.round(cm / 2.54 * 10) / 10;
}

/**
 * Convert inches to cm
 */
export function inToCm(inches: number): number {
  return Math.round(inches * 2.54 * 10) / 10;
}

export function get7DayAvgWeight(bodyEntries: BodyEntry[], date: string): number | null {
  const cutoff = new Date(date + 'T12:00:00');
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = toLocalDateStr(cutoff);
  const recent = bodyEntries.filter(e => e.date >= cutoffStr && e.date <= date);
  if (recent.length === 0) return null;
  return Math.round(recent.reduce((sum, e) => sum + e.weightKg, 0) / recent.length * 10) / 10;
}

export function computeMacrosFromWeight(
  calories: number,
  weightKg: number,
  proteinPerKg: number,
  fatPerKg: number,
  fiberPerKg: number,
  sugarLimitG: number,
): { proteinG: number; carbsG: number; fatG: number; fiberG: number; sugarG: number } {
  const proteinG = Math.round(weightKg * proteinPerKg * 10) / 10;
  const fatG = Math.round(weightKg * fatPerKg * 10) / 10;
  const fiberG = Math.round(weightKg * fiberPerKg * 10) / 10;
  const proteinCal = proteinG * 4;
  const fatCal = fatG * 9;
  const fiberCal = fiberG * 2;
  const remainingCal = Math.max(0, calories - proteinCal - fatCal - fiberCal);
  const carbsG = Math.round(remainingCal / 4 * 10) / 10;
  return { proteinG, carbsG, fatG, fiberG, sugarG: sugarLimitG };
}
