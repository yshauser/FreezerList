
// src/lib/errors.ts (new helper)
export function toErrorString(e: unknown): string {
  if (!e) return 'Unknown error';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || String(e);
  try {
    // If it's a plain object (e.g., payload from GIS), stringify safely
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}