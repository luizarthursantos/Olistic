const STORAGE_PREFIX = 'olistic_';

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

export function exportAllData(): string {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        data[key.replace(STORAGE_PREFIX, '')] = JSON.parse(localStorage.getItem(key)!);
      } catch {
        data[key.replace(STORAGE_PREFIX, '')] = localStorage.getItem(key);
      }
    }
  }
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString) as Record<string, unknown>;
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    }
    return true;
  } catch {
    return false;
  }
}
