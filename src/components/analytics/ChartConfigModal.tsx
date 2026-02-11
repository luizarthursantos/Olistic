import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { AnalyticsChart, AnalyticsMetric } from '../../types';
import { AVAILABLE_METRICS, MetricDefinition } from './analyticsMetrics';
import { X, Plus, Trash2, BarChart2, TrendingUp } from 'lucide-react';

interface ChartConfigModalProps {
  chart: AnalyticsChart | null;
  onClose: () => void;
}

const METRIC_COLORS = ['#6c63ff', '#34d399', '#f87171', '#fbbf24', '#60a5fa', '#a78bfa'];

export function ChartConfigModal({ chart, onClose }: ChartConfigModalProps) {
  const { addAnalyticsChart, updateAnalyticsChart, exercises } = useStore();

  const [title, setTitle] = useState(chart?.title || 'New Chart');
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>(chart?.metrics || []);
  const [showMovingAverage, setShowMovingAverage] = useState(chart?.showMovingAverage || false);
  const [movingAverageDays, setMovingAverageDays] = useState(chart?.movingAverageDays || 7);
  const [showMetricPicker, setShowMetricPicker] = useState(false);

  const addMetric = (metricDef: MetricDefinition) => {
    if (metrics.length >= 4) return;
    const newMetric: AnalyticsMetric = {
      key: metricDef.key,
      label: metricDef.label,
      color: METRIC_COLORS[metrics.length % METRIC_COLORS.length],
      axis: metrics.length > 0 ? 'right' : 'left',
    };
    setMetrics([...metrics, newMetric]);
    setShowMetricPicker(false);
  };

  const removeMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const updateMetric = (index: number, partial: Partial<AnalyticsMetric>) => {
    setMetrics(metrics.map((m, i) => (i === index ? { ...m, ...partial } : m)));
  };

  const save = () => {
    if (!title.trim() || metrics.length === 0) return;
    const data = { title, metrics, dateRange: chart?.dateRange || '6M' as const, showMovingAverage, movingAverageDays };
    if (chart) {
      updateAnalyticsChart(chart.id, data);
    } else {
      addAnalyticsChart(data);
    }
    onClose();
  };

  const categories: { key: string; label: string }[] = [
    { key: 'body', label: 'Body' },
    { key: 'food', label: 'Food' },
    { key: 'workout', label: 'Workout' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>
            {chart ? 'Edit Chart' : 'New Chart'}
          </h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="form-group">
          <label className="label">Chart Title</label>
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Metrics */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="label" style={{ margin: 0 }}>
              Metrics ({metrics.length}/4)
            </label>
            {metrics.length < 4 && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowMetricPicker(true)}>
                <Plus size={14} /> Add Metric
              </button>
            )}
          </div>

          <div className="metric-list">
            {metrics.map((metric, i) => {
              const metricDef = AVAILABLE_METRICS.find((m) => m.key === metric.key);
              return (
                <div key={i} className="metric-item">
                  <input
                    type="color"
                    className="metric-color-picker"
                    value={metric.color}
                    onChange={(e) => updateMetric(i, { color: e.target.value })}
                  />
                  <span style={{ flex: 1, fontSize: 13 }}>{metric.label}</span>
                  {metricDef?.needsExercise && (
                    <select
                      className="select"
                      style={{ width: 120, padding: '4px 8px', fontSize: 12 }}
                      value={metric.exerciseId || ''}
                      onChange={(e) => updateMetric(i, { exerciseId: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {exercises
                        .filter((e) => !e.isCardio)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                    </select>
                  )}
                  <button
                    className="metric-axis-toggle"
                    onClick={() => updateMetric(i, { chartType: (metric.chartType || 'line') === 'line' ? 'bar' : 'line' })}
                    title={(metric.chartType || 'line') === 'line' ? 'Line chart' : 'Bar chart'}
                  >
                    {(metric.chartType || 'line') === 'line' ? <TrendingUp size={13} /> : <BarChart2 size={13} />}
                  </button>
                  <button
                    className={`metric-axis-toggle ${metric.axis === 'right' ? 'right' : ''}`}
                    onClick={() => updateMetric(i, { axis: metric.axis === 'left' ? 'right' : 'left' })}
                  >
                    {metric.axis === 'left' ? 'L' : 'R'}
                  </button>
                  <button className="btn btn-icon btn-danger btn-sm" onClick={() => removeMetric(i)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
            {metrics.length === 0 && (
              <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 16 }}>
                Add at least one metric
              </p>
            )}
          </div>
        </div>

        {/* Moving Average */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={showMovingAverage}
              onChange={(e) => setShowMovingAverage(e.target.checked)}
            />
            Show Moving Average
          </label>
          {showMovingAverage && (
            <div style={{ marginTop: 8 }}>
              <label className="label">Rolling Window (days)</label>
              <input
                type="number"
                className="input"
                value={movingAverageDays}
                onChange={(e) => setMovingAverageDays(Number(e.target.value))}
                min={2}
                max={90}
                style={{ width: 100 }}
              />
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!title.trim() || metrics.length === 0}>
            {chart ? 'Save Changes' : 'Create Chart'}
          </button>
        </div>

        {/* Metric Picker */}
        {showMetricPicker && (
          <div className="modal-overlay" onClick={() => setShowMetricPicker(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Select Metric</h3>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {categories.map((cat) => (
                  <div key={cat.key} style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      {cat.label}
                    </h4>
                    {AVAILABLE_METRICS.filter((m) => m.category === cat.key).map((metric) => (
                      <button
                        key={metric.key}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          borderBottom: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: 13,
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                        onClick={() => addMetric(metric)}
                      >
                        {metric.label}
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                          {metric.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowMetricPicker(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
