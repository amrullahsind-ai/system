/**
 * ARISE SYSTEM v33 - Google Sheets Server Sync
 */
const SHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE';
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
  const ss = SpreadsheetApp.openById(SHEET_ID);
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
