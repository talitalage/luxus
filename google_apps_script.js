function doGet(e) {
  const action = e?.parameter?.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getInventario') return jsonResponse(getSheetData(ss, 'Inventario'));
  if (action === 'getRevendedores') return jsonResponse(getSheetData(ss, 'Revendedores'));
  if (action === 'getTipos') return jsonResponse(getSheetData(ss, 'Tipos'));
  if (action === 'getUsuarios') return jsonResponse(getSheetData(ss, 'Usuarios'));
  return jsonResponse({ status: "ok" });
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let data;
  try { data = JSON.parse(e.postData.contents); } catch(e) { return jsonResponse({ error: "JSON inválido" }); }
  
  const action = data.action;
  const sheet = ss.getSheetByName('Inventario');
  if (!sheet) return jsonResponse({ error: "Aba não encontrada" });
  
  if (action === 'editInventario') {
    const row = parseInt(data.rowId);
    if (data.codigo !== undefined) sheet.getRange(row, 1).setValue(data.codigo);
    if (data.descricao !== undefined) sheet.getRange(row, 8).setValue(data.descricao);
    if (data.tipo !== undefined) sheet.getRange(row, 7).setValue(data.tipo);
    if (data.custo !== undefined) sheet.getRange(row, 4).setValue(parseFloat(data.custo));
    if (data.venda !== undefined) sheet.getRange(row, 5).setValue(parseFloat(data.venda));
    if (data.status !== undefined) sheet.getRange(row, 3).setValue(data.status);
    if (data.foto !== undefined) sheet.getRange(row, 6).setValue(data.foto);
    return jsonResponse({ success: true });
  }
  
  if (action === 'addInventario') {
    sheet.appendRow([data.codigo, new Date(), data.status || 'Em Estoque', data.custo, data.venda, data.foto, data.tipo, data.descricao]);
    return jsonResponse({ success: true });
  }
  
  if (action === 'delInventario') {
    sheet.deleteRow(parseInt(data.rowId));
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

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}