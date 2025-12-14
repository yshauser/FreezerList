// Google Sheets API proxy - handles all Sheets operations
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import type { Entry, EntryDraft, Category } from './types.js';

const HEADERS = [
  'id',
  'product',
  'category',
  'date',
  'amount',
  'units',
  'cleanState',
  'skinState',
  'comments',
] as const;

// Convert Hebrew cell value to boolean
function hebToBool(s: any): boolean | undefined {
  const v = String(s ?? '').trim();
  if (v === 'כן') return true;
  if (v === 'לא') return false;
  return undefined;
}

// Convert boolean to Hebrew cell value
function boolToHeb(b: boolean | undefined): string {
  if (b === true) return 'כן';
  if (b === false) return 'לא';
  return '';
}

function toNum(s: any): number {
  const n = Number(String(s ?? '').replace(',', '.'));
  return isFinite(n) ? n : NaN;
}

// Get sheet ID by name
export async function getSheetId(
  oauth2Client: OAuth2Client,
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });
  
  const sheet = response.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  
  if (!sheet?.properties?.sheetId) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  
  return sheet.properties.sheetId;
}

// Read all entries from sheet
export async function readEntries(
  oauth2Client: OAuth2Client,
  spreadsheetId: string,
  sheetName: string
): Promise<Entry[]> {
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  const range = `${sheetName}!A1:I`;
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  
  const values = response.data.values ?? [];
  if (values.length === 0) return [];
  
  const rows = values.slice(1); // Skip header row
  
  return rows.map((row) => {
    const entry: Entry = {
      id: row[0] ?? '',
      product: row[1] ?? '',
      category: (row[2] ?? 'אחר') as Category,
      date: row[3] ?? '',
      amount: toNum(row[4]),
      units: row[5] ?? '',
      cleanState: hebToBool(row[6]),
      skinState: hebToBool(row[7]),
      comments: row[8] ?? '',
    };
    return entry;
  });
}

// Append new entry to sheet
export async function appendEntry(
  oauth2Client: OAuth2Client,
  spreadsheetId: string,
  sheetName: string,
  entry: EntryDraft
): Promise<{ id: string }> {
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  const id = entry.id ?? crypto.randomUUID();
  const range = `${sheetName}!A:I`;
  
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        id,
        entry.product,
        entry.category,
        entry.date ?? '',
        entry.amount ?? '',
        entry.units ?? '',
        boolToHeb(entry.cleanState),
        boolToHeb(entry.skinState),
        entry.comments ?? '',
      ]],
    },
  });
  
  return { id };
}

// Update entry by ID
export async function updateEntryById(
  oauth2Client: OAuth2Client,
  spreadsheetId: string,
  sheetName: string,
  id: string,
  entry: Entry
): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  
  // Find row by scanning column A
  const idsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:A`,
  });
  
  const ids = idsResponse.data.values ?? [];
  const rowIndex = ids.findIndex((row) => row[0] === id);
  
  if (rowIndex === -1 || rowIndex === 0) {
    throw new Error('Entry not found');
  }
  
  const rowNumber = rowIndex + 1; // Convert to 1-based
  const a1Range = `${sheetName}!A${rowNumber}:I${rowNumber}`;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: a1Range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        id,
        entry.product,
        entry.category,
        entry.date ?? '',
        entry.amount ?? '',
        entry.units ?? '',
        boolToHeb(entry.cleanState),
        boolToHeb(entry.skinState),
        entry.comments ?? '',
      ]],
    },
  });
}

// Delete entry by ID
export async function deleteEntryById(
  oauth2Client: OAuth2Client,
  spreadsheetId: string,
  sheetName: string,
  sheetId: number,
  id: string
): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  
  // Find row by scanning column A
  const idsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:A`,
  });
  
  const ids = idsResponse.data.values ?? [];
  const rowIndex = ids.findIndex((row) => row[0] === id);
  
  if (rowIndex === -1 || rowIndex === 0) {
    throw new Error('Entry not found');
  }
  
  // DeleteDimensionRequest uses 0-based indexing
  const startIndex = rowIndex;
  const endIndex = rowIndex + 1;
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex,
            endIndex,
          },
        },
      }],
    },
  });
}
