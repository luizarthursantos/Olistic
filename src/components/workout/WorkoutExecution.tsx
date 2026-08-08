import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { WorkoutSet, WorkoutExerciseSession, Exercise } from '../../types';
import { estimateWorkoutCalories, estimateCardioCalories, toLocalDateStr, getBestOneRepMax } from '../../utils/calculations';
import { ArrowLeft, Check, Plus, Trash2, Save, Play, Pencil, TrendingUp, X, Replace, ChevronUp, ChevronDown } from 'lucide-react';
import { ExercisePicker } from './ExercisePicker';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

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

  // Get the latest completed data for each exercise across all workouts
  const latestExerciseData = useMemo(() => {
    const map = new Map<string, { sets: WorkoutSet[]; cardioMinutes?: number }>();
    const sorted = [...workoutSessions]
      .filter((s) => s.completed && s.id !== existingSessionId)
      .sort((a, b) => b.date.localeCompare(a.date));
    for (const session of sorted) {
      for (const exSession of session.exercises) {
        if (map.has(exSession.exerciseId)) continue;
        const completedSets = exSession.sets.filter((s) => s.completed);
        if (completedSets.length > 0 || exSession.cardioMinutes) {
          map.set(exSession.exerciseId, { sets: completedSets, cardioMinutes: exSession.cardioMinutes });
        }
      }
    }
    return map;
  }, [workoutSessions, existingSessionId]);

  const [sessionId, setSessionId] = useState<string | null>(existingSessionId || null);
  const [exerciseSessions, setExerciseSessions] = useState<WorkoutExerciseSession[]>(() => {
    const templateNoteFor = (exerciseId: string) =>
      template?.exercises.find((ex) => ex.exerciseId === exerciseId)?.notes || undefined;

    if (existingSession) {
      // Notes used to be looked up from the template by exercise id at render
      // time. Sessions saved before the note moved onto the session have none,
      // and replacing an exercise changes the id the lookup depends on — which
      // silently dropped the note. Backfill on load so every session carries
      // its own notes before anything can be swapped.
      return existingSession.exercises.map((ex) =>
        ex.note === undefined ? { ...ex, note: templateNoteFor(ex.exerciseId) } : ex,
      );
    }
    if (!template) return [];
    return template.exercises.map((ex) => {
      const exercise = exercises.find((e) => e.id === ex.exerciseId);
      const prev = latestExerciseData.get(ex.exerciseId);
      if (exercise?.isCardio) {
        return {
          exerciseId: ex.exerciseId,
          sets: [],
          cardioMinutes: prev?.cardioMinutes ?? ex.defaultReps,
          estimatedCalories: 0,
          note: ex.notes || undefined,
        };
      }
      // Pre-fill with previous session's reps/load if available
      const prevSets = prev?.sets;
      return {
        exerciseId: ex.exerciseId,
        sets: Array.from({ length: ex.sets }, (_, i) => ({
          reps: prevSets?.[i]?.reps ?? ex.defaultReps,
          loadKg: prevSets?.[i]?.loadKg ?? ex.defaultLoadKg,
          completed: false,
        })),
        note: ex.notes || undefined,
      };
    });
  });

  const [sessionDate, setSessionDate] = useState(() => existingSession?.date || toLocalDateStr(new Date()));
  const [startTime, setStartTime] = useState(() => existingSession?.startTime || new Date().toISOString());
  const [endTime, setEndTime] = useState(() => existingSession?.endTime || '');
  const [elapsed, setElapsed] = useState(0);
  const [editSets, setEditSets] = useState(false);
  const [chartExerciseId, setChartExerciseId] = useState<string | null>(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [removeExerciseIdx, setRemoveExerciseIdx] = useState<number | null>(null);
  const [replaceExerciseIdx, setReplaceExerciseIdx] = useState<number | null>(null);
  const finishedRef = useRef(false);
  const sessionCreatedRef = useRef(false);

  // Build 1RM chart data for a given exercise across all workouts
  const getExerciseChartData = (exerciseId: string) => {
    const logs: { date: string; orm: number }[] = [];
    const sorted = [...workoutSessions]
      .filter((s) => s.completed)
      .sort((a, b) => a.date.localeCompare(b.date));
    for (const session of sorted) {
      const exSession = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (!exSession) continue;
      const best = getBestOneRepMax(exSession.sets);
      if (best <= 0) continue;
      const existing = logs.find((l) => l.date === session.date);
      if (existing) {
        existing.orm = Math.max(existing.orm, best);
      } else {
        logs.push({ date: session.date, orm: best });
      }
    }
    return logs;
  };

  // Compute static duration for completed sessions
  const completedDuration = useMemo(() => {
    if (isViewingCompleted && startTime && endTime) {
      return Math.floor(
        (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
      );
    }
    return 0;
  }, [isViewingCompleted, startTime, endTime]);

  useEffect(() => {
    if (isViewingCompleted || preview) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isViewingCompleted, preview]);

  // Get the latest body weight
  const latestWeight = useMemo(() => {
    const sorted = [...bodyEntries].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.weightKg || 75;
  }, [bodyEntries]);

  // Initialize session if new (not for viewing completed sessions or preview).
  // The ref guard matters because setSessionId does not apply before this
  // effect can run a second time: StrictMode's double invocation in dev
  // otherwise creates a second, orphaned in-progress session that lingers in
  // History and shadows the real one.
  useEffect(() => {
    if (sessionCreatedRef.current) return;
    if (!sessionId && template && !isViewingCompleted && !preview) {
      sessionCreatedRef.current = true;
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

  // Auto-save progress to store so data persists if the app is closed
  useEffect(() => {
    if (sessionId && !isViewingCompleted && !preview && !finishedRef.current) {
      updateWorkoutSession(sessionId, { exercises: exerciseSessions });
    }
  }, [exerciseSessions, sessionId, isViewingCompleted, preview]);

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

  /**
   * Adds an exercise to this session only — the template is left alone, so a
   * one-off substitution does not silently rewrite the routine.
   */
  const addExerciseToSession = (exercise: Exercise) => {
    const prev = latestExerciseData.get(exercise.id);
    setExerciseSessions((current) => {
      if (exercise.isCardio) {
        const minutes = prev?.cardioMinutes ?? 10;
        return [...current, {
          exerciseId: exercise.id,
          sets: [],
          cardioMinutes: minutes,
          estimatedCalories: estimateCardioCalories(latestWeight, minutes, exercise.name),
        }];
      }
      // Start from the last time this exercise was done, so the numbers are
      // already close; otherwise three blank sets.
      const prevSets = prev?.sets ?? [];
      const sets: WorkoutSet[] = prevSets.length > 0
        ? prevSets.map((s) => ({ reps: s.reps, loadKg: s.loadKg, completed: false }))
        : Array.from({ length: 3 }, () => ({ reps: 10, loadKg: 0, completed: false }));
      return [...current, { exerciseId: exercise.id, sets }];
    });
    setShowExercisePicker(false);
  };

  /**
   * Swaps which exercise a slot refers to while keeping the work logged
   * against it — the sets (reps, load, ticks) and the note carry over, so
   * substituting a machine mid-workout does not cost the sets already done.
   */
  const replaceExerciseInSession = (exIndex: number, exercise: Exercise) => {
    setExerciseSessions((current) => current.map((exSession, i) => {
      if (i !== exIndex) return exSession;
      const wasCardio = isCardio(exSession.exerciseId);

      // Same kind: the logged work transfers as-is.
      if (exercise.isCardio === wasCardio) {
        return {
          ...exSession,
          exerciseId: exercise.id,
          ...(exercise.isCardio
            ? { estimatedCalories: estimateCardioCalories(latestWeight, exSession.cardioMinutes || 0, exercise.name) }
            : {}),
        };
      }

      // Crossing between cardio and lifting: sets and minutes do not translate,
      // so rebuild that part from history while keeping the note.
      const prev = latestExerciseData.get(exercise.id);
      if (exercise.isCardio) {
        const minutes = prev?.cardioMinutes ?? 10;
        return {
          exerciseId: exercise.id,
          sets: [],
          cardioMinutes: minutes,
          estimatedCalories: estimateCardioCalories(latestWeight, minutes, exercise.name),
          note: exSession.note,
        };
      }
      const prevSets = prev?.sets ?? [];
      return {
        exerciseId: exercise.id,
        sets: prevSets.length > 0
          ? prevSets.map((s) => ({ reps: s.reps, loadKg: s.loadKg, completed: false }))
          : Array.from({ length: 3 }, () => ({ reps: 10, loadKg: 0, completed: false })),
        note: exSession.note,
      };
    }));
    setReplaceExerciseIdx(null);
  };

  const moveExerciseInSession = (exIndex: number, direction: -1 | 1) => {
    const target = exIndex + direction;
    setExerciseSessions((current) => {
      if (target < 0 || target >= current.length) return current;
      const updated = [...current];
      [updated[exIndex], updated[target]] = [updated[target], updated[exIndex]];
      return updated;
    });
  };

  const removeExerciseFromSession = (exIndex: number) => {
    setExerciseSessions((current) => current.filter((_, i) => i !== exIndex));
    setRemoveExerciseIdx(null);
  };

  /** Removing logged work should be confirmed; removing an untouched one should not. */
  const requestRemoveExercise = (exIndex: number) => {
    const exSession = exerciseSessions[exIndex];
    const hasWork = exSession.sets.some((s) => s.completed) || !!exSession.cardioMinutes;
    if (hasWork) setRemoveExerciseIdx(exIndex);
    else removeExerciseFromSession(exIndex);
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
    finishedRef.current = true;
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
      startTime,
      endTime: endTime || undefined,
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

  const isoToTimeStr = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const timeStrToIso = (baseIso: string, timeStr: string) => {
    const d = new Date(baseIso);
    const [h, m] = timeStr.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const getExerciseName = (id: string) => exercises.find((e) => e.id === id)?.name || 'Unknown';
  const getExerciseIcon = (id: string) => exercises.find((e) => e.id === id)?.icon || '🏋️';
  const isCardio = (id: string) => exercises.find((e) => e.id === id)?.isCardio || false;

  const getPreviousSets = (exerciseId: string): WorkoutSet[] => {
    return latestExerciseData.get(exerciseId)?.sets || [];
  };

  if (!template) return <p>Template not found</p>;

  // Reordering, replacing, adding and removing exercises all belong to the
  // same edit toggle, and none of them apply to a preview or a finished session.
  const editingExercises = !preview && !isViewingCompleted && editSets;

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
        {!preview && !isViewingCompleted && (
          <button
            className={`btn btn-sm ${editSets ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setEditSets(!editSets)}
          >
            <Pencil size={14} />
          </button>
        )}
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
           ·{' '}
          <input
            type="time"
            value={isoToTimeStr(startTime)}
            onChange={(e) => setStartTime(timeStrToIso(startTime, e.target.value))}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
              padding: 0,
              cursor: 'pointer',
              width: 60,
            }}
          />
          {' - '}
          <input
            type="time"
            value={isoToTimeStr(endTime)}
            onChange={(e) => setEndTime(timeStrToIso(endTime || startTime, e.target.value))}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
              padding: 0,
              cursor: 'pointer',
              width: 60,
            }}
          />
           · {existingSession.estimatedCalories} kcal
        </div>
      )}

      {exerciseSessions.map((exSession, exIdx) => (
        <div key={exIdx} className="exercise-card">
          <div className={`exercise-card-header${editingExercises ? ' editing' : ''}`}>
            <span className="exercise-card-name">
              {getExerciseIcon(exSession.exerciseId)} {getExerciseName(exSession.exerciseId)}
            </span>
            <div className="exercise-card-actions">
              {!isCardio(exSession.exerciseId) && (
                <button
                  className={`btn btn-icon btn-sm ${chartExerciseId === exSession.exerciseId ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setChartExerciseId(chartExerciseId === exSession.exerciseId ? null : exSession.exerciseId)}
                  title="1RM History"
                >
                  <TrendingUp size={14} />
                </button>
              )}
              {editingExercises && (
                <>
                  <button
                    className="btn btn-icon btn-secondary btn-sm"
                    onClick={() => moveExerciseInSession(exIdx, -1)}
                    disabled={exIdx === 0}
                    title="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    className="btn btn-icon btn-secondary btn-sm"
                    onClick={() => moveExerciseInSession(exIdx, 1)}
                    disabled={exIdx === exerciseSessions.length - 1}
                    title="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    className="btn btn-icon btn-secondary btn-sm"
                    onClick={() => setReplaceExerciseIdx(exIdx)}
                    title="Replace exercise, keeping the sets"
                  >
                    <Replace size={14} />
                  </button>
                  <button
                    className="btn btn-icon btn-danger btn-sm"
                    onClick={() => requestRemoveExercise(exIdx)}
                    title="Remove exercise from this workout"
                  >
                    <X size={14} />
                  </button>
                </>
              )}
            </div>
          </div>

          {chartExerciseId === exSession.exerciseId && (() => {
            const chartData = getExerciseChartData(exSession.exerciseId);
            if (chartData.length === 0) return (
              <div className="text-sm text-muted" style={{ padding: '8px 0' }}>No previous data</div>
            );
            return (
              <div style={{ marginBottom: 8 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                      tickFormatter={(val: string) => {
                        const d = new Date(val + 'T12:00:00');
                        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                        return `${d.getDate()}-${months[d.getMonth()]}`;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                      width={35}
                      domain={['auto', 'auto']}
                      tickFormatter={(v: number) => v % 1 === 0 ? String(v) : v.toFixed(1)}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      formatter={(value: unknown) => [`${Number(value).toFixed(1)} kg`, '1RM']}
                      labelFormatter={(label: unknown) => {
                        const d = new Date(String(label) + 'T12:00:00');
                        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="orm"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: 'var(--accent)' }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}

          {/* Sessions saved before notes were stored fall back to the template. */}
          {(exSession.note ?? templateNotes[exSession.exerciseId]) && (
            <div className="exercise-note">{exSession.note ?? templateNotes[exSession.exerciseId]}</div>
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

              {!preview && editSets && (
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

      {editingExercises && (
        <button
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: 8 }}
          onClick={() => setShowExercisePicker(true)}
        >
          <Plus size={16} /> Add Exercise
        </button>
      )}

      {showExercisePicker && (
        <ExercisePicker
          alreadyAdded={exerciseSessions.map((e) => e.exerciseId)}
          onPick={addExerciseToSession}
          onClose={() => setShowExercisePicker(false)}
        />
      )}

      {replaceExerciseIdx !== null && (
        <ExercisePicker
          title={`Replace ${getExerciseName(exerciseSessions[replaceExerciseIdx].exerciseId)}`}
          alreadyAdded={exerciseSessions.map((e) => e.exerciseId)}
          onPick={(exercise) => replaceExerciseInSession(replaceExerciseIdx, exercise)}
          onClose={() => setReplaceExerciseIdx(null)}
        />
      )}

      {removeExerciseIdx !== null && (
        <ConfirmDialog
          message={`Remove "${getExerciseName(exerciseSessions[removeExerciseIdx].exerciseId)}" from this workout? The sets you logged for it will be lost.`}
          confirmLabel="Remove"
          onConfirm={() => removeExerciseFromSession(removeExerciseIdx)}
          onCancel={() => setRemoveExerciseIdx(null)}
        />
      )}

      {preview ? (
        // Omitting onStart makes the preview read-only — used for archived
        // templates, which are kept for history but not meant to be run.
        onStart && (
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 16, padding: 14, fontSize: 16 }}
            onClick={onStart}
          >
            <Play size={18} /> Start Workout
          </button>
        )
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
