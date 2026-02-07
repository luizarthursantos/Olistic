import * as XLSX from 'xlsx';

const STORAGE_PREFIX = 'olistic_';

interface SheetDef {
  key: string;
  sheetName: string;
  isArray: boolean;
  /** Columns that hold JSON-serialized nested data */
  jsonCols?: string[];
}

const SHEETS: SheetDef[] = [
  { key: 'settings', sheetName: 'Settings', isArray: false },
  { key: 'bodyEntries', sheetName: 'Body Entries', isArray: true },
  { key: 'macroTargets', sheetName: 'Macro Targets', isArray: true },
  { key: 'foodItems', sheetName: 'Food Items', isArray: true },
  { key: 'mealEntries', sheetName: 'Meals', isArray: true },
  { key: 'exercises', sheetName: 'Exercises', isArray: true },
  { key: 'workoutTemplates', sheetName: 'Workout Templates', isArray: true, jsonCols: ['exercises'] },
  { key: 'workoutSessions', sheetName: 'Workout Sessions', isArray: true, jsonCols: ['exercises'] },
  { key: 'analyticsCharts', sheetName: 'Analytics Charts', isArray: true, jsonCols: ['metrics'] },
];

export function exportToXlsx(): Uint8Array {
  const wb = XLSX.utils.book_new();

  for (const sheet of SHEETS) {
    const raw = localStorage.getItem(STORAGE_PREFIX + sheet.key);
    if (!raw) continue;

    try {
      const data = JSON.parse(raw);
      let rows: Record<string, unknown>[];

      if (sheet.isArray) {
        rows = (data as Record<string, unknown>[]).map((row) => {
          const flat = { ...row };
          if (sheet.jsonCols) {
            for (const col of sheet.jsonCols) {
              if (flat[col] !== undefined) {
                flat[col] = JSON.stringify(flat[col]);
              }
            }
          }
          // Convert booleans to strings for readability
          for (const [k, v] of Object.entries(flat)) {
            if (typeof v === 'boolean') flat[k] = v ? 'TRUE' : 'FALSE';
          }
          return flat;
        });
      } else {
        // Settings: single object → one row of key-value
        const flat: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
          if (typeof v === 'boolean') flat[k] = v ? 'TRUE' : 'FALSE';
          else flat[k] = v;
        }
        rows = [flat];
      }

      if (rows.length === 0) {
        // Create empty sheet with headers from type info
        const ws = XLSX.utils.aoa_to_sheet([[]]);
        XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
      } else {
        const ws = XLSX.utils.json_to_sheet(rows);
        // Auto-size columns
        const colWidths = Object.keys(rows[0]).map((key) => {
          const maxLen = Math.max(
            key.length,
            ...rows.map((r) => String(r[key] ?? '').length)
          );
          return { wch: Math.min(maxLen + 2, 50) };
        });
        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
      }
    } catch {
      // skip malformed data
    }
  }

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

export function importFromXlsx(buffer: ArrayBuffer): boolean {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });

    for (const sheet of SHEETS) {
      const ws = wb.Sheets[sheet.sheetName];
      if (!ws) continue;

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      if (rows.length === 0) continue;

      let data: unknown;

      if (sheet.isArray) {
        data = rows.map((row) => {
          const restored: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(row)) {
            restored[k] = parseCell(v, sheet.jsonCols?.includes(k) ?? false);
          }
          return restored;
        });
      } else {
        // Settings: single row → object
        const restored: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rows[0])) {
          restored[k] = parseCell(v, false);
        }
        data = restored;
      }

      localStorage.setItem(STORAGE_PREFIX + sheet.key, JSON.stringify(data));
    }

    return true;
  } catch {
    return false;
  }
}

function parseCell(value: unknown, isJsonCol: boolean): unknown {
  if (value === 'TRUE') return true;
  if (value === 'FALSE') return false;

  if (isJsonCol && typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}
