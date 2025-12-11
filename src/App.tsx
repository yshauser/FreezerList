
// src/App.tsx
import { useEffect, useState } from 'react';
import './styles.css';

import { CSV_URL, fetchCsv, parseCsv, toEntries } from './lib/fetchSheet';
import type { Entry } from './types';
import { SheetTable } from './components/SheetTable';
import { EntryForm, type EntryDraft } from './components/EntryForm';
import { addEntry, updateEntry, deleteEntry } from './lib/sheetsApi';

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState('טוען…');
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | undefined>(undefined);

  async function reload() {
    try {
      setStatus('מוריד CSV…');
      const csvText = await fetchCsv(CSV_URL);
      setStatus('מפרש נתונים…');
      const rows = parseCsv(csvText);
      const ent = toEntries(rows);
      setEntries(ent);
      setStatus(`נטענו ${ent.length} שורות.`);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? String(e));
      setStatus('נכשלה טעינת הנתונים.');
    }
  }

  useEffect(() => { reload(); }, []);

  const openAdd = () => { setEditing(undefined); setFormOpen(true); };
  const openEdit = (e: Entry) => { setEditing(e); setFormOpen(true); };

  const onApply = async (draft: EntryDraft) => {
    try {
      setStatus('שומר…');
      if (draft.id) {
        // Edit
        const res = await updateEntry(draft as Entry);
        if (!res?.ok) throw new Error(res?.error ?? 'Update failed');
      } else {
        // Add
        const res = await addEntry({
          product: draft.product,
          category: draft.category,
          date: draft.date,
          amount: draft.amount,
          units: draft.units,
          cleanState: draft.cleanState,
          skinState: draft.skinState,
          comments: draft.comments,
        });
        if (!res?.ok) throw new Error(res?.error ?? 'Add failed');
      }
      setFormOpen(false);
      await reload();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? String(e));
      setStatus('שגיאה בשמירה.');
    }
  };

  const onDelete = async (e: Entry) => {
    if (!e.id) {
      alert('Cannot delete: missing id on row.');
      return;
    }
    const ok = confirm(`למחוק את "${e.product}"?`);
    if (!ok) return;
    try {
      setStatus('מוחק…');
      const res = await deleteEntry(e.id);
      if (!res?.ok) throw new Error(res?.error ?? 'Delete failed');
      await reload();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? String(err));
      setStatus('שגיאה במחיקה.');
    }
  };

  return (
    <main className="container" dir="rtl">
      <header className="app-header">
        <h1>המקפיא שלי</h1>
        <div className="spacer" />
        <button className="btn-primary" onClick={openAdd}>הוסף מוצר</button>
      </header>

      {error ? <div className="error">שגיאה: {error}</div> : <div className="status">{status}</div>}

      {entries.length > 0 && (
        <SheetTable entries={entries} onEdit={openEdit} onDelete={onDelete} />
      )}

      <EntryForm
        open={formOpen}
        initial={editing}
        onCancel={() => setFormOpen(false)}
        onApply={onApply}
      />
    </main>
   );
  }