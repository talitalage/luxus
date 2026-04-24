/**
 * LUXUS BACKEND v28.0 - CORRIGIDO GRAVAÇÃO
 */

function doGet(e) {
  const action = e?.parameter?.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === 'getInventario') return createResponse(getSheetAsJSON(ss, 'Inventario'));
    if (action === 'getTipos') return createResponse(getSheetAsJSON(ss, 'Tipos'));
    if (action === 'getRevendedores') return createResponse(getSheetAsJSON(ss, 'Revendedores'));
    if (action === 'getUsuarios') return createResponse(getSheetAsJSON(ss, 'Usuarios'));
    return createResponse({ status: "online" });
  } catch (err) {
    return createResponse({ error: err.message });
  }
}

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
    // ========== EDITAR INVENTÁRIO (CORRIGIDO) ==========
    if (action === 'editInventario') {
      const sheet = ss.getSheetByName('Inventario');
      if (!sheet) return createResponse({ success: false, error: "Aba não encontrada" });
      
      const rowId = parseInt(params.rowId);
      if (isNaN(rowId)) return createResponse({ success: false, error: "rowId inválido" });
      
      // Mapeamento das colunas
      const colMap = {
        'codigo': 1,
        'data': 2,
        'status': 3,
        'custo': 4,
        'venda': 5,
        'foto': 6,
        'tipo': 7,
        'descricao': 8
      };
      
      for (const [campo, valor] of Object.entries(params)) {
        if (colMap[campo] && valor !== undefined && campo !== 'action' && campo !== 'rowId') {
          sheet.getRange(rowId, colMap[campo]).setValue(valor);
        }
      }
      
      return createResponse({ success: true, message: "Item salvo com sucesso!" });
    }
    
    // ========== ADICIONAR INVENTÁRIO ==========
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
    
    // ========== DELETAR INVENTÁRIO ==========
    if (action === 'delInventario') {
      const sheet = ss.getSheetByName('Inventario');
      if (!sheet) return createResponse({ success: false, error: "Aba não encontrada" });
      sheet.deleteRow(parseInt(params.rowId));
      return createResponse({ success: true, message: "Item removido" });
    }
    
    // ========== ADICIONAR TIPO ==========
    if (action === 'addTipo') {
      const sheet = getSheet(ss, 'Tipos', ['Nome']);
      sheet.appendRow([params.nome]);
      return createResponse({ success: true, message: "Tipo adicionado" });
    }
    
    // ========== DELETAR TIPO ==========
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

function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(ss, name, headers) {
  let s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.appendRow(headers); }
  return s;
}