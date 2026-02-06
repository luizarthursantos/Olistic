import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { MealType, FoodItem, MEAL_TYPE_LABELS } from '../../types';
import { calcCaloriesFromMacros } from '../../utils/calculations';
import { X, Search, Camera } from 'lucide-react';

interface AddMealModalProps {
  mealType: MealType;
  date: string;
  onClose: () => void;
}

type AddMode = 'manual' | 'search' | 'photo';

export function AddMealModal({ mealType, date, onClose }: AddMealModalProps) {
  const { addMealEntry, foodItems, addFoodItem } = useStore();
  const [mode, setMode] = useState<AddMode>('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFood, setShowNewFood] = useState(false);
  const [photoEstimate, setPhotoEstimate] = useState<string>('');
  const [photoProcessing, setPhotoProcessing] = useState(false);

  const [form, setForm] = useState({
    name: '',
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    sugarG: 0,
    fiberG: 0,
  });

  const [newFood, setNewFood] = useState({
    name: '',
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    sugarG: 0,
    fiberG: 0,
    servingSize: '100g',
  });

  const calories = calcCaloriesFromMacros(form.proteinG, form.carbsG, form.fatG, form.fiberG);

  const filteredFoods = foodItems.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectFood = (food: FoodItem) => {
    setForm({
      name: food.name,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      sugarG: food.sugarG,
      fiberG: food.fiberG,
    });
    setMode('manual');
  };

  const saveNewFood = () => {
    addFoodItem(newFood);
    setForm({
      name: newFood.name,
      proteinG: newFood.proteinG,
      carbsG: newFood.carbsG,
      fatG: newFood.fatG,
      sugarG: newFood.sugarG,
      fiberG: newFood.fiberG,
    });
    setShowNewFood(false);
    setMode('manual');
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoProcessing(true);
    // Convert to base64 for display; in production, this would be sent to Claude API
    const reader = new FileReader();
    reader.onload = () => {
      // Simulate API response - in production, send to Claude Vision API
      setPhotoEstimate('Photo analysis would require Claude API integration. Enter macros manually based on the photo.');
      setPhotoProcessing(false);
      setMode('manual');
      setForm({ ...form, name: file.name.replace(/\.[^.]+$/, '') });
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!form.name.trim()) return;
    addMealEntry({
      date,
      mealType,
      name: form.name,
      proteinG: form.proteinG,
      carbsG: form.carbsG,
      fatG: form.fatG,
      sugarG: form.sugarG,
      fiberG: form.fiberG,
      calories,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>
            Add to {MEAL_TYPE_LABELS[mealType]}
          </h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="tab-bar" style={{ marginBottom: 16 }}>
          <button
            className={`tab-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            Manual
          </button>
          <button
            className={`tab-btn ${mode === 'search' ? 'active' : ''}`}
            onClick={() => setMode('search')}
          >
            <Search size={14} /> Search Food
          </button>
          <button
            className={`tab-btn ${mode === 'photo' ? 'active' : ''}`}
            onClick={() => setMode('photo')}
          >
            <Camera size={14} /> Photo
          </button>
        </div>

        {mode === 'search' && (
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              className="input"
              placeholder="Search food items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
              {filteredFoods.length > 0 ? (
                filteredFoods.map((food) => (
                  <button
                    key={food.id}
                    className="food-search-item"
                    onClick={() => selectFood(food)}
                  >
                    <span className="food-search-name">{food.name}</span>
                    <span className="food-search-macros">
                      {calcCaloriesFromMacros(food.proteinG, food.carbsG, food.fatG, food.fiberG)} kcal
                      | P:{food.proteinG}g C:{food.carbsG}g F:{food.fatG}g
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-muted text-sm" style={{ padding: 12 }}>
                  No foods found.{' '}
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowNewFood(true)}
                    style={{ marginLeft: 8 }}
                  >
                    Create New Food
                  </button>
                </p>
              )}
            </div>
            {filteredFoods.length > 0 && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setShowNewFood(true)}
                style={{ marginTop: 8 }}
              >
                + Create New Food
              </button>
            )}
          </div>
        )}

        {mode === 'photo' && (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <Camera size={16} /> Take or Upload Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhoto}
                style={{ display: 'none' }}
              />
            </label>
            {photoProcessing && <p className="text-muted" style={{ marginTop: 8 }}>Processing...</p>}
            {photoEstimate && (
              <p className="text-sm" style={{ marginTop: 8, color: 'var(--warning)' }}>
                {photoEstimate}
              </p>
            )}
          </div>
        )}

        {/* Manual form (always shown for final entry) */}
        {(mode === 'manual' || mode === 'photo') && (
          <>
            <div className="form-group">
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Chicken breast"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Protein (g)</label>
                <input
                  type="number"
                  className="input"
                  value={form.proteinG}
                  onChange={(e) => setForm({ ...form, proteinG: Number(e.target.value) })}
                  min={0}
                  step={0.1}
                />
              </div>
              <div className="form-group">
                <label className="label">Carbs (g)</label>
                <input
                  type="number"
                  className="input"
                  value={form.carbsG}
                  onChange={(e) => setForm({ ...form, carbsG: Number(e.target.value) })}
                  min={0}
                  step={0.1}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Fat (g)</label>
                <input
                  type="number"
                  className="input"
                  value={form.fatG}
                  onChange={(e) => setForm({ ...form, fatG: Number(e.target.value) })}
                  min={0}
                  step={0.1}
                />
              </div>
              <div className="form-group">
                <label className="label">Sugar (g)</label>
                <input
                  type="number"
                  className="input"
                  value={form.sugarG}
                  onChange={(e) => setForm({ ...form, sugarG: Number(e.target.value) })}
                  min={0}
                  step={0.1}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Fiber (g)</label>
              <input
                type="number"
                className="input"
                value={form.fiberG}
                onChange={(e) => setForm({ ...form, fiberG: Number(e.target.value) })}
                min={0}
                step={0.1}
              />
            </div>
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--accent-light)',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: 18,
                color: 'var(--accent)',
              }}
            >
              {calories} kcal
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!form.name.trim()}>
            Add Meal
          </button>
        </div>

        {/* New food sub-modal */}
        {showNewFood && (
          <div className="modal-overlay" onClick={() => setShowNewFood(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Create New Food</h3>
              <div className="form-group">
                <label className="label">Name</label>
                <input
                  type="text"
                  className="input"
                  value={newFood.name}
                  onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="label">Serving Size</label>
                <input
                  type="text"
                  className="input"
                  value={newFood.servingSize}
                  onChange={(e) => setNewFood({ ...newFood, servingSize: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Protein (g)</label>
                  <input type="number" className="input" value={newFood.proteinG}
                    onChange={(e) => setNewFood({ ...newFood, proteinG: Number(e.target.value) })} min={0} step={0.1} />
                </div>
                <div className="form-group">
                  <label className="label">Carbs (g)</label>
                  <input type="number" className="input" value={newFood.carbsG}
                    onChange={(e) => setNewFood({ ...newFood, carbsG: Number(e.target.value) })} min={0} step={0.1} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Fat (g)</label>
                  <input type="number" className="input" value={newFood.fatG}
                    onChange={(e) => setNewFood({ ...newFood, fatG: Number(e.target.value) })} min={0} step={0.1} />
                </div>
                <div className="form-group">
                  <label className="label">Sugar (g)</label>
                  <input type="number" className="input" value={newFood.sugarG}
                    onChange={(e) => setNewFood({ ...newFood, sugarG: Number(e.target.value) })} min={0} step={0.1} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Fiber (g)</label>
                <input type="number" className="input" value={newFood.fiberG}
                  onChange={(e) => setNewFood({ ...newFood, fiberG: Number(e.target.value) })} min={0} step={0.1} />
              </div>
              <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent)' }}>
                {calcCaloriesFromMacros(newFood.proteinG, newFood.carbsG, newFood.fatG, newFood.fiberG)} kcal
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowNewFood(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveNewFood} disabled={!newFood.name.trim()}>
                  Save Food
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
