import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { DateSelector } from '../common/DateSelector';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MealType, MEAL_TYPE_LABELS } from '../../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Target, Pencil } from 'lucide-react';
import { AddMealModal } from './AddMealModal';
import { MacroTargetsModal } from './MacroTargetsModal';
import './FoodTab.css';

interface MacroRow {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  color: string;
}

export function FoodTab() {
  const { selectedDate, getMealsForDate, deleteMealEntry, getMacroTargetsForDate } = useStore();
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [addMealType, setAddMealType] = useState<MealType>('breakfast');
  const [showTargets, setShowTargets] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const meals = getMealsForDate(selectedDate);
  const targets = getMacroTargetsForDate(selectedDate);

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        proteinG: acc.proteinG + m.proteinG,
        carbsG: acc.carbsG + m.carbsG,
        fatG: acc.fatG + m.fatG,
        sugarG: acc.sugarG + m.sugarG,
        fiberG: acc.fiberG + m.fiberG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0, fiberG: 0 }
    );
  }, [meals]);

  // Pie chart: calories by macro source
  const pieData = useMemo(() => {
    const proteinCal = totals.proteinG * 4;
    const carbsCal = totals.carbsG * 4;
    const fatCal = totals.fatG * 9;
    const fiberCal = totals.fiberG * 2;
    return [
      { name: 'Protein', value: proteinCal, color: '#6c63ff' },
      { name: 'Carbs', value: carbsCal, color: '#34d399' },
      { name: 'Fat', value: fatCal, color: '#fbbf24' },
      { name: 'Fiber', value: fiberCal, color: '#f87171' },
    ].filter((d) => d.value > 0);
  }, [totals]);

  const totalPieCal = pieData.reduce((s, d) => s + d.value, 0);

  // Macro progress rows
  const macroRows: MacroRow[] = useMemo(() => {
    if (!targets) return [];
    return [
      { label: 'Calories', consumed: totals.calories, target: targets.calories, unit: 'kcal', color: 'var(--accent)' },
      { label: 'Protein', consumed: totals.proteinG, target: targets.proteinG, unit: 'g', color: '#6c63ff' },
      { label: 'Carbs', consumed: totals.carbsG, target: targets.carbsG, unit: 'g', color: '#34d399' },
      { label: 'Fat', consumed: totals.fatG, target: targets.fatG, unit: 'g', color: '#fbbf24' },
      { label: 'Sugar', consumed: totals.sugarG, target: targets.sugarG, unit: 'g', color: '#f472b6' },
      { label: 'Fiber', consumed: totals.fiberG, target: targets.fiberG, unit: 'g', color: '#f87171' },
    ];
  }, [totals, targets]);

  const mealSubtotals = useMemo(() => {
    const result: Record<MealType, { calories: number; proteinG: number; carbsG: number; fatG: number; sugarG: number; fiberG: number }> = {
      breakfast: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0, fiberG: 0 },
      lunch: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0, fiberG: 0 },
      dinner: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0, fiberG: 0 },
      snack: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0, fiberG: 0 },
    };
    meals.forEach((m) => {
      result[m.mealType].calories += m.calories;
      result[m.mealType].proteinG += m.proteinG;
      result[m.mealType].carbsG += m.carbsG;
      result[m.mealType].fatG += m.fatG;
      result[m.mealType].sugarG += m.sugarG;
      result[m.mealType].fiberG += m.fiberG;
    });
    return result;
  }, [meals]);

  const openAddMeal = (type: MealType) => {
    setAddMealType(type);
    setShowAddMeal(true);
  };

  const handleDelete = (id: string) => {
    deleteMealEntry(id);
    setDeleteConfirm(null);
  };

  const calRemaining = targets ? targets.calories - totals.calories : 0;

  return (
    <div className="food-tab fade-in">
      <DateSelector />

      {/* Calorie headline */}
      <div className="food-summary">
        <div className="food-summary-main">
          <span className="food-calories-big">{totals.calories}</span>
          <span className="food-calories-label">kcal consumed</span>
          {targets && (
            <span
              className="food-calories-remaining"
              style={{ color: calRemaining >= 0 ? 'var(--success)' : 'var(--danger)' }}
            >
              {calRemaining >= 0 ? `${calRemaining} remaining` : `${Math.abs(calRemaining)} over`}
            </span>
          )}
        </div>

        {/* Macro pills - now includes sugar */}
        <div className="food-macros-row">
          <div className="food-macro-pill" style={{ borderColor: '#6c63ff' }}>
            <span className="food-macro-val">{totals.proteinG.toFixed(0)}g</span>
            <span className="food-macro-name">Protein</span>
          </div>
          <div className="food-macro-pill" style={{ borderColor: '#34d399' }}>
            <span className="food-macro-val">{totals.carbsG.toFixed(0)}g</span>
            <span className="food-macro-name">Carbs</span>
          </div>
          <div className="food-macro-pill" style={{ borderColor: '#fbbf24' }}>
            <span className="food-macro-val">{totals.fatG.toFixed(0)}g</span>
            <span className="food-macro-name">Fat</span>
          </div>
          <div className="food-macro-pill" style={{ borderColor: '#f472b6' }}>
            <span className="food-macro-val">{totals.sugarG.toFixed(0)}g</span>
            <span className="food-macro-name">Sugar</span>
          </div>
          <div className="food-macro-pill" style={{ borderColor: '#f87171' }}>
            <span className="food-macro-val">{totals.fiberG.toFixed(0)}g</span>
            <span className="food-macro-name">Fiber</span>
          </div>
        </div>
      </div>

      {/* Charts + targets row */}
      <div className="food-charts-row">
        {/* Pie chart */}
        {pieData.length > 0 && (
          <div className="card food-chart-card">
            <h4 className="food-chart-title">Calories by Macro</h4>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {pieData.map((d) => (
                <div key={d.name} className="pie-legend-item">
                  <span className="color-dot" style={{ background: d.color }} />
                  <span>{d.name} {totalPieCal > 0 ? Math.round((d.value / totalPieCal) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress bars vs target - each macro on its own scale */}
        {macroRows.length > 0 && (
          <div className="card food-chart-card">
            <h4 className="food-chart-title">vs Target</h4>
            <div className="macro-progress-list">
              {macroRows.map((row) => {
                const pct = row.target > 0 ? Math.min((row.consumed / row.target) * 100, 100) : 0;
                const over = row.consumed > row.target && row.target > 0;
                const remaining = row.target - row.consumed;
                return (
                  <div key={row.label} className="macro-progress-row">
                    <div className="macro-progress-header">
                      <span className="macro-progress-label">{row.label}</span>
                      <span className="macro-progress-values">
                        <strong>{Math.round(row.consumed)}</strong>
                        <span className="text-muted"> / {Math.round(row.target)} {row.unit}</span>
                        {row.target > 0 && (
                          <span
                            className="macro-progress-remaining"
                            style={{ color: over ? 'var(--danger)' : 'var(--success)' }}
                          >
                            {' '}({over ? '+' : ''}{Math.round(remaining)} left)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="macro-progress-track">
                      <div
                        className="macro-progress-fill"
                        style={{
                          width: `${pct}%`,
                          background: over ? 'var(--danger)' : row.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Target button */}
      <button
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: 16, marginTop: 16 }}
        onClick={() => setShowTargets(true)}
      >
        <Target size={14} /> {targets ? 'Update Macro Targets' : 'Set Macro Targets'}
      </button>

      {/* Unified meal table */}
      <div className="meal-table-container">
        <div className="meal-table-header-bar">
          <span style={{ fontSize: 14, fontWeight: 600 }}>Meals</span>
          <button
            className={`btn btn-sm ${editMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setEditMode(!editMode)}
          >
            <Pencil size={13} /> {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
        <div className="table-wrapper">
          <table className="meal-table">
            <thead>
              <tr>
                <th className="col-name">Name</th>
                <th className="col-num">Cal</th>
                <th className="col-num">P</th>
                <th className="col-num">C</th>
                <th className="col-num">F</th>
                <th className="col-num">S</th>
                <th className="col-num">Fb</th>
                <th className="col-action"></th>
              </tr>
            </thead>
            <tbody>
              {mealTypes.map((type) => {
                const typeMeals = meals.filter((m) => m.mealType === type);
                const sub = mealSubtotals[type];
                return [
                  <tr key={`section-${type}`} className="meal-section-row">
                    <td>
                      <div className="meal-section-row-inner">
                        <span className="meal-section-name">{MEAL_TYPE_LABELS[type]}</span>
                        {sub.calories > 0 && (
                          <span className="meal-section-subtotal">
                            {sub.calories} kcal · {sub.proteinG.toFixed(0)}P · {sub.carbsG.toFixed(0)}C · {sub.fatG.toFixed(0)}F
                          </span>
                        )}
                      </div>
                    </td>
                    <td colSpan={6}></td>
                    <td>
                      <button className="btn btn-primary btn-sm btn-add-meal" onClick={() => openAddMeal(type)}>
                        <Plus size={13} />
                      </button>
                    </td>
                  </tr>,
                  ...typeMeals.map((meal) => (
                    <tr key={meal.id} className="meal-item-row">
                      <td className="col-name">{meal.name}</td>
                      <td className="col-num">{meal.calories}</td>
                      <td className="col-num">{meal.proteinG}g</td>
                      <td className="col-num">{meal.carbsG}g</td>
                      <td className="col-num">{meal.fatG}g</td>
                      <td className="col-num">{meal.sugarG}g</td>
                      <td className="col-num">{meal.fiberG}g</td>
                      <td className="col-action">
                        {editMode && (
                          <button
                            className="btn btn-icon btn-danger btn-sm"
                            onClick={() => setDeleteConfirm(meal.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )),
                  ...(typeMeals.length === 0
                    ? [
                        <tr key={`empty-${type}`} className="meal-empty-row">
                          <td colSpan={8} className="text-muted text-sm">No items</td>
                        </tr>,
                      ]
                    : []),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddMeal && (
        <AddMealModal
          mealType={addMealType}
          date={selectedDate}
          onClose={() => setShowAddMeal(false)}
        />
      )}

      {showTargets && (
        <MacroTargetsModal
          date={selectedDate}
          onClose={() => setShowTargets(false)}
        />
      )}

      {deleteConfirm && (
        <ConfirmDialog
          message="Are you sure you want to delete this meal entry?"
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
