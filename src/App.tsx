// src/App.tsx
import { useEffect, useState } from 'react';
import './styles.css';
import type { Entry, EntryDraft } from './types';
import { toErrorString } from './lib/errors';
import { VersionBadge } from './components/VersionBadge';

import { AddProductWizard } from './components/AddProductWizard';
import { checkAuthStatus, readEntries, appendEntry, updateEntryById, deleteEntryById } from './lib/apiClient';
import { SheetTable } from './components/SheetTable';
import { EntryForm } from './components/EntryForm';

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState('טוען…');
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);

  async function boot() {
    try {
      setStatus('בודק אימות…');
      
      // Check if authenticated with backend
      const { authenticated } = await checkAuthStatus();
      
      if (!authenticated) {
        // Redirect to OAuth login
        window.location.href = '/auth/login';
        return;
      }
      // Load data
      await reload();
    } catch (e: any) {
      console.error(e);
      setError(toErrorString(e));
      setStatus('שגיאה באתחול.');
    }
  }

  async function reload() {
    try {
      setStatus('טוען נתונים…');
      const es = await readEntries();
      console.log ('debug - full loaded data', {es})
      setEntries(es);
      setStatus(`נטענו ${es.length} שורות.`);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(toErrorString(e));
      setStatus('נכשלה טעינת הנתונים.');
    }
  }

  useEffect(() => {
    boot(); // הפעלה חד־פעמית
  }, []);

  const openAdd = () => setAddOpen(true);
  const openEdit = (e: Entry) => { setEditing(e); setFormOpen(true); };

  const onApply = async (draft: EntryDraft) => {
    try {
      setStatus('שומר…');
      if (draft.id) {
        // עריכה
        await updateEntryById(draft.id, draft as Entry);
      } else {
        // הוספה
        await appendEntry({
          product: draft.product,
          category: draft.category,
          date: draft.date,
          amount: draft.amount,
          units: draft.units,
          cleanState: draft.cleanState,
          skinState: draft.skinState,
          comments: draft.comments,
        });
      }
      setFormOpen(false);
      await reload();
    } catch (e: any) {
      console.error(e);
      setError(toErrorString(e));
      setStatus('שגיאה בשמירה.');
    }
  };

async function onAddComplete(draft: EntryDraft) {
  try {
    setStatus('שומר…');
    await appendEntry({
      product: draft.product,
      category: draft.category,
      date: draft.date,
      amount: draft.amount,
      units: draft.units,
      cleanState: draft.cleanState,
      skinState: draft.skinState,
      comments: draft.comments,
    });
    setAddOpen(false);
    await reload();
  } catch (e: any) {
    console.error(e);
    setError(e?.result?.error?.message ?? e?.message ?? String(e));
    setStatus('שגיאה בשמירה.');
  }
}

  const onDelete = async (e: Entry) => {
    console.log ('debug entry', {e})
    if (!e.id) {
      alert('Cannot delete: missing id.');
      return;
    }
    const ok = confirm(`למחוק את "${e.product}"?`);
    if (!ok) return;
    try {
      setStatus('מוחק…');
      await deleteEntryById(e.id);
      await reload();
    } catch (err: any) {
      console.error(err);
      setError(toErrorString(err));
      setStatus('שגיאה במחיקה.');
    }
  };

  const onQuickAdjust = async (entry: Entry, delta: number) => {
    try {
      // optimistic UI
      setEntries(prev => prev.map(e => {
        if (e.id === entry.id) {
          const next = Math.max(0, (isNaN(e.amount) ? 0 : e.amount) + delta);
          return { ...e, amount: next };
        }
        return e;
      }));

      // persist
      const newAmount = Math.max(0, (isNaN(entry.amount) ? 0 : entry.amount) + delta);
      const updated: Entry = { ...entry, amount: newAmount };
      await updateEntryById(entry.id, updated);

      // optional: refresh from server (not strictly needed)
      // await reload();
    } catch (e: any) {
      console.error(e);
      setError(e?.result?.error?.message ?? e?.message ?? String(e));
      setStatus('שגיאה בעדכון.');
      // revert optimistic change if needed
      await reload();
    }
  };

  return (
    <>
    <main className="container" dir="rtl">
      <header className="app-header">
        <h1>המקפיא שלי</h1>
        <div className="spacer" />
        <button className="btn-primary" onClick={openAdd}>הוסף מוצר</button>
      </header>

      {error ? <div className="error">שגיאה: {error}</div> : <div className="status">{status}</div>}

      {entries.length > 0 && (
        <SheetTable
          entries={entries}
          onEdit={openEdit}
          onDelete={onDelete}
          onQuickAdjust={onQuickAdjust}
        />
      )}
      <AddProductWizard
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onComplete={onAddComplete}
      />
      <EntryForm
        open={formOpen}
        initial={editing}
        onCancel={() => setFormOpen(false)}
        onApply={onApply}
      />    
    </main>
        <VersionBadge />
      </>
  );
}
