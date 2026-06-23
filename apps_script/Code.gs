/**
 * ARISE SYSTEM v33 - Google Sheets Server Sync
 */
const SPREADSHEET_ID_OR_URL = 'PASTE_GOOGLE_SHEET_URL_OR_ID_HERE';
const SHEET_NAME = 'arise_profiles';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    const playerId = String(body.playerId || '').trim();
    if (!playerId) throw new Error('playerId kosong');
    const sheet = getSheet_();
    if (action === 'save') {
      const state = body.state || {};
      const now = new Date().toISOString();
      upsert_(sheet, playerId, JSON.stringify(state), now);
      return json_({ ok: true, action, playerId, updatedAt: now });
    }
    if (action === 'load') {
      const found = find_(sheet, playerId);
      if (!found) return json_({ ok: true, action, playerId, state: null });
      return json_({ ok: true, action, playerId, state: JSON.parse(found.stateJson || '{}'), updatedAt: found.updatedAt });
    }
    throw new Error('Action tidak dikenal: ' + action);
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}
function getSheet_() {
  const ss = openSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['playerId', 'stateJson', 'updatedAt']);
  }
  return sheet;
}
function find_(sheet, playerId) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === playerId) return { row: i + 1, playerId: values[i][0], stateJson: values[i][1], updatedAt: values[i][2] };
  }
  return null;
}
function upsert_(sheet, playerId, stateJson, updatedAt) {
  const found = find_(sheet, playerId);
  if (found) {
    sheet.getRange(found.row, 2).setValue(stateJson);
    sheet.getRange(found.row, 3).setValue(updatedAt);
  } else sheet.appendRow([playerId, stateJson, updatedAt]);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


function openSpreadsheet_() {
  const raw = String(SPREADSHEET_ID_OR_URL || '').trim();
  if (!raw || raw === 'PASTE_GOOGLE_SHEET_URL_OR_ID_HERE') {
    throw new Error('SPREADSHEET_ID_OR_URL belum diisi. Isi dengan URL atau ID Google Sheet, bukan Apps Script ID.');
  }

  // Accept full Google Sheet URL or raw spreadsheet ID.
  const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const id = match ? match[1] : raw
    .replace(/^https?:\/\/docs\.google\.com\/spreadsheets\/d\//, '')
    .split('/')[0]
    .split('?')[0]
    .trim();

  if (!/^[a-zA-Z0-9-_]{20,}$/.test(id)) {
    throw new Error('Spreadsheet ID tidak valid: ' + id + '. Pakai URL Google Sheet atau ID dari URL /spreadsheets/d/ID/edit.');
  }

  return SpreadsheetApp.openById(id);
}
