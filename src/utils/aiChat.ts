import { AiProvider, ClaudeModel, BodyEntry, MealEntry, WorkoutSession, WorkoutTemplate, Exercise, UserSettings, MacroTargets } from '../types';
import { streamClaudeText } from './claudeStream';
import {
  calcBodyFatNavy, calcFFMI, calcBMR, calcTDEE, calcAge, getBestOneRepMax,
  get7DayAvgWeight, computeMacrosFromWeight, toLocalDateStr,
} from './calculations';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// How many days back get meal-by-meal and set-by-set detail. Everything older
// is represented by the daily table plus the 1RM series, which carry the
// signal at a fraction of the tokens.
const DETAIL_WINDOW_DAYS = 30;

function num(v: unknown): number {
  const x = Number(v);
  return isFinite(x) ? x : 0;
}

/** Rounds to `places`, then renders '' for zero/NaN so table cells stay empty. */
function cell(v: number, places = 0): string {
  if (!isFinite(v) || v === 0) return '';
  const f = Math.pow(10, places);
  return String(Math.round(v * f) / f);
}

function toDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

function shiftDays(dateStr: string, days: number): string {
  const d = toDate(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Collapses a sorted list of dates into ranges: ['a', 'b→c', 'd']. */
function compressDateRanges(dates: string[]): string[] {
  const out: string[] = [];
  let runStart = '';
  let runEnd = '';
  for (const date of dates) {
    if (runEnd && shiftDays(runEnd, 1) === date) {
      runEnd = date;
      continue;
    }
    if (runStart) out.push(runStart === runEnd ? runStart : `${runStart}→${runEnd}`);
    runStart = date;
    runEnd = date;
  }
  if (runStart) out.push(runStart === runEnd ? runStart : `${runStart}→${runEnd}`);
  return out;
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
  const today = toLocalDateStr(new Date());
  const heightCm = num(settings.heightCm);

  const bodyAsc = [...bodyEntries].sort((a, b) => a.date.localeCompare(b.date));
  const bodyDesc = [...bodyAsc].reverse();
  const bodyByDate = new Map(bodyAsc.map((e) => [e.date, e]));
  const latest = bodyDesc[0];

  // ── Derived-value helpers ──────────────────────────────────────────────
  // These mirror src/components/analytics/analyticsMetrics.ts exactly, so the
  // numbers the assistant quotes match the numbers the Analytics tab plots.
  // Diverging here would be worse than omitting the data.

  const interpolate = (date: string, field: 'weightKg' | 'waistCm' | 'neckCm'): number => {
    const before = bodyAsc.filter((e) => e.date <= date && num(e[field]) > 0).pop();
    const after = bodyAsc.find((e) => e.date >= date && num(e[field]) > 0);
    if (before && after && before.date !== after.date) {
      const d1 = toDate(before.date).getTime();
      const d2 = toDate(after.date).getTime();
      const dt = toDate(date).getTime();
      const t = (dt - d1) / (d2 - d1);
      return Math.round((num(before[field]) + t * (num(after[field]) - num(before[field]))) * 10) / 10;
    }
    return num(before?.[field]) || num(after?.[field]) || 0;
  };

  const resolve = (entry: BodyEntry, field: 'weightKg' | 'waistCm' | 'neckCm'): number => {
    const v = num(entry[field]);
    return v > 0 ? v : interpolate(entry.date, field);
  };

  const nearestActivity = (date: string) => {
    const before = bodyAsc.filter((e) => e.date <= date).pop();
    const after = bodyAsc.find((e) => e.date >= date);
    if (!before && !after) return settings.activityLevel;
    if (!before) return after!.activityLevel;
    if (!after) return before.activityLevel;
    const d = toDate(date).getTime();
    return d - toDate(before.date).getTime() <= toDate(after.date).getTime() - d
      ? before.activityLevel
      : after.activityLevel;
  };

  const bodyFatOn = (entry: BodyEntry): number => {
    const waist = resolve(entry, 'waistCm');
    const neck = resolve(entry, 'neckCm');
    if (waist <= 0 || neck <= 0) return 0;
    return calcBodyFatNavy(settings.sex, waist, neck, heightCm);
  };

  // Macro targets are forward-filled by date, then scaled to the 7-day average
  // weight — same resolution the Food tab uses.
  const targetsDesc = [...macroTargets].sort((a, b) => b.date.localeCompare(a.date));
  const targetsOn = (date: string) => {
    const target = targetsDesc.find((t) => t.date <= date);
    if (!target) return null;
    const avgWeight = get7DayAvgWeight(bodyEntries, date);
    if (!avgWeight) return target;
    return {
      ...target,
      ...computeMacrosFromWeight(
        target.calories,
        avgWeight,
        settings.proteinPerKg ?? 2.0,
        settings.fatPerKg ?? 1.0,
        settings.fiberPerKg ?? 0.4,
        settings.sugarLimitG ?? 50,
      ),
    };
  };

  // ── Group logs by date ─────────────────────────────────────────────────
  const mealsByDate = new Map<string, MealEntry[]>();
  for (const m of mealEntries) {
    const list = mealsByDate.get(m.date);
    if (list) list.push(m);
    else mealsByDate.set(m.date, [m]);
  }

  const sessionsByDate = new Map<string, WorkoutSession[]>();
  for (const s of workoutSessions) {
    const list = sessionsByDate.get(s.date);
    if (list) list.push(s);
    else sessionsByDate.set(s.date, [s]);
  }

  const exerciseName = (id: string) => exercises.find((e) => e.id === id)?.name || 'Unknown exercise';
  const templateName = (id: string) => workoutTemplates.find((t) => t.id === id)?.name || 'Unplanned';

  const loggedDates = [...new Set([
    ...bodyEntries.map((e) => e.date),
    ...mealEntries.map((m) => m.date),
    ...workoutSessions.map((s) => s.date),
  ])].sort();

  // ── Header ─────────────────────────────────────────────────────────────
  let summary = `TODAY'S DATE: ${today}
All dates below are in YYYY-MM-DD format. Interpret them carefully — pay attention to the year.

USER PROFILE:
- Age: ${age}, Sex: ${settings.sex}, Height: ${settings.heightCm} cm
- Default activity level: ${settings.activityLevel.replace(/_/g, ' ')}
- Unit system: ${settings.unitSystem}
- Targets: Body fat ${settings.targetBodyFatPct}%, FFMI ${settings.targetFFMI}, Caloric balance ${settings.targetCaloricDelta} kcal/day\n`;

  if (latest) {
    const weight = resolve(latest, 'weightKg');
    const bf = bodyFatOn(latest);
    const ffmi = bf > 0 ? calcFFMI(weight, bf, heightCm) : 0;
    const bmr = calcBMR(settings.sex, weight, heightCm, age);
    const tdee = calcTDEE(bmr, latest.activityLevel);
    const avg7 = get7DayAvgWeight(bodyEntries, latest.date);
    summary += `\nCURRENT STATUS (from latest body entry, ${latest.date}):
- Weight: ${weight} kg${avg7 ? ` (7-day avg: ${avg7} kg)` : ''}, Waist: ${resolve(latest, 'waistCm')} cm, Neck: ${resolve(latest, 'neckCm')} cm
- Body fat: ${bf}% (target ${settings.targetBodyFatPct}%, ${fmtGap(bf - num(settings.targetBodyFatPct), 'pp above', 'pp below')})
- FFMI: ${ffmi} (target ${settings.targetFFMI}, ${fmtGap(num(settings.targetFFMI) - ffmi, 'to gain', 'above target')})
- BMR: ${bmr} kcal, TDEE at rest: ${tdee} kcal (before workout calories)\n`;
  }

  const currentTargets = targetsOn(today);
  if (currentTargets) {
    summary += `\nCURRENT MACRO TARGETS (${currentTargets.calories} kcal/day):
- Protein ${currentTargets.proteinG}g, Carbs ${currentTargets.carbsG}g, Fat ${currentTargets.fatG}g, Fiber ${currentTargets.fiberG}g, Sugar limit ${currentTargets.sugarG}g
- Gram targets scale with 7-day average weight (protein ${settings.proteinPerKg ?? 2.0} g/kg, fat ${settings.fatPerKg ?? 1.0} g/kg, fiber ${settings.fiberPerKg ?? 0.4} g/kg); carbs fill the remaining calories\n`;
  }

  // ── Daily table: the full history, one row per logged day ───────────────
  if (loggedDates.length > 0) {
    summary += `\nDAILY SUMMARY (${loggedDates.length} logged days, most recent first)
Columns: date | wt = weight kg | wt7d = 7-day avg weight kg | bf% | ffmi | in = kcal eaten | tgt = kcal target | out = total expenditure kcal (TDEE + workout) | bal = in - out | P/C/F/sug/fib = grams eaten | Ptgt = protein target g | training
BAL SIGN: negative = deficit (ate less than burned), positive = surplus. Blank cell = not logged / not computable.
date | wt | wt7d | bf% | ffmi | in | tgt | out | bal | P | Ptgt | C | F | sug | fib | training\n`;

    for (const date of [...loggedDates].reverse()) {
      const meals = mealsByDate.get(date) ?? [];
      const sessions = sessionsByDate.get(date) ?? [];
      const entry = bodyByDate.get(date);

      const eaten = meals.reduce(
        (acc, m) => ({
          cal: acc.cal + num(m.calories),
          p: acc.p + num(m.proteinG),
          c: acc.c + num(m.carbsG),
          f: acc.f + num(m.fatG),
          sugar: acc.sugar + num(m.sugarG),
          fiber: acc.fiber + num(m.fiberG),
        }),
        { cal: 0, p: 0, c: 0, f: 0, sugar: 0, fiber: 0 },
      );

      const weight = entry ? resolve(entry, 'weightKg') : interpolate(date, 'weightKg');
      const bf = entry ? bodyFatOn(entry) : 0;
      const ffmi = entry && bf > 0 ? calcFFMI(weight, bf, heightCm) : 0;

      // Expenditure needs a weight to work from; without one, leave it blank
      // rather than invent a number.
      const workoutCal = sessions
        .filter((s) => s.completed)
        .reduce((sum, s) => sum + num(s.estimatedCalories), 0);
      let out = 0;
      if (weight > 0) {
        const bmr = calcBMR(settings.sex, weight, heightCm, age);
        out = calcTDEE(bmr, entry?.activityLevel ?? nearestActivity(date)) + workoutCal;
      }
      const balance = eaten.cal > 0 && out > 0 ? eaten.cal - out : 0;

      const targets = targetsOn(date);

      const trained = sessions.map((s) => {
        const cardioMin = s.exercises.reduce((sum, ex) => sum + num(ex.cardioMinutes), 0);
        const parts = [templateName(s.templateId)];
        if (cardioMin > 0) parts.push(`${Math.round(cardioMin)}min cardio`);
        if (!s.completed) parts.push('INCOMPLETE');
        return parts.join(', ');
      });
      const training = trained.length > 0 ? trained.join(' + ') : 'rest';

      summary += [
        date,
        // Only ever show a weight the user actually logged. `weight` above may
        // be interpolated, which is fine for driving the expenditure maths but
        // would be a number the weight chart never plots.
        cell(num(entry?.weightKg), 1),
        cell(get7DayAvgWeight(bodyEntries, date) ?? 0, 1),
        cell(bf, 1),
        cell(ffmi, 1),
        cell(eaten.cal),
        cell(num(targets?.calories)),
        cell(out),
        cell(balance),
        cell(eaten.p),
        cell(num(targets?.proteinG)),
        cell(eaten.c),
        cell(eaten.f),
        cell(eaten.sugar),
        cell(eaten.fiber),
        training,
      ].join(' | ') + '\n';
    }

    // Days inside the logged range with nothing at all — distinguishes
    // "rest day" (logged food, no workout) from "didn't log anything".
    const missing: string[] = [];
    const logged = new Set(loggedDates);
    for (let d = loggedDates[0]; d <= today; d = shiftDays(d, 1)) {
      if (!logged.has(d)) missing.push(d);
    }
    if (missing.length > 0) {
      summary += `\nUNLOGGED DAYS (no body, food or workout entry — ${missing.length} of ${missing.length + loggedDates.length} days in range):\n  ${compressDateRanges(missing).join(', ')}\n`;
    }
  }

  // ── Recent detail window ───────────────────────────────────────────────
  const detailCutoff = shiftDays(today, -DETAIL_WINDOW_DAYS);
  const detailMealDates = [...mealsByDate.keys()].filter((d) => d >= detailCutoff).sort().reverse();

  if (detailMealDates.length > 0) {
    summary += `\nMEAL DETAIL (individual meals, last ${DETAIL_WINDOW_DAYS} days only — older days appear in the daily table above):\n`;
    for (const date of detailMealDates) {
      summary += `  ${date}:\n`;
      for (const m of mealsByDate.get(date)!) {
        summary += `    [${m.mealType}] ${m.name}: ${m.calories} kcal, P${m.proteinG}g C${m.carbsG}g F${m.fatG}g${m.quantityG ? ` (${m.quantityG}g)` : ''}\n`;
      }
    }
  }

  const detailSessions = workoutSessions
    .filter((s) => s.date >= detailCutoff)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (detailSessions.length > 0) {
    summary += `\nWORKOUT DETAIL (every set, last ${DETAIL_WINDOW_DAYS} days only):\n`;
    for (const session of detailSessions) {
      const time = `${session.startTime?.slice(11, 16) || '?'}–${session.endTime?.slice(11, 16) || '?'}`;
      summary += `  ${session.date} "${templateName(session.templateId)}" (${session.estimatedCalories} kcal, ${time})${session.completed ? '' : ' [INCOMPLETE — abandoned partway]'}:\n`;
      for (const exSession of session.exercises) {
        const exercise = exercises.find((e) => e.id === exSession.exerciseId);
        if (exercise?.isCardio) {
          summary += `    ${exerciseName(exSession.exerciseId)}: ${exSession.cardioMinutes || 0} min${exSession.estimatedCalories ? `, ${exSession.estimatedCalories} kcal` : ''}\n`;
        } else {
          const done = exSession.sets.filter((s) => s.completed);
          const skipped = exSession.sets.length - done.length;
          const orm = getBestOneRepMax(exSession.sets);
          summary += `    ${exerciseName(exSession.exerciseId)}: ${done.map((s) => `${s.reps}x${s.loadKg}kg`).join(', ') || 'no sets completed'}`
            + `${skipped > 0 ? ` (${skipped} set${skipped === 1 ? '' : 's'} not completed)` : ''}`
            + `${orm > 0 ? ` (est. 1RM: ${orm}kg)` : ''}\n`;
        }
      }
    }
  }

  // ── Strength progression across all history ────────────────────────────
  // Replaces set-by-set dumps for older sessions: one estimated-1RM series per
  // exercise is what actually shows whether training is progressing.
  const ormSeries = new Map<string, string[]>();
  const cardioSeries = new Map<string, string[]>();
  for (const session of [...workoutSessions].filter((s) => s.completed).sort((a, b) => a.date.localeCompare(b.date))) {
    for (const exSession of session.exercises) {
      const exercise = exercises.find((e) => e.id === exSession.exerciseId);
      const name = exerciseName(exSession.exerciseId);
      if (exercise?.isCardio) {
        const minutes = num(exSession.cardioMinutes);
        if (minutes <= 0) continue;
        if (!cardioSeries.has(name)) cardioSeries.set(name, []);
        cardioSeries.get(name)!.push(`${session.date}:${Math.round(minutes)}min`);
      } else {
        const orm = getBestOneRepMax(exSession.sets);
        if (orm <= 0) continue;
        const volume = exSession.sets
          .filter((s) => s.completed)
          .reduce((sum, s) => sum + num(s.reps) * num(s.loadKg), 0);
        if (!ormSeries.has(name)) ormSeries.set(name, []);
        ormSeries.get(name)!.push(`${session.date}:${orm}kg/${Math.round(volume)}kg`);
      }
    }
  }

  if (ormSeries.size > 0) {
    summary += `\nSTRENGTH PROGRESSION (all history, oldest first). Format — date:estimated1RM/totalVolume:\n`;
    ormSeries.forEach((points, name) => {
      summary += `  ${name}: ${points.join(', ')}\n`;
    });
  }

  if (cardioSeries.size > 0) {
    summary += `\nCARDIO HISTORY (all history, oldest first). Format — date:minutes:\n`;
    cardioSeries.forEach((points, name) => {
      summary += `  ${name}: ${points.join(', ')}\n`;
    });
  }

  // ── Templates ──────────────────────────────────────────────────────────
  if (workoutTemplates.length > 0) {
    summary += `\nWORKOUT TEMPLATES (${workoutTemplates.length}) — the planned routines:\n`;
    for (const t of workoutTemplates) {
      summary += `  "${t.name}":\n`;
      for (const e of t.exercises) {
        summary += `    ${exerciseName(e.exerciseId)}: ${e.sets}x${e.defaultReps}@${e.defaultLoadKg}kg${e.notes ? ` — note: ${e.notes}` : ''}\n`;
      }
    }
  }

  return summary;
}

/** "2.4 pp above" / "on target" — for stating distance to a goal. */
function fmtGap(delta: number, over: string, under: string): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return 'on target';
  return rounded > 0 ? `${rounded} ${over}` : `${Math.abs(rounded)} ${under}`;
}

const SYSTEM_PROMPT = (dataSummary: string) =>
  `You are an AI fitness and nutrition assistant inside "Olistic", a personal health tracking app. You have access to the user's complete logged data below. Use this data to give personalized feedback, insights, recommendations, or just chat.

IMPORTANT RULES:
- All dates in the data are in YYYY-MM-DD format (e.g. 2026-04-23 = April 23, 2026). Read them carefully, especially the year.
- Only state facts that are directly supported by the data. Do not guess or assume values not present.
- Be concise and helpful. Use the data to back up your points when relevant.
- Use metric units unless the user's settings indicate imperial.

HOW THE DATA IS ORGANISED:
- DAILY SUMMARY is the main table: one row per logged day, most recent first, covering the entire history. Prefer it for any trend, average, or adherence question — the values are precomputed and match what the app's Analytics tab plots, so use them as given rather than recalculating from raw entries.
- A blank cell means not logged or not computable. Do not read a blank as zero.
- 'bal' is caloric balance: negative = deficit, positive = surplus. The user's target balance is in USER PROFILE and uses the same sign convention.
- 'out' already includes workout calories, so balance is complete as given.
- MEAL DETAIL and WORKOUT DETAIL only cover the last 30 days. Older days are still fully represented in the DAILY SUMMARY table — if asked about an older day, use the table and do not say the data is missing.
- STRENGTH PROGRESSION covers all history as estimated 1RM and total volume per exercise per session. Use it for progression questions rather than the 30-day detail.
- 'rest' in the training column means the day was logged but no workout was done. Days in UNLOGGED DAYS have no entries at all — that is missing data, not a rest day. Keep the two distinct.
- Sessions marked INCOMPLETE were started and abandoned; their calories are excluded from 'out'.

You can:
- Analyze trends in weight, body composition, nutrition, and workouts
- Suggest improvements to training or diet
- Answer fitness/nutrition questions with context from their data
- Give encouragement and accountability
- Calculate or estimate things based on their logged data

--- USER DATA ---
${dataSummary}`;

export interface ChatOptions {
  /** Called with each chunk of the reply as it streams in. */
  onText?: (chunk: string) => void;
  signal?: AbortSignal;
}

export async function sendChatMessage(
  apiKey: string,
  provider: AiProvider,
  messages: ChatMessage[],
  dataSummary: string,
  claudeModel: ClaudeModel = 'claude-sonnet-4-6',
  options: ChatOptions = {},
): Promise<string> {
  const systemPrompt = SYSTEM_PROMPT(dataSummary);

  if (provider === 'gemini') {
    return geminiChat(apiKey, systemPrompt, messages, options);
  }
  return claudeChat(apiKey, systemPrompt, messages, claudeModel, options);
}

function claudeChat(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  model: ClaudeModel = 'claude-sonnet-4-6',
  options: ChatOptions = {},
): Promise<string> {
  return streamClaudeText({
    apiKey,
    model,
    system: systemPrompt,
    messages,
    // Models with adaptive thinking on by default spend max_tokens on
    // thinking before writing any text, so this has to be generous.
    maxTokens: 16000,
    // The data summary is identical across turns in a conversation, so cache
    // it rather than re-reading tens of thousands of tokens every message.
    cacheSystem: true,
    onText: options.onText,
    signal: options.signal,
  });
}

async function geminiChat(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
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
      signal: options.signal,
    },
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (text) options.onText?.(text);
  return text;
}

export { buildDataSummary };
