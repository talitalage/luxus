
function doGet(e) {
  const action = e?.parameter?.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getInventario')    return jsonResponse(getSheetData(ss, 'Inventario'));
  if (action === 'getTipos')         return jsonResponse(getSheetData(ss, 'Tipos'));
  if (action === 'getRevendedores')  return jsonResponse(getSheetData(ss, 'Revendedores'));
  if (action === 'getRepasses')      return jsonResponse(getSheetData(ss, 'Repasses'));
  if (action === 'getFechamento')    return jsonResponse(getSheetData(ss, 'Fechamento'));
  if (action === 'getUsuarios')      return jsonResponse(getSheetData(ss, 'Usuarios'));
  if (action === 'getPin')           return jsonResponse({ pin: getScriptProperty('CONFIG_PIN') });
  if (action === 'getScriptUrl')     return jsonResponse({ scriptUrl: getScriptProperty('SCRIPT_URL') });
  if (action === 'exportData')       return jsonResponse(exportAllData(ss));

  return jsonResponse({ status: "ok" });
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let data;
  try { data = JSON.parse(e.postData.contents); }
  catch(err) { return jsonResponse({ error: "JSON inválido" }); }

  const action = data.action;

  // ─── Login e Usuários ─────────────────────────────────────────────────────────
  if (action === 'login') {
    const usuariosSheet = ss.getSheetByName('Usuarios');
    if (!usuariosSheet) return jsonResponse({ error: 'Aba Usuarios não encontrada.' });
    const usuarios = getSheetData(ss, 'Usuarios');
    const user = usuarios.find(u => u.Usuario === data.usuario && u.Senha === data.senha);
    if (user) {
      return jsonResponse({ success: true, user: { Usuario: user.Usuario, Nivel: user.Nivel } });
    } else {
      return jsonResponse({ success: false, message: 'Usuário ou senha inválidos.' });
    }
  }

  // ─── Inventário: adicionar novo item ─────────────────────────────────────────
  if (action === 'addInventario') {
    const sheet = getSheet(ss, 'Inventario',
      ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto', 'Tipo', 'Descricao', 'Localizacao']);
    sheet.appendRow([
      String(data.codigo || '').trim(),
      new Date(),
      data.status   || 'Em Estoque',
      parseFloat(data.custo)  || 0,
      parseFloat(data.venda)  || 0,
      data.foto     || '',
      data.tipo     || '',
      data.descricao|| '',
      data.localizacao || ''
    ]);
    return jsonResponse({ success: true });
  }

  // ─── Inventário: editar item existente ───────────────────────────────────────
  if (action === 'editInventario') {
    const sheet = ss.getSheetByName('Inventario');
    const row   = parseInt(data.rowId);
    if (!sheet || !row) return jsonResponse({ error: 'rowId inválido' });

    if (data.codigo       !== undefined) sheet.getRange(row, 1).setValue(String(data.codigo).trim());
    if (data.status       !== undefined) sheet.getRange(row, 3).setValue(data.status);
    if (data.custo        !== undefined) sheet.getRange(row, 4).setValue(parseFloat(data.custo)  || 0);
    if (data.venda        !== undefined) sheet.getRange(row, 5).setValue(parseFloat(data.venda)  || 0);
    if (data.foto         !== undefined) sheet.getRange(row, 6).setValue(data.foto);
    if (data.tipo         !== undefined) sheet.getRange(row, 7).setValue(data.tipo);
    if (data.descricao    !== undefined) sheet.getRange(row, 8).setValue(data.descricao);
    if (data.localizacao  !== undefined) sheet.getRange(row, 9).setValue(data.localizacao);
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

  // ─── Revendedores: adicionar ──────────────────────────────────────────────────
  if (action === 'addRevendedor') {
    const sheet = getSheet(ss, 'Revendedores', ['Nome', 'Contato', 'Email', 'Endereco', 'CPF', 'Observacoes']);
    sheet.appendRow([
      String(data.nome || '').trim(),
      data.contato    || '',
      data.email      || '',
      data.endereco   || '',
      data.cpf        || '',
      data.observacoes|| ''
    ]);
    return jsonResponse({ success: true });
  }

  // ─── Revendedores: editar ────────────────────────────────────────────────────
  if (action === 'editRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    const row   = parseInt(data.rowId);
    if (!sheet || !row) return jsonResponse({ error: 'rowId inválido' });

    if (data.nome       !== undefined) sheet.getRange(row, 1).setValue(String(data.nome).trim());
    if (data.contato    !== undefined) sheet.getRange(row, 2).setValue(data.contato);
    if (data.email      !== undefined) sheet.getRange(row, 3).setValue(data.email);
    if (data.endereco   !== undefined) sheet.getRange(row, 4).setValue(data.endereco);
    if (data.cpf        !== undefined) sheet.getRange(row, 5).setValue(data.cpf);
    if (data.observacoes!== undefined) sheet.getRange(row, 6).setValue(data.observacoes);
    return jsonResponse({ success: true });
  }

  // ─── Revendedores: excluir ────────────────────────────────────────────────────
  if (action === 'delRevendedor') {
    const sheet  = ss.getSheetByName('Revendedores');
    if (!sheet) return jsonResponse({ error: 'Aba Revendedores não encontrada' });
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

  // ─── Repasses: adicionar ────────────────────────────────────────────────────
  if (action === 'addRepasse') {
    const sheet = getSheet(ss, 'Repasses', ['Revendedor', 'CodigoJoia', 'DataRepasse', 'DataRetorno', 'Status']);
    sheet.appendRow([
      String(data.revendedor || '').trim(),
      String(data.codigoJoia || '').trim(),
      new Date(),
      data.dataRetorno || '',
      data.status      || 'Em Repasse'
    ]);
    return jsonResponse({ success: true });
  }

  // ─── Repasses: editar ────────────────────────────────────────────────────
  if (action === 'editRepasse') {
    const sheet = ss.getSheetByName('Repasses');
    const row   = parseInt(data.rowId);
    if (!sheet || !row) return jsonResponse({ error: 'rowId inválido' });

    if (data.revendedor   !== undefined) sheet.getRange(row, 1).setValue(String(data.revendedor).trim());
    if (data.codigoJoia   !== undefined) sheet.getRange(row, 2).setValue(String(data.codigoJoia).trim());
    if (data.dataRetorno  !== undefined) sheet.getRange(row, 4).setValue(data.dataRetorno);
    if (data.status       !== undefined) sheet.getRange(row, 5).setValue(data.status);
    return jsonResponse({ success: true });
  }

  // ─── Fechamento: setar ────────────────────────────────────────────────────
  if (action === 'setFechamento') {
    const sheet = getSheet(ss, 'Fechamento', ['Revendedor', 'MesAno', 'TotalVendido', 'TotalPago', 'DataFechamento']);
    sheet.appendRow([
      String(data.revendedor || '').trim(),
      data.mesAno      || '',
      parseFloat(data.totalVendido) || 0,
      parseFloat(data.totalPago)    || 0,
      new Date()
    ]);
    return jsonResponse({ success: true });
  }

  // ─── Configuração de Segurança ───────────────────────────────────────────────
  if (action === 'setPin') {
    setScriptProperty('CONFIG_PIN', data.pin);
    return jsonResponse({ success: true });
  }

  if (action === 'setScriptUrl') {
    setScriptProperty('SCRIPT_URL', data.scriptUrl);
    return jsonResponse({ success: true });
  }

  // ─── Importar/Exportar Dados ─────────────────────────────────────────────────
  if (action === 'importData') {
    importAllData(ss, data.data);
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Ação inválida: ' + action });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSheetData(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 1) return []; // Allow empty sheets with just headers
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

function setScriptProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

function getScriptProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function exportAllData(ss) {
  const sheetsToExport = ['Inventario', 'Tipos', 'Revendedores', 'Repasses', 'Fechamento', 'Usuarios'];
  const exportedData = {};
  sheetsToExport.forEach(sheetName => {
    exportedData[sheetName] = getSheetData(ss, sheetName);
  });
  return exportedData;
}

function importAllData(ss, importedData) {
  const sheetsToImport = ['Inventario', 'Tipos', 'Revendedores', 'Repasses', 'Fechamento', 'Usuarios'];
  sheetsToImport.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      sheet.clearContents();
      // Check if importedData[sheetName] is not empty and has at least one row
      if (importedData[sheetName] && importedData[sheetName].length > 0) {
        // Extract headers from the first row of imported data
        const headers = Object.keys(importedData[sheetName][0]);
        if (headers.length > 0) {
          sheet.appendRow(headers);
          importedData[sheetName].forEach(row => {
            const rowValues = headers.map(header => row[header]);
            sheet.appendRow(rowValues);
          });
        }
      } else { // If importedData[sheetName] is empty, just add headers if available
        const defaultHeaders = {
          'Inventario': ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto', 'Tipo', 'Descricao', 'Localizacao'],
          'Tipos': ['Nome'],
          'Revendedores': ['Nome', 'Contato', 'Email', 'Endereco', 'CPF', 'Observacoes'],
          'Repasses': ['Revendedor', 'CodigoJoia', 'DataRepasse', 'DataRetorno', 'Status'],
          'Fechamento': ['Revendedor', 'MesAno', 'TotalVendido', 'TotalPago', 'DataFechamento'],
          'Usuarios': ['Usuario', 'Senha', 'Nivel']
        };
        if (defaultHeaders[sheetName]) {
          sheet.appendRow(defaultHeaders[sheetName]);
        }
      }
    }
  });
}
