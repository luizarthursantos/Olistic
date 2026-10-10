// Discovers which Claude models the user's API key can use, via the Models
// API (GET /v1/models), so new releases can be picked in Settings without an
// app update. Raw fetch, matching how the rest of the app calls the API.

import { ClaudeModelOption } from '../types';

const MODELS_URL = 'https://api.anthropic.com/v1/models';

interface ModelsPage {
  data: { id: string; display_name?: string; created_at?: string }[];
  has_more: boolean;
  last_id: string | null;
}

/** Every model the key can use, newest first (the API's own order). */
export async function fetchClaudeModels(apiKey: string): Promise<ClaudeModelOption[]> {
  const models: ClaudeModelOption[] = [];
  let afterId: string | null = null;

  // The endpoint is paginated; follow it rather than assume one page covers it.
  for (let page = 0; page < 20; page++) {
    const url = new URL(MODELS_URL);
    url.searchParams.set('limit', '100');
    if (afterId) url.searchParams.set('after_id', afterId);

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Your Claude API key was rejected. Check it in the field below.');
      const body = await response.text();
      let message = body;
      try { message = JSON.parse(body)?.error?.message || body; } catch { /* keep raw body */ }
      throw new Error(`Could not list models (${response.status}): ${message}`);
    }

    const json = (await response.json()) as ModelsPage;
    for (const m of json.data) models.push({ id: m.id, label: m.display_name || m.id });
    if (!json.has_more || !json.last_id) break;
    afterId = json.last_id;
  }

  return models;
}

export interface ModelListMerge {
  models: ClaudeModelOption[];
  added: ClaudeModelOption[];
  /** Already in the list but not offered by the API for this key. */
  notOffered: ClaudeModelOption[];
}

/**
 * Additive merge: models the API offers come first in its order, and anything
 * already in the list is kept even if the API no longer offers it — removing
 * the model someone has selected would be worse than a stale entry.
 */
export function mergeModelLists(current: ClaudeModelOption[], fetched: ClaudeModelOption[]): ModelListMerge {
  const currentIds = new Set(current.map((m) => m.id));
  const fetchedIds = new Set(fetched.map((m) => m.id));
  return {
    models: [...fetched, ...current.filter((m) => !fetchedIds.has(m.id))],
    added: fetched.filter((m) => !currentIds.has(m.id)),
    notOffered: current.filter((m) => !fetchedIds.has(m.id)),
  };
}
