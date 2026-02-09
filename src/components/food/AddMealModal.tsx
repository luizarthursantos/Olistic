import { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { MealType, FoodItem, MEAL_TYPE_LABELS } from '../../types';
import { calcCaloriesFromMacros } from '../../utils/calculations';
import { analyzeFoodPhoto, analyzeFoodDescription, FoodAnalysisResult } from '../../utils/analyzeFood';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { X, Search, Camera, Image, Loader, Check, Settings, Send, Trash2, Pencil, Sparkles, Save } from 'lucide-react';

interface AddMealModalProps {
  mealType: MealType;
  date: string;
  onClose: () => void;
}

type AddMode = 'manual' | 'search' | 'photo' | 'ai';

export function AddMealModal({ mealType, date, onClose }: AddMealModalProps) {
  const { addMealEntry, foodItems, addFoodItem, updateFoodItem, deleteFoodItem, settings } = useStore();
  const [mode, setMode] = useState<AddMode>('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFood, setShowNewFood] = useState(false);
  const [editFoods, setEditFoods] = useState(false);
  const [deleteFoodConfirm, setDeleteFoodConfirm] = useState<string | null>(null);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoError, setPhotoError] = useState<string>('');
  const [photoResults, setPhotoResults] = useState<FoodAnalysisResult[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoDescription, setPhotoDescription] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResults, setAiResults] = useState<FoodAnalysisResult[]>([]);
  const [fromAi, setFromAi] = useState(false);
  const [savedFood, setSavedFood] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    quantityG: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    sugarG: 0,
    fiberG: 0,
  });

  // Base macros per the original quantity — used to scale when user changes quantity
  const baseMacros = useRef({ quantityG: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0, fiberG: 0 });

  const setFormWithBase = (data: { name: string; quantityG: number; proteinG: number; carbsG: number; fatG: number; sugarG: number; fiberG: number }) => {
    setForm(data);
    baseMacros.current = { quantityG: data.quantityG, proteinG: data.proteinG, carbsG: data.carbsG, fatG: data.fatG, sugarG: data.sugarG, fiberG: data.fiberG };
  };

  const handleQuantityChange = (newQty: number) => {
    const base = baseMacros.current;
    if (base.quantityG > 0 && newQty > 0) {
      const ratio = newQty / base.quantityG;
      setForm((prev) => ({
        ...prev,
        quantityG: newQty,
        proteinG: Math.round(base.proteinG * ratio * 10) / 10,
        carbsG: Math.round(base.carbsG * ratio * 10) / 10,
        fatG: Math.round(base.fatG * ratio * 10) / 10,
        sugarG: Math.round(base.sugarG * ratio * 10) / 10,
        fiberG: Math.round(base.fiberG * ratio * 10) / 10,
      }));
    } else {
      setForm((prev) => ({ ...prev, quantityG: newQty }));
    }
  };

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

  const parseServingGrams = (serving: string): number => {
    const match = serving.match(/(\d+)\s*g/i);
    return match ? Number(match[1]) : 100;
  };

  const selectFood = (food: FoodItem) => {
    const qty = parseServingGrams(food.servingSize);
    setFormWithBase({
      name: food.name,
      quantityG: qty,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      sugarG: food.sugarG,
      fiberG: food.fiberG,
    });
    setFromAi(false);
    setSavedFood(false);
    setMode('manual');
  };

  const saveNewFood = () => {
    addFoodItem(newFood);
    const qty = parseServingGrams(newFood.servingSize);
    setFormWithBase({
      name: newFood.name,
      quantityG: qty,
      proteinG: newFood.proteinG,
      carbsG: newFood.carbsG,
      fatG: newFood.fatG,
      sugarG: newFood.sugarG,
      fiberG: newFood.fiberG,
    });
    setFromAi(false);
    setSavedFood(false);
    setShowNewFood(false);
    setMode('manual');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError('');
    setPhotoResults([]);

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoAnalyze = async () => {
    if (!photoPreview) return;

    if (!settings.claudeApiKey) {
      setPhotoError('Claude API key required. Set it in Settings.');
      return;
    }

    setPhotoProcessing(true);
    setPhotoError('');
    setPhotoResults([]);

    const match = photoPreview.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match) {
      setPhotoError('Invalid image format.');
      setPhotoProcessing(false);
      return;
    }

    const mediaType = match[1];
    const base64Data = match[2];

    try {
      const results = await analyzeFoodPhoto(
        settings.claudeApiKey, base64Data, mediaType, photoDescription || undefined,
      );
      setPhotoResults(results);

      if (results.length === 1) {
        const item = results[0];
        setFormWithBase({
          name: item.name,
          quantityG: item.quantityG,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          sugarG: item.sugarG,
          fiberG: item.fiberG,
        });
        setFromAi(true);
        setSavedFood(false);
        setMode('manual');
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Failed to analyze photo');
    } finally {
      setPhotoProcessing(false);
    }
  };

  const handleAiAnalyze = async () => {
    if (!aiDescription.trim()) return;
    if (!settings.claudeApiKey) {
      setAiError('Claude API key required. Set it in Settings.');
      return;
    }
    setAiProcessing(true);
    setAiError('');
    setAiResults([]);
    try {
      const results = await analyzeFoodDescription(settings.claudeApiKey, aiDescription);
      setAiResults(results);
      if (results.length === 1) {
        const item = results[0];
        setFormWithBase({
          name: item.name,
          quantityG: item.quantityG,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          sugarG: item.sugarG,
          fiberG: item.fiberG,
        });
        setFromAi(true);
        setSavedFood(false);
        setMode('manual');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to analyze food');
    } finally {
      setAiProcessing(false);
    }
  };

  const selectAiResult = (item: FoodAnalysisResult) => {
    setFormWithBase({
      name: item.name,
      quantityG: item.quantityG,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      sugarG: item.sugarG,
      fiberG: item.fiberG,
    });
    setFromAi(true);
    setSavedFood(false);
    setMode('manual');
  };

  const addAllAiResults = () => {
    aiResults.forEach((item) => {
      addMealEntry({
        date,
        mealType,
        name: item.name,
        quantityG: item.quantityG,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
        sugarG: item.sugarG,
        fiberG: item.fiberG,
        calories: item.calories,
      });
    });
    onClose();
  };

  const selectPhotoResult = (item: FoodAnalysisResult) => {
    setFormWithBase({
      name: item.name,
      quantityG: item.quantityG,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      sugarG: item.sugarG,
      fiberG: item.fiberG,
    });
    setFromAi(true);
    setSavedFood(false);
    setMode('manual');
  };

  const addAllPhotoResults = () => {
    photoResults.forEach((item) => {
      addMealEntry({
        date,
        mealType,
        name: item.name,
        quantityG: item.quantityG,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
        sugarG: item.sugarG,
        fiberG: item.fiberG,
        calories: item.calories,
      });
    });
    onClose();
  };

  const saveAsFood = () => {
    if (!form.name.trim()) return;
    const qty = form.quantityG || 100;
    addFoodItem({
      name: form.name,
      proteinG: form.proteinG,
      carbsG: form.carbsG,
      fatG: form.fatG,
      sugarG: form.sugarG,
      fiberG: form.fiberG,
      servingSize: `${qty}g`,
    });
    setSavedFood(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    addMealEntry({
      date,
      mealType,
      name: form.name,
      quantityG: form.quantityG || undefined,
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
            title="Manual"
          >
            <Pencil size={16} />
          </button>
          <button
            className={`tab-btn ${mode === 'search' ? 'active' : ''}`}
            onClick={() => setMode('search')}
            title="Search Food"
          >
            <Search size={16} />
          </button>
          <button
            className={`tab-btn ${mode === 'ai' ? 'active' : ''}`}
            onClick={() => setMode('ai')}
            title="AI"
          >
            <Sparkles size={16} />
          </button>
          <button
            className={`tab-btn ${mode === 'photo' ? 'active' : ''}`}
            onClick={() => setMode('photo')}
            title="Photo"
          >
            <Camera size={16} />
          </button>
        </div>

        {mode === 'search' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                className="input"
                placeholder="Search food items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{ flex: 1 }}
              />
              {filteredFoods.length > 0 && (
                <button
                  className={`btn btn-sm ${editFoods ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setEditFoods(!editFoods)}
                >
                  <Pencil size={13} /> {editFoods ? 'Done' : 'Edit'}
                </button>
              )}
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {filteredFoods.length > 0 ? (
                filteredFoods.map((food) => (
                  <div key={food.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      className="food-search-item"
                      onClick={() => selectFood(food)}
                      style={{ flex: 1 }}
                    >
                      <span className="food-search-name">{food.name}</span>
                      <span className="food-search-macros">
                        {calcCaloriesFromMacros(food.proteinG, food.carbsG, food.fatG, food.fiberG)} kcal
                        | P:{food.proteinG}g C:{food.carbsG}g F:{food.fatG}g
                      </span>
                    </button>
                    {editFoods && (
                      <>
                        <button
                          className="btn btn-icon btn-secondary btn-sm"
                          style={{ flexShrink: 0 }}
                          onClick={() => setEditingFood(food)}
                          title="Edit food"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-icon btn-danger btn-sm"
                          style={{ marginRight: 8, flexShrink: 0 }}
                          onClick={() => setDeleteFoodConfirm(food.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
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

        {mode === 'ai' && (
          <div style={{ marginBottom: 16 }}>
            {!settings.claudeApiKey && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 12,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                }}
              >
                <Settings size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Claude API key required. Set it in <strong>Settings</strong> to use AI analysis.
              </div>
            )}

            {!aiProcessing && aiResults.length === 0 && (
              <div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="label">Describe what you ate</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={aiDescription}
                    onChange={(e) => setAiDescription(e.target.value)}
                    placeholder="e.g., 200g grilled chicken breast with 150g white rice and a mixed green salad with olive oil"
                    style={{ resize: 'vertical' }}
                    autoFocus
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={handleAiAnalyze}
                  disabled={!aiDescription.trim() || !settings.claudeApiKey}
                >
                  <Sparkles size={16} /> Analyze
                </button>
              </div>
            )}

            {aiProcessing && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)' }}>
                  <Loader size={16} className="spin" /> Analyzing...
                </div>
              </div>
            )}

            {aiError && (
              <p className="text-sm" style={{ marginTop: 12, color: 'var(--danger)', textAlign: 'center' }}>
                {aiError}
              </p>
            )}

            {aiResults.length > 1 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>
                    {aiResults.length} items detected
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={addAllAiResults}>
                    <Check size={14} /> Add All
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {aiResults.map((item, i) => (
                    <button
                      key={i}
                      className="food-search-item"
                      onClick={() => selectAiResult(item)}
                    >
                      <span className="food-search-name">{item.name}</span>
                      <span className="food-search-macros">
                        {item.calories} kcal | P:{item.proteinG}g C:{item.carbsG}g F:{item.fatG}g
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'photo' && (
          <div style={{ marginBottom: 16 }}>
            {!settings.claudeApiKey && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 12,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                }}
              >
                <Settings size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Claude API key required. Set it in <strong>Settings</strong> to use photo analysis.
              </div>
            )}

            {/* Camera and Gallery buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 12 }}>
              <label
                className={`btn ${settings.claudeApiKey ? 'btn-primary' : 'btn-secondary'}`}
                style={{ cursor: settings.claudeApiKey ? 'pointer' : 'not-allowed', opacity: settings.claudeApiKey ? 1 : 0.5 }}
              >
                <Camera size={16} /> Camera
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                  disabled={!settings.claudeApiKey}
                />
              </label>
              <label
                className={`btn ${settings.claudeApiKey ? 'btn-secondary' : 'btn-secondary'}`}
                style={{ cursor: settings.claudeApiKey ? 'pointer' : 'not-allowed', opacity: settings.claudeApiKey ? 1 : 0.5 }}
              >
                <Image size={16} /> Gallery
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                  disabled={!settings.claudeApiKey}
                />
              </label>
            </div>

            {/* Photo preview */}
            {photoPreview && !photoProcessing && photoResults.length === 0 && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={photoPreview}
                  alt="Selected food"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 180,
                    borderRadius: 'var(--radius-sm)',
                    display: 'block',
                    margin: '0 auto 12px',
                  }}
                />
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="label">Description (optional)</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={photoDescription}
                    onChange={(e) => setPhotoDescription(e.target.value)}
                    placeholder="e.g., 200g grilled chicken with rice, side salad with olive oil dressing"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={handlePhotoAnalyze}
                >
                  <Send size={16} /> Analyze Photo
                </button>
              </div>
            )}

            {photoProcessing && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)' }}>
                  <Loader size={16} className="spin" /> Analyzing photo...
                </div>
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Uploaded food"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 150,
                      borderRadius: 'var(--radius-sm)',
                      marginTop: 12,
                      opacity: 0.6,
                    }}
                  />
                )}
              </div>
            )}

            {photoError && (
              <p className="text-sm" style={{ marginTop: 12, color: 'var(--danger)', textAlign: 'center' }}>
                {photoError}
              </p>
            )}

            {/* Multiple results from photo */}
            {photoResults.length > 1 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>
                    {photoResults.length} items detected
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={addAllPhotoResults}>
                    <Check size={14} /> Add All
                  </button>
                </div>
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Uploaded food"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 120,
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: 12,
                    }}
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {photoResults.map((item, i) => (
                    <button
                      key={i}
                      className="food-search-item"
                      onClick={() => selectPhotoResult(item)}
                    >
                      <span className="food-search-name">{item.name}</span>
                      <span className="food-search-macros">
                        {item.calories} kcal | P:{item.proteinG}g C:{item.carbsG}g F:{item.fatG}g
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual form (always shown for final entry) */}
        {(mode === 'manual' || mode === 'photo' || mode === 'ai') && !photoProcessing && !aiProcessing && photoResults.length <= 1 && aiResults.length <= 1 && (
          <>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="label">Name</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Chicken breast"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="label">Qty (g)</label>
                <input
                  type="number"
                  className="input"
                  value={form.quantityG || ''}
                  onChange={(e) => handleQuantityChange(Number(e.target.value))}
                  min={0}
                  placeholder="g"
                />
              </div>
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

        {(!photoProcessing && !aiProcessing && (mode !== 'photo' || photoResults.length <= 1) && (mode !== 'ai' || aiResults.length <= 1)) && (
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            {fromAi && form.name.trim() && (
              <button
                className="btn btn-secondary"
                onClick={saveAsFood}
                disabled={savedFood}
                title="Save as reusable food item"
              >
                <Save size={14} /> {savedFood ? 'Saved' : 'Save Food'}
              </button>
            )}
            <button className="btn btn-primary" onClick={save} disabled={!form.name.trim()}>
              Add Meal
            </button>
          </div>
        )}

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

        {deleteFoodConfirm && (
          <ConfirmDialog
            message="Are you sure you want to delete this saved food?"
            onConfirm={() => {
              deleteFoodItem(deleteFoodConfirm);
              setDeleteFoodConfirm(null);
            }}
            onCancel={() => setDeleteFoodConfirm(null)}
          />
        )}

        {editingFood && (
          <EditFoodModal
            food={editingFood}
            onSave={(updated) => {
              updateFoodItem(editingFood.id, updated);
              setEditingFood(null);
            }}
            onClose={() => setEditingFood(null)}
          />
        )}
      </div>
    </div>
  );
}

function EditFoodModal({ food, onSave, onClose }: {
  food: FoodItem;
  onSave: (data: Omit<FoodItem, 'id'>) => void;
  onClose: () => void;
}) {
  const [ef, setEf] = useState({
    name: food.name,
    servingSize: food.servingSize,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
    sugarG: food.sugarG,
    fiberG: food.fiberG,
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Edit Food</h3>
        <div className="form-group">
          <label className="label">Name</label>
          <input type="text" className="input" value={ef.name}
            onChange={(e) => setEf({ ...ef, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="label">Serving Size</label>
          <input type="text" className="input" value={ef.servingSize}
            onChange={(e) => setEf({ ...ef, servingSize: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Protein (g)</label>
            <input type="number" className="input" value={ef.proteinG}
              onChange={(e) => setEf({ ...ef, proteinG: Number(e.target.value) })} min={0} step={0.1} />
          </div>
          <div className="form-group">
            <label className="label">Carbs (g)</label>
            <input type="number" className="input" value={ef.carbsG}
              onChange={(e) => setEf({ ...ef, carbsG: Number(e.target.value) })} min={0} step={0.1} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Fat (g)</label>
            <input type="number" className="input" value={ef.fatG}
              onChange={(e) => setEf({ ...ef, fatG: Number(e.target.value) })} min={0} step={0.1} />
          </div>
          <div className="form-group">
            <label className="label">Sugar (g)</label>
            <input type="number" className="input" value={ef.sugarG}
              onChange={(e) => setEf({ ...ef, sugarG: Number(e.target.value) })} min={0} step={0.1} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">Fiber (g)</label>
          <input type="number" className="input" value={ef.fiberG}
            onChange={(e) => setEf({ ...ef, fiberG: Number(e.target.value) })} min={0} step={0.1} />
        </div>
        <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent)' }}>
          {calcCaloriesFromMacros(ef.proteinG, ef.carbsG, ef.fatG, ef.fiberG)} kcal
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(ef)} disabled={!ef.name.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
