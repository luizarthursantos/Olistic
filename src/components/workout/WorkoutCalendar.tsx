import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { toLocalDateStr } from '../../utils/calculations';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WorkoutCalendarProps {
  onViewSession?: (sessionId: string) => void;
}

export function WorkoutCalendar({ onViewSession }: WorkoutCalendarProps) {
  const { workoutSessions, workoutTemplates } = useStore();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const changeMonth = (delta: number) => {
    setCurrentMonth((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
  };

  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay(); // 0 = Sunday

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      days.push({
        date: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      days.push({
        date: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, { color: string; name: string; sessionId: string }[]> = {};
    workoutSessions
      .filter((s) => s.completed)
      .forEach((session) => {
        const template = workoutTemplates.find((t) => t.id === session.templateId);
        if (!map[session.date]) map[session.date] = [];
        map[session.date].push({
          color: template?.color || '#6c63ff',
          name: template?.name || 'Workout',
          sessionId: session.id,
        });
      });
    return map;
  }, [workoutSessions, workoutTemplates]);

  const today = toLocalDateStr(new Date());
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="workout-calendar">
      <div className="calendar-header">
        <button className="btn btn-icon btn-secondary" onClick={() => changeMonth(-1)}>
          <ChevronLeft size={18} />
        </button>
        <span className="calendar-month">
          {monthNames[currentMonth.month]} {currentMonth.year}
        </span>
        <button className="btn btn-icon btn-secondary" onClick={() => changeMonth(1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="calendar-grid">
        {dayNames.map((d) => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}
        {calendarDays.map((day, i) => {
          const sessions = sessionsByDate[day.date] || [];
          const hasWorkout = sessions.length > 0;
          return (
            <div
              key={i}
              className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.date === today ? 'today' : ''} ${hasWorkout ? 'has-workout' : ''}`}
            >
              <span className="calendar-day-number">{day.day}</span>
              {hasWorkout && (
                <div className="calendar-day-workouts">
                  {sessions.slice(0, 2).map((s, j) => (
                    <div
                      key={j}
                      className="calendar-workout-label"
                      style={{ background: s.color }}
                      onClick={() => onViewSession?.(s.sessionId)}
                    >
                      {s.name}
                    </div>
                  ))}
                  {sessions.length > 2 && (
                    <div className="calendar-workout-more">+{sessions.length - 2}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {workoutTemplates.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            <div className="color-dot" style={{ background: t.color }} />
            {t.name}
          </div>
        ))}
      </div>
    </div>
  );
}
