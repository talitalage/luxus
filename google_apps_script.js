function doGet(e) {
  const action = e?.parameter?.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getInventario')    return jsonResponse(getSheetData(ss, 'Inventario'));
  if (action === 'getTipos')         return jsonResponse(getSheetData(ss, 'Tipos'));
  if (action === 'getRevendedores')  return jsonResponse(getSheetData(ss, 'Revendedores'));
  if (action === 'getUsuarios')      return jsonResponse(getSheetData(ss, 'Usuarios'));
  return jsonResponse({ status: "ok" });
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let data;
  try { data = JSON.parse(e.postData.contents); }
  catch(err) { return jsonResponse({ error: "JSON inválido" }); }

  const action = data.action;
  
  // EDITAR INVENTÁRIO
  if (action === 'editInventario') {
    const sheet = ss.getSheetByName('Inventario');
    const row = parseInt(data.rowId);
    if (!sheet || !row) return jsonResponse({ error: "rowId inválido" });
    
    if (data.codigo !== undefined) sheet.getRange(row, 1).setValue(String(data.codigo));
    if (data.descricao !== undefined) sheet.getRange(row, 8).setValue(String(data.descricao));
    if (data.tipo !== undefined) sheet.getRange(row, 7).setValue(String(data.tipo));
    if (data.custo !== undefined) sheet.getRange(row, 4).setValue(parseFloat(data.custo) || 0);
    if (data.venda !== undefined) sheet.getRange(row, 5).setValue(parseFloat(data.venda) || 0);
    if (data.status !== undefined) sheet.getRange(row, 3).setValue(String(data.status));
    if (data.foto !== undefined) sheet.getRange(row, 6).setValue(String(data.foto));
    return jsonResponse({ success: true });
  }
  
  // ADICIONAR INVENTÁRIO
  if (action === 'addInventario') {
    const sheet = getSheet(ss, 'Inventario', ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto', 'Tipo', 'Descricao']);
    sheet.appendRow([data.codigo, new Date(), data.status || 'Em Estoque', data.custo || 0, data.venda || 0, data.foto || '', data.tipo || '', data.descricao || '']);
    return jsonResponse({ success: true });
  }
  
  // ADICIONAR REVENDEDOR
  if (action === 'addRevendedor') {
    const sheet = getSheet(ss, 'Revendedores', ['Nome', 'Contato', 'Comissão']);
    sheet.appendRow([data.nome, data.contato || '', data.comissao || 30]);
    return jsonResponse({ success: true });
  }
  
  // EDITAR REVENDEDOR
  if (action === 'editRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    const row = parseInt(data.rowId);
    if (!sheet || !row) return jsonResponse({ error: "rowId inválido" });
    if (data.nome !== undefined) sheet.getRange(row, 1).setValue(data.nome);
    if (data.contato !== undefined) sheet.getRange(row, 2).setValue(data.contato);
    if (data.comissao !== undefined) sheet.getRange(row, 3).setValue(parseFloat(data.comissao));
    return jsonResponse({ success: true });
  }
  
  // DELETAR REVENDEDOR
  if (action === 'delRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    if (sheet && data.rowId) sheet.deleteRow(parseInt(data.rowId));
    return jsonResponse({ success: true });
  }
  
  // ADICIONAR TIPO
  if (action === 'addTipo') {
    const sheet = getSheet(ss, 'Tipos', ['Nome']);
    sheet.appendRow([data.nome]);
    return jsonResponse({ success: true });
  }
  
  // DELETAR TIPO
  if (action === 'delTipo') {
    const sheet = ss.getSheetByName('Tipos');
    const valores = sheet.getDataRange().getValues();
    for (let i = 1; i < valores.length; i++) {
      if (valores[i][0] === data.nome) { sheet.deleteRow(i + 1); break; }
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