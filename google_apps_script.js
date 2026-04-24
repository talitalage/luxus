function doGet(e) {
  return handleCors(() => {
    const action = e?.parameter?.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'getInventario') return getSheetData(ss, 'Inventario');
    if (action === 'getTipos') return getSheetData(ss, 'Tipos');
    if (action === 'getRevendedores') return getSheetData(ss, 'Revendedores');
    if (action === 'getUsuarios') return getSheetData(ss, 'Usuarios');
    return { status: "ok" };
  });
}

function doPost(e) {
  return handleCors(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let data;
    try { data = JSON.parse(e.postData.contents); }
    catch(err) { return { error: "JSON inválido" }; }

    const action = data.action;
    
    if (action === 'editInventario') {
      const sheet = ss.getSheetByName('Inventario');
      const row = parseInt(data.rowId);
      if (!sheet || !row) return { error: "rowId inválido" };
      
      if (data.codigo !== undefined) sheet.getRange(row, 1).setValue(String(data.codigo));
      if (data.descricao !== undefined) sheet.getRange(row, 8).setValue(String(data.descricao));
      if (data.tipo !== undefined) sheet.getRange(row, 7).setValue(String(data.tipo));
      if (data.custo !== undefined) sheet.getRange(row, 4).setValue(parseFloat(data.custo) || 0);
      if (data.venda !== undefined) sheet.getRange(row, 5).setValue(parseFloat(data.venda) || 0);
      if (data.status !== undefined) sheet.getRange(row, 3).setValue(String(data.status));
      if (data.foto !== undefined) sheet.getRange(row, 6).setValue(String(data.foto));
      return { success: true };
    }
    
    if (action === 'addInventario') {
      const sheet = getSheet(ss, 'Inventario', ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto', 'Tipo', 'Descricao']);
      sheet.appendRow([data.codigo, new Date(), data.status || 'Em Estoque', data.custo || 0, data.venda || 0, data.foto || '', data.tipo || '', data.descricao || '']);
      return { success: true };
    }
    
    return { error: "Ação inválida" };
  });
}

// FUNÇÃO QUE RESOLVE O CORS - NÃO MEXA!
function handleCors(callback) {
  try {
    const result = callback();
    const output = ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
    // Cabeçalhos CORS OBRIGATÓRIOS
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    output.setHeader('Access-Control-Max-Age', '3600');
    
    return output;
  } catch (err) {
    const output = ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
    output.setHeader('Access-Control-Allow-Origin', '*');
    return output;
  }
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