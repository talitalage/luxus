/**
 * LUXUS BACKEND v24.0 - COMPLETO E CORRIGIDO
 * Mantenha exatamente este código no seu Google Apps Script
 */

// ==================== CONFIGURAÇÕES INICIAIS ====================
const PLANILHA_ID = '1uZtTx4xXZ5v6VWaQo9RppEdOTe55ZIcPV1p08CXSL7s';

// ==================== DO GET ====================
function doGet(e) {
  const action = e?.parameter?.action;
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  
  try {
    if (action === 'getInventario') return createResponse(getSheetAsJSON(ss, 'Inventario'));
    if (action === 'getRepasses') return createResponse(getSheetAsJSON(ss, 'Repasses'));
    if (action === 'getRevendedores') return createResponse(getSheetAsJSON(ss, 'Revendedores'));
    if (action === 'getTipos') return createResponse(getSheetAsJSON(ss, 'Tipos'));
    if (action === 'getUsuarios') return createResponse(getSheetAsJSON(ss, 'Usuarios'));
    return createResponse({ status: "online", message: "API Luxus funcionando" });
  } catch (err) {
    return createResponse({ error: err.message });
  }
}

// ==================== DO POST ====================
function doPost(e) {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  let params;
  
  try { 
    params = JSON.parse(e.postData.contents); 
  } catch (err) { 
    return createResponse({ error: "JSON inválido: " + err.message }); 
  }
  
  const action = params.action;
  console.log(`Ação recebida: ${action}`, params);
  
  try {
    // ========== GESTÃO DE TIPOS ==========
    if (action === 'addTipo') {
      const sheet = getSheet(ss, 'Tipos', ['Nome']);
      const nome = params.nome.toString().trim();
      if (!nome) return createResponse({ error: "Nome do tipo é obrigatório" });
      sheet.appendRow([nome]);
      return createResponse({ success: true, message: "Tipo adicionado" });
    }
    
    if (action === 'delTipo') {
      const sheet = ss.getSheetByName('Tipos');
      if (!sheet) return createResponse({ error: "Aba Tipos não encontrada" });
      const data = sheet.getDataRange().getValues();
      const nome = params.nome?.toString().trim().toLowerCase();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString().trim().toLowerCase() === nome) { 
          sheet.deleteRow(i + 1); 
          break; 
        }
      }
      return createResponse({ success: true, message: "Tipo removido" });
    }

    // ========== GESTÃO DE REVENDEDORES ==========
    if (action === 'addRevendedor') {
      const sheet = getSheet(ss, 'Revendedores', ['Nome', 'Contato', 'Comissao']);
      sheet.appendRow([params.nome.toString().trim(), params.contato?.toString().trim() || "", params.comissao || 30]);
      return createResponse({ success: true, message: "Revendedor adicionado" });
    }
    
    if (action === 'editRevendedor') {
      const sheet = ss.getSheetByName('Revendedores');
      if (!sheet) return createResponse({ error: "Aba Revendedores não encontrada" });
      const data = sheet.getDataRange().getValues();
      const nomeAntigo = params.nomeAntigo?.toString().trim().toLowerCase();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString().trim().toLowerCase() === nomeAntigo) {
          sheet.getRange(i + 1, 1).setValue(params.novoNome.toString().trim());
          sheet.getRange(i + 1, 2).setValue(params.novoContato?.toString().trim() || "");
          sheet.getRange(i + 1, 3).setValue(params.comissao || 30);
          atualizarVinculosRevendedor(ss, params.nomeAntigo, params.novoNome);
          return createResponse({ success: true, message: "Revendedor editado" });
        }
      }
      return createResponse({ error: "Revendedor não encontrado" });
    }
    
    if (action === 'delRevendedor') {
      const sheet = ss.getSheetByName('Revendedores');
      if (!sheet) return createResponse({ error: "Aba Revendedores não encontrada" });
      const data = sheet.getDataRange().getValues();
      const nome = params.nome?.toString().trim().toLowerCase();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString().trim().toLowerCase() === nome) { 
          sheet.deleteRow(i + 1); 
          break; 
        }
      }
      return createResponse({ success: true, message: "Revendedor removido" });
    }

    // ========== GESTÃO DE INVENTÁRIO (CORRIGIDO) ==========
    if (action === 'addInventario') {
      const sheet = getSheet(ss, 'Inventario', ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto', 'Tipo', 'Descricao']);
      const codigo = params.codigo?.toString().trim();
      if (!codigo) return createResponse({ error: "Código é obrigatório" });
      
      // Verificar se código já existe
      const existingData = sheet.getDataRange().getValues();
      for (let i = 1; i < existingData.length; i++) {
        if (existingData[i][0] && existingData[i][0].toString().trim() === codigo) {
          return createResponse({ error: "Código já existe" });
        }
      }
      
      sheet.appendRow([
        codigo,
        params.data || new Date(),
        params.status || 'Em Estoque',
        params.custo || 0,
        params.venda || 0,
        params.foto || "",
        params.tipo || "",
        params.descricao || ""
      ]);
      return createResponse({ success: true, message: "Item adicionado", rowId: sheet.getLastRow() });
    }
    
    if (action === 'editInventario') {
      const sheet = ss.getSheetByName('Inventario');
      if (!sheet) return createResponse({ error: "Aba Inventario não encontrada" });
      
      const rowId = parseInt(params.rowId);
      if (isNaN(rowId)) return createResponse({ error: "rowId inválido" });
      
      // Atualizar cada campo individualmente (mais seguro)
      if (params.codigo !== undefined) sheet.getRange(rowId, 1).setValue(params.codigo.toString().trim());
      if (params.descricao !== undefined) sheet.getRange(rowId, 8).setValue(params.descricao.toString().trim());
      if (params.tipo !== undefined) sheet.getRange(rowId, 7).setValue(params.tipo);
      if (params.custo !== undefined) sheet.getRange(rowId, 4).setValue(parseFloat(params.custo) || 0);
      if (params.venda !== undefined) sheet.getRange(rowId, 5).setValue(parseFloat(params.venda) || 0);
      if (params.status !== undefined) sheet.getRange(rowId, 3).setValue(params.status);
      if (params.foto !== undefined) sheet.getRange(rowId, 6).setValue(params.foto);
      
      return createResponse({ success: true, message: "Item editado" });
    }
    
    if (action === 'delInventario') {
      const sheet = ss.getSheetByName('Inventario');
      if (!sheet) return createResponse({ error: "Aba Inventario não encontrada" });
      const rowId = parseInt(params.rowId);
      if (isNaN(rowId)) return createResponse({ error: "rowId inválido" });
      sheet.deleteRow(rowId);
      return createResponse({ success: true, message: "Item removido" });
    }

    // ========== GESTÃO DE REPASSES ==========
    if (action === 'addRepasse') {
      const sheetRep = getSheet(ss, 'Repasses', ['Revendedor', 'Codigo', 'Custo', 'Venda', 'Data', 'Status']);
      const sheetInv = ss.getSheetByName('Inventario');
      const rev = params.revendedor?.toString().trim();
      const cod = params.codigo?.toString().trim();
      
      if (!rev || !cod) return createResponse({ error: "Revendedor e código são obrigatórios" });
      
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
      return createResponse({ success: true, message: "Repasse adicionado" });
    }
    
    if (action === 'delRepasse') {
      const sheetRep = ss.getSheetByName('Repasses');
      const sheetInv = ss.getSheetByName('Inventario');
      const rowId = parseInt(params.rowId);
      if (isNaN(rowId) || !sheetRep) return createResponse({ error: "Repasse não encontrado" });
      
      const rowData = sheetRep.getRange(rowId, 1, 1, 2).getValues()[0];
      const cod = rowData[1]?.toString().trim();
      sheetRep.deleteRow(rowId);
      
      if (sheetInv && cod) {
        const dInv = sheetInv.getDataRange().getValues();
        for (let i = 1; i < dInv.length; i++) {
          if (dInv[i][0] && dInv[i][0].toString().trim() === cod && dInv[i][2] !== 'Em Estoque' && dInv[i][2] !== 'Vendido') {
            sheetInv.getRange(i + 1, 3).setValue('Em Estoque'); 
            break;
          }
        }
      }
      return createResponse({ success: true, message: "Repasse removido" });
    }

    if (action === 'fechamentoParcial') {
      const sheetRep = ss.getSheetByName('Repasses');
      const sheetInv = ss.getSheetByName('Inventario');
      const rev = params.revendedor?.toString().trim().toLowerCase();
      const codigosVendas = params.codigos?.map(c => c.toString().trim().toLowerCase()) || [];
      
      if (sheetRep) {
        const dRep = sheetRep.getDataRange().getValues();
        for (let i = 1; i < dRep.length; i++) {
          const codItem = dRep[i][1]?.toString().trim().toLowerCase();
          if (dRep[i][0]?.toString().trim().toLowerCase() === rev && codigosVendas.includes(codItem) && dRep[i][5] === 'Pendente') {
            sheetRep.getRange(i + 1, 6).setValue('Pago');
            if (sheetInv) {
              const dInv = sheetInv.getDataRange().getValues();
              for (let j = 1; j < dInv.length; j++) {
                if (dInv[j][0]?.toString().trim().toLowerCase() === codItem && dInv[j][2]?.toString().trim().toLowerCase() === rev) { 
                  sheetInv.getRange(j + 1, 3).setValue('Vendido'); 
                  break; 
                }
              }
            }
          }
        }
      }
      
      const sheetFech = getSheet(ss, 'Fechamentos', ['Revendedor', 'Data', 'Observacoes', 'Desconto', 'Comissao']);
      sheetFech.appendRow([params.revendedor, params.data || new Date(), params.obs || "", params.desconto || 0, params.comissao || 0]);
      return createResponse({ success: true, message: "Fechamento realizado" });
    }
    
    return createResponse({ error: `Ação não reconhecida: ${action}` });
    
  } catch (err) {
    console.error("Erro no doPost:", err);
    return createResponse({ error: err.message });
  }
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
      if (h && row[i] !== undefined) obj[h] = row[i]; 
    });
    return obj;
  });
}

function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function atualizarVinculosRevendedor(ss, nomeAntigo, nomeNovo) {
  const a = nomeAntigo?.toString().trim();
  const n = nomeNovo?.toString().trim();
  if (!a || !n) return;
  
  const sInv = ss.getSheetByName('Inventario');
  if (sInv) {
    const d = sInv.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) { 
      if (d[i][2]?.toString().trim() === a) sInv.getRange(i + 1, 3).setValue(n); 
    }
  }
  
  const sRep = ss.getSheetByName('Repasses');
  if (sRep) {
    const d = sRep.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) { 
      if (d[i][0]?.toString().trim() === a) sRep.getRange(i + 1, 1).setValue(n); 
    }
  }
}

function getSheet(ss, name, headers) {
  let s = ss.getSheetByName(name);
  if (!s) { 
    s = ss.insertSheet(name); 
    s.appendRow(headers); 
  }
  return s;
}