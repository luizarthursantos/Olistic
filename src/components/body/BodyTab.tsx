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

  // Neck and biceps are optional: they start blank, with the last measurement
  // shown faded as a placeholder. Left blank, nothing is stored and the value
  // is estimated from nearby entries instead.
  const [form, setForm] = useState({
    weightKg: String(existingEntry?.weightKg ?? 75),
    waistCm: String(existingEntry?.waistCm ?? 80),
    neckCm: existingEntry?.neckCm ? String(existingEntry.neckCm) : '',
    bicepsCm: existingEntry?.bicepsCm ? String(existingEntry.bicepsCm) : '',
    activityLevel: existingEntry?.activityLevel || settings.activityLevel,
  });

  const formNum = {
    weightKg: Number(form.weightKg) || 0,
    waistCm: Number(form.waistCm) || 0,
    neckCm: Number(form.neckCm) || 0,
    bicepsCm: Number(form.bicepsCm) || 0,
  };

  // Safe numeric getter — handles strings, undefined, NaN
  const num = (val: unknown): number => {
    const n = Number(val);
    return isFinite(n) ? n : 0;
  };

  /** A measurement entered as its own value, or blank if it was left empty. */
  const ownValue = (v: number | undefined) => (num(v) > 0 ? String(v) : '');

  /**
   * The value to show faded in an optional field: the last time it was
   * measured before the entry's date, or the latest measurement otherwise.
   * The entry's own date is skipped — its value is in the field itself.
   */
  const lastMeasured = (date: string, field: 'neckCm' | 'bicepsCm'): number => {
    const measured = bodyEntries
      .filter((e) => e.date !== date && num(e[field]) > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
    return num((measured.find((e) => e.date < date) ?? measured[0])?.[field]);
  };

  const openForm = (entry?: BodyEntry) => {
    const target = entry ?? bodyEntries.find((e) => e.date === selectedDate);
    if (target) {
      setForm({
        weightKg: String(target.weightKg),
        waistCm: String(target.waistCm),
        neckCm: ownValue(target.neckCm),
        bicepsCm: ownValue(target.bicepsCm),
        activityLevel: target.activityLevel,
      });
    } else {
      // New day: weight, waist and activity carry over from the last entry;
      // the optional fields stay blank and show the last value faded.
      const last = [...bodyEntries].sort((a, b) => b.date.localeCompare(a.date))[0];
      if (last) {
        setForm({
          weightKg: String(last.weightKg),
          waistCm: String(last.waistCm),
          neckCm: '',
          bicepsCm: '',
          activityLevel: last.activityLevel,
        });
      }
    }
    setEditEntry(entry ?? null);
    setShowForm(true);
  };

  const saveEntry = () => {
    addBodyEntry({
      date: editEntry?.date || selectedDate,
      weightKg: formNum.weightKg,
      waistCm: formNum.waistCm,
      // Left blank means not measured that day: store nothing, so it is
      // estimated from nearby entries rather than read as zero.
      ...(formNum.neckCm > 0 ? { neckCm: formNum.neckCm } : {}),
      ...(formNum.bicepsCm > 0 ? { bicepsCm: formNum.bicepsCm } : {}),
      activityLevel: form.activityLevel,
    });
    setShowForm(false);
    setEditEntry(null);
  };

  const handleDelete = (id: string) => {
    deleteBodyEntry(id);
    setDeleteConfirm(null);
  };

  // Interpolate a numeric field for a given date from surrounding entries that have it
  const interpolateField = (
    date: string,
    field: 'weightKg' | 'waistCm' | 'neckCm' | 'bicepsCm',
    // Ignore an entry on this date — used when previewing an entry whose
    // stored value is about to be replaced by what is in the form.
    excludeDate?: string,
  ): number => {
    const sorted = [...bodyEntries]
      .filter((e) => e.date !== excludeDate)
      .sort((a, b) => a.date.localeCompare(b.date));
    const before = sorted.filter((e) => e.date <= date && num(e[field]) > 0).pop();
    const after = sorted.find((e) => e.date >= date && num(e[field]) > 0);
    if (before && after && before.date !== after.date) {
      const d1 = new Date(before.date + 'T12:00:00').getTime();
      const d2 = new Date(after.date + 'T12:00:00').getTime();
      const dt = new Date(date + 'T12:00:00').getTime();
      const t = (dt - d1) / (d2 - d1);
      const v1 = num(before[field]);
      const v2 = num(after[field]);
      return Math.round((v1 + t * (v2 - v1)) * 10) / 10;
    }
    // Biceps was added later than the other measurements and is optional, so a
    // day before it was first measured has no value — projecting the first
    // measurement backwards would invent history.
    if (field === 'bicepsCm' && !before) return 0;
    return num(before?.[field]) || num(after?.[field]) || 0;
  };

  // Get best value for a field: use entry's own value if present, otherwise interpolate
  const resolveField = (entry: BodyEntry, field: 'weightKg' | 'waistCm' | 'neckCm' | 'bicepsCm'): number => {
    const v = num(entry[field]);
    return v > 0 ? v : interpolateField(entry.date, field);
  };

  // Interpolate a body entry for the selected date if no exact entry exists
  const interpolatedEntry = useMemo(() => {
    const exact = bodyEntries.find((e) => e.date === selectedDate);
    if (exact) return exact;
    if (bodyEntries.length === 0) return null;

    const sorted = [...bodyEntries].sort((a, b) => a.date.localeCompare(b.date));
    const before = sorted.filter((e) => e.date < selectedDate).pop();
    const after = sorted.find((e) => e.date > selectedDate);
    const activityLevel = before?.activityLevel || after?.activityLevel || settings.activityLevel;

    return {
      id: 'interpolated',
      date: selectedDate,
      weightKg: interpolateField(selectedDate, 'weightKg'),
      waistCm: interpolateField(selectedDate, 'waistCm'),
      neckCm: interpolateField(selectedDate, 'neckCm'),
      bicepsCm: interpolateField(selectedDate, 'bicepsCm'),
      activityLevel,
    } as BodyEntry;
  }, [bodyEntries, selectedDate]);

  const isInterpolated = interpolatedEntry ? !bodyEntries.some((e) => e.date === selectedDate) : false;

  // Calculate stats for the current (or interpolated) entry
  const stats = useMemo(() => {
    if (!interpolatedEntry) return null;

    const weight = resolveField(interpolatedEntry, 'weightKg');
    const waist = resolveField(interpolatedEntry, 'waistCm');
    const neck = resolveField(interpolatedEntry, 'neckCm');
    const biceps = resolveField(interpolatedEntry, 'bicepsCm');
    if (!weight) return null;

    const bodyFat = calcBodyFatNavy(settings.sex, waist, neck, settings.heightCm);
    const ffmi = calcFFMI(weight, bodyFat, settings.heightCm);
    const age = calcAge(settings.birthday);
    const bmr = calcBMR(settings.sex, weight, settings.heightCm, age);
    const tdee = calcTDEE(bmr, interpolatedEntry.activityLevel);
    const leanMassKg = weight * (1 - bodyFat / 100);
    const fatMassKg = weight * (bodyFat / 100);

    return { weight, biceps, bodyFat, ffmi, bmr, tdee, leanMassKg, fatMassKg };
  }, [interpolatedEntry, bodyEntries, settings]);

  const recentEntries = useMemo(() => {
    return [...bodyEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [bodyEntries]);

  const formDate = editEntry?.date || selectedDate;
  const lastNeck = showForm ? lastMeasured(formDate, 'neckCm') : 0;
  const lastBiceps = showForm ? lastMeasured(formDate, 'bicepsCm') : 0;
  const previewNeck = formNum.neckCm || (showForm ? interpolateField(formDate, 'neckCm', formDate) : 0);
  const previewBodyFat = calcBodyFatNavy(settings.sex, formNum.waistCm, previewNeck, settings.heightCm);

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
            <div className="stat-card-value">{stats.weight} kg</div>
            <div className="stat-card-label">Weight</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{stats.bodyFat}%</div>
            <div className="stat-card-label">Body Fat (Navy)</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{stats.ffmi.toFixed(2)}</div>
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
              {(stats.weight - stats.leanMassKg / (1 - settings.targetBodyFatPct / 100)).toFixed(1)} kg
            </div>
            <div className="stat-card-label">Weight to Lose</div>
          </div>
          {stats.biceps > 0 && (
            <div className="stat-card">
              <div className="stat-card-value">{stats.biceps} cm</div>
              <div className="stat-card-label">Biceps</div>
            </div>
          )}
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
            <table className="body-entries-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weight</th>
                  <th>Waist</th>
                  <th>Neck</th>
                  <th>Biceps</th>
                  <th>BF %</th>
                  {editMode && <th></th>}
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((entry) => {
                  const weight = resolveField(entry, 'weightKg');
                  const waist = resolveField(entry, 'waistCm');
                  const neck = resolveField(entry, 'neckCm');
                  const biceps = resolveField(entry, 'bicepsCm');
                  const bf = calcBodyFatNavy(settings.sex, waist, neck, settings.heightCm);
                  const est = { color: 'var(--text-muted)', fontStyle: 'italic' as const };
                  const hasWeight = num(entry.weightKg) > 0;
                  const hasWaist = num(entry.waistCm) > 0;
                  const hasNeck = num(entry.neckCm) > 0;
                  const hasBiceps = num(entry.bicepsCm) > 0;
                  return (
                    <tr key={entry.id}>
                      <td>{entry.date.slice(8,10)}-{entry.date.slice(5,7)}-{entry.date.slice(2,4)}</td>
                      <td style={!hasWeight ? est : undefined}>{weight || '–'}</td>
                      <td style={!hasWaist ? est : undefined}>{waist || '–'}</td>
                      <td style={!hasNeck ? est : undefined}>{neck || '–'}</td>
                      <td style={!hasBiceps ? est : undefined}>{biceps || '–'}</td>
                      <td style={!hasWaist || !hasNeck ? est : undefined}>{bf || '–'}</td>
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
          <p className="text-sm text-muted" style={{ margin: '8px 0 0' }}>
            Weight in kg, measurements in cm. Grey values are estimated from nearby entries.
          </p>
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
                  placeholder={lastNeck ? String(lastNeck) : 'Optional'}
                />
              </div>
              <div className="form-group">
                <label className="label">Biceps (cm)</label>
                <input
                  type="number"
                  className="input"
                  value={form.bicepsCm}
                  onChange={(e) => setForm({ ...form, bicepsCm: e.target.value })}
                  step={0.1}
                  placeholder={lastBiceps ? String(lastBiceps) : 'Optional'}
                />
              </div>
            </div>
            <p className="text-sm text-muted" style={{ margin: '-4px 0 12px' }}>
              Neck and biceps are optional. Faded values are your last measurement;
              leave blank to estimate from nearby entries.
            </p>
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

            {/* Live preview — with neck left blank, preview with the same estimate
                the saved entry will get. */}
            {previewNeck > 0 && formNum.waistCm > previewNeck && (
              <div className="body-preview">
                <span>Body Fat: {previewBodyFat}%{!formNum.neckCm && ' (est.)'}</span>
                <span>FFMI: {calcFFMI(formNum.weightKg, previewBodyFat, settings.heightCm).toFixed(2)}</span>
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
