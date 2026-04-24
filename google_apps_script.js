/**
 * LUXUS BACKEND v31.0 - SEM setHeader
 */

// ==================== DO GET ====================
function doGet(e) {
  const action = e?.parameter?.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === 'getInventario') return createResponse(getSheetAsJSON(ss, 'Inventario'));
    if (action === 'getRepasses') return createResponse(getSheetAsJSON(ss, 'Repasses'));
    if (action === 'getRevendedores') return createResponse(getSheetAsJSON(ss, 'Revendedores'));
    if (action === 'getTipos') return createResponse(getSheetAsJSON(ss, 'Tipos'));
    if (action === 'getUsuarios') return createResponse(getSheetAsJSON(ss, 'Usuarios'));
    return createResponse({ status: "online" });
  } catch (err) {
    return createResponse({ error: err.message });
  }
}

// ==================== DO POST ====================
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let params;
  
  try { 
    params = JSON.parse(e.postData.contents); 
  } catch (err) { 
    return createResponse({ success: false, error: "JSON inválido" }); 
  }
  
  const action = params.action;
  
  try {
    // EDITAR INVENTÁRIO
    if (action === 'editInventario') {
      const sheet = ss.getSheetByName('Inventario');
      if (!sheet) return createResponse({ success: false, error: "Aba não encontrada" });
      
      const rowId = parseInt(params.rowId);
      if (isNaN(rowId)) return createResponse({ success: false, error: "rowId inválido" });
      
      if (params.codigo !== undefined) sheet.getRange(rowId, 1).setValue(String(params.codigo));
      if (params.descricao !== undefined) sheet.getRange(rowId, 8).setValue(String(params.descricao));
      if (params.tipo !== undefined) sheet.getRange(rowId, 7).setValue(String(params.tipo));
      if (params.custo !== undefined) sheet.getRange(rowId, 4).setValue(parseFloat(params.custo) || 0);
      if (params.venda !== undefined) sheet.getRange(rowId, 5).setValue(parseFloat(params.venda) || 0);
      if (params.status !== undefined) sheet.getRange(rowId, 3).setValue(String(params.status));
      if (params.foto !== undefined) sheet.getRange(rowId, 6).setValue(String(params.foto));
      
      return createResponse({ success: true, message: "Item salvo" });
    }
    
    // ADICIONAR INVENTÁRIO
    if (action === 'addInventario') {
      const sheet = getSheet(ss, 'Inventario', ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto', 'Tipo', 'Descricao']);
      sheet.appendRow([
        params.codigo || '',
        params.data || new Date(),
        params.status || 'Em Estoque',
        params.custo || 0,
        params.venda || 0,
        params.foto || '',
        params.tipo || '',
        params.descricao || ''
      ]);
      return createResponse({ success: true, message: "Item adicionado" });
    }
    
    // DELETAR INVENTÁRIO
    if (action === 'delInventario') {
      const sheet = ss.getSheetByName('Inventario');
      if (sheet) sheet.deleteRow(parseInt(params.rowId));
      return createResponse({ success: true, message: "Item removido" });
    }
    
    // REPASSES
    if (action === 'addRepasse') {
      const sheet = getSheet(ss, 'Repasses', ['Revendedor', 'Codigo', 'Custo', 'Venda', 'Data', 'Status']);
      sheet.appendRow([params.revendedor, params.codigo, params.custo, params.venda, params.data || new Date(), 'Pendente']);
      return createResponse({ success: true, message: "Repasse adicionado" });
    }
    
    if (action === 'delRepasse') {
      const sheet = ss.getSheetByName('Repasses');
      if (sheet) sheet.deleteRow(parseInt(params.rowId));
      return createResponse({ success: true, message: "Repasse removido" });
    }
    
    if (action === 'fechamentoParcial') {
      const sheet = getSheet(ss, 'Fechamentos', ['Revendedor', 'Data', 'Observacoes']);
      sheet.appendRow([params.revendedor, params.data || new Date(), params.obs || '']);
      return createResponse({ success: true, message: "Fechamento registrado" });
    }
    
    // REVENDEDORES
    if (action === 'addRevendedor') {
      const sheet = getSheet(ss, 'Revendedores', ['Nome', 'Contato', 'Comissao']);
      sheet.appendRow([params.nome, params.contato || '', params.comissao || 30]);
      return createResponse({ success: true, message: "Revendedor adicionado" });
    }
    
    if (action === 'editRevendedor') {
      const sheet = ss.getSheetByName('Revendedores');
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.nomeAntigo) {
          sheet.getRange(i + 1, 1).setValue(params.novoNome);
          sheet.getRange(i + 1, 2).setValue(params.novoContato || '');
          sheet.getRange(i + 1, 3).setValue(params.comissao || 30);
          break;
        }
      }
      return createResponse({ success: true, message: "Revendedor editado" });
    }
    
    if (action === 'delRevendedor') {
      const sheet = ss.getSheetByName('Revendedores');
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.nome) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return createResponse({ success: true, message: "Revendedor removido" });
    }
    
    // TIPOS
    if (action === 'addTipo') {
      const sheet = getSheet(ss, 'Tipos', ['Nome']);
      sheet.appendRow([params.nome]);
      return createResponse({ success: true, message: "Tipo adicionado" });
    }
    
    if (action === 'delTipo') {
      const sheet = ss.getSheetByName('Tipos');
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === params.nome) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return createResponse({ success: true, message: "Tipo removido" });
    }
    
    return createResponse({ success: false, error: `Ação desconhecida: ${action}` });
    
  } catch (err) {
    return createResponse({ success: false, error: err.message });
  }
}

// ==================== FUNÇÕES AUXILIARES (SEM setHeader) ====================
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetAsJSON(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0].map(h => h.toString().trim());
  return data.slice(1).map((row, index) => {
    let obj = { rowId: index + 2 };
    headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
    return obj;
  });
}

function getSheet(ss, name, headers) {
  let s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.appendRow(headers); }
  return s;
}