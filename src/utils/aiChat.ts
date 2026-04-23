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
  const sorted = [...bodyEntries].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];

  let summary = `USER PROFILE:
- Age: ${age}, Sex: ${settings.sex}, Height: ${settings.heightCm} cm
- Activity level: ${settings.activityLevel.replace(/_/g, ' ')}
- Unit system: ${settings.unitSystem}
- Targets: Body fat ${settings.targetBodyFatPct}%, FFMI ${settings.targetFFMI}, Caloric delta ${settings.targetCaloricDelta} kcal/day\n`;

  if (latest) {
    const bf = calcBodyFatNavy(settings.sex, latest.waistCm, latest.neckCm, settings.heightCm);
    const ffmi = bf > 0 ? calcFFMI(latest.weightKg, bf, settings.heightCm) : 0;
    const bmr = calcBMR(settings.sex, latest.weightKg, settings.heightCm, age);
    const tdee = calcTDEE(bmr, settings.activityLevel);
    summary += `\nLATEST BODY ENTRY (${latest.date}):
- Weight: ${latest.weightKg} kg, Waist: ${latest.waistCm} cm, Neck: ${latest.neckCm} cm
- Estimated body fat: ${bf}%, FFMI: ${ffmi}
- BMR: ${bmr} kcal, TDEE: ${tdee} kcal\n`;

    if (sorted.length >= 2) {
      const oldest = sorted[sorted.length - 1];
      const weightDelta = Math.round((latest.weightKg - oldest.weightKg) * 10) / 10;
      summary += `- Weight trend: ${weightDelta > 0 ? '+' : ''}${weightDelta} kg over ${sorted.length} entries (${oldest.date} to ${latest.date})\n`;
    }
  }

  const recentMeals = [...mealEntries].sort((a, b) => b.date.localeCompare(a.date));
  if (recentMeals.length > 0) {
    const dates = [...new Set(recentMeals.map(m => m.date))].slice(0, 7);
    summary += `\nRECENT NUTRITION (last ${dates.length} days with entries):\n`;
    for (const date of dates) {
      const dayMeals = recentMeals.filter(m => m.date === date);
      const totals = dayMeals.reduce((acc, m) => ({
        cal: acc.cal + m.calories,
        p: acc.p + m.proteinG,
        c: acc.c + m.carbsG,
        f: acc.f + m.fatG,
      }), { cal: 0, p: 0, c: 0, f: 0 });
      summary += `  ${date}: ${totals.cal} kcal, P${Math.round(totals.p)}g C${Math.round(totals.c)}g F${Math.round(totals.f)}g (${dayMeals.length} meals)\n`;
    }
  }

  const currentTargets = [...macroTargets].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (currentTargets) {
    summary += `\nMACRO TARGETS: ${currentTargets.calories} kcal, P${currentTargets.proteinG}g C${currentTargets.carbsG}g F${currentTargets.fatG}g\n`;
  }

  const completedSessions = workoutSessions.filter(s => s.completed);
  const recentSessions = [...completedSessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  if (recentSessions.length > 0) {
    summary += `\nRECENT WORKOUTS (last ${recentSessions.length} sessions):\n`;
    for (const session of recentSessions) {
      const template = workoutTemplates.find(t => t.id === session.templateId);
      const name = template?.name || 'Unknown';
      const exCount = session.exercises.length;
      const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.filter(s => s.completed).length, 0);
      summary += `  ${session.date}: ${name} — ${exCount} exercises, ${totalSets} sets, ${session.estimatedCalories} kcal\n`;
    }

    const exerciseMap = new Map<string, number>();
    for (const session of completedSessions) {
      for (const ex of session.exercises) {
        const exercise = exercises.find(e => e.id === ex.exerciseId);
        if (!exercise || exercise.isCardio) continue;
        const orm = getBestOneRepMax(ex.sets);
        if (orm > (exerciseMap.get(ex.exerciseId) || 0)) {
          exerciseMap.set(ex.exerciseId, orm);
        }
      }
    }
    if (exerciseMap.size > 0) {
      summary += `\nBEST 1RM ESTIMATES:\n`;
      exerciseMap.forEach((orm, exId) => {
        const exercise = exercises.find(e => e.id === exId);
        if (exercise) summary += `  ${exercise.name}: ${orm} kg\n`;
      });
    }
  }

  summary += `\nTOTAL DATA: ${bodyEntries.length} body entries, ${mealEntries.length} meal entries, ${completedSessions.length} completed workouts, ${workoutTemplates.length} templates\n`;

  return summary;
}

const SYSTEM_PROMPT = (dataSummary: string) =>
  `You are an AI fitness and nutrition assistant inside "Olistic", a personal health tracking app. You have access to the user's logged data below. Use this data to give personalized feedback, insights, recommendations, or just chat.

Be concise and helpful. Use the data to back up your points when relevant. You can:
- Analyze trends in weight, body composition, nutrition, and workouts
- Suggest improvements to training or diet
- Answer fitness/nutrition questions with context from their data
- Give encouragement and accountability
- Calculate or estimate things based on their logged data

Keep responses conversational and focused. Use metric units unless the user's settings indicate imperial.

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
      model: 'claude-sonnet-4-5-20250929',
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
