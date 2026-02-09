import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { AnalyticsChart, AnalyticsMetric, DateRangeOption } from '../../types';
import { Plus, Trash2, Settings, Pencil, Maximize2, X } from 'lucide-react';
import { AnalyticsChartView } from './AnalyticsChartView';
import { ChartConfigModal } from './ChartConfigModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import './AnalyticsTab.css';

const DATE_RANGES: DateRangeOption[] = ['1M', '3M', '6M', '12M', '24M', '36M', 'ALL'];

export function AnalyticsTab() {
  const { analyticsCharts, addAnalyticsChart, deleteAnalyticsChart, analyticsDateRange, setAnalyticsDateRange } = useStore();
  const [configChart, setConfigChart] = useState<AnalyticsChart | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [fullscreenChart, setFullscreenChart] = useState<AnalyticsChart | null>(null);

  const handleAddChart = () => {
    setConfigChart(null);
    setShowConfig(true);
  };

  const handleEditChart = (chart: AnalyticsChart) => {
    setConfigChart(chart);
    setShowConfig(true);
  };

  const handleDelete = (id: string) => {
    deleteAnalyticsChart(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="analytics-tab fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Analytics Dashboard</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {analyticsCharts.length > 0 && (
            <button
              className={`btn btn-sm ${editMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setEditMode(!editMode)}
            >
              <Pencil size={14} /> {editMode ? 'Done' : 'Edit'}
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={handleAddChart}>
            <Plus size={14} /> Add Chart
          </button>
        </div>
      </div>

      {analyticsCharts.length > 0 && (
        <div className="date-range-btns" style={{ marginBottom: 16 }}>
          {DATE_RANGES.map((r) => (
            <button
              key={r}
              className={`date-range-btn ${analyticsDateRange === r ? 'active' : ''}`}
              onClick={() => setAnalyticsDateRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {analyticsCharts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">No Charts Yet</div>
          <p className="text-muted">Add charts to build your analytics dashboard</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleAddChart}>
            <Plus size={16} /> Create Your First Chart
          </button>
        </div>
      ) : (
        <div className="analytics-charts-grid">
          {analyticsCharts.map((chart) => (
            <div key={chart.id} className="analytics-chart-wrapper">
              <div className="analytics-chart-header">
                <h3 className="analytics-chart-title">{chart.title}</h3>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn btn-icon btn-secondary btn-sm"
                    onClick={() => setFullscreenChart(chart)}
                    title="Fullscreen"
                  >
                    <Maximize2 size={14} />
                  </button>
                  {editMode && (
                    <>
                      <button
                        className="btn btn-icon btn-secondary btn-sm"
                        onClick={() => handleEditChart(chart)}
                        title="Edit"
                      >
                        <Settings size={14} />
                      </button>
                      <button
                        className="btn btn-icon btn-danger btn-sm"
                        onClick={() => setDeleteConfirm(chart.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <AnalyticsChartView chart={chart} dateRange={analyticsDateRange} />
            </div>
          ))}
        </div>
      )}

      {showConfig && (
        <ChartConfigModal
          chart={configChart}
          onClose={() => { setShowConfig(false); setConfigChart(null); }}
        />
      )}

      {deleteConfirm && (
        <ConfirmDialog
          message="Are you sure you want to delete this chart?"
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {fullscreenChart && (
        <div className="fullscreen-chart-overlay" onClick={() => setFullscreenChart(null)}>
          <div className="fullscreen-chart-container" onClick={(e) => e.stopPropagation()}>
            <div className="fullscreen-chart-header">
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{fullscreenChart.title}</h3>
              <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setFullscreenChart(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="fullscreen-chart-body">
              <AnalyticsChartView chart={fullscreenChart} dateRange={analyticsDateRange} fullscreen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
