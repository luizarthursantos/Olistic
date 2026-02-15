import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { WorkoutSet, WorkoutExerciseSession } from '../../types';
import { estimateWorkoutCalories, estimateCardioCalories, toLocalDateStr } from '../../utils/calculations';
import { ArrowLeft, Check, Plus, Trash2, Save, Play } from 'lucide-react';

interface WorkoutExecutionProps {
  templateId: string;
  existingSessionId?: string;
  preview?: boolean;
  onFinish: () => void;
  onStart?: () => void;
}

export function WorkoutExecution({ templateId, existingSessionId, preview, onFinish, onStart }: WorkoutExecutionProps) {
  const {
    workoutTemplates,
    workoutSessions,
    exercises,
    addWorkoutSession,
    updateWorkoutSession,
    bodyEntries,
    settings,
  } = useStore();

  const template = workoutTemplates.find((t) => t.id === templateId);
  const existingSession = existingSessionId
    ? workoutSessions.find((s) => s.id === existingSessionId)
    : null;
  const isViewingCompleted = existingSession?.completed === true;

  const [sessionId, setSessionId] = useState<string | null>(existingSessionId || null);
  const [exerciseSessions, setExerciseSessions] = useState<WorkoutExerciseSession[]>(() => {
    if (existingSession) return existingSession.exercises;
    if (!template) return [];
    return template.exercises.map((ex) => {
      const exercise = exercises.find((e) => e.id === ex.exerciseId);
      if (exercise?.isCardio) {
        return {
          exerciseId: ex.exerciseId,
          sets: [],
          cardioMinutes: ex.defaultReps,
          estimatedCalories: 0,
        };
      }
      return {
        exerciseId: ex.exerciseId,
        sets: Array.from({ length: ex.sets }, () => ({
          reps: ex.defaultReps,
          loadKg: ex.defaultLoadKg,
          completed: false,
        })),
      };
    });
  });

  const [sessionDate, setSessionDate] = useState(() => existingSession?.date || toLocalDateStr(new Date()));
  const [startTime] = useState(() => existingSession?.startTime || new Date().toISOString());
  const [elapsed, setElapsed] = useState(0);

  // Compute static duration for completed sessions
  const completedDuration = useMemo(() => {
    if (isViewingCompleted && existingSession?.startTime && existingSession?.endTime) {
      return Math.floor(
        (new Date(existingSession.endTime).getTime() - new Date(existingSession.startTime).getTime()) / 1000
      );
    }
    return 0;
  }, [isViewingCompleted, existingSession]);

  useEffect(() => {
    if (isViewingCompleted || preview) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isViewingCompleted, preview]);

  // Get previous session for this template
  const previousSession = useMemo(() => {
    return [...workoutSessions]
      .filter((s) => s.templateId === templateId && s.completed && s.id !== existingSessionId)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [workoutSessions, templateId]);

  // Get the latest body weight
  const latestWeight = useMemo(() => {
    const sorted = [...bodyEntries].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.weightKg || 75;
  }, [bodyEntries]);

  // Initialize session if new (not for viewing completed sessions or preview)
  useEffect(() => {
    if (!sessionId && template && !isViewingCompleted && !preview) {
      const today = toLocalDateStr(new Date());
      const id = addWorkoutSession({
        templateId,
        date: today,
        startTime,
        completed: false,
        exercises: exerciseSessions,
        estimatedCalories: 0,
      });
      setSessionId(id);
    }
  }, []);

  const updateSet = (exIndex: number, setIndex: number, partial: Partial<WorkoutSet>) => {
    setExerciseSessions((prev) => {
      const updated = [...prev];
      const sets = [...updated[exIndex].sets];
      sets[setIndex] = { ...sets[setIndex], ...partial };
      updated[exIndex] = { ...updated[exIndex], sets };
      return updated;
    });
  };

  const toggleSetComplete = (exIndex: number, setIndex: number) => {
    updateSet(exIndex, setIndex, {
      completed: !exerciseSessions[exIndex].sets[setIndex].completed,
    });
  };

  const addSet = (exIndex: number) => {
    setExerciseSessions((prev) => {
      const updated = [...prev];
      const lastSet = updated[exIndex].sets[updated[exIndex].sets.length - 1];
      updated[exIndex] = {
        ...updated[exIndex],
        sets: [
          ...updated[exIndex].sets,
          { reps: lastSet?.reps || 10, loadKg: lastSet?.loadKg || 0, completed: false },
        ],
      };
      return updated;
    });
  };

  const removeSet = (exIndex: number, setIndex: number) => {
    setExerciseSessions((prev) => {
      const updated = [...prev];
      updated[exIndex] = {
        ...updated[exIndex],
        sets: updated[exIndex].sets.filter((_, i) => i !== setIndex),
      };
      return updated;
    });
  };

  const updateCardioMinutes = (exIndex: number, minutes: number) => {
    setExerciseSessions((prev) => {
      const updated = [...prev];
      const ex = exercises.find((e) => e.id === updated[exIndex].exerciseId);
      const cal = estimateCardioCalories(latestWeight, minutes, ex?.name || '');
      updated[exIndex] = { ...updated[exIndex], cardioMinutes: minutes, estimatedCalories: cal };
      return updated;
    });
  };

  const calcTotalCalories = () => {
    let totalCalories = 0;

    // Sum explicit cardio calories
    let totalCardioMinutes = 0;
    exerciseSessions.forEach((exSession) => {
      const exercise = exercises.find((e) => e.id === exSession.exerciseId);
      if (exercise?.isCardio && exSession.cardioMinutes) {
        totalCalories += estimateCardioCalories(latestWeight, exSession.cardioMinutes, exercise.name);
        totalCardioMinutes += exSession.cardioMinutes;
      }
    });

    // Use actual elapsed time for weightlifting (total duration minus cardio)
    const durationSeconds = isViewingCompleted ? completedDuration : elapsed;
    const elapsedMinutes = durationSeconds / 60;
    const weightliftingMinutes = Math.max(0, elapsedMinutes - totalCardioMinutes);
    if (weightliftingMinutes > 0) {
      totalCalories += estimateWorkoutCalories(latestWeight, weightliftingMinutes, false);
    }

    return Math.round(totalCalories);
  };

  const finishWorkout = () => {
    if (!sessionId) return;
    updateWorkoutSession(sessionId, {
      exercises: exerciseSessions,
      endTime: new Date().toISOString(),
      completed: true,
      estimatedCalories: calcTotalCalories(),
    });
    onFinish();
  };

  const saveEdits = () => {
    if (!sessionId) return;
    updateWorkoutSession(sessionId, {
      date: sessionDate,
      exercises: exerciseSessions,
      estimatedCalories: calcTotalCalories(),
    });
    onFinish();
  };

  const saveProgress = () => {
    if (sessionId) {
      updateWorkoutSession(sessionId, { exercises: exerciseSessions });
    }
    onFinish();
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getExerciseName = (id: string) => exercises.find((e) => e.id === id)?.name || 'Unknown';
  const getExerciseIcon = (id: string) => exercises.find((e) => e.id === id)?.icon || '🏋️';
  const isCardio = (id: string) => exercises.find((e) => e.id === id)?.isCardio || false;

  const getPreviousSets = (exerciseId: string): WorkoutSet[] => {
    if (!previousSession) return [];
    const prevEx = previousSession.exercises.find((e) => e.exerciseId === exerciseId);
    return prevEx?.sets || [];
  };

  if (!template) return <p>Template not found</p>;

  const templateNotes = template.exercises.reduce((acc, ex) => {
    if (ex.notes) acc[ex.exerciseId] = ex.notes;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="workout-execution fade-in">
      <div className="workout-exec-header">
        <button className="btn btn-secondary btn-sm" onClick={preview || isViewingCompleted ? onFinish : saveProgress}>
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="workout-exec-title">{template.name}</h2>
        {!preview && (
          <span className="workout-exec-timer">
            {isViewingCompleted
              ? formatTime(completedDuration)
              : formatTime(elapsed)}
          </span>
        )}
      </div>
      {isViewingCompleted && existingSession && (
        <div className="workout-completed-badge">
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
              padding: 0,
              cursor: 'pointer',
            }}
          />
           · {existingSession.estimatedCalories} kcal
        </div>
      )}

      {exerciseSessions.map((exSession, exIdx) => (
        <div key={exIdx} className="exercise-card">
          <div className="exercise-card-header">
            <span className="exercise-card-name">
              {getExerciseIcon(exSession.exerciseId)} {getExerciseName(exSession.exerciseId)}
            </span>
          </div>

          {templateNotes[exSession.exerciseId] && (
            <div className="exercise-note">{templateNotes[exSession.exerciseId]}</div>
          )}

          {isCardio(exSession.exerciseId) ? (
            <div className="cardio-input-row">
              <span className="cardio-label">Duration (min):</span>
              <input
                type="number"
                className="set-input"
                style={{ width: 80 }}
                value={exSession.cardioMinutes || 0}
                onChange={(e) => updateCardioMinutes(exIdx, Number(e.target.value))}
                min={0}
                readOnly={preview}
              />
              {exSession.estimatedCalories ? (
                <span className="text-sm text-muted">~{exSession.estimatedCalories} kcal</span>
              ) : null}
            </div>
          ) : (
            <>
              {/* Header row */}
              <div className="set-row" style={{ marginBottom: 8 }}>
                <span className="set-number" style={{ fontWeight: 600 }}>Set</span>
                <span className="set-prev" style={{ fontWeight: 600, fontSize: 11 }}>Previous</span>
                <span style={{ width: 70, textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Reps</span>
                <span style={{ width: 70, textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>kg</span>
                <span style={{ width: 28 }}></span>
              </div>

              {exSession.sets.map((set, setIdx) => {
                const prevSets = getPreviousSets(exSession.exerciseId);
                const prevSet = prevSets[setIdx];
                return (
                  <div key={setIdx} className="set-row">
                    <span className="set-number">{setIdx + 1}</span>
                    <span className="set-prev">
                      {prevSet ? `${prevSet.reps}x${prevSet.loadKg}kg` : '-'}
                    </span>
                    <input
                      type="number"
                      className="set-input"
                      value={set.reps}
                      onChange={(e) => updateSet(exIdx, setIdx, { reps: Number(e.target.value) })}
                      min={0}
                      readOnly={preview}
                    />
                    <input
                      type="number"
                      className="set-input"
                      value={set.loadKg}
                      onChange={(e) => updateSet(exIdx, setIdx, { loadKg: Number(e.target.value) })}
                      min={0}
                      step={0.5}
                      readOnly={preview}
                    />
                    {!preview && (
                      <button
                        className={`set-check ${set.completed ? 'done' : ''}`}
                        onClick={() => toggleSetComplete(exIdx, setIdx)}
                      >
                        {set.completed ? '✓' : ''}
                      </button>
                    )}
                  </div>
                );
              })}

              {!preview && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => addSet(exIdx)}>
                    <Plus size={12} /> Add Set
                  </button>
                  {exSession.sets.length > 1 && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeSet(exIdx, exSession.sets.length - 1)}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {preview ? (
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 16, padding: 14, fontSize: 16 }}
          onClick={() => onStart?.()}
        >
          <Play size={18} /> Start Workout
        </button>
      ) : isViewingCompleted ? (
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 16, padding: 14, fontSize: 16 }}
          onClick={saveEdits}
        >
          <Save size={18} /> Save Changes
        </button>
      ) : (
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 16, padding: 14, fontSize: 16 }}
          onClick={finishWorkout}
        >
          <Check size={18} /> Finish Workout
        </button>
      )}
    </div>
  );
}
