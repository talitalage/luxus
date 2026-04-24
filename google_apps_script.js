/**
 * LUXUS BACKEND v30.0 - CORS COMPLETO
 */

// ==================== DO GET ====================
function doGet(e) {
  const action = e?.parameter?.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === 'getInventario') return corsResponse(getSheetAsJSON(ss, 'Inventario'));
    if (action === 'getRepasses') return corsResponse(getSheetAsJSON(ss, 'Repasses'));
    if (action === 'getRevendedores') return corsResponse(getSheetAsJSON(ss, 'Revendedores'));
    if (action === 'getTipos') return corsResponse(getSheetAsJSON(ss, 'Tipos'));
    if (action === 'getUsuarios') return corsResponse(getSheetAsJSON(ss, 'Usuarios'));
    return corsResponse({ status: "online", message: "API Luxus funcionando" });
  } catch (err) {
    return corsResponse({ error: err.message });
  }
}

// ==================== DO POST (COM CORS) ====================
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let params;
  
  try { 
    params = JSON.parse(e.postData.contents); 
  } catch (err) { 
    return corsResponse({ success: false, error: "JSON inválido: " + err.message }); 
  }
  
  const action = params.action;
  console.log("[LUXUS] Ação:", action);
  
  try {
    // ========== INVENTÁRIO - EDITAR ==========
    if (action === 'editInventario') {
      const sheet = ss.getSheetByName('Inventario');
      if (!sheet) return corsResponse({ success: false, error: "Aba Inventario não encontrada" });
      
      const rowId = parseInt(params.rowId);
      if (isNaN(rowId)) return corsResponse({ success: false, error: "rowId inválido" });
      
      // Mapeamento das colunas
      if (params.codigo !== undefined) sheet.getRange(rowId, 1).setValue(String(params.codigo));
      if (params.descricao !== undefined) sheet.getRange(rowId, 8).setValue(String(params.descricao));
      if (params.tipo !== undefined) sheet.getRange(rowId, 7).setValue(String(params.tipo));
      if (params.custo !== undefined) sheet.getRange(rowId, 4).setValue(parseFloat(params.custo) || 0);
      if (params.venda !== undefined) sheet.getRange(rowId, 5).setValue(parseFloat(params.venda) || 0);
      if (params.status !== undefined) sheet.getRange(rowId, 3).setValue(String(params.status));
      if (params.foto !== undefined) sheet.getRange(rowId, 6).setValue(String(params.foto));
      
      return corsResponse({ success: true, message: "Item salvo com sucesso!" });
    }
    
    // ========== INVENTÁRIO - ADICIONAR ==========
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
      return corsResponse({ success: true, message: "Item adicionado", rowId: sheet.getLastRow() });
    }
    
    // ========== INVENTÁRIO - DELETAR ==========
    if (action === 'delInventario') {
      const sheet = ss.getSheetByName('Inventario');
      if (!sheet) return corsResponse({ success: false, error: "Aba Inventario não encontrada" });
      const rowId = parseInt(params.rowId);
      if (isNaN(rowId)) return corsResponse({ success: false, error: "rowId inválido" });
      sheet.deleteRow(rowId);
      return corsResponse({ success: true, message: "Item removido" });
    }
    
    // ========== REPASSES ==========
    if (action === 'addRepasse') {
      const sheetRep = getSheet(ss, 'Repasses', ['Revendedor', 'Codigo', 'Custo', 'Venda', 'Data', 'Status']);
      const sheetInv = ss.getSheetByName('Inventario');
      const rev = params.revendedor?.toString().trim();
      const cod = params.codigo?.toString().trim();
      
      if (!rev || !cod) return corsResponse({ success: false, error: "Revendedor e código são obrigatórios" });
      
      sheetRep.appendRow([rev, cod, params.custo || 0, params.venda || 0, params.data || new Date(), 'Pendente']);
      
      if (sheetInv) {
        const dInv = sheetInv.getDataRange().getValues();
        for (let i = 1; i < dInv.length; i++) {
          if (dInv[i][0] && dInv[i][0].toString().trim() === cod && dInv[i][2] === 'Em Estoque') { 
            sheetInv.getRange(i + 1, 3).setValue(rev); 
            break; 
          }
        }
      }
      return corsResponse({ success: true, message: "Repasse adicionado" });
    }
    
    if (action === 'delRepasse') {
      const sheetRep = ss.getSheetByName('Repasses');
      const rowId = parseInt(params.rowId);
      if (isNaN(rowId) || !sheetRep) return corsResponse({ success: false, error: "Repasse não encontrado" });
      sheetRep.deleteRow(rowId);
      return corsResponse({ success: true, message: "Repasse removido" });
    }
    
    if (action === 'fechamentoParcial') {
      const sheetFech = getSheet(ss, 'Fechamentos', ['Revendedor', 'Data', 'Observacoes', 'Desconto', 'Comissao']);
      sheetFech.appendRow([params.revendedor, params.data || new Date(), params.obs || "", params.desconto || 0, params.comissao || 0]);
      return corsResponse({ success: true, message: "Fechamento realizado" });
    }
    
    // ========== REVENDEDORES ==========
    if (action === 'addRevendedor') {
      const sheet = getSheet(ss, 'Revendedores', ['Nome', 'Contato', 'Comissao']);
      sheet.appendRow([params.nome?.toString().trim(), params.contato || '', params.comissao || 30]);
      return corsResponse({ success: true, message: "Revendedor adicionado" });
    }
    
    if (action === 'editRevendedor') {
      const sheet = ss.getSheetByName('Revendedores');
      if (!sheet) return corsResponse({ success: false, error: "Aba Revendedores não encontrada" });
      const data = sheet.getDataRange().getValues();
      const nomeAntigo = params.nomeAntigo?.toString().trim();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString().trim() === nomeAntigo) {
          sheet.getRange(i + 1, 1).setValue(params.novoNome?.toString().trim());
          sheet.getRange(i + 1, 2).setValue(params.novoContato || '');
          sheet.getRange(i + 1, 3).setValue(params.comissao || 30);
          return corsResponse({ success: true, message: "Revendedor editado" });
        }
      }
      return corsResponse({ success: false, error: "Revendedor não encontrado" });
    }
    
    if (action === 'delRevendedor') {
      const sheet = ss.getSheetByName('Revendedores');
      if (!sheet) return corsResponse({ success: false, error: "Aba Revendedores não encontrada" });
      const data = sheet.getDataRange().getValues();
      const nome = params.nome?.toString().trim();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString().trim() === nome) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return corsResponse({ success: true, message: "Revendedor removido" });
    }
    
    // ========== TIPOS ==========
    if (action === 'addTipo') {
      const sheet = getSheet(ss, 'Tipos', ['Nome']);
      sheet.appendRow([params.nome?.toString().trim()]);
      return corsResponse({ success: true, message: "Tipo adicionado" });
    }
    
    if (action === 'delTipo') {
      const sheet = ss.getSheetByName('Tipos');
      if (!sheet) return corsResponse({ success: false, error: "Aba Tipos não encontrada" });
      const data = sheet.getDataRange().getValues();
      const nome = params.nome?.toString().trim();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString().trim() === nome) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return corsResponse({ success: true, message: "Tipo removido" });
    }
    
    return corsResponse({ success: false, error: `Ação não reconhecida: ${action}` });
    
  } catch (err) {
    console.error("[LUXUS] Erro:", err);
    return corsResponse({ success: false, error: err.message });
  }
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
function getSheetAsJSON(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0].map(h => h.toString().trim());
  const rows = data.slice(1);
  
  return rows.map((row, index) => {
    let obj = { rowId: index + 2 };
    headers.forEach((h, i) => { 
      if (h && row[i] !== undefined && row[i] !== '') obj[h] = row[i]; 
    });
    return obj;
  });
}

function getSheet(ss, name, headers) {
  let s = ss.getSheetByName(name);
  if (!s) { 
    s = ss.insertSheet(name); 
    s.appendRow(headers); 
  }
  return s;
}