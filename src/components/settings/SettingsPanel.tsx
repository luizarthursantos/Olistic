import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { ActivityLevel, ACTIVITY_LABELS, UnitSystem, AiProvider, ClaudeModel, CLAUDE_MODEL_LABELS } from '../../types';
import { exportToXlsx, importFromXlsx } from '../../utils/xlsxIO';
import { toLocalDateStr } from '../../utils/calculations';
import { X, Download, Upload, Sun, Moon, Database, Key, Smartphone, FileText } from 'lucide-react';
import { export1rmPdf } from '../../utils/export1rmPdf';
import { BUILD_LABEL } from '../../version';
import './SettingsPanel.css';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings, loadSampleData, exercises, workoutSessions, workoutTemplates } = useStore();
  const [importStatus, setImportStatus] = useState<string>('');
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check if install prompt is available
    if ((window as any).__pwaInstallPrompt) {
      setCanInstall(true);
    }
    const handler = () => setCanInstall(true);
    window.addEventListener('pwainstallready', handler);
    return () => window.removeEventListener('pwainstallready', handler);
  }, []);

  const handleInstall = async () => {
    const prompt = (window as any).__pwaInstallPrompt;
    if (prompt) {
      prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === 'accepted') {
        setIsStandalone(true);
        setCanInstall(false);
      }
    }
  };

  const handleExportXlsx = () => {
    const data = exportToXlsx();
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `olistic-export-${toLocalDateStr(new Date())}.xlsx`;
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0 }}>Settings</h2>
            <p className="settings-build">{BUILD_LABEL}</p>
          </div>
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
          <h3 className="settings-section-title">Charts</h3>
          <div className="form-group">
            <label className="label">Line Alpha (moving avg enabled): {settings.chartLineAlpha ?? 60}%</label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.chartLineAlpha ?? 60}
              onChange={(e) => updateSettings({ chartLineAlpha: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
            <p className="text-muted text-sm" style={{ marginTop: 4 }}>
              Opacity of the raw data line when moving average overlay is shown.
            </p>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">AI Food Analysis</h3>
          <div className="form-group">
            <label className="label">AI Provider</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn btn-sm ${settings.aiProvider === 'claude' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateSettings({ aiProvider: 'claude' as AiProvider })}
                style={{ flex: 1 }}
              >
                Claude
              </button>
              <button
                className={`btn btn-sm ${settings.aiProvider === 'gemini' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateSettings({ aiProvider: 'gemini' as AiProvider })}
                style={{ flex: 1 }}
              >
                Gemini
              </button>
            </div>
          </div>
          {settings.aiProvider === 'claude' && (
            <div className="form-group">
              <label className="label">Claude Model</label>
              <select
                className="select"
                value={settings.claudeModel || 'claude-sonnet-4-6'}
                onChange={(e) => updateSettings({ claudeModel: e.target.value as ClaudeModel })}
              >
                {(Object.keys(CLAUDE_MODEL_LABELS) as ClaudeModel[]).map((model) => (
                  <option key={model} value={model}>
                    {CLAUDE_MODEL_LABELS[model]}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="label"><Key size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Claude API Key</label>
            <input
              type="password"
              className="input"
              value={settings.claudeApiKey}
              onChange={(e) => updateSettings({ claudeApiKey: e.target.value })}
              placeholder="sk-ant-..."
            />
          </div>
          <div className="form-group">
            <label className="label"><Key size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Gemini API Key</label>
            <input
              type="password"
              className="input"
              value={settings.geminiApiKey}
              onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
              placeholder="AIza..."
            />
          </div>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            API key for the selected provider is required for AI food analysis. Keys are stored locally.
          </p>
        </div>

        {!isStandalone && (
          <div className="settings-section">
            <h3 className="settings-section-title">Install App</h3>
            {canInstall ? (
              <button className="btn btn-primary" onClick={handleInstall}>
                <Smartphone size={16} /> Install Olistic
              </button>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <p style={{ marginBottom: 8 }}><strong>Samsung Internet:</strong></p>
                <ol style={{ paddingLeft: 20, margin: 0 }}>
                  <li>Tap the menu icon (&#9776;) at the bottom</li>
                  <li>Tap <strong>"Add page to"</strong></li>
                  <li>Select <strong>"Home screen"</strong></li>
                </ol>
                <p style={{ marginTop: 12, marginBottom: 8 }}><strong>Chrome:</strong></p>
                <ol style={{ paddingLeft: 20, margin: 0 }}>
                  <li>Tap the menu icon (&#8942;) at the top right</li>
                  <li>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
                </ol>
              </div>
            )}
          </div>
        )}

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
              className="btn btn-secondary"
              onClick={() => {
                const result = export1rmPdf(exercises, workoutSessions, workoutTemplates);
                if (!result) {
                  setImportStatus('No exercise data found in the past month.');
                }
              }}
            >
              <FileText size={16} /> Export 1RM PDF
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
