import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { calcCaloriesFromMacros } from '../../utils/calculations';
import { X } from 'lucide-react';

interface MacroTargetsModalProps {
  date: string;
  onClose: () => void;
}

export function MacroTargetsModal({ date, onClose }: MacroTargetsModalProps) {
  const { getMacroTargetsForDate, addMacroTargets } = useStore();
  const existing = getMacroTargetsForDate(date);

  const [calories, setCalories] = useState(existing?.calories || 2000);
  const [proteinPct, setProteinPct] = useState(30);
  const [carbsPct, setCarbsPct] = useState(40);
  const [fatPct, setFatPct] = useState(30);
  const [sugarG, setSugarG] = useState(existing?.sugarG || 50);
  const [fiberG, setFiberG] = useState(existing?.fiberG || 30);

  // Calculate grams from percentages
  const proteinG = Math.round((calories * proteinPct) / 100 / 4);
  const carbsG = Math.round((calories * carbsPct) / 100 / 4);
  const fatG = Math.round((calories * fatPct) / 100 / 9);

  // Initialize from existing
  useEffect(() => {
    if (existing) {
      setCalories(existing.calories);
      setSugarG(existing.sugarG);
      setFiberG(existing.fiberG);
      if (existing.calories > 0) {
        setProteinPct(Math.round((existing.proteinG * 4 / existing.calories) * 100));
        setCarbsPct(Math.round((existing.carbsG * 4 / existing.calories) * 100));
        setFatPct(Math.round((existing.fatG * 9 / existing.calories) * 100));
      }
    }
  }, []);

  const adjustPct = (which: 'protein' | 'carbs' | 'fat', value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    if (which === 'protein') {
      setProteinPct(clamped);
      const remaining = 100 - clamped;
      const ratio = carbsPct + fatPct > 0 ? carbsPct / (carbsPct + fatPct) : 0.5;
      setCarbsPct(Math.round(remaining * ratio));
      setFatPct(remaining - Math.round(remaining * ratio));
    } else if (which === 'carbs') {
      setCarbsPct(clamped);
      const remaining = 100 - clamped;
      const ratio = proteinPct + fatPct > 0 ? proteinPct / (proteinPct + fatPct) : 0.5;
      setProteinPct(Math.round(remaining * ratio));
      setFatPct(remaining - Math.round(remaining * ratio));
    } else {
      setFatPct(clamped);
      const remaining = 100 - clamped;
      const ratio = proteinPct + carbsPct > 0 ? proteinPct / (proteinPct + carbsPct) : 0.5;
      setProteinPct(Math.round(remaining * ratio));
      setCarbsPct(remaining - Math.round(remaining * ratio));
    }
  };

  const save = () => {
    addMacroTargets({
      date,
      calories,
      proteinG,
      carbsG,
      fatG,
      sugarG,
      fiberG,
    });
    onClose();
  };

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
          Targets are forward-filled until updated. Setting targets for {date}.
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

        <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Macro Distribution (adjust sliders, others auto-balance)
        </h4>

        <div className="form-group">
          <label className="label">
            Protein: {proteinPct}% ({proteinG}g)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={proteinPct}
            onChange={(e) => adjustPct('protein', Number(e.target.value))}
            style={{ width: '100%', accentColor: '#6c63ff' }}
          />
        </div>
        <div className="form-group">
          <label className="label">
            Carbs: {carbsPct}% ({carbsG}g)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={carbsPct}
            onChange={(e) => adjustPct('carbs', Number(e.target.value))}
            style={{ width: '100%', accentColor: '#34d399' }}
          />
        </div>
        <div className="form-group">
          <label className="label">
            Fat: {fatPct}% ({fatG}g)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={fatPct}
            onChange={(e) => adjustPct('fat', Number(e.target.value))}
            style={{ width: '100%', accentColor: '#fbbf24' }}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Sugar limit (g)</label>
            <input
              type="number"
              className="input"
              value={sugarG}
              onChange={(e) => setSugarG(Number(e.target.value))}
              min={0}
            />
          </div>
          <div className="form-group">
            <label className="label">Fiber target (g)</label>
            <input
              type="number"
              className="input"
              value={fiberG}
              onChange={(e) => setFiberG(Number(e.target.value))}
              min={0}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save Targets</button>
        </div>
      </div>
    </div>
  );
}
