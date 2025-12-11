
// src/lib/fetchSheet.ts
import Papa from 'papaparse';
import type { Entry, Category } from '../types';

const VALID_CATEGORIES: Category[] = ['בשר', 'בצק', 'טבעול', 'אחר'];
const toCategory = (s?: string): Category =>
  (VALID_CATEGORIES as string[]).includes((s ?? '').trim()) ? (s as Category) : 'אחר';


export const SHEET_ID = '1cATOOjCiKx5VUKsn7CrjY6_-SiCh0RYu_HMJPZ9Lz78';
export const SHEET_NAME = 'list';
export const CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

export type Row = Record<string, string>;

export async function fetchCsv(url: string): Promise<string> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.text();
}

export function parseCsv(csvText: string): Row[] {
  const parsed = Papa.parse<Row>(csvText, {
    header: true,            // first row as headers
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  if (parsed.errors?.length) {
    console.warn('CSV parse warnings:', parsed.errors);
  }

  // Normalize: trim keys/values and drop empty rows
  const normalized = (parsed.data ?? [])
    .map(row => {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        const nk = (k ?? '').trim();
        const nv = (v ?? '').trim();
        if (nk.length) cleaned[nk] = nv;
      }
      return cleaned;
    })
    .filter(r => Object.values(r).some(v => v.length > 0));

  return normalized;
}

// Helpers to normalize values from strings:
const yesVals = new Set(['true', '1', 'yes', 'כן', 'y']);
const noVals  = new Set(['false', '0', 'no', 'לא', 'n']);

function toBool(s?: string): boolean | undefined {
  if (!s) return undefined;
  const t = s.trim().toLowerCase();
  if (yesVals.has(t)) return true;
  if (noVals.has(t)) return false;
  return undefined; // unknown
}

function toNum(s?: string): number {
  if (!s) return NaN;
  // normalize commas as decimal separators
  const n = Number(s.replace(',', '.'));
  return isFinite(n) ? n : NaN;
}

/** Convert parsed rows into typed entries (assumes columns exist). */
export function toEntries(rows: Row[]): Entry[] {
  return rows.map((r) => ({
    id: r.id ?? '', // must not be empty for edit/delete
    product: r.product ?? '',
    category: toCategory(r.category),
    date: r.date ?? '',
    amount: toNum(r.amount),
    units: r.units ?? '',
    cleanState: toBool(r.cleanState),
    skinState: toBool(r.skinState),
    comments: r.comments ?? '',
  }));
}

/** Group entries by category. */
export function groupByCategory(entries: Entry[]): Record<string, Entry[]> {
  return entries.reduce((acc, e) => {
    const key = e.category || '(ללא קטגוריה)';
    (acc[key] ??= []).push(e);
    return acc;
  }, {} as Record<string, Entry[]>);
}

