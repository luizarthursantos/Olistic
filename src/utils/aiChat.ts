import { AiProvider, BodyEntry, MealEntry, WorkoutSession, WorkoutTemplate, Exercise, UserSettings, MacroTargets } from '../types';
import { calcBodyFatNavy, calcFFMI, calcBMR, calcTDEE, calcAge, getBestOneRepMax } from './calculations';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildDataSummary(
  settings: UserSettings,
  bodyEntries: BodyEntry[],
  mealEntries: MealEntry[],
  workoutSessions: WorkoutSession[],
  workoutTemplates: WorkoutTemplate[],
  exercises: Exercise[],
  macroTargets: MacroTargets[],
): string {
  const age = calcAge(settings.birthday);
  const today = new Date().toISOString().slice(0, 10);
  const sortedBody = [...bodyEntries].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sortedBody[0];

  let summary = `TODAY'S DATE: ${today}
All dates below are in YYYY-MM-DD format. Interpret them carefully — pay attention to the year.

USER PROFILE:
- Age: ${age}, Sex: ${settings.sex}, Height: ${settings.heightCm} cm
- Activity level: ${settings.activityLevel.replace(/_/g, ' ')}
- Unit system: ${settings.unitSystem}
- Targets: Body fat ${settings.targetBodyFatPct}%, FFMI ${settings.targetFFMI}, Caloric delta ${settings.targetCaloricDelta} kcal/day\n`;

  if (latest) {
    const bf = calcBodyFatNavy(settings.sex, latest.waistCm, latest.neckCm, settings.heightCm);
    const ffmi = bf > 0 ? calcFFMI(latest.weightKg, bf, settings.heightCm) : 0;
    const bmr = calcBMR(settings.sex, latest.weightKg, settings.heightCm, age);
    const tdee = calcTDEE(bmr, settings.activityLevel);
    summary += `\nLATEST BODY MEASUREMENTS (${latest.date}):
- Weight: ${latest.weightKg} kg, Waist: ${latest.waistCm} cm, Neck: ${latest.neckCm} cm
- Estimated body fat: ${bf}%, FFMI: ${ffmi}
- BMR: ${bmr} kcal, TDEE: ${tdee} kcal\n`;
  }

  if (macroTargets.length > 0) {
    const currentTargets = [...macroTargets].sort((a, b) => b.date.localeCompare(a.date))[0];
    summary += `\nMACRO TARGETS: ${currentTargets.calories} kcal target
- Protein: ${settings.proteinPerKg ?? 2.0} g/kg, Fat: ${settings.fatPerKg ?? 1.0} g/kg, Fiber: ${settings.fiberPerKg ?? 0.4} g/kg, Sugar limit: ${settings.sugarLimitG ?? 50}g
- Carbs fill the remaining calories after protein, fat, and fiber\n`;
  }

  // Body history — most recent first
  if (sortedBody.length > 0) {
    summary += `\nBODY HISTORY (${sortedBody.length} entries, most recent first):\n`;
    for (const entry of sortedBody) {
      summary += `  ${entry.date}: ${entry.weightKg}kg, waist ${entry.waistCm}cm, neck ${entry.neckCm}cm\n`;
    }
  }

  // Nutrition history — most recent first, grouped by date
  const sortedMeals = [...mealEntries].sort((a, b) => b.date.localeCompare(a.date));
  if (sortedMeals.length > 0) {
    const mealsByDate = new Map<string, MealEntry[]>();
    for (const m of sortedMeals) {
      if (!mealsByDate.has(m.date)) mealsByDate.set(m.date, []);
      mealsByDate.get(m.date)!.push(m);
    }
    summary += `\nNUTRITION HISTORY (${sortedMeals.length} meals across ${mealsByDate.size} days, most recent first):\n`;
    mealsByDate.forEach((meals, date) => {
      const totals = meals.reduce((acc, m) => ({
        cal: acc.cal + m.calories, p: acc.p + m.proteinG, c: acc.c + m.carbsG, f: acc.f + m.fatG,
        sugar: acc.sugar + m.sugarG, fiber: acc.fiber + m.fiberG,
      }), { cal: 0, p: 0, c: 0, f: 0, sugar: 0, fiber: 0 });
      summary += `  ${date} — TOTAL: ${totals.cal} kcal, P${Math.round(totals.p)}g C${Math.round(totals.c)}g F${Math.round(totals.f)}g Sugar${Math.round(totals.sugar)}g Fiber${Math.round(totals.fiber)}g\n`;
      for (const m of meals) {
        summary += `    [${m.mealType}] ${m.name}: ${m.calories} kcal, P${m.proteinG}g C${m.carbsG}g F${m.fatG}g${m.quantityG ? ` (${m.quantityG}g)` : ''}\n`;
      }
    });
  }

  // Workout templates
  if (workoutTemplates.length > 0) {
    summary += `\nWORKOUT TEMPLATES (${workoutTemplates.length}):\n`;
    for (const t of workoutTemplates) {
      const exNames = t.exercises.map(e => {
        const ex = exercises.find(x => x.id === e.exerciseId);
        return ex ? `${ex.name} (${e.sets}x${e.defaultReps}@${e.defaultLoadKg}kg)` : 'Unknown';
      });
      summary += `  "${t.name}": ${exNames.join(', ')}\n`;
    }
  }

  // Workout session history — most recent first
  const sortedSessions = [...workoutSessions]
    .filter(s => s.completed)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (sortedSessions.length > 0) {
    summary += `\nWORKOUT HISTORY (${sortedSessions.length} completed sessions, most recent first):\n`;
    for (const session of sortedSessions) {
      const template = workoutTemplates.find(t => t.id === session.templateId);
      const name = template?.name || 'Unknown';
      summary += `  ${session.date} "${name}" (${session.estimatedCalories} kcal, ${session.startTime?.slice(11, 16) || '?'}–${session.endTime?.slice(11, 16) || '?'}):\n`;
      for (const exSession of session.exercises) {
        const exercise = exercises.find(e => e.id === exSession.exerciseId);
        const exName = exercise?.name || 'Unknown';
        if (exercise?.isCardio) {
          summary += `    ${exName}: ${exSession.cardioMinutes || 0} min${exSession.estimatedCalories ? `, ${exSession.estimatedCalories} kcal` : ''}\n`;
        } else {
          const completedSets = exSession.sets.filter(s => s.completed);
          const setsStr = completedSets.map(s => `${s.reps}x${s.loadKg}kg`).join(', ');
          const orm = getBestOneRepMax(exSession.sets);
          summary += `    ${exName}: ${setsStr}${orm > 0 ? ` (est. 1RM: ${orm}kg)` : ''}\n`;
        }
      }
    }
  }

  return summary;
}

const SYSTEM_PROMPT = (dataSummary: string) =>
  `You are an AI fitness and nutrition assistant inside "Olistic", a personal health tracking app. You have access to the user's complete logged data below. Use this data to give personalized feedback, insights, recommendations, or just chat.

IMPORTANT RULES:
- All dates in the data are in YYYY-MM-DD format (e.g. 2026-04-23 = April 23, 2026). Read them carefully, especially the year.
- Data is sorted most recent first. The first entry in each section is the most recent.
- Only state facts that are directly supported by the data. Do not guess or assume values not present.
- Be concise and helpful. Use the data to back up your points when relevant.
- Use metric units unless the user's settings indicate imperial.

You can:
- Analyze trends in weight, body composition, nutrition, and workouts
- Suggest improvements to training or diet
- Answer fitness/nutrition questions with context from their data
- Give encouragement and accountability
- Calculate or estimate things based on their logged data

--- USER DATA ---
${dataSummary}`;

export async function sendChatMessage(
  apiKey: string,
  provider: AiProvider,
  messages: ChatMessage[],
  dataSummary: string,
): Promise<string> {
  const systemPrompt = SYSTEM_PROMPT(dataSummary);

  if (provider === 'gemini') {
    return geminiChat(apiKey, systemPrompt, messages);
  }
  return claudeChat(apiKey, systemPrompt, messages);
}

async function claudeChat(apiKey: string, systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error (${response.status}): ${error}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function geminiChat(apiKey: string, systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt + '\n\nPlease acknowledge you understand and are ready to help.' }] },
    { role: 'model', parts: [{ text: 'I understand! I have access to your health and fitness data. How can I help you today?' }] },
    ...messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    },
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export { buildDataSummary };
