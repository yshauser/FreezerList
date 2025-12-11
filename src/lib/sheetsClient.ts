
// src/lib/sheetsClient.ts
import type { Entry, Category } from '../types';

export type SheetsConfig = {
  spreadsheetId: string;
  sheetName: string; // e.g., 'list'
};

const HEADERS = [
  'product',
  'category',
  'date',
  'amount',
  'units',
  'cleanState',
  'skinState',
  'comments',
  'id',
] as const;

type Header = typeof HEADERS[number];

function toBool(s: any): boolean | undefined {
  if (s === true || s === 'true' || s === '1' || s === 1) return true;
  if (s === false || s === 'false' || s === '0' || s === 0) return false;
  return undefined;
}
function toNum(s: any): number {
  const n = Number(String(s ?? '').replace(',', '.'));
  return isFinite(n) ? n : NaN;
}

export async function getSheetId(spreadsheetId: string, sheetName: string): Promise<number> {
  const resp = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId });
  const sheets = resp.result?.sheets ?? [];
  const found = sheets.find((s: any) => s.properties?.title === sheetName);
  if (!found) throw new Error(`Sheet "${sheetName}" not found`);
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
      product: row[0] ?? '',
      category: (row[1] ?? 'אחר') as Category,
      date: row[2] ?? '',
      amount: toNum(row[3]),
      units: row[4] ?? '',
      cleanState: toBool(row[5]),
      skinState: toBool(row[6]),
      comments: row[7] ?? '',
      id: row[8] ?? '',
    };
    return record as Entry;
  });
}

export async function appendEntry(cfg: SheetsConfig, entry: Omit<Entry, 'id'> & { id?: string }) {
  const id = entry.id ?? crypto.randomUUID();
  const range = `${cfg.sheetName}!A:I`;
  const body = {
    values: [[
      entry.product,
      entry.category,
      entry.date ?? '',
      entry.amount ?? '',
      entry.units ?? '',
      entry.cleanState ? 'true' : 'false',
      entry.skinState ? 'true' : 'false',
      entry.comments ?? '',
      id,
    ]],
  };
  const query = {
    spreadsheetId: cfg.spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED', // parse like UI input
  };
  await window.gapi.client.sheets.spreadsheets.values.append(query, body);
  return id;
}

export async function updateEntryById(cfg: SheetsConfig, sheetId: number, id: string, entry: Entry) {
    console.log ('update Entry by ID inputs', {cfg, sheetId,id,entry});
  // Locate row by scanning column I (id)
  const idsResp = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: cfg.spreadsheetId,
    range: `${cfg.sheetName}!I:I`,
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
      entry.product,
      entry.category,
      entry.date ?? '',
      entry.amount ?? '',
      entry.units ?? '',
      entry.cleanState ? 'true' : 'false',
      entry.skinState ? 'true' : 'false',
      entry.comments ?? '',
      id,
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
  // Find row number (1-based) in column I
  const idsResp = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: cfg.spreadsheetId,
    range: `${cfg.sheetName}!I:I`,
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
