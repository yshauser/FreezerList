
// Apps Script bound to the spreadsheet
const SHEET_ID = '1nIsjXANpvYuj5gOBbbsLh0TEGwrN4V_O';
const SHEET_NAME = 'list';

/**
 * Helpers: ensure headers exist, find column indexes, etc.
 */
function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(SHEET_NAME);
}

function getHeaders(sheet) {
  const range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  const values = range.getValues()[0];
  return values.map(v => String(v).trim());
}

function findCol(headers, name) {
  const idx = headers.indexOf(name);
  if (idx < 0) throw new Error('Missing column: ' + name);
  return idx + 1; // 1-based
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Simple POST endpoint (no preflight): expects x-www-form-urlencoded body.
 * Fields: action = add|edit|delete
 */
function doPost(e) {
  try {
    const sheet = getSheet();
    const headers = getHeaders(sheet);

    const params = e.parameter || {};
    const action = String(params.action || '');

    if (action === 'add') {
      // Create an id if not provided
      const id = Utilities.getUuid();

      // Map fields in correct order (must match your header names)
      const row = [
        params.product || '',
        params.category || '',
        params.date || '',
        Number(params.amount || ''),
        params.units || '',
        params.cleanState === 'true',
        params.skinState === 'true',
        params.comments || '',
        id
      ];

      sheet.appendRow(row);
      return json({ ok: true, id });

    } else if (action === 'edit') {
      const id = String(params.id || '');
      if (!id) throw new Error('Missing id');

      // find row by id
           const idCol = findCol(headers, 'id');
      const dataRange = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1); // ids
      const ids = dataRange.getValues().map(r => String(r[0]).trim());
      const idx = ids.indexOf(id);
      if (idx < 0) throw new Error('id not found');

      const rowIndex = 2 + idx; // actual row in sheet
      // Write each field
      const map = {
        product: 'product', category: 'category', date: 'date', amount: 'amount',
        units: 'units', cleanState: 'cleanState', skinState: 'skinState', comments: 'comments'
      };

      Object.entries(map).forEach(([paramName, colName]) => {
        const col = findCol(headers, colName);
        let val = params[paramName] || '';
        if (colName === 'amount') val = Number(val || '');
        if (colName === 'cleanState' || colName === 'skinState') val = (val === 'true');
        sheet.getRange(rowIndex, col, 1, 1).setValue(val);
      });

      return json({ ok: true });

    } else if (action === 'delete') {
      const id = String(params.id || '');
      if (!id) throw new Error('Missing id');
      const idCol = findCol(headers, 'id');
      const dataRange = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1);
      const ids = dataRange.getValues().map(r => String(r[0]).trim());
      const idx = ids.indexOf(id);
      if (idx < 0) throw new Error('id not found');

      const rowIndex = 2 + idx;
      sheet.deleteRow(rowIndex);
      return json({ ok: true });

    } else {
      return json({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}