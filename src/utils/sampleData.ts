import { v4 as uuid } from 'uuid';
import { toLocalDateStr } from './calculations';
import {
  BodyEntry,
  MacroTargets,
  MealEntry,
  FoodItem,
  Exercise,
  WorkoutTemplate,
  WorkoutSession,
  WorkoutExerciseSession,
  WorkoutSet,
  MealType,
  ActivityLevel,
  AnalyticsChart,
} from '../types';
import { DEFAULT_EXERCISES } from './defaultExercises';

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return toLocalDateStr(d);
}

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate 180 days (~6 months) of body entries with a gradual weight loss trend
function generateBodyEntries(): BodyEntry[] {
  const entries: BodyEntry[] = [];
  let weight = 85; // starting weight
  let waist = 92;
  let neck = 38;
  const activities: ActivityLevel[] = ['moderately_active', 'moderately_active', 'very_active', 'lightly_active', 'moderately_active'];

  for (let i = 180; i >= 0; i -= randInt(1, 3)) {
    // Gradual improvement with daily noise
    weight = Math.max(70, weight - rand(0, 0.15) + rand(-0.05, 0.05));
    waist = Math.max(76, waist - rand(0, 0.08) + rand(-0.03, 0.03));
    neck = Math.min(40, Math.max(36, neck + rand(-0.05, 0.05)));

    entries.push({
      id: uuid(),
      date: dateStr(i),
      weightKg: Math.round(weight * 10) / 10,
      waistCm: Math.round(waist * 10) / 10,
      neckCm: Math.round(neck * 10) / 10,
      activityLevel: activities[Math.floor(Math.random() * activities.length)],
    });
  }
  return entries;
}

// Sample food items
function generateFoodItems(): FoodItem[] {
  return [
    { id: uuid(), name: 'Chicken Breast (150g)', proteinG: 46, carbsG: 0, fatG: 5, sugarG: 0, fiberG: 0, servingSize: 150 },
    { id: uuid(), name: 'Brown Rice (200g cooked)', proteinG: 5, carbsG: 44, fatG: 2, sugarG: 0, fiberG: 3, servingSize: 200 },
    { id: uuid(), name: 'Salmon Fillet (150g)', proteinG: 34, carbsG: 0, fatG: 18, sugarG: 0, fiberG: 0, servingSize: 150 },
    { id: uuid(), name: 'Greek Yogurt (200g)', proteinG: 20, carbsG: 8, fatG: 10, sugarG: 6, fiberG: 0, servingSize: 200 },
    { id: uuid(), name: 'Banana', proteinG: 1, carbsG: 27, fatG: 0, sugarG: 14, fiberG: 3, servingSize: 120 },
    { id: uuid(), name: 'Oatmeal (80g dry)', proteinG: 10, carbsG: 54, fatG: 5, sugarG: 1, fiberG: 8, servingSize: 80 },
    { id: uuid(), name: 'Eggs (2 large)', proteinG: 12, carbsG: 1, fatG: 10, sugarG: 0, fiberG: 0, servingSize: 100 },
    { id: uuid(), name: 'Broccoli (200g)', proteinG: 6, carbsG: 14, fatG: 1, sugarG: 3, fiberG: 5, servingSize: 200 },
    { id: uuid(), name: 'Whey Protein Shake', proteinG: 25, carbsG: 3, fatG: 2, sugarG: 1, fiberG: 0, servingSize: 30 },
    { id: uuid(), name: 'Avocado (half)', proteinG: 2, carbsG: 6, fatG: 15, sugarG: 0, fiberG: 7, servingSize: 100 },
    { id: uuid(), name: 'Sweet Potato (200g)', proteinG: 3, carbsG: 40, fatG: 0, sugarG: 10, fiberG: 6, servingSize: 200 },
    { id: uuid(), name: 'Almonds (30g)', proteinG: 6, carbsG: 6, fatG: 15, sugarG: 1, fiberG: 4, servingSize: 30 },
    { id: uuid(), name: 'Whole Wheat Bread (2 slices)', proteinG: 7, carbsG: 24, fatG: 2, sugarG: 4, fiberG: 4, servingSize: 60 },
    { id: uuid(), name: 'Tuna Can (120g)', proteinG: 30, carbsG: 0, fatG: 1, sugarG: 0, fiberG: 0, servingSize: 120 },
    { id: uuid(), name: 'Pasta (200g cooked)', proteinG: 7, carbsG: 50, fatG: 1, sugarG: 2, fiberG: 2, servingSize: 200 },
  ];
}

// Macro targets (set a few times over 6 months, forward-filled)
function generateMacroTargets(): MacroTargets[] {
  return [
    { id: uuid(), date: dateStr(180), calories: 2200, proteinG: 165, carbsG: 220, fatG: 73, sugarG: 50, fiberG: 30 },
    { id: uuid(), date: dateStr(120), calories: 2100, proteinG: 170, carbsG: 200, fatG: 70, sugarG: 45, fiberG: 30 },
    { id: uuid(), date: dateStr(60), calories: 2000, proteinG: 175, carbsG: 180, fatG: 67, sugarG: 40, fiberG: 35 },
    { id: uuid(), date: dateStr(14), calories: 1950, proteinG: 180, carbsG: 170, fatG: 65, sugarG: 40, fiberG: 35 },
  ];
}

// Generate 180 days of meal entries with realistic daily meals
function generateMealEntries(foodItems: FoodItem[]): MealEntry[] {
  const entries: MealEntry[] = [];
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  // Breakfast options
  const breakfastOptions = [
    { name: 'Oatmeal with Banana', proteinG: 11, carbsG: 70, fatG: 6, sugarG: 15, fiberG: 10 },
    { name: 'Eggs & Toast', proteinG: 19, carbsG: 25, fatG: 12, sugarG: 4, fiberG: 4 },
    { name: 'Greek Yogurt & Granola', proteinG: 22, carbsG: 35, fatG: 12, sugarG: 18, fiberG: 3 },
    { name: 'Protein Shake & Banana', proteinG: 26, carbsG: 30, fatG: 2, sugarG: 15, fiberG: 3 },
  ];

  const lunchOptions = [
    { name: 'Chicken & Rice', proteinG: 46, carbsG: 50, fatG: 8, sugarG: 0, fiberG: 3 },
    { name: 'Tuna Salad Wrap', proteinG: 35, carbsG: 30, fatG: 8, sugarG: 3, fiberG: 5 },
    { name: 'Salmon & Sweet Potato', proteinG: 38, carbsG: 42, fatG: 18, sugarG: 10, fiberG: 6 },
    { name: 'Turkey Sandwich', proteinG: 30, carbsG: 35, fatG: 10, sugarG: 5, fiberG: 4 },
  ];

  const dinnerOptions = [
    { name: 'Steak & Vegetables', proteinG: 45, carbsG: 20, fatG: 22, sugarG: 5, fiberG: 6 },
    { name: 'Chicken Stir Fry', proteinG: 40, carbsG: 45, fatG: 12, sugarG: 8, fiberG: 5 },
    { name: 'Pasta with Meat Sauce', proteinG: 28, carbsG: 60, fatG: 15, sugarG: 8, fiberG: 4 },
    { name: 'Grilled Fish & Salad', proteinG: 38, carbsG: 15, fatG: 14, sugarG: 3, fiberG: 7 },
  ];

  const snackOptions = [
    { name: 'Protein Bar', proteinG: 20, carbsG: 22, fatG: 8, sugarG: 6, fiberG: 3 },
    { name: 'Almonds & Apple', proteinG: 7, carbsG: 25, fatG: 15, sugarG: 15, fiberG: 7 },
    { name: 'Whey Shake', proteinG: 25, carbsG: 3, fatG: 2, sugarG: 1, fiberG: 0 },
    { name: 'Cottage Cheese & Berries', proteinG: 15, carbsG: 12, fatG: 5, sugarG: 8, fiberG: 2 },
  ];

  for (let i = 180; i >= 0; i--) {
    const date = dateStr(i);
    // Skip ~15% of days randomly (missed logging)
    if (Math.random() < 0.15) continue;

    const addMeal = (type: MealType, options: typeof breakfastOptions) => {
      const option = options[randInt(0, options.length - 1)];
      const noise = () => rand(0.85, 1.15);
      const p = Math.round(option.proteinG * noise());
      const c = Math.round(option.carbsG * noise());
      const f = Math.round(option.fatG * noise());
      const s = Math.round(option.sugarG * noise());
      const fb = Math.round(option.fiberG * noise());
      entries.push({
        id: uuid(),
        date,
        mealType: type,
        name: option.name,
        proteinG: p,
        carbsG: c,
        fatG: f,
        sugarG: s,
        fiberG: fb,
        calories: p * 4 + c * 4 + f * 9 + fb * 2,
      });
    };

    addMeal('breakfast', breakfastOptions);
    addMeal('lunch', lunchOptions);
    addMeal('dinner', dinnerOptions);
    // ~70% chance of snack
    if (Math.random() < 0.7) {
      addMeal('snack', snackOptions);
    }
  }

  return entries;
}

// Generate workout templates and sessions
function generateWorkoutData(exercises: Exercise[]): {
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
} {
  const findExercise = (name: string) => exercises.find((e) => e.name === name);

  const benchPress = findExercise('Bench Press')!;
  const squat = findExercise('Squat')!;
  const deadlift = findExercise('Deadlift')!;
  const overheadPress = findExercise('Overhead Press')!;
  const barbellRow = findExercise('Barbell Row')!;
  const bicepCurl = findExercise('Bicep Curl')!;
  const tricepPushdown = findExercise('Tricep Pushdown')!;
  const latPulldown = findExercise('Lat Pulldown')!;
  const legPress = findExercise('Leg Press')!;
  const lateralRaise = findExercise('Lateral Raise')!;
  const running = findExercise('Running')!;
  const walking = findExercise('Walking')!;

  const pushTemplate: WorkoutTemplate = {
    id: uuid(),
    name: 'Push Day',
    color: '#6c63ff',
    exercises: [
      { exerciseId: benchPress.id, sets: 4, defaultReps: 8, defaultLoadKg: 80, notes: 'Pause at bottom' },
      { exerciseId: overheadPress.id, sets: 3, defaultReps: 10, defaultLoadKg: 50, notes: '' },
      { exerciseId: lateralRaise.id, sets: 3, defaultReps: 12, defaultLoadKg: 12, notes: 'Slow negatives' },
      { exerciseId: tricepPushdown.id, sets: 3, defaultReps: 12, defaultLoadKg: 25, notes: '' },
    ],
  };

  const pullTemplate: WorkoutTemplate = {
    id: uuid(),
    name: 'Pull Day',
    color: '#34d399',
    exercises: [
      { exerciseId: deadlift.id, sets: 4, defaultReps: 5, defaultLoadKg: 120, notes: 'Belt on working sets' },
      { exerciseId: barbellRow.id, sets: 3, defaultReps: 8, defaultLoadKg: 70, notes: '' },
      { exerciseId: latPulldown.id, sets: 3, defaultReps: 10, defaultLoadKg: 60, notes: '' },
      { exerciseId: bicepCurl.id, sets: 3, defaultReps: 12, defaultLoadKg: 14, notes: '' },
    ],
  };

  const legTemplate: WorkoutTemplate = {
    id: uuid(),
    name: 'Leg Day',
    color: '#fbbf24',
    exercises: [
      { exerciseId: squat.id, sets: 4, defaultReps: 6, defaultLoadKg: 100, notes: 'Below parallel' },
      { exerciseId: legPress.id, sets: 3, defaultReps: 10, defaultLoadKg: 180, notes: '' },
      { exerciseId: walking.id, sets: 1, defaultReps: 15, defaultLoadKg: 0, notes: 'Cooldown walk' },
    ],
  };

  const cardioTemplate: WorkoutTemplate = {
    id: uuid(),
    name: 'Cardio',
    color: '#f87171',
    exercises: [
      { exerciseId: running.id, sets: 1, defaultReps: 30, defaultLoadKg: 0, notes: 'Zone 2 heart rate' },
    ],
  };

  const templates = [pushTemplate, pullTemplate, legTemplate, cardioTemplate];

  // Generate sessions over 6 months
  // PPL split: Push, Pull, Legs, rest, repeat + occasional cardio
  const sessions: WorkoutSession[] = [];
  const rotation = [pushTemplate, pullTemplate, legTemplate];
  let rotIndex = 0;

  for (let i = 180; i >= 0; i--) {
    const dayOfWeek = new Date(new Date().getTime() - i * 86400000).getDay();
    // Rest on some Sundays, train ~5 days/week
    if (dayOfWeek === 0 && Math.random() < 0.7) continue;
    if (Math.random() < 0.25) continue; // skip ~25% for realism

    const date = dateStr(i);
    let template: WorkoutTemplate;

    // Saturday = cardio day sometimes
    if (dayOfWeek === 6 && Math.random() < 0.5) {
      template = cardioTemplate;
    } else {
      template = rotation[rotIndex % 3];
      rotIndex++;
    }

    const progressFactor = 1 + (180 - i) / 180 * 0.15; // 15% strength gain over 6 months

    const exerciseSessions: WorkoutExerciseSession[] = template.exercises.map((ex) => {
      const exercise = exercises.find((e) => e.id === ex.exerciseId);
      if (exercise?.isCardio) {
        const minutes = ex.defaultReps + randInt(-5, 5);
        const met = exercise.name.includes('Run') ? 8 : 3.5;
        const cal = Math.round((met * 80 * minutes) / 60);
        return {
          exerciseId: ex.exerciseId,
          sets: [],
          cardioMinutes: minutes,
          estimatedCalories: cal,
        };
      }

      const sets: WorkoutSet[] = [];
      for (let s = 0; s < ex.sets; s++) {
        const loadBase = ex.defaultLoadKg * progressFactor;
        const load = Math.round((loadBase + rand(-2, 2)) * 2) / 2;
        const reps = ex.defaultReps + randInt(-2, 1);
        sets.push({
          reps: Math.max(1, reps),
          loadKg: Math.max(0, load),
          completed: Math.random() < 0.95, // 95% completion rate
        });
      }
      return { exerciseId: ex.exerciseId, sets };
    });

    // Estimate calories
    let totalCal = 0;
    exerciseSessions.forEach((es) => {
      if (es.cardioMinutes) {
        totalCal += es.estimatedCalories || 0;
      } else {
        totalCal += es.sets.filter((s) => s.completed).length * 8; // ~8 cal per set
      }
    });

    sessions.push({
      id: uuid(),
      templateId: template.id,
      date,
      startTime: new Date(new Date(date + 'T08:00:00').getTime() + randInt(0, 4) * 3600000).toISOString(),
      endTime: new Date(new Date(date + 'T08:00:00').getTime() + randInt(4, 6) * 3600000).toISOString(),
      completed: true,
      exercises: exerciseSessions,
      estimatedCalories: Math.max(100, totalCal + randInt(50, 150)),
    });
  }

  return { templates, sessions };
}

// Generate some default analytics charts
function generateAnalyticsCharts(): AnalyticsChart[] {
  return [
    {
      id: uuid(),
      title: 'Weight & Body Fat',
      metrics: [
        { key: 'weight', label: 'Weight', color: '#6c63ff', axis: 'left' },
        { key: 'body_fat_pct', label: 'Body Fat %', color: '#f87171', axis: 'right' },
      ],
      dateRange: '6M',
      movingAverageDays: 7,
      showMovingAverage: true,
    },
    {
      id: uuid(),
      title: 'Body Composition',
      metrics: [
        { key: 'lean_mass_kg', label: 'Lean Mass', color: '#34d399', axis: 'left' },
        { key: 'body_fat_kg', label: 'Fat Mass', color: '#fbbf24', axis: 'left' },
      ],
      dateRange: '6M',
      movingAverageDays: 7,
      showMovingAverage: true,
    },
    {
      id: uuid(),
      title: 'Daily Calories',
      metrics: [
        { key: 'food_calories', label: 'Consumed', color: '#60a5fa', axis: 'left' },
        { key: 'food_target_calories', label: 'Target', color: '#f87171', axis: 'left' },
      ],
      dateRange: '3M',
      movingAverageDays: 7,
      showMovingAverage: true,
    },
    {
      id: uuid(),
      title: 'FFMI Progress',
      metrics: [
        { key: 'ffmi', label: 'FFMI', color: '#a78bfa', axis: 'left' },
      ],
      dateRange: '6M',
      movingAverageDays: 14,
      showMovingAverage: true,
    },
    {
      id: uuid(),
      title: 'Caloric Balance',
      metrics: [
        { key: 'caloric_balance', label: 'Balance', color: '#fbbf24', axis: 'left' },
        { key: 'tdee', label: 'TDEE', color: '#34d399', axis: 'right' },
      ],
      dateRange: '3M',
      movingAverageDays: 7,
      showMovingAverage: true,
    },
    {
      id: uuid(),
      title: 'Protein Intake',
      metrics: [
        { key: 'food_protein', label: 'Protein', color: '#6c63ff', axis: 'left' },
        { key: 'food_target_protein', label: 'Target', color: '#f87171', axis: 'left' },
      ],
      dateRange: '3M',
      movingAverageDays: 7,
      showMovingAverage: true,
    },
  ];
}

export function generateAllSampleData(exercises: Exercise[]) {
  const bodyEntries = generateBodyEntries();
  const foodItems = generateFoodItems();
  const mealEntries = generateMealEntries(foodItems);
  const macroTargets = generateMacroTargets();
  const { templates, sessions } = generateWorkoutData(exercises);
  const analyticsCharts = generateAnalyticsCharts();

  return {
    bodyEntries,
    foodItems,
    mealEntries,
    macroTargets,
    workoutTemplates: templates,
    workoutSessions: sessions,
    analyticsCharts,
  };
}
