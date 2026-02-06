import { Exercise } from '../types';
import { v4 as uuid } from 'uuid';

export const DEFAULT_EXERCISES: Exercise[] = [
  // Chest
  { id: uuid(), name: 'Bench Press', icon: '🏋️', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Incline Bench Press', icon: '🏋️', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Dumbbell Fly', icon: '🏋️', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Push Up', icon: '💪', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Cable Crossover', icon: '🏋️', isCardio: false, isCustom: false },
  // Back
  { id: uuid(), name: 'Deadlift', icon: '🏋️', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Barbell Row', icon: '🏋️', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Pull Up', icon: '💪', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Lat Pulldown', icon: '🏋️', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Seated Row', icon: '🏋️', isCardio: false, isCustom: false },
  // Shoulders
  { id: uuid(), name: 'Overhead Press', icon: '🏋️', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Lateral Raise', icon: '🏋️', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Front Raise', icon: '🏋️', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Face Pull', icon: '🏋️', isCardio: false, isCustom: false },
  // Arms
  { id: uuid(), name: 'Bicep Curl', icon: '💪', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Tricep Pushdown', icon: '💪', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Hammer Curl', icon: '💪', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Skull Crusher', icon: '💪', isCardio: false, isCustom: false },
  // Legs
  { id: uuid(), name: 'Squat', icon: '🦵', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Leg Press', icon: '🦵', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Romanian Deadlift', icon: '🦵', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Leg Curl', icon: '🦵', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Leg Extension', icon: '🦵', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Calf Raise', icon: '🦵', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Lunge', icon: '🦵', isCardio: false, isCustom: false },
  // Core
  { id: uuid(), name: 'Plank', icon: '🧘', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Crunch', icon: '🧘', isCardio: false, isCustom: false },
  { id: uuid(), name: 'Hanging Leg Raise', icon: '🧘', isCardio: false, isCustom: false },
  // Cardio
  { id: uuid(), name: 'Running', icon: '🏃', isCardio: true, isCustom: false },
  { id: uuid(), name: 'Walking', icon: '🚶', isCardio: true, isCustom: false },
  { id: uuid(), name: 'Cycling', icon: '🚴', isCardio: true, isCustom: false },
];
