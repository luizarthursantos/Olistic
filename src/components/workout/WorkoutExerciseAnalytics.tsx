import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { calcOneRepMax, getBestOneRepMax } from '../../utils/calculations';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface WorkoutExerciseAnalyticsProps {
  initialExerciseId?: string;
  onClose?: () => void;
}

export function WorkoutExerciseAnalytics({ initialExerciseId, onClose }: WorkoutExerciseAnalyticsProps = {}) {
  const { exercises, workoutSessions, workoutTemplates } = useStore();
  const [selectedExerciseId, setSelectedExerciseId] = useState(initialExerciseId || '');

  // Only show exercises that have been used in at least one completed session
  const usedExercises = useMemo(() => {
    const ids = new Set<string>();
    workoutSessions.filter((s) => s.completed).forEach((s) => {
      s.exercises.forEach((ex) => {
        if (ex.sets.some((set) => set.completed && set.loadKg > 0)) {
          ids.add(ex.exerciseId);
        }
      });
    });
    return exercises
      .filter((e) => !e.isCardio && ids.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, workoutSessions]);

  const exercise = exercises.find((e) => e.id === selectedExerciseId);

  // Collect all session data for the selected exercise
  const exerciseLogs = useMemo(() => {
    if (!selectedExerciseId) return [];
    const logs: {
      date: string;
      sessionId: string;
      templateName: string;
      sets: { reps: number; loadKg: number; completed: boolean }[];
      best1RM: number;
    }[] = [];

    workoutSessions
      .filter((s) => s.completed)
      .forEach((s) => {
        const exSession = s.exercises.find((e) => e.exerciseId === selectedExerciseId);
        if (!exSession) return;
        const completedSets = exSession.sets.filter((set) => set.completed);
        if (completedSets.length === 0) return;
        const best1RM = getBestOneRepMax(exSession.sets);
        const templateName = workoutTemplates.find((t) => t.id === s.templateId)?.name || 'Unknown';
        logs.push({
          date: s.date,
          sessionId: s.id,
          templateName,
          sets: completedSets,
          best1RM,
        });
      });

    return logs.sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedExerciseId, workoutSessions, workoutTemplates]);

  // Chart data: 1RM over time
  const chartData = useMemo(() => {
    if (exerciseLogs.length === 0) return [];

    // Fill calendar dates for proportional x-axis
    const first = exerciseLogs[0].date;
    const last = exerciseLogs[exerciseLogs.length - 1].date;
    const byDate: Record<string, number> = {};
    exerciseLogs.forEach((log) => {
      byDate[log.date] = Math.max(byDate[log.date] || 0, log.best1RM);
    });

    const allDates: string[] = [];
    const d = new Date(first + 'T12:00:00');
    while (d.toISOString().split('T')[0] <= last) {
      allDates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }

    return allDates.map((date) => ({
      date,
      orm: byDate[date] ?? undefined,
    }));
  }, [exerciseLogs]);

  // Nice Y-axis ticks (multiples of 5/10)
  const yAxisConfig = useMemo(() => {
    const values = chartData.map((d) => d.orm).filter((v): v is number => v !== undefined);
    if (values.length === 0) return undefined;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || Math.abs(max) * 0.1 || 1;
    const rawStep = range / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1))));
    const candidates = [1, 2, 5, 10].map((m) => m * magnitude);
    const step = Math.max(1, candidates.find((c) => c >= rawStep) || candidates[candidates.length - 1]);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = lo; v <= hi + step * 0.01; v += step) {
      ticks.push(Math.round(v));
    }
    return { domain: [ticks[0], ticks[ticks.length - 1]] as [number, number], ticks };
  }, [chartData]);

  // X-axis ticks
  const xTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const first = chartData[0].date;
    const last = chartData[chartData.length - 1].date;
    const span = (new Date(last).getTime() - new Date(first).getTime()) / (1000 * 60 * 60 * 24);
    const ticks: string[] = [];
    if (span <= 120) {
      const d = new Date(first + 'T12:00:00');
      d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
      while (d.toISOString().split('T')[0] <= last) {
        ticks.push(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 7);
      }
    } else {
      const startD = new Date(first + 'T12:00:00');
      const d = new Date(startD.getFullYear(), startD.getMonth() + 1, 1, 12);
      while (d.toISOString().split('T')[0] <= last) {
        ticks.push(d.toISOString().split('T')[0]);
        d.setMonth(d.getMonth() + 1);
      }
    }
    return ticks;
  }, [chartData]);

  const reversedLogs = useMemo(() => [...exerciseLogs].reverse(), [exerciseLogs]);

  const content = (
    <div>
      {/* Exercise Selector - hide when opened for a specific exercise */}
      {!initialExerciseId && (
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="label">Exercise</label>
          <select
            className="select"
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
          >
            <option value="">Select an exercise...</option>
            {usedExercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.icon} {ex.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!selectedExerciseId && (
        <div className="empty-state" style={{ padding: '30px 20px' }}>
          <p className="text-muted">Select an exercise to view analytics</p>
        </div>
      )}

      {selectedExerciseId && exerciseLogs.length === 0 && (
        <div className="empty-state" style={{ padding: '30px 20px' }}>
          <p className="text-muted">No completed sets for this exercise</p>
        </div>
      )}

      {selectedExerciseId && exerciseLogs.length > 0 && (
        <>
          {/* 1RM Chart */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              {exercise?.icon} {exercise?.name} — Est. 1RM (kg)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  ticks={xTicks.length > 0 ? xTicks : undefined}
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickFormatter={(val: string) => {
                    const d = new Date(val + 'T12:00:00');
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    return `${d.getDate()}-${months[d.getMonth()]}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  width={40}
                  domain={yAxisConfig?.domain || ['auto', 'auto']}
                  ticks={yAxisConfig?.ticks}
                  tickFormatter={(v: number) => String(Math.round(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: unknown) => [`${Math.round(Number(value))} kg`, '1RM']}
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

          {/* History Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>All Sessions ({exerciseLogs.length})</h3>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Workout</th>
                    <th>Sets</th>
                    <th>Best Set</th>
                    <th>1RM</th>
                  </tr>
                </thead>
                <tbody>
                  {reversedLogs.map((log) => {
                    const bestSet = log.sets.reduce((best, s) => {
                      const orm = calcOneRepMax(s.loadKg, s.reps);
                      const bestOrm = calcOneRepMax(best.loadKg, best.reps);
                      return orm > bestOrm ? s : best;
                    }, log.sets[0]);
                    return (
                      <tr key={log.sessionId}>
                        <td>{log.date.slice(8,10)}-{log.date.slice(5,7)}-{log.date.slice(2,4)}</td>
                        <td>{log.templateName}</td>
                        <td>{log.sets.length}</td>
                        <td>{bestSet.loadKg}×{bestSet.reps}</td>
                        <td style={{ fontWeight: 600 }}>{Math.round(log.best1RM)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (onClose) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="modal-title" style={{ margin: 0 }}>
              {exercise?.icon} {exercise?.name} — Analytics
            </h3>
            <button className="btn btn-icon btn-secondary" onClick={onClose}>✕</button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
