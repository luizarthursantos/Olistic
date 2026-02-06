import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { ActivityLevel, ACTIVITY_LABELS, UnitSystem } from '../../types';
import { exportAllData, importData } from '../../utils/storage';
import { X, Download, Upload, Sun, Moon } from 'lucide-react';
import './SettingsPanel.css';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useStore();
  const [importStatus, setImportStatus] = useState<string>('');

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `olistic-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        if (importData(text)) {
          setImportStatus('Data imported successfully! Refresh to see changes.');
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
          <h3 className="settings-section-title">Data</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={handleExport}>
              <Download size={16} /> Export JSON
            </button>
            <button className="btn btn-secondary" onClick={handleImport}>
              <Upload size={16} /> Import JSON
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
