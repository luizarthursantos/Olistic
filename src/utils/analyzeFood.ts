import { AiProvider } from '../types';

export interface FoodAnalysisResult {
  name: string;
  quantityG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
  fiberG: number;
}

const FOOD_DESCRIPTION_PROMPT = (description: string, breakdown: boolean) =>
  `Estimate the nutritional content of this food/meal based on the description:

"${description}"

Return ONLY a JSON array (no markdown, no explanation) of food items with this structure:
[{"name": "Food name", "quantityG": 0, "calories": 0, "proteinG": 0.0, "carbsG": 0.0, "fatG": 0.0, "sugarG": 0.0, "fiberG": 0.0}]

Rules:
- quantityG and calories should be integers
- proteinG, carbsG, fatG, sugarG, fiberG should use one decimal place (e.g. 12.5)
- quantityG is the estimated weight in grams of the portion
- calories should be the total kcal value for that portion
${breakdown
    ? '- Break down the meal into individual components, returning one entry per item'
    : '- Combine everything into a single entry with summed totals'}
- Use the portion sizes mentioned, or reasonable defaults if not specified
- Be as accurate as possible with your nutritional estimates`;

const FOOD_PHOTO_PROMPT = (descriptionHint: string, breakdown: boolean) =>
  `Analyze this food image. It could be a photo of food/meal or a nutritional facts label/table.

If it's a photo of food: estimate the nutritional content based on what you see, including reasonable portion sizes.
If it's a nutritional label: extract the exact values shown.

Return ONLY a JSON array (no markdown, no explanation) of food items with this structure:
[{"name": "Food name", "quantityG": 0, "calories": 0, "proteinG": 0.0, "carbsG": 0.0, "fatG": 0.0, "sugarG": 0.0, "fiberG": 0.0}]

Rules:
- quantityG and calories should be integers
- proteinG, carbsG, fatG, sugarG, fiberG should use one decimal place (e.g. 12.5)
- quantityG is the estimated weight in grams of the portion
- calories should be the total kcal value for that portion
${breakdown
    ? '- Break down the meal into individual components, returning one entry per item'
    : '- Combine everything into a single entry with summed totals'}
- Use reasonable portion estimates for a single serving
- Be as accurate as possible${descriptionHint}`;

function parseResults(text: string): FoodAnalysisResult[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse food data from response');
  }
  const items: FoodAnalysisResult[] = JSON.parse(jsonMatch[0]);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return items.map((item) => ({
    name: String(item.name || 'Unknown food'),
    quantityG: Math.round(Number(item.quantityG) || 0),
    calories: Math.round(Number(item.calories) || 0),
    proteinG: round1(Number(item.proteinG) || 0),
    carbsG: round1(Number(item.carbsG) || 0),
    fatG: round1(Number(item.fatG) || 0),
    sugarG: round1(Number(item.sugarG) || 0),
    fiberG: round1(Number(item.fiberG) || 0),
  }));
}

// ── Claude ──

async function claudeTextRequest(apiKey: string, prompt: string): Promise<string> {
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
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error (${response.status}): ${error}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function claudePhotoRequest(
  apiKey: string,
  imageBase64: string,
  mediaType: string,
  prompt: string,
): Promise<string> {
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
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error (${response.status}): ${error}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

// ── Gemini ──

async function geminiTextRequest(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function geminiPhotoRequest(
  apiKey: string,
  imageBase64: string,
  mediaType: string,
  prompt: string,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mediaType, data: imageBase64 } },
            { text: prompt },
          ],
        }],
      }),
    },
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Public API ──

export async function analyzeFoodDescription(
  apiKey: string,
  description: string,
  provider: AiProvider = 'claude',
  breakdown = false,
): Promise<FoodAnalysisResult[]> {
  const prompt = FOOD_DESCRIPTION_PROMPT(description, breakdown);
  const text = provider === 'gemini'
    ? await geminiTextRequest(apiKey, prompt)
    : await claudeTextRequest(apiKey, prompt);
  return parseResults(text);
}

export async function analyzeFoodPhoto(
  apiKey: string,
  imageBase64: string,
  mediaType: string,
  description?: string,
  provider: AiProvider = 'claude',
  breakdown = false,
): Promise<FoodAnalysisResult[]> {
  const descriptionHint = description
    ? `\n\nThe user provided this description of the image: "${description}". Use this to improve your analysis.`
    : '';
  const prompt = FOOD_PHOTO_PROMPT(descriptionHint, breakdown);
  const text = provider === 'gemini'
    ? await geminiPhotoRequest(apiKey, imageBase64, mediaType, prompt)
    : await claudePhotoRequest(apiKey, imageBase64, mediaType, prompt);
  return parseResults(text);
}
