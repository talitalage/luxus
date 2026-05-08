// ========================================
// LUXUS - Google Apps Script Backend v2
// ========================================
// Usa headers da planilha para todas operações
// Não depende de ordem das colunas

// ========================================
// FUNÇÃO PRINCIPAL - GET
// ========================================
function doGet(e) {
  try {
    const action = e.parameter.action || '';
    let result;
    switch(action) {
      case 'getInventario':   result = getInventario();   break;
      case 'getRevendedores': result = getRevendedores(); break;
      case 'getCategorias':   result = getCategorias();   break;
      case 'getUsuarios':     result = getUsuarios();     break;
      default:
        result = { status: 'error', message: 'Action inválida: ' + action };
    }
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// FUNÇÃO PRINCIPAL - POST
// ========================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || '';
    let result;
    switch(action) {
      case 'addInventario':   result = addInventario(data);        break;
      case 'editInventario':  result = editInventario(data);       break;
      case 'delInventario':   result = delInventario(data.rowId);  break;
      case 'addRevendedor':   result = addRevendedor(data);        break;
      case 'editRevendedor':  result = editRevendedor(data);       break;
      case 'delRevendedor':   result = delRevendedor(data.rowId);  break;
      case 'addCategoria':    result = addCategoria(data);         break;
      case 'delCategoria':    result = delCategoria(data);         break;
      default:
        result = { success: false, error: 'Action inválida: ' + action };
    }
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// HELPERS — usar headers da planilha
// ========================================

// Retorna mapa { nomeHeader: indiceColuna } (case-insensitive)
function getHeaderMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => { map[String(h).trim().toLowerCase()] = i + 1; }); // 1-based
  return map;
}

// Converte linha de dados em objeto usando o headerMap
function rowToObj(headers1based, row, rowId) {
  const obj = { rowId };
  Object.entries(headers1based).forEach(([key, col]) => {
    obj[capitalize(key)] = row[col - 1];
  });
  return obj;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ========================================
// LEITURA — GET
// ========================================

function getInventario() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Inventario');

  if (!sheet) {
    sheet = ss.insertSheet('Inventario');
    sheet.appendRow(['Codigo','Descricao','Tipo','Categoria','Custo','Venda','Status','Revendedor','Data','Foto']);
    return [];
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const hmap = {};
  headers.forEach((h, i) => { hmap[String(h).trim().toLowerCase()] = i; });

  const g = (row, name) => {
    const i = hmap[name.toLowerCase()];
    return i !== undefined ? row[i] : '';
  };

  return data.slice(1).map((row, idx) => ({
    rowId:      idx + 2,
    Codigo:     g(row, 'codigo'),
    Descricao:  g(row, 'descricao'),
    Tipo:       g(row, 'tipo'),
    Categoria:  g(row, 'categoria'),
    Custo:      g(row, 'custo'),
    Venda:      g(row, 'venda'),
    Status:     g(row, 'status'),
    Revendedor: g(row, 'revendedor'),
    Data:       g(row, 'data'),
    Foto:       g(row, 'foto'),
  }));
}

function getRevendedores() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Revendedores');

  if (!sheet) {
    sheet = ss.insertSheet('Revendedores');
    sheet.appendRow(['Nome','Contato','Percentual']);
    return [];
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const hmap = {};
  headers.forEach((h, i) => { hmap[String(h).trim().toLowerCase()] = i; });
  const g = (row, name) => { const i = hmap[name.toLowerCase()]; return i !== undefined ? row[i] : ''; };

  return data.slice(1).map((row, idx) => ({
    rowId:      idx + 2,
    Nome:       g(row, 'nome'),
    Contato:    g(row, 'contato'),
    Percentual: g(row, 'percentual'),
  }));
}

function getCategorias() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Categorias');

  if (!sheet) {
    sheet = ss.insertSheet('Categorias');
    sheet.appendRow(['Tipo','Nome']);
    [['Semi Joia','Brincos'],['Semi Joia','Colares'],['Semi Joia','Pulseiras'],['Semi Joia','Anéis'],
     ['Perfume','Importado'],['Perfume','Árabe'],['Perfume','Nacional']].forEach(r => sheet.appendRow(r));
    return sheet.getDataRange().getValues().slice(1).map((r,i)=>({rowId:i+2,Tipo:r[0],Nome:r[1]}));
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const hmap = {};
  headers.forEach((h, i) => { hmap[String(h).trim().toLowerCase()] = i; });
  const g = (row, name) => { const i = hmap[name.toLowerCase()]; return i !== undefined ? row[i] : ''; };

  return data.slice(1).map((row, idx) => ({
    rowId: idx + 2,
    Tipo:  g(row, 'tipo'),
    Nome:  g(row, 'nome'),
  }));
}

function getUsuarios() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Usuarios');
  if (!sheet) {
    sheet = ss.insertSheet('Usuarios');
    sheet.appendRow(['Nome','Senha']);
    sheet.appendRow(['admin','admin']);
  }
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map((row, idx) => ({ rowId: idx+2, Nome: row[0], Senha: row[1] }));
}

// ========================================
// INVENTÁRIO — POST
// ========================================

function addInventario(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Inventario');
    if (!sheet) {
      sheet = ss.insertSheet('Inventario');
      sheet.appendRow(['Codigo','Descricao','Tipo','Categoria','Custo','Venda','Status','Revendedor','Data','Foto']);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const hmap = {};
    headers.forEach((h, i) => { hmap[String(h).trim().toLowerCase()] = i; });

    const now = new Date();
    const newRow = new Array(headers.length).fill('');
    const set = (name, val) => { const i = hmap[name]; if (i !== undefined) newRow[i] = val; };

    set('codigo',     data.codigo     || '');
    set('descricao',  data.descricao  || '');
    set('tipo',       data.tipo       || '');
    set('categoria',  data.categoria  || '');
    set('custo',      data.custo      || 0);
    set('venda',      data.venda      || 0);
    set('status',     data.status     || 'Em Estoque');
    set('revendedor', data.revendedor || '');
    set('data',       now);
    set('foto',       data.foto       || '');

    sheet.appendRow(newRow);
    return { success: true };
  } catch(err) { return { success: false, error: err.toString() }; }
}

function editInventario(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Inventario');
    if (!sheet) return { success: false, error: 'Aba Inventario não encontrada' };

    const rowId = parseInt(data.rowId);
    if (!rowId || rowId < 2) return { success: false, error: 'rowId inválido' };

    // Mapear headers
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const hmap = {};
    headers.forEach((h, i) => { hmap[String(h).trim().toLowerCase()] = i + 1; }); // 1-based

    const set = (name, val) => {
      const col = hmap[name.toLowerCase()];
      if (col) sheet.getRange(rowId, col).setValue(val);
    };

    if (data.codigo     !== undefined) set('codigo',     data.codigo);
    if (data.descricao  !== undefined) set('descricao',  data.descricao);
    if (data.tipo       !== undefined) set('tipo',       data.tipo);
    if (data.categoria  !== undefined) set('categoria',  data.categoria);
    if (data.custo      !== undefined) set('custo',      data.custo);
    if (data.venda      !== undefined) set('venda',      data.venda);
    if (data.status     !== undefined) set('status',     data.status);
    if (data.revendedor !== undefined) set('revendedor', data.revendedor);
    if (data.foto       !== undefined) set('foto',       data.foto);

    return { success: true };
  } catch(err) { return { success: false, error: err.toString() }; }
}

function delInventario(rowId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Inventario');
    if (!sheet) return { success: false, error: 'Aba Inventario não encontrada' };
    sheet.deleteRow(parseInt(rowId));
    return { success: true };
  } catch(err) { return { success: false, error: err.toString() }; }
}

// ========================================
// REVENDEDORES — POST
// ========================================

function addRevendedor(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Revendedores');
    if (!sheet) {
      sheet = ss.insertSheet('Revendedores');
      sheet.appendRow(['Nome','Contato','Percentual']);
    }
    const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const hmap = {};
    headers.forEach((h,i)=>{ hmap[String(h).trim().toLowerCase()]=i; });
    const row = new Array(headers.length).fill('');
    if (hmap['nome']       !== undefined) row[hmap['nome']]       = data.nome       || '';
    if (hmap['contato']    !== undefined) row[hmap['contato']]    = data.contato    || '';
    if (hmap['percentual'] !== undefined) row[hmap['percentual']] = data.percentual || 30;
    sheet.appendRow(row);
    return { success: true };
  } catch(err) { return { success: false, error: err.toString() }; }
}

function editRevendedor(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Revendedores');
    if (!sheet) return { success: false, error: 'Aba não encontrada' };
    const rowId = parseInt(data.rowId);
    const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const hmap = {};
    headers.forEach((h,i)=>{ hmap[String(h).trim().toLowerCase()]=i+1; });
    if (data.nome       !== undefined && hmap['nome'])       sheet.getRange(rowId, hmap['nome']).setValue(data.nome);
    if (data.contato    !== undefined && hmap['contato'])    sheet.getRange(rowId, hmap['contato']).setValue(data.contato);
    if (data.percentual !== undefined && hmap['percentual']) sheet.getRange(rowId, hmap['percentual']).setValue(data.percentual);
    return { success: true };
  } catch(err) { return { success: false, error: err.toString() }; }
}

function delRevendedor(rowId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Revendedores');
    if (!sheet) return { success: false, error: 'Aba não encontrada' };
    sheet.deleteRow(parseInt(rowId));
    return { success: true };
  } catch(err) { return { success: false, error: err.toString() }; }
}

// ========================================
// CATEGORIAS — POST
// ========================================

function addCategoria(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Categorias');
    if (!sheet) {
      sheet = ss.insertSheet('Categorias');
      sheet.appendRow(['Tipo','Nome']);
    }
    sheet.appendRow([data.tipo || '', data.nome || '']);
    return { success: true };
  } catch(err) { return { success: false, error: err.toString() }; }
}

function delCategoria(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Categorias');
    if (!sheet) return { success: false, error: 'Aba não encontrada' };
    const values = sheet.getDataRange().getValues();
    for (let i = values.length - 1; i >= 1; i--) {
      if (String(values[i][0]) === String(data.tipo) && String(values[i][1]) === String(data.nome)) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return { success: true };
  } catch(err) { return { success: false, error: err.toString() }; }
}
