import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { DateSelector } from '../common/DateSelector';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { calcBodyFatNavy, calcFFMI, calcBMR, calcTDEE, calcAge } from '../../utils/calculations';
import { Plus, Trash2, Edit3, Pencil } from 'lucide-react';
import { BodyEntry, ACTIVITY_LABELS, ActivityLevel } from '../../types';
import './BodyTab.css';

export function BodyTab() {
  const { bodyEntries, addBodyEntry, deleteBodyEntry, selectedDate, settings } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<BodyEntry | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const existingEntry = bodyEntries.find((e) => e.date === selectedDate);

  const [form, setForm] = useState({
    weightKg: String(existingEntry?.weightKg ?? 75),
    waistCm: String(existingEntry?.waistCm ?? 80),
    neckCm: String(existingEntry?.neckCm ?? 37),
    activityLevel: existingEntry?.activityLevel || settings.activityLevel,
  });

  const formNum = {
    weightKg: Number(form.weightKg) || 0,
    waistCm: Number(form.waistCm) || 0,
    neckCm: Number(form.neckCm) || 0,
  };

  const openForm = (entry?: BodyEntry) => {
    if (entry) {
      setForm({
        weightKg: String(entry.weightKg),
        waistCm: String(entry.waistCm),
        neckCm: String(entry.neckCm),
        activityLevel: entry.activityLevel,
      });
      setEditEntry(entry);
    } else {
      const existing = bodyEntries.find((e) => e.date === selectedDate);
      if (existing) {
        setForm({
          weightKg: String(existing.weightKg),
          waistCm: String(existing.waistCm),
          neckCm: String(existing.neckCm),
          activityLevel: existing.activityLevel,
        });
      } else {
        // Use last entry as defaults
        const sorted = [...bodyEntries].sort((a, b) => b.date.localeCompare(a.date));
        const last = sorted[0];
        if (last) {
          setForm({
            weightKg: String(last.weightKg),
            waistCm: String(last.waistCm),
            neckCm: String(last.neckCm),
            activityLevel: last.activityLevel,
          });
        }
      }
      setEditEntry(null);
    }
    setShowForm(true);
  };

  const saveEntry = () => {
    addBodyEntry({
      date: editEntry?.date || selectedDate,
      weightKg: formNum.weightKg,
      waistCm: formNum.waistCm,
      neckCm: formNum.neckCm,
      activityLevel: form.activityLevel,
    });
    setShowForm(false);
    setEditEntry(null);
  };

  const handleDelete = (id: string) => {
    deleteBodyEntry(id);
    setDeleteConfirm(null);
  };

  // Interpolate a body entry for the selected date if no exact entry exists
  const interpolatedEntry = useMemo(() => {
    const exact = bodyEntries.find((e) => e.date === selectedDate);
    if (exact) return exact;
    if (bodyEntries.length === 0) return null;

    const sorted = [...bodyEntries].sort((a, b) => a.date.localeCompare(b.date));
    const before = sorted.filter((e) => e.date < selectedDate).pop();
    const after = sorted.find((e) => e.date > selectedDate);

    if (before && after) {
      const d1 = new Date(before.date + 'T12:00:00').getTime();
      const d2 = new Date(after.date + 'T12:00:00').getTime();
      const dt = new Date(selectedDate + 'T12:00:00').getTime();
      const t = (dt - d1) / (d2 - d1);
      return {
        id: 'interpolated',
        date: selectedDate,
        weightKg: Math.round((before.weightKg + t * (after.weightKg - before.weightKg)) * 100) / 100,
        waistCm: Math.round((before.waistCm + t * (after.waistCm - before.waistCm)) * 100) / 100,
        neckCm: Math.round((before.neckCm + t * (after.neckCm - before.neckCm)) * 100) / 100,
        activityLevel: before.activityLevel,
      } as BodyEntry;
    }

    // Only data on one side — use the nearest entry
    return before || after || null;
  }, [bodyEntries, selectedDate]);

  const isInterpolated = interpolatedEntry ? !bodyEntries.some((e) => e.date === selectedDate) : false;

  // Calculate stats for the current (or interpolated) entry
  const stats = useMemo(() => {
    if (!interpolatedEntry) return null;

    const bodyFat = calcBodyFatNavy(settings.sex, interpolatedEntry.waistCm, interpolatedEntry.neckCm, settings.heightCm);
    const ffmi = calcFFMI(interpolatedEntry.weightKg, bodyFat, settings.heightCm);
    const age = calcAge(settings.birthday);
    const bmr = calcBMR(settings.sex, interpolatedEntry.weightKg, settings.heightCm, age);
    const tdee = calcTDEE(bmr, interpolatedEntry.activityLevel);
    const leanMassKg = interpolatedEntry.weightKg * (1 - bodyFat / 100);
    const fatMassKg = interpolatedEntry.weightKg * (bodyFat / 100);

    return { bodyFat, ffmi, bmr, tdee, leanMassKg, fatMassKg };
  }, [interpolatedEntry, settings]);

  const recentEntries = useMemo(() => {
    return [...bodyEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [bodyEntries]);

  return (
    <div className="body-tab fade-in">
      <DateSelector />

      {stats ? (
        <div>
          {isInterpolated && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 8, fontStyle: 'italic' }}>
              Estimated from nearby entries
            </div>
          )}
          <div className="body-stats-grid">
          <div className="stat-card">
            <div className="stat-card-value">{interpolatedEntry?.weightKg} kg</div>
            <div className="stat-card-label">Weight</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{stats.bodyFat}%</div>
            <div className="stat-card-label">Body Fat (Navy)</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{stats.ffmi}</div>
            <div className="stat-card-label">FFMI</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{stats.leanMassKg.toFixed(1)} kg</div>
            <div className="stat-card-label">Lean Mass</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{stats.fatMassKg.toFixed(1)} kg</div>
            <div className="stat-card-label">Fat Mass</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{stats.bmr}</div>
            <div className="stat-card-label">BMR (kcal)</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{stats.tdee}</div>
            <div className="stat-card-label">TDEE (kcal)</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">
              {(stats.bodyFat - settings.targetBodyFatPct).toFixed(1)}%
            </div>
            <div className="stat-card-label">Fat to Lose</div>
          </div>
          </div>
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
            No data available
          </p>
        </div>
      )}

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => openForm()}>
        <Plus size={16} /> {existingEntry ? 'Edit Entry' : 'Add Entry'}
      </button>

      {recentEntries.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Recent Entries</h3>
            <button
              className={`btn btn-sm ${editMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setEditMode(!editMode)}
            >
              <Pencil size={14} /> {editMode ? 'Done' : 'Edit'}
            </button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weight (kg)</th>
                  <th>Waist (cm)</th>
                  <th>Neck (cm)</th>
                  <th>BF (%)</th>
                  {editMode && <th></th>}
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((entry) => {
                  const bf = calcBodyFatNavy(settings.sex, entry.waistCm, entry.neckCm, settings.heightCm);
                  return (
                    <tr key={entry.id}>
                      <td>{entry.date.slice(8,10)}-{entry.date.slice(5,7)}-{entry.date.slice(2,4)}</td>
                      <td>{entry.weightKg}</td>
                      <td>{entry.waistCm}</td>
                      <td>{entry.neckCm}</td>
                      <td>{bf}</td>
                      {editMode && (
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn btn-icon btn-secondary btn-sm"
                              onClick={() => openForm(entry)}
                              title="Edit"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              className="btn btn-icon btn-danger btn-sm"
                              onClick={() => setDeleteConfirm(entry.id)}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {editEntry ? `Edit Entry - ${editEntry.date}` : `Add Entry - ${selectedDate}`}
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Weight (kg)</label>
                <input
                  type="number"
                  className="input"
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                  step={0.1}
                />
              </div>
              <div className="form-group">
                <label className="label">Waist (cm)</label>
                <input
                  type="number"
                  className="input"
                  value={form.waistCm}
                  onChange={(e) => setForm({ ...form, waistCm: e.target.value })}
                  step={0.1}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Neck (cm)</label>
                <input
                  type="number"
                  className="input"
                  value={form.neckCm}
                  onChange={(e) => setForm({ ...form, neckCm: e.target.value })}
                  step={0.1}
                />
              </div>
              <div className="form-group">
                <label className="label">Activity Level</label>
                <select
                  className="select"
                  value={form.activityLevel}
                  onChange={(e) =>
                    setForm({ ...form, activityLevel: e.target.value as ActivityLevel })
                  }
                >
                  {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                    <option key={level} value={level}>
                      {ACTIVITY_LABELS[level]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live preview */}
            {formNum.waistCm > formNum.neckCm && (
              <div className="body-preview">
                <span>Body Fat: {calcBodyFatNavy(settings.sex, formNum.waistCm, formNum.neckCm, settings.heightCm)}%</span>
                <span>FFMI: {calcFFMI(formNum.weightKg, calcBodyFatNavy(settings.sex, formNum.waistCm, formNum.neckCm, settings.heightCm), settings.heightCm)}</span>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveEntry}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          message="Are you sure you want to delete this body entry?"
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
