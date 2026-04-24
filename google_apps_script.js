function doGet(e) {
  const action = e?.parameter?.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getInventario') return jsonResponse(getSheetData(ss, 'Inventario'));
  if (action === 'getTipos')      return jsonResponse(getSheetData(ss, 'Tipos'));
  return jsonResponse({ status: "ok" });
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let data;
  try { data = JSON.parse(e.postData.contents); }
  catch(err) { return jsonResponse({ error: "JSON inválido" }); }

  const action = data.action;

  // ─── Inventário: adicionar novo item ─────────────────────────────────────────
  if (action === 'addInventario') {
    const sheet = getSheet(ss, 'Inventario',
      ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto', 'Tipo', 'Descricao']);
    sheet.appendRow([
      String(data.codigo || '').trim(),
      new Date(),
      data.status   || 'Em Estoque',
      parseFloat(data.custo)  || 0,
      parseFloat(data.venda)  || 0,
      data.foto     || '',
      data.tipo     || '',
      data.descricao|| ''
    ]);
    return jsonResponse({ success: true });
  }

  // ─── Inventário: editar item existente ───────────────────────────────────────
  if (action === 'editInventario') {
    const sheet = ss.getSheetByName('Inventario');
    const row   = parseInt(data.rowId);
    if (!sheet || !row) return jsonResponse({ error: 'rowId inválido' });

    if (data.codigo    !== undefined) sheet.getRange(row, 1).setValue(String(data.codigo).trim());
    if (data.status    !== undefined) sheet.getRange(row, 3).setValue(data.status);
    if (data.custo     !== undefined) sheet.getRange(row, 4).setValue(parseFloat(data.custo)  || 0);
    if (data.venda     !== undefined) sheet.getRange(row, 5).setValue(parseFloat(data.venda)  || 0);
    if (data.foto      !== undefined) sheet.getRange(row, 6).setValue(data.foto);
    if (data.tipo      !== undefined) sheet.getRange(row, 7).setValue(data.tipo);
    if (data.descricao !== undefined) sheet.getRange(row, 8).setValue(data.descricao);
    return jsonResponse({ success: true });
  }

  // ─── Tipos: adicionar ────────────────────────────────────────────────────────
  if (action === 'addTipo') {
    const sheet = getSheet(ss, 'Tipos', ['Nome']);
    sheet.appendRow([String(data.nome || '').trim()]);
    return jsonResponse({ success: true });
  }

  // ─── Tipos: excluir ──────────────────────────────────────────────────────────
  if (action === 'delTipo') {
    const sheet  = ss.getSheetByName('Tipos');
    if (!sheet) return jsonResponse({ error: 'Aba Tipos não encontrada' });
    const valores = sheet.getDataRange().getValues();
    const nome    = String(data.nome || '').trim().toLowerCase();
    for (let i = 1; i < valores.length; i++) {
      if (String(valores[i][0]).trim().toLowerCase() === nome) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Ação inválida: ' + action });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
