import { Exercise } from '../types';

export const DEFAULT_EXERCISES: Exercise[] = [
  // Chest
  { id: 'ex-bench-press', name: 'Bench Press', icon: '🏋️', isCardio: false, isCustom: false },
  { id: 'ex-incline-bench', name: 'Incline Bench Press', icon: '🏋️', isCardio: false, isCustom: false },
  { id: 'ex-dumbbell-fly', name: 'Dumbbell Fly', icon: '🏋️', isCardio: false, isCustom: false },
  { id: 'ex-push-up', name: 'Push Up', icon: '💪', isCardio: false, isCustom: false },
  { id: 'ex-cable-crossover', name: 'Cable Crossover', icon: '🏋️', isCardio: false, isCustom: false },
  // Back
  { id: 'ex-deadlift', name: 'Deadlift', icon: '🏋️', isCardio: false, isCustom: false },
  { id: 'ex-barbell-row', name: 'Barbell Row', icon: '🏋️', isCardio: false, isCustom: false },
  { id: 'ex-pull-up', name: 'Pull Up', icon: '💪', isCardio: false, isCustom: false },
  { id: 'ex-lat-pulldown', name: 'Lat Pulldown', icon: '🏋️', isCardio: false, isCustom: false },
  { id: 'ex-seated-row', name: 'Seated Row', icon: '🏋️', isCardio: false, isCustom: false },
  // Shoulders
  { id: 'ex-overhead-press', name: 'Overhead Press', icon: '🏋️', isCardio: false, isCustom: false },
  { id: 'ex-lateral-raise', name: 'Lateral Raise', icon: '🏋️', isCardio: false, isCustom: false },
  { id: 'ex-front-raise', name: 'Front Raise', icon: '🏋️', isCardio: false, isCustom: false },
  { id: 'ex-face-pull', name: 'Face Pull', icon: '🏋️', isCardio: false, isCustom: false },
  // Arms
  { id: 'ex-bicep-curl', name: 'Bicep Curl', icon: '💪', isCardio: false, isCustom: false },
  { id: 'ex-tricep-pushdown', name: 'Tricep Pushdown', icon: '💪', isCardio: false, isCustom: false },
  { id: 'ex-hammer-curl', name: 'Hammer Curl', icon: '💪', isCardio: false, isCustom: false },
  { id: 'ex-skull-crusher', name: 'Skull Crusher', icon: '💪', isCardio: false, isCustom: false },
  // Legs
  { id: 'ex-squat', name: 'Squat', icon: '🦵', isCardio: false, isCustom: false },
  { id: 'ex-leg-press', name: 'Leg Press', icon: '🦵', isCardio: false, isCustom: false },
  { id: 'ex-romanian-deadlift', name: 'Romanian Deadlift', icon: '🦵', isCardio: false, isCustom: false },
  { id: 'ex-leg-curl', name: 'Leg Curl', icon: '🦵', isCardio: false, isCustom: false },
  { id: 'ex-leg-extension', name: 'Leg Extension', icon: '🦵', isCardio: false, isCustom: false },
  { id: 'ex-calf-raise', name: 'Calf Raise', icon: '🦵', isCardio: false, isCustom: false },
  { id: 'ex-lunge', name: 'Lunge', icon: '🦵', isCardio: false, isCustom: false },
  // Core
  { id: 'ex-plank', name: 'Plank', icon: '🧘', isCardio: false, isCustom: false },
  { id: 'ex-crunch', name: 'Crunch', icon: '🧘', isCardio: false, isCustom: false },
  { id: 'ex-hanging-leg-raise', name: 'Hanging Leg Raise', icon: '🧘', isCardio: false, isCustom: false },
  // Cardio
  { id: 'ex-running', name: 'Running', icon: '🏃', isCardio: true, isCustom: false },
  { id: 'ex-walking', name: 'Walking', icon: '🚶', isCardio: true, isCustom: false },
  { id: 'ex-cycling', name: 'Cycling', icon: '🚴', isCardio: true, isCustom: false },
];
