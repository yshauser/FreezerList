
// src/lib/sheetsClient.ts
import type { Entry, Category } from '../types';

export type SheetsConfig = {
  spreadsheetId: string;
  sheetName: string; // e.g., 'list'
};

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
type Header = typeof HEADERS[number];

// Convert Hebrew cell value to boolean:
// "כן" => true, "לא" => false, otherwise undefined
function hebToBool(s: any): boolean | undefined {
  const v = String(s ?? '').trim();
  if (v === 'כן') return true;
  if (v === 'לא') return false;
  return undefined;
}

// Convert boolean to Hebrew cell value:
// true => "כן", false => "לא"
function boolToHeb(b: boolean | undefined): string {
  if (b === true) return 'כן';
  if (b === false) return 'לא';
  return ''; // empty if undefined; change to 'לא' if you prefer default false
}

function toNum(s: any): number {
  const n = Number(String(s ?? '').replace(',', '.'));
  return isFinite(n) ? n : NaN;
}

export async function getSheetId(spreadsheetId: string, sheetName: string): Promise<number> {
//  console.log ('debug - in get sheet id', {spreadsheetId, sheetName})
  const resp = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId });
  const sheets = resp.result?.sheets ?? [];
  const found = sheets.find((s: any) => s.properties?.title === sheetName);
  if (!found) throw new Error(`Sheet "${sheetName}" not found`);
//   console.log ('debug - properties', {resp,found})
  return found.properties.sheetId;
}

export async function readEntries(cfg: SheetsConfig): Promise<Entry[]> {
  const range = `${cfg.sheetName}!A1:I`; // 9 columns
  const resp = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: cfg.spreadsheetId,
    range,
  });
  const values: any[][] = resp.result?.values ?? [];
  if (values.length === 0) return [];

  const rows = values.slice(1); // skip header
  return rows.map((row) => {
    const record: Record<Header, any> = {
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
    return record as Entry;
  });
}

export async function appendEntry(cfg: SheetsConfig, entry: Omit<Entry, 'id'> & { id?: string }) {
  const id = entry.id ?? crypto.randomUUID();
  const range = `${cfg.sheetName}!A:I`;
  const body = {
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
  };
  const query = {
    spreadsheetId: cfg.spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED', // parse like UI input
  };
  await window.gapi.client.sheets.spreadsheets.values.append(query, body);
  return {id};
}

export async function updateEntryById(cfg: SheetsConfig, sheetId: number, id: string, entry: Entry) {
    console.log ('debug - update Entry by ID inputs', {cfg, sheetId,id,entry});
  // Locate row by scanning column A (id)
  const idsResp = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: cfg.spreadsheetId,
    range: `${cfg.sheetName}!A:A`,
  });
  const ids: any[][] = idsResp.result?.values ?? [];
  const rowIndex1Based = ids
    .map((v, i) => ({ v: v[0], row: i + 1 }))
    .find(x => x.v === id)?.row;

  if (!rowIndex1Based || rowIndex1Based < 2) throw new Error('id not found');

  const a1 = `${cfg.sheetName}!A${rowIndex1Based}:I${rowIndex1Based}`;
  const body = {
    range: a1,
    majorDimension: 'ROWS',
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
  };
  await window.gapi.client.sheets.spreadsheets.values.update(
    {
      spreadsheetId: cfg.spreadsheetId,
      range: a1,
      valueInputOption: 'USER_ENTERED',
    },
    body
  );
}

export async function deleteEntryById(cfg: SheetsConfig, sheetId: number, id: string) {
  // Find row number (1-based) in column A
  console.log ('debug - delete by id inputs', {cfg, sheetId, id })
  const idsResp = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: cfg.spreadsheetId,
    range: `${cfg.sheetName}!A:A`,
  });
  const ids: any[][] = idsResp.result?.values ?? [];
  const rowIndex1Based = ids
    .map((v, i) => ({ v: v[0], row: i + 1 }))
    .find(x => x.v === id)?.row;

  if (!rowIndex1Based || rowIndex1Based < 2) throw new Error('id not found');

  // DeleteDimensionRequest is zero-based: start = row-1, end = row
  const startIndex = rowIndex1Based - 1;
  const endIndex = rowIndex1Based;

  const batch = {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex,
            endIndex,
          },
        },
      },
    ],
  };

  await window.gapi.client.sheets.spreadsheets.batchUpdate(
    { spreadsheetId: cfg.spreadsheetId },
    batch
  );
}
