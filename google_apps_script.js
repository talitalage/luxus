// ==================== CONFIGURAÇÕES ====================
function getScriptProperties() {
  return PropertiesService.getScriptProperties();
}

// ==================== DO GET ====================
function doGet(e) {
  const action = e?.parameter?.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Salvar URL do script
  if (action === 'saveScriptUrl') {
    const url = e?.parameter?.url;
    if (url) getScriptProperties().setProperty('SCRIPT_URL', url);
    return corsResponse({ success: true, message: "URL salva" });
  }
  
  // Recuperar URL salva
  if (action === 'getScriptUrl') {
    const savedUrl = getScriptProperties().getProperty('SCRIPT_URL');
    return corsResponse({ scriptUrl: savedUrl || "" });
  }
  
  // Dados da planilha
  if (action === 'getInventario')    return corsResponse(getSheetData(ss, 'Inventario'));
  if (action === 'getTipos')         return corsResponse(getSheetData(ss, 'Tipos'));
  if (action === 'getRevendedores')  return corsResponse(getSheetData(ss, 'Revendedores'));
  if (action === 'getUsuarios')      return corsResponse(getSheetData(ss, 'Usuarios'));
  
  return corsResponse({ status: "ok", message: "API funcionando" });
}

// ==================== DO POST ====================
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let data;
  try { data = JSON.parse(e.postData.contents); }
  catch(err) { return corsResponse({ error: "JSON inválido" }); }

  const action = data.action;
  
  // ========== SALVAR URL DO SCRIPT ==========
  if (action === 'saveScriptUrl') {
    if (data.url) getScriptProperties().setProperty('SCRIPT_URL', data.url);
    return corsResponse({ success: true, message: "URL salva" });
  }
  
  // ========== EDITAR INVENTÁRIO ==========
  if (action === 'editInventario') {
    const sheet = ss.getSheetByName('Inventario');
    const row = parseInt(data.rowId);
    if (!sheet || !row) return corsResponse({ error: "rowId inválido" });
    
    if (data.codigo !== undefined) sheet.getRange(row, 1).setValue(String(data.codigo));
    if (data.descricao !== undefined) sheet.getRange(row, 8).setValue(String(data.descricao));
    if (data.tipo !== undefined) sheet.getRange(row, 7).setValue(String(data.tipo));
    if (data.custo !== undefined) sheet.getRange(row, 4).setValue(parseFloat(data.custo) || 0);
    if (data.venda !== undefined) sheet.getRange(row, 5).setValue(parseFloat(data.venda) || 0);
    if (data.status !== undefined) sheet.getRange(row, 3).setValue(String(data.status));
    if (data.foto !== undefined) sheet.getRange(row, 6).setValue(String(data.foto));
    return corsResponse({ success: true });
  }
  
  // ========== ADICIONAR INVENTÁRIO ==========
  if (action === 'addInventario') {
    const sheet = getSheet(ss, 'Inventario', ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto', 'Tipo', 'Descricao']);
    sheet.appendRow([data.codigo, new Date(), data.status || 'Em Estoque', data.custo || 0, data.venda || 0, data.foto || '', data.tipo || '', data.descricao || '']);
    return corsResponse({ success: true });
  }
  
  // ========== REVENDEDORES ==========
  if (action === 'addRevendedor') {
    const sheet = getSheet(ss, 'Revendedores', ['Nome', 'Contato', 'Comissão']);
    sheet.appendRow([data.nome, data.contato || '', data.comissao || 30]);
    return corsResponse({ success: true });
  }
  
  if (action === 'editRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    const row = parseInt(data.rowId);
    if (!sheet || !row) return corsResponse({ error: "rowId inválido" });
    if (data.nome !== undefined) sheet.getRange(row, 1).setValue(data.nome);
    if (data.contato !== undefined) sheet.getRange(row, 2).setValue(data.contato);
    if (data.comissao !== undefined) sheet.getRange(row, 3).setValue(parseFloat(data.comissao));
    return corsResponse({ success: true });
  }
  
  if (action === 'delRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    if (sheet && data.rowId) sheet.deleteRow(parseInt(data.rowId));
    return corsResponse({ success: true });
  }
  
  // ========== TIPOS ==========
  if (action === 'addTipo') {
    const sheet = getSheet(ss, 'Tipos', ['Nome']);
    sheet.appendRow([data.nome]);
    return corsResponse({ success: true });
  }
  
  if (action === 'delTipo') {
    const sheet = ss.getSheetByName('Tipos');
    const valores = sheet.getDataRange().getValues();
    for (let i = 1; i < valores.length; i++) {
      if (valores[i][0] === data.nome) { sheet.deleteRow(i + 1); break; }
    }
    return corsResponse({ success: true });
  }
  
  return corsResponse({ error: "Ação inválida: " + action });
}

// ==================== FUNÇÃO CORS (RESOLVE O PROBLEMA) ====================
function corsResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // Cabeçalhos CORS essenciais
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  output.setHeader('Access-Control-Max-Age', '3600');
  
  return output;
}

// ==================== FUNÇÕES AUXILIARES ====================
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