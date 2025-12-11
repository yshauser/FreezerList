
// src/lib/sheetsApi.ts
import type { Entry } from '../types';

const APP_SCRIPT_URL = import.meta.env.VITE_SHEETS_WEBAPP_URL; 
// e.g. "https://script.google.com/macros/s/AKfycbx.../exec"

function postForm(data: Record<string, string>) {
  return fetch(APP_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data).toString(),
  }).then(async (res) => {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { ok: false, error: text }; }
  });
}

export async function addEntry(entry: Omit<Entry, 'id'>) {
  const payload = {
    action: 'add',
    product: entry.product,
    category: entry.category,
    date: entry.date ?? '',
       amount: String(entry.amount ?? ''),
    units: entry.units ?? '',
    cleanState: entry.cleanState ? 'true' : 'false',
    skinState: entry.skinState ? 'true' : 'false',
    comments: entry.comments ?? '',
  };
  return postForm(payload); // expects { ok:true, id:string }
}

export async function updateEntry(entry: Entry) {
  const payload = {
    action: 'edit',
    id: entry.id,
    product: entry.product,
    category: entry.category,
    date: entry.date ?? '',
    amount: String(entry.amount ?? ''),
    units: entry.units ?? '',
    cleanState: entry.cleanState ? 'true' : 'false',
    skinState: entry.skinState ? 'true' : 'false',
    comments: entry.comments ?? '',
  };
  return postForm(payload); // expects { ok:true }
}

export async function deleteEntry(id: string) {
  const payload = { action: 'delete', id };
  return postForm(payload); // expects { ok:true }
}