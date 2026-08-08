import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Play, Calendar, Clock, Trash2, Edit3, Eye, Pencil, TrendingUp, Archive, ArchiveRestore, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { WorkoutTemplate, WorkoutSession } from '../../types';
import { WorkoutTemplateModal } from './WorkoutTemplateModal';
import { WorkoutExecution } from './WorkoutExecution';
import { WorkoutCalendar } from './WorkoutCalendar';
import { WorkoutExerciseAnalytics } from './WorkoutExerciseAnalytics';
import { ConfirmDialog } from '../common/ConfirmDialog';
import './WorkoutTab.css';

type WorkoutView = 'history' | 'calendar' | 'analytics';

export function WorkoutTab() {
  const {
    workoutTemplates,
    workoutSessions,
    addWorkoutTemplate,
    updateWorkoutTemplate,
    moveWorkoutTemplate,
    deleteWorkoutTemplate,
    updateWorkoutSession,
    deleteWorkoutSession,
    exercises,
  } = useStore();

  const [view, setView] = useState<WorkoutView>('history');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<WorkoutTemplate | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [startTemplateId, setStartTemplateId] = useState<string | null>(null);
  const [editModeTemplates, setEditModeTemplates] = useState(false);
  const [editModeHistory, setEditModeHistory] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'template' | 'session'; id: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [duplicating, setDuplicating] = useState<{ source: WorkoutTemplate; name: string } | null>(null);

  const sortedSessions = useMemo(() => {
    return [...workoutSessions].sort((a, b) => b.date.localeCompare(a.date));
  }, [workoutSessions]);

  const activeTemplates = useMemo(
    () => workoutTemplates.filter((t) => !t.archived),
    [workoutTemplates],
  );
  const archivedTemplates = useMemo(
    () => workoutTemplates.filter((t) => t.archived),
    [workoutTemplates],
  );

  const sessionCount = (templateId: string) =>
    workoutSessions.filter((s) => s.templateId === templateId).length;

  /** True when the session's template was deleted, so its name is lost. */
  const isOrphaned = (templateId: string) =>
    !workoutTemplates.some((t) => t.id === templateId);

  const setArchived = (templateId: string, archived: boolean) => {
    updateWorkoutTemplate(templateId, { archived });
    setDeleteConfirm(null);
  };

  /** Suggests "Push Day (copy)", then "(copy 2)" and so on if taken. */
  const suggestCopyName = (name: string) => {
    const taken = new Set(workoutTemplates.map((t) => t.name));
    let candidate = `${name} (copy)`;
    for (let n = 2; taken.has(candidate); n++) candidate = `${name} (copy ${n})`;
    return candidate;
  };

  const confirmDuplicate = () => {
    if (!duplicating) return;
    const name = duplicating.name.trim();
    if (!name) return;
    addWorkoutTemplate({
      name,
      color: duplicating.source.color,
      // Deep copy so editing the duplicate cannot reach back into the original.
      exercises: duplicating.source.exercises.map((e) => ({ ...e })),
    });
    setDuplicating(null);
  };

  const startWorkout = (templateId: string) => {
    setStartTemplateId(templateId);
  };

  const openEditTemplate = (template: WorkoutTemplate) => {
    setEditTemplate(template);
    setShowTemplateModal(true);
  };

  const getTemplateName = (templateId: string) => {
    return workoutTemplates.find((t) => t.id === templateId)?.name || 'Unknown Workout';
  };

  const getTemplateColor = (templateId: string) => {
    return workoutTemplates.find((t) => t.id === templateId)?.color || '#6c63ff';
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'template') {
      deleteWorkoutTemplate(deleteConfirm.id);
    } else {
      deleteWorkoutSession(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  // If previewing a workout template
  if (previewTemplateId) {
    const isArchived = !!workoutTemplates.find((t) => t.id === previewTemplateId)?.archived;
    return (
      <WorkoutExecution
        key="preview"
        templateId={previewTemplateId}
        preview
        onFinish={() => setPreviewTemplateId(null)}
        // Archived templates are viewable but not runnable; restore first.
        onStart={isArchived ? undefined : () => {
          const id = previewTemplateId;
          setPreviewTemplateId(null);
          startWorkout(id);
        }}
      />
    );
  }

  // If executing a workout
  if (startTemplateId) {
    return (
      <WorkoutExecution
        key="active"
        templateId={startTemplateId}
        onFinish={() => setStartTemplateId(null)}
      />
    );
  }

  if (activeSession) {
    const session = workoutSessions.find((s) => s.id === activeSession);
    if (session) {
      return (
        <WorkoutExecution
          templateId={session.templateId}
          existingSessionId={session.id}
          onFinish={() => setActiveSession(null)}
        />
      );
    }
  }

  return (
    <div className="workout-tab fade-in">
      {/* View toggle */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        <button
          className={`tab-btn ${view === 'history' ? 'active' : ''}`}
          onClick={() => setView('history')}
        >
          <Clock size={14} /> History
        </button>
        <button
          className={`tab-btn ${view === 'calendar' ? 'active' : ''}`}
          onClick={() => setView('calendar')}
        >
          <Calendar size={14} /> Calendar
        </button>
        <button
          className={`tab-btn ${view === 'analytics' ? 'active' : ''}`}
          onClick={() => setView('analytics')}
        >
          <TrendingUp size={14} /> Analytics
        </button>
      </div>

      {view === 'history' && (
        <>
          {/* Workout templates */}
          <div className="workout-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>My Workouts</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                {activeTemplates.length > 0 && (
                  <button
                    className={`btn btn-sm ${editModeTemplates ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setEditModeTemplates(!editModeTemplates)}
                  >
                    <Pencil size={14} /> {editModeTemplates ? 'Done' : 'Edit'}
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setEditTemplate(null); setShowTemplateModal(true); }}
                >
                  <Plus size={14} /> New
                </button>
              </div>
            </div>

            {activeTemplates.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 20px' }}>
                <p className="text-muted">
                  {archivedTemplates.length > 0
                    ? 'No active workouts — restore one from Archived below.'
                    : 'Create your first workout template'}
                </p>
              </div>
            ) : (
              <div className="workout-templates-grid">
                {activeTemplates.map((template, i) => (
                  <div key={template.id} className={`workout-template-card${editModeTemplates ? ' editing' : ''}`}>
                    <div
                      className="workout-template-color"
                      style={{ background: template.color }}
                    />
                    {editModeTemplates && (
                      <div className="workout-template-order">
                        <button
                          className="btn btn-icon btn-secondary btn-sm"
                          onClick={() => moveWorkoutTemplate(template.id, -1)}
                          disabled={i === 0}
                          title="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          className="btn btn-icon btn-secondary btn-sm"
                          onClick={() => moveWorkoutTemplate(template.id, 1)}
                          disabled={i === activeTemplates.length - 1}
                          title="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    )}
                    <div
                      className="workout-template-info"
                      onClick={() => setPreviewTemplateId(template.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <h4>{template.name}</h4>
                      <p className="text-sm text-muted">
                        {template.exercises.length} exercises
                      </p>
                    </div>
                    <div className="workout-template-actions">
                      {/* Start and View are dropped while editing: Start is the
                          widest control and irrelevant here, and tapping the
                          card already opens the preview. That keeps the row on
                          one line on a phone. */}
                      {!editModeTemplates && (
                        <>
                          <button
                            className="btn btn-icon btn-secondary btn-sm"
                            onClick={() => setPreviewTemplateId(template.id)}
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => startWorkout(template.id)}
                          >
                            <Play size={14} /> Start
                          </button>
                        </>
                      )}
                      {editModeTemplates && (
                        <>
                          <button
                            className="btn btn-icon btn-secondary btn-sm"
                            onClick={() => openEditTemplate(template)}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="btn btn-icon btn-secondary btn-sm"
                            onClick={() => setDuplicating({ source: template, name: suggestCopyName(template.name) })}
                            title="Duplicate under a new name"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            className="btn btn-icon btn-secondary btn-sm"
                            onClick={() => setArchived(template.id, true)}
                            title="Archive — hides it here but keeps your history"
                          >
                            <Archive size={14} />
                          </button>
                          <button
                            className="btn btn-icon btn-danger btn-sm"
                            onClick={() => setDeleteConfirm({ type: 'template', id: template.id })}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Archived templates — retired from the list, still naming history */}
            {archivedTemplates.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowArchived(!showArchived)}
                >
                  <Archive size={14} /> Archived ({archivedTemplates.length})
                </button>
                {showArchived && (
                  <div className="workout-templates-grid" style={{ marginTop: 8 }}>
                    {archivedTemplates.map((template) => (
                      <div key={template.id} className="workout-template-card workout-template-archived">
                        <div className="workout-template-color" style={{ background: template.color }} />
                        <div
                          className="workout-template-info"
                          onClick={() => setPreviewTemplateId(template.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <h4>{template.name}</h4>
                          <p className="text-sm text-muted">
                            {template.exercises.length} exercises · {sessionCount(template.id)} logged
                          </p>
                        </div>
                        <div className="workout-template-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setArchived(template.id, false)}
                            title="Restore to My Workouts"
                          >
                            <ArchiveRestore size={14} /> Restore
                          </button>
                          <button
                            className="btn btn-icon btn-danger btn-sm"
                            onClick={() => setDeleteConfirm({ type: 'template', id: template.id })}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* History */}
          <div className="workout-section" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>History</h3>
              {sortedSessions.length > 0 && (
                <button
                  className={`btn btn-sm ${editModeHistory ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setEditModeHistory(!editModeHistory)}
                >
                  <Pencil size={14} /> {editModeHistory ? 'Done' : 'Edit'}
                </button>
              )}
            </div>
            {sortedSessions.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 20px' }}>
                <p className="text-muted">No workouts completed yet</p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th></th>
                        <th>Workout</th>
                        <th>Date</th>
                        <th>kcal</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSessions.slice(0, 20).map((session) => (
                        <tr key={session.id}>
                          <td style={{ width: 16, padding: '10px 4px 10px 12px' }}>
                            <div
                              className="color-dot"
                              style={{ background: getTemplateColor(session.templateId) }}
                            />
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            {/* A session whose template was deleted can be
                                re-pointed at an existing one, which is the
                                only way to recover an orphaned name. */}
                            {editModeHistory && isOrphaned(session.templateId) && workoutTemplates.length > 0 ? (
                              <select
                                className="select"
                                value=""
                                style={{ fontSize: 12, padding: '4px 6px', minWidth: 110 }}
                                onChange={(e) => {
                                  if (e.target.value) updateWorkoutSession(session.id, { templateId: e.target.value });
                                }}
                              >
                                <option value="">Reassign…</option>
                                {workoutTemplates.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}{t.archived ? ' (archived)' : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              getTemplateName(session.templateId)
                            )}
                          </td>
                          <td>{session.date.slice(8,10)}-{session.date.slice(5,7)}-{session.date.slice(2,4)}</td>
                          <td>{session.estimatedCalories > 0 ? session.estimatedCalories : '-'}</td>
                          <td>
                            <span className={`badge ${session.completed ? 'badge-success' : 'badge-warning'}`}>
                              {session.completed ? 'Done' : 'In Progress'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              {session.completed && (
                                <button
                                  className="btn btn-icon btn-secondary btn-sm"
                                  onClick={() => setActiveSession(session.id)}
                                  title="View"
                                >
                                  <Eye size={14} />
                                </button>
                              )}
                              {!session.completed && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => setActiveSession(session.id)}
                                >
                                  Resume
                                </button>
                              )}
                              {editModeHistory && (
                                <button
                                  className="btn btn-icon btn-danger btn-sm"
                                  onClick={() => setDeleteConfirm({ type: 'session', id: session.id })}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {view === 'calendar' && (
        <WorkoutCalendar onViewSession={(sessionId) => setActiveSession(sessionId)} />
      )}

      {view === 'analytics' && (
        <WorkoutExerciseAnalytics />
      )}

      {showTemplateModal && (
        <WorkoutTemplateModal
          template={editTemplate}
          onClose={() => { setShowTemplateModal(false); setEditTemplate(null); }}
        />
      )}

      {duplicating && (
        <div className="modal-overlay" onClick={() => setDuplicating(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Duplicate Workout</h3>
            <p className="text-sm text-muted" style={{ marginTop: -8, marginBottom: 12 }}>
              Copies every exercise from "{duplicating.source.name}" into a new workout.
            </p>
            <div className="form-group">
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                value={duplicating.name}
                onChange={(e) => setDuplicating({ ...duplicating, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmDuplicate(); }}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setDuplicating(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={confirmDuplicate}
                disabled={!duplicating.name.trim()}
              >
                Duplicate
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (() => {
        if (deleteConfirm.type === 'session') {
          return (
            <ConfirmDialog
              message="Are you sure you want to delete this workout session?"
              onConfirm={handleDeleteConfirm}
              onCancel={() => setDeleteConfirm(null)}
            />
          );
        }

        // Deleting a template that history points at is what turns past
        // sessions into "Unknown Workout", so spell that out and put archiving
        // in front of it.
        const template = workoutTemplates.find((t) => t.id === deleteConfirm.id);
        const used = sessionCount(deleteConfirm.id);
        const name = template?.name ?? 'this workout';
        return (
          <ConfirmDialog
            message={
              used > 0
                ? `${used} logged ${used === 1 ? 'session uses' : 'sessions use'} "${name}".\n\n`
                  + 'Deleting it makes them show as "Unknown Workout" in your history, and the name cannot be recovered.\n\n'
                  + 'Archiving hides it from My Workouts but keeps your history readable.'
                : `Delete "${name}"? No logged sessions use it.`
            }
            confirmLabel={used > 0 ? 'Delete anyway' : 'Delete'}
            secondaryAction={
              used > 0 && !template?.archived
                ? { label: 'Archive instead', onClick: () => setArchived(deleteConfirm.id, true) }
                : undefined
            }
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteConfirm(null)}
          />
        );
      })()}
    </div>
  );
}
