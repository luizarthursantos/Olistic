import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Play, Calendar, Clock, Trash2, Edit3, Eye } from 'lucide-react';
import { WorkoutTemplate, WorkoutSession } from '../../types';
import { WorkoutTemplateModal } from './WorkoutTemplateModal';
import { WorkoutExecution } from './WorkoutExecution';
import { WorkoutCalendar } from './WorkoutCalendar';
import './WorkoutTab.css';

type WorkoutView = 'history' | 'calendar';

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

  // If executing a workout
  if (startTemplateId) {
    return (
      <WorkoutExecution
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
      </div>

      {view === 'history' && (
        <>
          {/* Workout templates */}
          <div className="workout-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>My Workouts</h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setEditTemplate(null); setShowTemplateModal(true); }}
              >
                <Plus size={14} /> New Workout
              </button>
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
                    <div className="workout-template-info">
                      <h4>{template.name}</h4>
                      <p className="text-sm text-muted">
                        {template.exercises.length} exercises
                      </p>
                    </div>
                    <div className="workout-template-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => startWorkout(template.id)}
                      >
                        <Play size={14} /> Start
                      </button>
                      <button
                        className="btn btn-icon btn-secondary btn-sm"
                        onClick={() => openEditTemplate(template)}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="btn btn-icon btn-danger btn-sm"
                        onClick={() => deleteWorkoutTemplate(template.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          <div className="workout-section" style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>History</h3>
            {sortedSessions.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 20px' }}>
                <p className="text-muted">No workouts completed yet</p>
              </div>
            ) : (
              <div className="workout-history-list">
                {sortedSessions.map((session) => (
                  <div key={session.id} className="workout-history-item">
                    <div
                      className="color-dot"
                      style={{ background: getTemplateColor(session.templateId), flexShrink: 0 }}
                    />
                    <div className="workout-history-info">
                      <h4>{getTemplateName(session.templateId)}</h4>
                      <p className="text-sm text-muted">
                        {session.date}
                        {session.estimatedCalories > 0 && ` · ${session.estimatedCalories} kcal`}
                        {session.completed && ' · Completed'}
                        {!session.completed && ' · In Progress'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {session.completed && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setActiveSession(session.id)}
                        >
                          <Eye size={14} /> View
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
                      <button
                        className="btn btn-icon btn-danger btn-sm"
                        onClick={() => deleteWorkoutSession(session.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {view === 'calendar' && (
        <WorkoutCalendar onViewSession={(sessionId) => setActiveSession(sessionId)} />
      )}

      {showTemplateModal && (
        <WorkoutTemplateModal
          template={editTemplate}
          onClose={() => { setShowTemplateModal(false); setEditTemplate(null); }}
        />
      )}
    </div>
  );
}
