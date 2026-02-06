import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { DateSelector } from '../common/DateSelector';
import { MealType, MealEntry, MEAL_TYPE_LABELS } from '../../types';
import { calcCaloriesFromMacros } from '../../utils/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Plus, Trash2, Target, Camera, Search, Edit3 } from 'lucide-react';
import { AddMealModal } from './AddMealModal';
import { MacroTargetsModal } from './MacroTargetsModal';
import './FoodTab.css';

export function FoodTab() {
  const { selectedDate, getMealsForDate, deleteMealEntry, getMacroTargetsForDate } = useStore();
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [addMealType, setAddMealType] = useState<MealType>('breakfast');
  const [showTargets, setShowTargets] = useState(false);

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

  // Remaining chart
  const remainingData = useMemo(() => {
    if (!targets) return [];
    return [
      { name: 'Calories', consumed: totals.calories, target: targets.calories, unit: 'kcal' },
      { name: 'Protein', consumed: totals.proteinG, target: targets.proteinG, unit: 'g' },
      { name: 'Carbs', consumed: totals.carbsG, target: targets.carbsG, unit: 'g' },
      { name: 'Fat', consumed: totals.fatG, target: targets.fatG, unit: 'g' },
    ];
  }, [totals, targets]);

  const openAddMeal = (type: MealType) => {
    setAddMealType(type);
    setShowAddMeal(true);
  };

  return (
    <div className="food-tab fade-in">
      <DateSelector />

      <div className="food-top-section">
        {/* Summary stats */}
        <div className="food-summary">
          <div className="food-summary-main">
            <span className="food-calories-big">{totals.calories}</span>
            <span className="food-calories-label">kcal consumed</span>
            {targets && (
              <span className="food-calories-remaining" style={{
                color: targets.calories - totals.calories >= 0 ? 'var(--success)' : 'var(--danger)'
              }}>
                {targets.calories - totals.calories >= 0 ? '' : '+'}{Math.abs(targets.calories - totals.calories)} kcal {targets.calories - totals.calories >= 0 ? 'remaining' : 'over'}
              </span>
            )}
          </div>
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
            <div className="food-macro-pill" style={{ borderColor: '#f87171' }}>
              <span className="food-macro-val">{totals.fiberG.toFixed(0)}g</span>
              <span className="food-macro-name">Fiber</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="food-charts-row">
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

          {remainingData.length > 0 && (
            <div className="card food-chart-card">
              <h4 className="food-chart-title">vs Target</h4>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={remainingData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={((value: number | undefined, name: string | undefined) => [value ?? 0, name === 'consumed' ? 'Consumed' : 'Target']) as never}
                  />
                  <Bar dataKey="target" fill="var(--bg-tertiary)" radius={[4, 4, 4, 4]} />
                  <Bar dataKey="consumed" fill="var(--accent)" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Target button */}
      <button
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: 16 }}
        onClick={() => setShowTargets(true)}
      >
        <Target size={14} /> {targets ? 'Update Macro Targets' : 'Set Macro Targets'}
      </button>

      {/* Meal sections */}
      {mealTypes.map((type) => {
        const typeMeals = meals.filter((m) => m.mealType === type);
        const typeTotal = typeMeals.reduce((s, m) => s + m.calories, 0);
        return (
          <div key={type} className="meal-section">
            <div className="meal-section-header">
              <h3 className="meal-section-title">
                {MEAL_TYPE_LABELS[type]}
                {typeTotal > 0 && (
                  <span className="meal-section-cal">{typeTotal} kcal</span>
                )}
              </h3>
              <button className="btn btn-primary btn-sm" onClick={() => openAddMeal(type)}>
                <Plus size={14} /> Add
              </button>
            </div>
            {typeMeals.length > 0 ? (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Cal</th>
                      <th>P</th>
                      <th>C</th>
                      <th>F</th>
                      <th>S</th>
                      <th>Fb</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeMeals.map((meal) => (
                      <tr key={meal.id}>
                        <td>{meal.name}</td>
                        <td>{meal.calories}</td>
                        <td>{meal.proteinG}g</td>
                        <td>{meal.carbsG}g</td>
                        <td>{meal.fatG}g</td>
                        <td>{meal.sugarG}g</td>
                        <td>{meal.fiberG}g</td>
                        <td>
                          <button
                            className="btn btn-icon btn-danger btn-sm"
                            onClick={() => deleteMealEntry(meal.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-sm" style={{ padding: '8px 0' }}>
                No items
              </p>
            )}
          </div>
        );
      })}

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
    </div>
  );
}
