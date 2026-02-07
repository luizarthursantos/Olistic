import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import {
  UserSettings,
  BodyEntry,
  MacroTargets,
  FoodItem,
  MealEntry,
  Exercise,
  WorkoutTemplate,
  WorkoutSession,
  AnalyticsChart,
  ThemeMode,
  UnitSystem,
  ActivityLevel,
  MealType,
  WorkoutExerciseTemplate,
  WorkoutExerciseSession,
} from '../types';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { DEFAULT_EXERCISES } from '../utils/defaultExercises';
import { generateAllSampleData } from '../utils/sampleData';

export interface AppState {
  // Settings
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;

  // Body
  bodyEntries: BodyEntry[];
  addBodyEntry: (entry: Omit<BodyEntry, 'id'>) => void;
  updateBodyEntry: (id: string, entry: Partial<BodyEntry>) => void;
  deleteBodyEntry: (id: string) => void;

  // Food - Targets
  macroTargets: MacroTargets[];
  addMacroTargets: (targets: Omit<MacroTargets, 'id'>) => void;
  getMacroTargetsForDate: (date: string) => MacroTargets | undefined;

  // Food - Items
  foodItems: FoodItem[];
  addFoodItem: (item: Omit<FoodItem, 'id'>) => string;
  deleteFoodItem: (id: string) => void;

  // Food - Meals
  mealEntries: MealEntry[];
  addMealEntry: (entry: Omit<MealEntry, 'id'>) => void;
  updateMealEntry: (id: string, entry: Partial<MealEntry>) => void;
  deleteMealEntry: (id: string) => void;
  getMealsForDate: (date: string) => MealEntry[];

  // Exercises
  exercises: Exercise[];
  addExercise: (exercise: Omit<Exercise, 'id'>) => string;

  // Workout Templates
  workoutTemplates: WorkoutTemplate[];
  addWorkoutTemplate: (template: Omit<WorkoutTemplate, 'id'>) => string;
  updateWorkoutTemplate: (id: string, template: Partial<WorkoutTemplate>) => void;
  deleteWorkoutTemplate: (id: string) => void;

  // Workout Sessions
  workoutSessions: WorkoutSession[];
  addWorkoutSession: (session: Omit<WorkoutSession, 'id'>) => string;
  updateWorkoutSession: (id: string, session: Partial<WorkoutSession>) => void;
  deleteWorkoutSession: (id: string) => void;

  // Analytics
  analyticsCharts: AnalyticsChart[];
  addAnalyticsChart: (chart: Omit<AnalyticsChart, 'id'>) => void;
  updateAnalyticsChart: (id: string, chart: Partial<AnalyticsChart>) => void;
  deleteAnalyticsChart: (id: string) => void;

  // UI state
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Sample data
  loadSampleData: () => void;
}

const defaultSettings: UserSettings = {
  birthday: '1990-01-01',
  sex: 'male',
  heightCm: 175,
  targetBodyFatPct: 15,
  targetFFMI: 22,
  targetCaloricDelta: -500,
  activityLevel: 'moderately_active',
  unitSystem: 'metric',
  theme: 'dark',
  onboardingComplete: false,
  claudeApiKey: '',
};

const today = new Date().toISOString().split('T')[0];

export const useStore = create<AppState>((set, get) => ({
  // Settings
  settings: loadFromStorage<UserSettings>('settings', defaultSettings),
  updateSettings: (partial) => {
    const newSettings = { ...get().settings, ...partial };
    set({ settings: newSettings });
    saveToStorage('settings', newSettings);
  },

  // Body
  bodyEntries: loadFromStorage<BodyEntry[]>('bodyEntries', []),
  addBodyEntry: (entry) => {
    const newEntry = { ...entry, id: uuid() };
    const existing = get().bodyEntries.find(e => e.date === entry.date);
    let entries: BodyEntry[];
    if (existing) {
      entries = get().bodyEntries.map(e => e.date === entry.date ? { ...newEntry, id: e.id } : e);
    } else {
      entries = [...get().bodyEntries, newEntry];
    }
    set({ bodyEntries: entries });
    saveToStorage('bodyEntries', entries);
  },
  updateBodyEntry: (id, partial) => {
    const entries = get().bodyEntries.map(e => e.id === id ? { ...e, ...partial } : e);
    set({ bodyEntries: entries });
    saveToStorage('bodyEntries', entries);
  },
  deleteBodyEntry: (id) => {
    const entries = get().bodyEntries.filter(e => e.id !== id);
    set({ bodyEntries: entries });
    saveToStorage('bodyEntries', entries);
  },

  // Macro Targets
  macroTargets: loadFromStorage<MacroTargets[]>('macroTargets', []),
  addMacroTargets: (targets) => {
    const newTargets = { ...targets, id: uuid() };
    const existing = get().macroTargets.find(t => t.date === targets.date);
    let all: MacroTargets[];
    if (existing) {
      all = get().macroTargets.map(t => t.date === targets.date ? { ...newTargets, id: t.id } : t);
    } else {
      all = [...get().macroTargets, newTargets];
    }
    set({ macroTargets: all });
    saveToStorage('macroTargets', all);
  },
  getMacroTargetsForDate: (date) => {
    const sorted = [...get().macroTargets].sort((a, b) => b.date.localeCompare(a.date));
    return sorted.find(t => t.date <= date);
  },

  // Food Items
  foodItems: loadFromStorage<FoodItem[]>('foodItems', []),
  addFoodItem: (item) => {
    const id = uuid();
    const newItem = { ...item, id };
    const items = [...get().foodItems, newItem];
    set({ foodItems: items });
    saveToStorage('foodItems', items);
    return id;
  },
  deleteFoodItem: (id) => {
    const items = get().foodItems.filter(i => i.id !== id);
    set({ foodItems: items });
    saveToStorage('foodItems', items);
  },

  // Meal Entries
  mealEntries: loadFromStorage<MealEntry[]>('mealEntries', []),
  addMealEntry: (entry) => {
    const newEntry = { ...entry, id: uuid() };
    const entries = [...get().mealEntries, newEntry];
    set({ mealEntries: entries });
    saveToStorage('mealEntries', entries);
  },
  updateMealEntry: (id, partial) => {
    const entries = get().mealEntries.map(e => e.id === id ? { ...e, ...partial } : e);
    set({ mealEntries: entries });
    saveToStorage('mealEntries', entries);
  },
  deleteMealEntry: (id) => {
    const entries = get().mealEntries.filter(e => e.id !== id);
    set({ mealEntries: entries });
    saveToStorage('mealEntries', entries);
  },
  getMealsForDate: (date) => {
    return get().mealEntries.filter(e => e.date === date);
  },

  // Exercises
  exercises: loadFromStorage<Exercise[]>('exercises', DEFAULT_EXERCISES),
  addExercise: (exercise) => {
    const id = uuid();
    const newExercise = { ...exercise, id };
    const exercises = [...get().exercises, newExercise];
    set({ exercises });
    saveToStorage('exercises', exercises);
    return id;
  },

  // Workout Templates
  workoutTemplates: loadFromStorage<WorkoutTemplate[]>('workoutTemplates', []),
  addWorkoutTemplate: (template) => {
    const id = uuid();
    const newTemplate = { ...template, id };
    const templates = [...get().workoutTemplates, newTemplate];
    set({ workoutTemplates: templates });
    saveToStorage('workoutTemplates', templates);
    return id;
  },
  updateWorkoutTemplate: (id, partial) => {
    const templates = get().workoutTemplates.map(t => t.id === id ? { ...t, ...partial } : t);
    set({ workoutTemplates: templates });
    saveToStorage('workoutTemplates', templates);
  },
  deleteWorkoutTemplate: (id) => {
    const templates = get().workoutTemplates.filter(t => t.id !== id);
    set({ workoutTemplates: templates });
    saveToStorage('workoutTemplates', templates);
  },

  // Workout Sessions
  workoutSessions: loadFromStorage<WorkoutSession[]>('workoutSessions', []),
  addWorkoutSession: (session) => {
    const id = uuid();
    const newSession = { ...session, id };
    const sessions = [...get().workoutSessions, newSession];
    set({ workoutSessions: sessions });
    saveToStorage('workoutSessions', sessions);
    return id;
  },
  updateWorkoutSession: (id, partial) => {
    const sessions = get().workoutSessions.map(s => s.id === id ? { ...s, ...partial } : s);
    set({ workoutSessions: sessions });
    saveToStorage('workoutSessions', sessions);
  },
  deleteWorkoutSession: (id) => {
    const sessions = get().workoutSessions.filter(s => s.id !== id);
    set({ workoutSessions: sessions });
    saveToStorage('workoutSessions', sessions);
  },

  // Analytics
  analyticsCharts: loadFromStorage<AnalyticsChart[]>('analyticsCharts', []),
  addAnalyticsChart: (chart) => {
    const newChart = { ...chart, id: uuid() };
    const charts = [...get().analyticsCharts, newChart];
    set({ analyticsCharts: charts });
    saveToStorage('analyticsCharts', charts);
  },
  updateAnalyticsChart: (id, partial) => {
    const charts = get().analyticsCharts.map(c => c.id === id ? { ...c, ...partial } : c);
    set({ analyticsCharts: charts });
    saveToStorage('analyticsCharts', charts);
  },
  deleteAnalyticsChart: (id) => {
    const charts = get().analyticsCharts.filter(c => c.id !== id);
    set({ analyticsCharts: charts });
    saveToStorage('analyticsCharts', charts);
  },

  // UI State
  selectedDate: today,
  setSelectedDate: (date) => set({ selectedDate: date }),
  activeTab: 'body',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Sample data
  loadSampleData: () => {
    // Reset exercises to defaults so IDs are stable
    const exercises = DEFAULT_EXERCISES;
    const data = generateAllSampleData(exercises);
    set({
      exercises,
      bodyEntries: data.bodyEntries,
      foodItems: data.foodItems,
      mealEntries: data.mealEntries,
      macroTargets: data.macroTargets,
      workoutTemplates: data.workoutTemplates,
      workoutSessions: data.workoutSessions,
      analyticsCharts: data.analyticsCharts,
    });
    saveToStorage('exercises', exercises);
    saveToStorage('bodyEntries', data.bodyEntries);
    saveToStorage('foodItems', data.foodItems);
    saveToStorage('mealEntries', data.mealEntries);
    saveToStorage('macroTargets', data.macroTargets);
    saveToStorage('workoutTemplates', data.workoutTemplates);
    saveToStorage('workoutSessions', data.workoutSessions);
    saveToStorage('analyticsCharts', data.analyticsCharts);
  },
}));
