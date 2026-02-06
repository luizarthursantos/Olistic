import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { WorkoutTemplate, WorkoutExerciseTemplate, Exercise } from '../../types';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';

interface WorkoutTemplateModalProps {
  template: WorkoutTemplate | null;
  onClose: () => void;
}

const COLORS = ['#6c63ff', '#34d399', '#f87171', '#fbbf24', '#60a5fa', '#a78bfa', '#fb923c', '#e879f9'];

export function WorkoutTemplateModal({ template, onClose }: WorkoutTemplateModalProps) {
  const { exercises, addExercise, addWorkoutTemplate, updateWorkoutTemplate } = useStore();
  const [name, setName] = useState(template?.name || '');
  const [color, setColor] = useState(template?.color || COLORS[0]);
  const [templateExercises, setTemplateExercises] = useState<WorkoutExerciseTemplate[]>(
    template?.exercises || []
  );
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseIsCardio, setNewExerciseIsCardio] = useState(false);
  const [showCreateExercise, setShowCreateExercise] = useState(false);

  const addExerciseToTemplate = (exercise: Exercise) => {
    setTemplateExercises([
      ...templateExercises,
      {
        exerciseId: exercise.id,
        sets: exercise.isCardio ? 1 : 3,
        defaultReps: exercise.isCardio ? 1 : 10,
        defaultLoadKg: 0,
        notes: '',
      },
    ]);
    setShowExercisePicker(false);
  };

  const removeExercise = (index: number) => {
    setTemplateExercises(templateExercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, partial: Partial<WorkoutExerciseTemplate>) => {
    setTemplateExercises(
      templateExercises.map((ex, i) => (i === index ? { ...ex, ...partial } : ex))
    );
  };

  const createNewExercise = () => {
    if (!newExerciseName.trim()) return;
    const id = addExercise({
      name: newExerciseName.trim(),
      icon: newExerciseIsCardio ? '🏃' : '🏋️',
      isCardio: newExerciseIsCardio,
      isCustom: true,
    });
    const ex = { ...exercises[exercises.length - 1], id }; // just use the id
    addExerciseToTemplate({
      id,
      name: newExerciseName.trim(),
      icon: newExerciseIsCardio ? '🏃' : '🏋️',
      isCardio: newExerciseIsCardio,
      isCustom: true,
    });
    setNewExerciseName('');
    setShowCreateExercise(false);
  };

  const save = () => {
    if (!name.trim()) return;
    if (template) {
      updateWorkoutTemplate(template.id, { name, color, exercises: templateExercises });
    } else {
      addWorkoutTemplate({ name, color, exercises: templateExercises });
    }
    onClose();
  };

  const getExerciseName = (exerciseId: string) => {
    return exercises.find((e) => e.id === exerciseId)?.name || 'Unknown';
  };

  const getExerciseIcon = (exerciseId: string) => {
    return exercises.find((e) => e.id === exerciseId)?.icon || '🏋️';
  };

  const isCardioExercise = (exerciseId: string) => {
    return exercises.find((e) => e.id === exerciseId)?.isCardio || false;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>
            {template ? 'Edit Workout' : 'New Workout'}
          </h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="form-group">
          <label className="label">Workout Name</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Push Day, Full Body..."
          />
        </div>

        <div className="form-group">
          <label className="label">Color</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                  cursor: 'pointer',
                }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="label" style={{ margin: 0 }}>Exercises</label>
            <button className="btn btn-primary btn-sm" onClick={() => setShowExercisePicker(true)}>
              <Plus size={14} /> Add Exercise
            </button>
          </div>

          {templateExercises.map((ex, i) => (
            <div key={i} className="exercise-card" style={{ marginBottom: 8 }}>
              <div className="exercise-card-header">
                <span className="exercise-card-name">
                  {getExerciseIcon(ex.exerciseId)} {getExerciseName(ex.exerciseId)}
                </span>
                <button className="btn btn-icon btn-danger btn-sm" onClick={() => removeExercise(i)}>
                  <Trash2 size={14} />
                </button>
              </div>

              {isCardioExercise(ex.exerciseId) ? (
                <div className="form-group">
                  <label className="label">Default Duration (minutes)</label>
                  <input
                    type="number"
                    className="input"
                    value={ex.defaultReps}
                    onChange={(e) => updateExercise(i, { defaultReps: Number(e.target.value) })}
                    min={1}
                  />
                </div>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Sets</label>
                    <input
                      type="number"
                      className="input"
                      value={ex.sets}
                      onChange={(e) => updateExercise(i, { sets: Number(e.target.value) })}
                      min={1}
                      max={20}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Default Reps</label>
                    <input
                      type="number"
                      className="input"
                      value={ex.defaultReps}
                      onChange={(e) => updateExercise(i, { defaultReps: Number(e.target.value) })}
                      min={1}
                    />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label className="label">{isCardioExercise(ex.exerciseId) ? 'Notes' : 'Default Load (kg)'}</label>
                {!isCardioExercise(ex.exerciseId) && (
                  <input
                    type="number"
                    className="input"
                    value={ex.defaultLoadKg}
                    onChange={(e) => updateExercise(i, { defaultLoadKg: Number(e.target.value) })}
                    min={0}
                    step={0.5}
                    style={{ marginBottom: 8 }}
                  />
                )}
                <input
                  type="text"
                  className="input"
                  value={ex.notes}
                  onChange={(e) => updateExercise(i, { notes: e.target.value })}
                  placeholder="Notes (shown during execution)"
                />
              </div>
            </div>
          ))}

          {templateExercises.length === 0 && (
            <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 20 }}>
              Add exercises to this workout
            </p>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!name.trim()}>
            {template ? 'Save Changes' : 'Create Workout'}
          </button>
        </div>

        {/* Exercise picker */}
        {showExercisePicker && (
          <div className="modal-overlay" onClick={() => setShowExercisePicker(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 className="modal-title" style={{ margin: 0 }}>Add Exercise</h3>
                <button className="btn btn-icon btn-secondary" onClick={() => setShowExercisePicker(false)}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {exercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    className="food-search-item"
                    onClick={() => addExerciseToTemplate(exercise)}
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
                    {exercise.isCardio && <span className="badge badge-success">Cardio</span>}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                {!showCreateExercise ? (
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateExercise(true)}>
                    <Plus size={14} /> Create Custom Exercise
                  </button>
                ) : (
                  <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="form-group">
                      <input
                        type="text"
                        className="input"
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                        placeholder="Exercise name"
                      />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newExerciseIsCardio}
                        onChange={(e) => setNewExerciseIsCardio(e.target.checked)}
                      />
                      Cardio exercise
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateExercise(false)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={createNewExercise}>Create & Add</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
