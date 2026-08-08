import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Exercise } from '../../types';
import { X, Plus } from 'lucide-react';

interface ExercisePickerProps {
  title?: string;
  /** Marked as already in the workout — still selectable, since an exercise can legitimately be repeated. */
  alreadyAdded?: string[];
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}

/**
 * Searchable exercise chooser for picking one exercise mid-workout. The
 * template editor has its own picker that also manages the exercise library
 * (rename, delete); this one deliberately only chooses.
 */
export function ExercisePicker({ title = 'Add Exercise', alreadyAdded = [], onPick, onClose }: ExercisePickerProps) {
  const { exercises, addExercise } = useStore();
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIsCardio, setNewIsCardio] = useState(false);

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const createAndPick = () => {
    const name = newName.trim();
    if (!name) return;
    const icon = newIsCardio ? '🏃' : '🏋️';
    const id = addExercise({ name, icon, isCardio: newIsCardio, isCustom: true });
    onPick({ id, name, icon, isCardio: newIsCardio, isCustom: true });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>{title}</h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <input
          type="text"
          className="input"
          placeholder="Search exercises..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          style={{ width: '100%', marginBottom: 8 }}
        />

        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {filtered.map((exercise) => (
            <button
              key={exercise.id}
              className="food-search-item"
              onClick={() => onPick(exercise)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              <span>{exercise.icon}</span>
              <span style={{ flex: 1 }}>{exercise.name}</span>
              {alreadyAdded.includes(exercise.id) && <span className="badge">Added</span>}
              {exercise.isCardio && <span className="badge badge-success">Cardio</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted" style={{ padding: '12px 0', margin: 0 }}>
              No exercise matches "{query.trim()}".
            </p>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          {!showCreate ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (!newName.trim()) setNewName(query.trim());
                setShowCreate(true);
              }}
            >
              <Plus size={14} /> Create Custom Exercise
            </button>
          ) : (
            <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <div className="form-group">
                <input
                  type="text"
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createAndPick(); }}
                  placeholder="Exercise name"
                  autoFocus
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newIsCardio}
                  onChange={(e) => setNewIsCardio(e.target.checked)}
                />
                Cardio exercise
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={createAndPick} disabled={!newName.trim()}>
                  Create &amp; Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
