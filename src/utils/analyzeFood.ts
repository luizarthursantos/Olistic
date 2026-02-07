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

export async function analyzeFoodDescription(
  apiKey: string,
  description: string,
): Promise<FoodAnalysisResult[]> {
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
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Estimate the nutritional content of this food/meal based on the description:

"${description}"

Return ONLY a JSON array (no markdown, no explanation) of food items with this structure:
[{"name": "Food name", "quantityG": 0, "calories": 0, "proteinG": 0, "carbsG": 0, "fatG": 0, "sugarG": 0, "fiberG": 0}]

Rules:
- All numbers should be integers (round to nearest whole number)
- quantityG is the estimated weight in grams of the portion
- calories should be the total kcal value for that portion
- If multiple items are described, return one entry per item
- If it's a single dish, return one entry
- Use the portion sizes mentioned, or reasonable defaults if not specified
- Be as accurate as possible with your nutritional estimates`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse food data from response');
  }

  const items: FoodAnalysisResult[] = JSON.parse(jsonMatch[0]);
  return items.map((item) => ({
    name: String(item.name || 'Unknown food'),
    quantityG: Math.round(Number(item.quantityG) || 0),
    calories: Math.round(Number(item.calories) || 0),
    proteinG: Math.round(Number(item.proteinG) || 0),
    carbsG: Math.round(Number(item.carbsG) || 0),
    fatG: Math.round(Number(item.fatG) || 0),
    sugarG: Math.round(Number(item.sugarG) || 0),
    fiberG: Math.round(Number(item.fiberG) || 0),
  }));
}

export async function analyzeFoodPhoto(
  apiKey: string,
  imageBase64: string,
  mediaType: string,
  description?: string,
): Promise<FoodAnalysisResult[]> {
  const descriptionHint = description
    ? `\n\nThe user provided this description of the image: "${description}". Use this to improve your analysis.`
    : '';

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
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Analyze this food image. It could be a photo of food/meal or a nutritional facts label/table.

If it's a photo of food: estimate the nutritional content based on what you see, including reasonable portion sizes.
If it's a nutritional label: extract the exact values shown.

Return ONLY a JSON array (no markdown, no explanation) of food items with this structure:
[{"name": "Food name", "quantityG": 0, "calories": 0, "proteinG": 0, "carbsG": 0, "fatG": 0, "sugarG": 0, "fiberG": 0}]

Rules:
- All numbers should be integers (round to nearest whole number)
- quantityG is the estimated weight in grams of the portion
- calories should be the total kcal value for that portion
- If multiple items are visible, return one entry per item
- If it's a single dish, return one entry
- Use reasonable portion estimates for a single serving
- Be as accurate as possible${descriptionHint}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // Extract JSON from the response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse food data from response');
  }

  const items: FoodAnalysisResult[] = JSON.parse(jsonMatch[0]);
  return items.map((item) => ({
    name: String(item.name || 'Unknown food'),
    quantityG: Math.round(Number(item.quantityG) || 0),
    calories: Math.round(Number(item.calories) || 0),
    proteinG: Math.round(Number(item.proteinG) || 0),
    carbsG: Math.round(Number(item.carbsG) || 0),
    fatG: Math.round(Number(item.fatG) || 0),
    sugarG: Math.round(Number(item.sugarG) || 0),
    fiberG: Math.round(Number(item.fiberG) || 0),
  }));
}
