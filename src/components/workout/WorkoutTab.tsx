import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Play, Calendar, Clock, Trash2, Edit3, Eye, Pencil, TrendingUp } from 'lucide-react';
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
    deleteWorkoutTemplate,
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

  const sortedSessions = useMemo(() => {
    return [...workoutSessions].sort((a, b) => b.date.localeCompare(a.date));
  }, [workoutSessions]);

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
    return (
      <WorkoutExecution
        key="preview"
        templateId={previewTemplateId}
        preview
        onFinish={() => setPreviewTemplateId(null)}
        onStart={() => {
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
                {workoutTemplates.length > 0 && (
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

            {workoutTemplates.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 20px' }}>
                <p className="text-muted">Create your first workout template</p>
              </div>
            ) : (
              <div className="workout-templates-grid">
                {workoutTemplates.map((template) => (
                  <div key={template.id} className="workout-template-card">
                    <div
                      className="workout-template-color"
                      style={{ background: template.color }}
                    />
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
                      {editModeTemplates && (
                        <>
                          <button
                            className="btn btn-icon btn-secondary btn-sm"
                            onClick={() => openEditTemplate(template)}
                          >
                            <Edit3 size={14} />
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
                          <td style={{ fontWeight: 500 }}>{getTemplateName(session.templateId)}</td>
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

      {deleteConfirm && (
        <ConfirmDialog
          message={
            deleteConfirm.type === 'template'
              ? 'Are you sure you want to delete this workout template?'
              : 'Are you sure you want to delete this workout session?'
          }
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
