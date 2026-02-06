import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { AnalyticsChart, AnalyticsMetric, DateRangeOption } from '../../types';
import { Plus, Trash2, Settings } from 'lucide-react';
import { AnalyticsChartView } from './AnalyticsChartView';
import { ChartConfigModal } from './ChartConfigModal';
import './AnalyticsTab.css';

export function AnalyticsTab() {
  const { analyticsCharts, addAnalyticsChart, deleteAnalyticsChart } = useStore();
  const [configChart, setConfigChart] = useState<AnalyticsChart | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const handleAddChart = () => {
    setConfigChart(null);
    setShowConfig(true);
  };

  const handleEditChart = (chart: AnalyticsChart) => {
    setConfigChart(chart);
    setShowConfig(true);
  };

  return (
    <div className="analytics-tab fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Analytics Dashboard</h2>
        <button className="btn btn-primary btn-sm" onClick={handleAddChart}>
          <Plus size={14} /> Add Chart
        </button>
      </div>

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
                    onClick={() => handleEditChart(chart)}
                    title="Edit"
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    className="btn btn-icon btn-danger btn-sm"
                    onClick={() => deleteAnalyticsChart(chart.id)}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <AnalyticsChartView chart={chart} />
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
    </div>
  );
}
