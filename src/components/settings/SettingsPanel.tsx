import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { ActivityLevel, ACTIVITY_LABELS, UnitSystem } from '../../types';
import { exportToXlsx, importFromXlsx } from '../../utils/xlsxIO';
import { X, Download, Upload, Sun, Moon, Database, Key } from 'lucide-react';
import './SettingsPanel.css';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings, loadSampleData } = useStore();
  const [importStatus, setImportStatus] = useState<string>('');

  const handleExportXlsx = () => {
    const data = exportToXlsx();
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `olistic-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportXlsx = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const buffer = await file.arrayBuffer();
        if (importFromXlsx(buffer)) {
          setImportStatus('Data imported successfully! Refreshing...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setImportStatus('Failed to import data. Invalid format.');
        }
      } catch {
        setImportStatus('Error reading file.');
      }
    };
    input.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Settings</h2>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Profile</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Birthday</label>
              <input
                type="date"
                className="input"
                value={settings.birthday}
                onChange={(e) => updateSettings({ birthday: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="label">Sex</label>
              <select
                className="select"
                value={settings.sex}
                onChange={(e) => updateSettings({ sex: e.target.value as 'male' | 'female' })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Height (cm)</label>
            <input
              type="number"
              className="input"
              value={settings.heightCm}
              onChange={(e) => updateSettings({ heightCm: Number(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label className="label">Activity Level</label>
            <select
              className="select"
              value={settings.activityLevel}
              onChange={(e) => updateSettings({ activityLevel: e.target.value as ActivityLevel })}
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                <option key={level} value={level}>
                  {ACTIVITY_LABELS[level]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Targets</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Target Body Fat %</label>
              <input
                type="number"
                className="input"
                value={settings.targetBodyFatPct}
                onChange={(e) => updateSettings({ targetBodyFatPct: Number(e.target.value) })}
                step={0.5}
              />
            </div>
            <div className="form-group">
              <label className="label">Target FFMI</label>
              <input
                type="number"
                className="input"
                value={settings.targetFFMI}
                onChange={(e) => updateSettings({ targetFFMI: Number(e.target.value) })}
                step={0.1}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Caloric Delta (kcal/day)</label>
            <input
              type="number"
              className="input"
              value={settings.targetCaloricDelta}
              onChange={(e) => updateSettings({ targetCaloricDelta: Number(e.target.value) })}
              step={50}
            />
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Appearance</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Theme</label>
              <div className="theme-toggle">
                <button
                  className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
                  onClick={() => updateSettings({ theme: 'light' })}
                >
                  <Sun size={16} /> Light
                </button>
                <button
                  className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => updateSettings({ theme: 'dark' })}
                >
                  <Moon size={16} /> Dark
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Units</label>
              <select
                className="select"
                value={settings.unitSystem}
                onChange={(e) => updateSettings({ unitSystem: e.target.value as UnitSystem })}
              >
                <option value="metric">Metric (kg, cm)</option>
                <option value="imperial">Imperial (lbs, in)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Integrations</h3>
          <div className="form-group">
            <label className="label"><Key size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Claude API Key</label>
            <input
              type="password"
              className="input"
              value={settings.claudeApiKey}
              onChange={(e) => updateSettings({ claudeApiKey: e.target.value })}
              placeholder="sk-ant-..."
            />
            <p className="text-muted text-sm" style={{ marginTop: 4 }}>
              Required for photo-based food analysis. Your key is stored locally.
            </p>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Data</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleExportXlsx}>
              <Download size={16} /> Export XLSX
            </button>
            <button className="btn btn-secondary" onClick={handleImportXlsx}>
              <Upload size={16} /> Import XLSX
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                loadSampleData();
                setImportStatus('Sample data loaded! 6 months of history across all metrics.');
              }}
            >
              <Database size={16} /> Load Sample Data
            </button>
          </div>
          {importStatus && (
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--success)' }}>{importStatus}</p>
          )}
        </div>
      </div>
    </div>
  );
}
