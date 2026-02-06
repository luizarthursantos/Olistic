import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { ActivityLevel, ACTIVITY_LABELS, ACTIVITY_MULTIPLIERS } from '../../types';
import { calcBMR, calcTDEE, calcAge } from '../../utils/calculations';
import './Onboarding.css';

export function Onboarding() {
  const { settings, updateSettings } = useStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    birthday: settings.birthday,
    sex: settings.sex,
    heightCm: settings.heightCm,
    targetBodyFatPct: settings.targetBodyFatPct,
    targetFFMI: settings.targetFFMI,
    targetCaloricDelta: settings.targetCaloricDelta,
    activityLevel: settings.activityLevel,
  });

  const update = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const steps = [
    {
      title: 'Welcome to Olistic',
      subtitle: 'Your holistic health tracking companion. Let\'s set up your profile.',
      content: (
        <>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Birthday</label>
              <input
                type="date"
                className="input"
                value={form.birthday}
                onChange={(e) => update('birthday', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Sex</label>
              <select
                className="select"
                value={form.sex}
                onChange={(e) => update('sex', e.target.value)}
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
              value={form.heightCm}
              onChange={(e) => update('heightCm', Number(e.target.value))}
              min={100}
              max={250}
            />
          </div>
        </>
      ),
    },
    {
      title: 'Set Your Targets',
      subtitle: 'These will help track your progress. You can change them later.',
      content: (
        <>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Target Body Fat %</label>
              <input
                type="number"
                className="input"
                value={form.targetBodyFatPct}
                onChange={(e) => update('targetBodyFatPct', Number(e.target.value))}
                min={3}
                max={50}
                step={0.5}
              />
            </div>
            <div className="form-group">
              <label className="label">Target FFMI</label>
              <input
                type="number"
                className="input"
                value={form.targetFFMI}
                onChange={(e) => update('targetFFMI', Number(e.target.value))}
                min={14}
                max={30}
                step={0.1}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Caloric Target (kcal/day, negative = deficit)</label>
            <input
              type="number"
              className="input"
              value={form.targetCaloricDelta}
              onChange={(e) => update('targetCaloricDelta', Number(e.target.value))}
              step={50}
            />
            <span className="text-sm text-muted" style={{ marginTop: 4, display: 'block' }}>
              {form.targetCaloricDelta < 0
                ? `${Math.abs(form.targetCaloricDelta)} kcal deficit/day`
                : form.targetCaloricDelta > 0
                ? `${form.targetCaloricDelta} kcal surplus/day`
                : 'Maintenance'}
            </span>
          </div>
        </>
      ),
    },
    {
      title: 'Activity Level',
      subtitle: 'This determines your estimated daily calorie expenditure.',
      content: (
        <div className="activity-options">
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => {
            const age = calcAge(form.birthday);
            const bmr = calcBMR(form.sex, 75, form.heightCm, age);
            const tdee = calcTDEE(bmr, level);
            return (
              <button
                key={level}
                className={`activity-option ${form.activityLevel === level ? 'active' : ''}`}
                onClick={() => update('activityLevel', level)}
              >
                <div className="activity-option-label">{ACTIVITY_LABELS[level]}</div>
                <div className="activity-option-cal">~{tdee} kcal/day (at 75 kg)</div>
                <div className="activity-option-mult">x{ACTIVITY_MULTIPLIERS[level]}</div>
              </button>
            );
          })}
        </div>
      ),
    },
  ];

  const canNext = step < steps.length - 1;
  const canFinish = step === steps.length - 1;

  const finish = () => {
    updateSettings({
      ...form,
      onboardingComplete: true,
    });
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {steps.map((_, i) => (
            <div key={i} className={`progress-dot ${i <= step ? 'active' : ''}`} />
          ))}
        </div>
        <h2 className="onboarding-title">{steps[step].title}</h2>
        <p className="onboarding-subtitle">{steps[step].subtitle}</p>
        <div className="onboarding-content">{steps[step].content}</div>
        <div className="onboarding-actions">
          {step > 0 && (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {canNext && (
            <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
              Next
            </button>
          )}
          {canFinish && (
            <button className="btn btn-primary" onClick={finish}>
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
