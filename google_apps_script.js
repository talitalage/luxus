function doGet(e) {
  const action = e?.parameter?.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getInventario') return jsonResponse(getSheetData(ss, 'Inventario'));
  if (action === 'getTipos') return jsonResponse(getSheetData(ss, 'Tipos'));
  return jsonResponse({ status: "ok" });
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let data;
  try { data = JSON.parse(e.postData.contents); } catch(e) { return jsonResponse({ error: "JSON inválido" }); }
  
  const action = data.action;
  const sheet = ss.getSheetByName('Inventario');
  
  if (action === 'editInventario') {
    const row = parseInt(data.rowId);
    if (data.codigo) sheet.getRange(row, 1).setValue(data.codigo);
    if (data.descricao) sheet.getRange(row, 8).setValue(data.descricao);
    if (data.tipo) sheet.getRange(row, 7).setValue(data.tipo);
    if (data.custo) sheet.getRange(row, 4).setValue(parseFloat(data.custo));
    if (data.venda) sheet.getRange(row, 5).setValue(parseFloat(data.venda));
    if (data.status) sheet.getRange(row, 3).setValue(data.status);
    if (data.foto) sheet.getRange(row, 6).setValue(data.foto);
    return jsonResponse({ success: true });
  }
  
  if (action === 'addTipo') {
    const tipoSheet = getSheet(ss, 'Tipos', ['Nome']);
    tipoSheet.appendRow([data.nome]);
    return jsonResponse({ success: true });
  }
  
  if (action === 'delTipo') {
    const tipoSheet = ss.getSheetByName('Tipos');
    const valores = tipoSheet.getDataRange().getValues();
    for (let i = 1; i < valores.length; i++) {
      if (valores[i][0] === data.nome) { tipoSheet.deleteRow(i + 1); break; }
    }
    return jsonResponse({ success: true });
  }
  
  return jsonResponse({ error: "Ação inválida" });
}

function getSheetData(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row, i) => {
    const obj = { rowId: i + 2 };
    headers.forEach((h, idx) => { if (h) obj[h] = row[idx]; });
    return obj;
  });
}

function getSheet(ss, name, headers) {
  let s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.appendRow(headers); }
  return s;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}