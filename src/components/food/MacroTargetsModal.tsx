import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { get7DayAvgWeight, computeMacrosFromWeight } from '../../utils/calculations';
import { X } from 'lucide-react';

interface MacroTargetsModalProps {
  date: string;
  onClose: () => void;
}

export function MacroTargetsModal({ date, onClose }: MacroTargetsModalProps) {
  const { getMacroTargetsForDate, addMacroTargets, settings, updateSettings, bodyEntries } = useStore();
  const existing = getMacroTargetsForDate(date);

  const [calories, setCalories] = useState(existing?.calories || 2000);
  const [proteinPerKg, setProteinPerKg] = useState(settings.proteinPerKg ?? 2.0);
  const [fatPerKg, setFatPerKg] = useState(settings.fatPerKg ?? 1.0);
  const [fiberPerKg, setFiberPerKg] = useState(settings.fiberPerKg ?? 0.4);
  const [sugarLimitG, setSugarLimitG] = useState(settings.sugarLimitG ?? 50);

  const avgWeight = useMemo(() => get7DayAvgWeight(bodyEntries, date), [bodyEntries, date]);

  const macros = useMemo(() => {
    if (!avgWeight) return null;
    return computeMacrosFromWeight(calories, avgWeight, proteinPerKg, fatPerKg, fiberPerKg, sugarLimitG);
  }, [calories, avgWeight, proteinPerKg, fatPerKg, fiberPerKg, sugarLimitG]);

  useEffect(() => {
    if (existing) {
      setCalories(existing.calories);
    }
  }, []);

  const save = () => {
    updateSettings({ proteinPerKg, fatPerKg, fiberPerKg, sugarLimitG });

    if (macros) {
      addMacroTargets({
        date,
        calories,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
        sugarG: macros.sugarG,
        fiberG: macros.fiberG,
      });
    } else {
      addMacroTargets({
        date,
        calories,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        sugarG: sugarLimitG,
        fiberG: 0,
      });
    }
    onClose();
  };

  const proteinCal = macros ? macros.proteinG * 4 : 0;
  const carbsCal = macros ? macros.carbsG * 4 : 0;
  const fatCal = macros ? macros.fatG * 9 : 0;
  const fiberCal = macros ? macros.fiberG * 2 : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>Macro Targets</h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
          Macros are calculated from your 7-day average weight ({avgWeight ? `${avgWeight} kg` : 'no data'}).
          {existing && existing.date !== date && (
            <span> Calories from {existing.date}.</span>
          )}
        </p>

        <div className="form-group">
          <label className="label">Daily Calories (kcal)</label>
          <input
            type="number"
            className="input"
            value={calories}
            onChange={(e) => setCalories(Number(e.target.value))}
            min={500}
            max={10000}
            step={50}
          />
        </div>

        <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, marginTop: 16 }}>
          Grams per kg of body weight
        </h4>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Protein (g/kg)</label>
            <input
              type="number"
              className="input"
              value={proteinPerKg}
              onChange={(e) => setProteinPerKg(Number(e.target.value))}
              min={0}
              max={5}
              step={0.1}
            />
          </div>
          <div className="form-group">
            <label className="label">Fat (g/kg)</label>
            <input
              type="number"
              className="input"
              value={fatPerKg}
              onChange={(e) => setFatPerKg(Number(e.target.value))}
              min={0}
              max={5}
              step={0.1}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Fiber (g/kg)</label>
            <input
              type="number"
              className="input"
              value={fiberPerKg}
              onChange={(e) => setFiberPerKg(Number(e.target.value))}
              min={0}
              max={2}
              step={0.1}
            />
          </div>
          <div className="form-group">
            <label className="label">Sugar limit (g)</label>
            <input
              type="number"
              className="input"
              value={sugarLimitG}
              onChange={(e) => setSugarLimitG(Number(e.target.value))}
              min={0}
            />
          </div>
        </div>

        {macros && (
          <div className="card" style={{ padding: 12, marginTop: 8 }}>
            <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Computed targets ({avgWeight} kg)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 13 }}>
              <span><strong style={{ color: '#6c63ff' }}>Protein:</strong> {macros.proteinG}g</span>
              <span style={{ color: 'var(--text-secondary)' }}>{Math.round(proteinCal)} kcal ({Math.round(proteinCal / calories * 100)}%)</span>
              <span><strong style={{ color: '#34d399' }}>Carbs:</strong> {macros.carbsG}g</span>
              <span style={{ color: 'var(--text-secondary)' }}>{Math.round(carbsCal)} kcal ({Math.round(carbsCal / calories * 100)}%)</span>
              <span><strong style={{ color: '#fbbf24' }}>Fat:</strong> {macros.fatG}g</span>
              <span style={{ color: 'var(--text-secondary)' }}>{Math.round(fatCal)} kcal ({Math.round(fatCal / calories * 100)}%)</span>
              <span><strong style={{ color: '#f87171' }}>Fiber:</strong> {macros.fiberG}g</span>
              <span style={{ color: 'var(--text-secondary)' }}>{Math.round(fiberCal)} kcal ({Math.round(fiberCal / calories * 100)}%)</span>
            </div>
          </div>
        )}

        {!avgWeight && (
          <p className="text-sm" style={{ color: 'var(--danger, #ef4444)', marginTop: 8 }}>
            No body weight entries in the past 7 days. Log your weight to compute macro targets.
          </p>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save Targets</button>
        </div>
      </div>
    </div>
  );
}
