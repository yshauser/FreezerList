
// src/App.tsx
import { useEffect, useState } from 'react';
import './styles.css';
import type { Entry } from './types';
import { toErrorString } from './lib/errors';

import { initGapiClient, initTokenClient, ensureSignedIn } from './lib/googleAuth'; //signOut
import { readEntries, appendEntry, updateEntryById, deleteEntryById, getSheetId } from './lib/sheetsClient';

import { SheetTable } from './components/SheetTable';
import { EntryForm, type EntryDraft } from './components/EntryForm';

const SPREADSHEET_ID = '1cATOOjCiKx5VUKsn7CrjY6_-SiCh0RYu_HMJPZ9Lz78';
const SHEET_NAME = 'list';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID!;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY!;

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState('טוען…');
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | undefined>(undefined);
  const [sheetId, setSheetId] = useState<number | null>(null);


async function boot() {
  try {
    setStatus('מאתחל לקוח Google…');
    await initGapiClient(API_KEY);
    initTokenClient(CLIENT_ID);

    // decide prompt mode: 'consent' for first-ever, '' for silent refreshes
    const hasConsented = localStorage.getItem('gsheets_consent_done') === 'yes';
    // console.log ('debug - consent', {hasConsented})
    await ensureSignedIn(hasConsented ? '' : 'consent');

    // mark consent so next reloads can be silent
    localStorage.setItem('gsheets_consent_done', 'yes');
    const sid = await getSheetId(SPREADSHEET_ID, SHEET_NAME);
    setSheetId(sid);
    await reload();
    // console.log ('debug - sid after reload', {sheetId,sid});
  } catch (e: any) {
    console.error(e);
    setError(toErrorString(e));
    setStatus('שגיאה באתחול.');
  }
}

  async function reload() {
    try {
      setStatus('טוען נתונים…');
      const es = await readEntries({ spreadsheetId: SPREADSHEET_ID, sheetName: SHEET_NAME });
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

  const openAdd = () => { setEditing(undefined); setFormOpen(true); };
  const openEdit = (e: Entry) => { setEditing(e); setFormOpen(true); };

  const onApply = async (draft: EntryDraft) => {
    try {
      setStatus('שומר…');
      if (draft.id) {
        // עריכה
        if (sheetId == null) throw new Error('missing sheetId');
        await updateEntryById({ spreadsheetId: SPREADSHEET_ID, sheetName: SHEET_NAME }, sheetId, draft.id, draft as Entry);
      } else {
        // הוספה
        await appendEntry({ spreadsheetId: SPREADSHEET_ID, sheetName: SHEET_NAME }, {
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

  const onDelete = async (e: Entry) => {
    console.log ('debug entry', {e})
    if (!e.id || sheetId == null) {
      alert('Cannot delete: missing id or sheetId.');
      return;
    }
    const ok = confirm(`למחוק את "${e.product}"?`);
    if (!ok) return;
    try {
      setStatus('מוחק…');
      console.log ('debug - delete inputs', {SPREADSHEET_ID, SHEET_NAME, sheetId, e})
      await deleteEntryById({ spreadsheetId: SPREADSHEET_ID, sheetName: SHEET_NAME }, sheetId, e.id);
      await reload();
    } catch (err: any) {
      console.error(err);
      setError(toErrorString(err));
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
