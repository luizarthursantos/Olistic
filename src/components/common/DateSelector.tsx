import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { toLocalDateStr } from '../../utils/calculations';
import './DateSelector.css';

export function DateSelector() {
  const { selectedDate, setSelectedDate } = useStore();

  const todayStr = toLocalDateStr(new Date());
  const isToday = selectedDate >= todayStr;

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const next = toLocalDateStr(d);
    if (next > todayStr) return;
    setSelectedDate(next);
  };

  const formatDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const yesterday = new Date(todayStr + 'T12:00:00');
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterday);

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="date-selector">
      <button className="btn btn-icon btn-secondary" onClick={() => changeDate(-1)}>
        <ChevronLeft size={18} />
      </button>
      <div className="date-display">
        <input
          type="date"
          className="date-input-hidden"
          value={selectedDate}
          max={todayStr}
          onChange={(e) => { if (e.target.value <= todayStr) setSelectedDate(e.target.value); }}
        />
        <span className="date-label">{formatDisplay(selectedDate)}</span>
        <span className="date-full">{selectedDate}</span>
      </div>
      <button className="btn btn-icon btn-secondary" onClick={() => changeDate(1)} disabled={isToday}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
