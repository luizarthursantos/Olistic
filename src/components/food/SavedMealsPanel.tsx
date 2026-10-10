import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FoodItem, MealType, SavedMeal, SavedMealItem } from '../../types';
import { calcCaloriesFromMacros } from '../../utils/calculations';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

interface SavedMealsPanelProps {
  date: string;
  mealType: MealType;
  /** Called after a saved meal has been logged, so the modal can close. */
  onLogged: () => void;
}

interface Draft {
  id?: string;
  name: string;
  items: SavedMealItem[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** An item's macros at the quantity the meal uses, rather than per serving. */
function scaleItem(item: SavedMealItem) {
  const ratio = item.servingSize > 0 ? item.quantityG / item.servingSize : 0;
  const proteinG = round1(item.proteinG * ratio);
  const carbsG = round1(item.carbsG * ratio);
  const fatG = round1(item.fatG * ratio);
  const sugarG = round1(item.sugarG * ratio);
  const fiberG = round1(item.fiberG * ratio);
  return {
    proteinG, carbsG, fatG, sugarG, fiberG,
    calories: calcCaloriesFromMacros(proteinG, carbsG, fatG, fiberG),
  };
}

function totals(items: SavedMealItem[]) {
  return items.map(scaleItem).reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      proteinG: round1(acc.proteinG + m.proteinG),
      carbsG: round1(acc.carbsG + m.carbsG),
      fatG: round1(acc.fatG + m.fatG),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

function itemFromFood(food: FoodItem): SavedMealItem {
  const servingSize = food.servingSize || 100;
  return {
    foodItemId: food.id,
    name: food.name,
    servingSize,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
    sugarG: food.sugarG,
    fiberG: food.fiberG,
    quantityG: servingSize,
  };
}

export function SavedMealsPanel({ date, mealType, onLogged }: SavedMealsPanelProps) {
  const { savedMeals, addSavedMeal, updateSavedMeal, deleteSavedMeal, foodItems, addMealEntry } = useStore();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editList, setEditList] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [foodQuery, setFoodQuery] = useState('');

  /** Logs every food in the meal as its own entry, at the meal's quantities. */
  const logMeal = (meal: SavedMeal) => {
    for (const item of meal.items) {
      const scaled = scaleItem(item);
      addMealEntry({
        date,
        mealType,
        name: item.name,
        quantityG: item.quantityG,
        foodItemId: item.foodItemId,
        ...scaled,
      });
    }
    onLogged();
  };

  const startNew = () => {
    setDraft({ name: '', items: [] });
    setFoodQuery('');
  };

  const startEdit = (meal: SavedMeal) => {
    setDraft({ id: meal.id, name: meal.name, items: meal.items.map((i) => ({ ...i })) });
    setFoodQuery('');
  };

  const updateItem = (index: number, partial: Partial<SavedMealItem>) => {
    if (!draft) return;
    setDraft({ ...draft, items: draft.items.map((it, i) => (i === index ? { ...it, ...partial } : it)) });
  };

  const draftValid = !!draft
    && draft.name.trim() !== ''
    && draft.items.length > 0
    && draft.items.every((i) => i.quantityG > 0);

  const saveDraft = () => {
    if (!draft || !draftValid) return;
    const meal = { name: draft.name.trim(), items: draft.items };
    if (draft.id) updateSavedMeal(draft.id, meal);
    else addSavedMeal(meal);
    setDraft(null);
  };

  // ── Builder ────────────────────────────────────────────────────────────
  if (draft) {
    const matches = foodQuery.trim()
      ? foodItems.filter((f) => f.name.toLowerCase().includes(foodQuery.trim().toLowerCase()))
      : foodItems;
    const t = totals(draft.items);

    return (
      <div style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label className="label">Meal name</label>
          <input
            type="text"
            className="input"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g., Usual breakfast"
            autoFocus
          />
        </div>

        <label className="label">Foods</label>
        {draft.items.length === 0 ? (
          <p className="text-sm text-muted" style={{ margin: '0 0 8px' }}>No foods yet — add some below.</p>
        ) : (
          <div style={{ marginBottom: 8 }}>
            {draft.items.map((item, i) => (
              <div key={i} className="saved-meal-item-row">
                <span className="saved-meal-item-name">{item.name}</span>
                <input
                  type="number"
                  className="input saved-meal-qty"
                  value={item.quantityG || ''}
                  onChange={(e) => updateItem(i, { quantityG: Number(e.target.value) })}
                  min={1}
                  aria-label={`${item.name} quantity in grams`}
                />
                <span className="text-sm text-muted">g</span>
                <span className="text-sm text-muted saved-meal-kcal">{scaleItem(item).calories} kcal</span>
                <button
                  className="btn btn-icon btn-secondary btn-sm"
                  onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}
                  title="Remove food"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <p className="text-sm" style={{ margin: '8px 0 0' }}>
              Total: <strong>{t.calories} kcal</strong> · P:{t.proteinG}g C:{t.carbsG}g F:{t.fatG}g
            </p>
          </div>
        )}

        <div style={{ padding: 10, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
          <input
            type="text"
            className="input"
            placeholder="Search your foods to add..."
            value={foodQuery}
            onChange={(e) => setFoodQuery(e.target.value)}
            style={{ marginBottom: 6 }}
          />
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {foodItems.length === 0 ? (
              <p className="text-sm text-muted" style={{ margin: 0, padding: 8 }}>
                Your food library is empty. Create foods in the search tab first.
              </p>
            ) : matches.length === 0 ? (
              <p className="text-sm text-muted" style={{ margin: 0, padding: 8 }}>No food matches "{foodQuery.trim()}".</p>
            ) : (
              matches.map((food) => (
                <button
                  key={food.id}
                  className="food-search-item"
                  onClick={() => setDraft({ ...draft, items: [...draft.items, itemFromFood(food)] })}
                  style={{ width: '100%' }}
                >
                  <span className="food-search-name"><Plus size={12} /> {food.name}</span>
                  <span className="food-search-macros">
                    {calcCaloriesFromMacros(food.proteinG, food.carbsG, food.fatG, food.fiberG)} kcal / {food.servingSize || 100}g
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setDraft(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveDraft} disabled={!draftValid}>
            {draft.id ? 'Save changes' : 'Save meal'}
          </button>
        </div>
      </div>
    );
  }

  // ── List ───────────────────────────────────────────────────────────────
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
        {savedMeals.length > 0 && (
          <button
            className={`btn btn-sm ${editList ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setEditList(!editList)}
          >
            <Pencil size={13} /> {editList ? 'Done' : 'Edit'}
          </button>
        )}
        <button className="btn btn-sm btn-secondary" onClick={startNew}>
          <Plus size={13} /> New saved meal
        </button>
      </div>

      {savedMeals.length === 0 ? (
        <p className="text-sm text-muted" style={{ padding: 12, textAlign: 'center' }}>
          No saved meals yet. Save a set of foods you often eat together, then log them in one tap.
        </p>
      ) : (
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {savedMeals.map((meal) => {
            const t = totals(meal.items);
            return (
              <div key={meal.id} className="saved-meal-row">
                <div className="saved-meal-info">
                  <div className="food-search-name">{meal.name}</div>
                  <div className="food-search-macros">
                    {t.calories} kcal · P:{t.proteinG}g C:{t.carbsG}g F:{t.fatG}g
                  </div>
                  <div className="text-sm text-muted saved-meal-foods">
                    {meal.items.map((i) => `${i.name} ${i.quantityG}g`).join(', ')}
                  </div>
                </div>
                {editList ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => startEdit(meal)} title="Edit meal">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-icon btn-danger btn-sm" onClick={() => setDeleteId(meal.id)} title="Delete meal">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => logMeal(meal)}>
                    <Plus size={14} /> Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {deleteId && (
        <ConfirmDialog
          message={`Delete the saved meal "${savedMeals.find((m) => m.id === deleteId)?.name ?? ''}"? Meals already logged are not affected.`}
          onConfirm={() => { deleteSavedMeal(deleteId); setDeleteId(null); }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
