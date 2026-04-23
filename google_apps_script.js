/**
 * LUXUS BACKEND v23.0 - COM CORS E SUPORTE COMPLETO
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === 'getInventario') return createCORSResponse(getSheetAsJSON(ss, 'Inventario'));
    if (action === 'getRepasses') return createCORSResponse(getSheetAsJSON(ss, 'Repasses'));
    if (action === 'getRevendedores') return createCORSResponse(getSheetAsJSON(ss, 'Revendedores'));
    if (action === 'getTipos') return createCORSResponse(getSheetAsJSON(ss, 'Tipos'));
    return createCORSResponse({ status: "online" });
  } catch (err) {
    return createCORSResponse({ error: err.message });
  }
}

function getSheetAsJSON(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0].map(h => h.toString().trim());
  const rows = data.slice(1);
  
  const json = rows.map((row, index) => {
    let obj = { rowId: index + 2 };
    headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
    
    if (sheetName === 'Revendedores') { obj.Nome = row[0]; obj.Contato = row[1]; }
    if (sheetName === 'Inventario') { 
      obj.Codigo = row[0]; obj.Data = row[1]; obj.Status = row[2]; 
      obj.Custo = row[3]; obj.Venda = row[4]; obj.Foto = row[5]; obj.Tipo = row[6] || ""; 
    }
    if (sheetName === 'Tipos') { obj.Nome = row[0]; }
    return obj;
  });
  return json;
}

function createCORSResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // Adiciona cabeçalhos CORS
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  output.setHeader('Access-Control-Max-Age', '3600');
  
  return output;
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let params;
  
  try { 
    params = JSON.parse(e.postData.contents); 
  } catch (err) { 
    return createCORSResponse({ error: "JSON inválido" }); 
  }
  
  const action = params.action;

  // GESTÃO DE TIPOS
  if (action === 'addTipo') {
    const sheet = getSheet(ss, 'Tipos', ['Nome']);
    sheet.appendRow([params.nome.toString().trim()]);
    return createCORSResponse({ success: true, message: "Tipo adicionado" });
  }
  
  if (action === 'delTipo') {
    const sheet = ss.getSheetByName('Tipos');
    const data = sheet.getDataRange().getValues();
    const n = params.nome.toString().trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === n) { 
        sheet.deleteRow(i + 1); 
        break; 
      }
    }
    return createCORSResponse({ success: true, message: "Tipo removido" });
  }

  // GESTÃO DE REVENDEDORES
  if (action === 'addRevendedor') {
    const sheet = getSheet(ss, 'Revendedores', ['Nome', 'Contato']);
    sheet.appendRow([params.nome.toString().trim(), params.contato ? params.contato.toString().trim() : ""]);
    return createCORSResponse({ success: true, message: "Revendedor adicionado" });
  }
  
  if (action === 'editRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    const data = sheet.getDataRange().getValues();
    const a = params.nomeAntigo.toString().trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === a) {
        sheet.getRange(i + 1, 1).setValue(params.novoNome.toString().trim());
        sheet.getRange(i + 1, 2).setValue(params.novoContato ? params.novoContato.toString().trim() : "");
        atualizarVinculos(ss, params.nomeAntigo.toString().trim(), params.novoNome.toString().trim());
        return createCORSResponse({ success: true, message: "Revendedor editado" });
      }
    }
    return createCORSResponse({ error: "Revendedor não encontrado" });
  }
  
  if (action === 'delRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    const data = sheet.getDataRange().getValues();
    const n = params.nome.toString().trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === n) { 
        sheet.deleteRow(i + 1); 
        break; 
      }
    }
    return createCORSResponse({ success: true, message: "Revendedor removido" });
  }

  // GESTÃO DE INVENTÁRIO
  if (action === 'addInventario') {
    const sheet = getSheet(ss, 'Inventario', ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto', 'Tipo']);
    sheet.appendRow([
      params.codigo.toString().trim(), 
      params.data || new Date(), 
      params.status || 'Em Estoque', 
      params.custo || "", 
      params.venda || "", 
      params.foto || "", 
      params.tipo || ""
    ]);
    return createCORSResponse({ success: true, message: "Item adicionado" });
  }
  
  if (action === 'editInventario') {
    const sheet = ss.getSheetByName('Inventario');
    const rowId = params.rowId; 
    if (rowId) {
      sheet.getRange(rowId, 1).setValue(params.codigo.toString().trim());
      sheet.getRange(rowId, 3).setValue(params.status || 'Em Estoque');
      sheet.getRange(rowId, 4).setValue(params.custo || "");
      sheet.getRange(rowId, 5).setValue(params.venda || "");
      sheet.getRange(rowId, 6).setValue(params.foto || "");
      sheet.getRange(rowId, 7).setValue(params.tipo || "");
      return createCORSResponse({ success: true, message: "Item editado" });
    }
    return createCORSResponse({ error: "Item não encontrado" });
  }
  
  if (action === 'delInventario') {
    const sheet = ss.getSheetByName('Inventario');
    if (params.rowId) { 
      sheet.deleteRow(params.rowId); 
      return createCORSResponse({ success: true, message: "Item removido" }); 
    }
    return createCORSResponse({ error: "Item não encontrado" });
  }

  // GESTÃO DE REPASSES
  if (action === 'addRepasse') {
    const sheetRep = getSheet(ss, 'Repasses', ['Revendedor', 'Codigo', 'Custo', 'Venda', 'Data', 'Status']);
    const sheetInv = ss.getSheetByName('Inventario');
    const rev = params.revendedor.toString().trim();
    const cod = params.codigo.toString().trim();
    sheetRep.appendRow([rev, cod, params.custo || "", params.venda || "", params.data || new Date(), 'Pendente']);
    if (sheetInv) {
      const dInv = sheetInv.getDataRange().getValues();
      for (let i = 1; i < dInv.length; i++) {
        if (dInv[i][0].toString().trim().toLowerCase() === cod.toLowerCase() && dInv[i][2] === 'Em Estoque') { 
          sheetInv.getRange(i + 1, 3).setValue(rev); 
          break; 
        }
      }
    }
    return createCORSResponse({ success: true, message: "Repasse adicionado" });
  }
  
  if (action === 'delRepasse') {
    const sheetRep = ss.getSheetByName('Repasses');
    const sheetInv = ss.getSheetByName('Inventario');
    if (params.rowId && sheetRep) {
      const rowData = sheetRep.getRange(params.rowId, 1, 1, 2).getValues()[0];
      const cod = rowData[1].toString().trim().toLowerCase();
      sheetRep.deleteRow(params.rowId);
      if (sheetInv) {
        const dInv = sheetInv.getDataRange().getValues();
        for (let i = 1; i < dInv.length; i++) {
          if (dInv[i][0].toString().trim().toLowerCase() === cod && dInv[i][2] !== 'Em Estoque' && dInv[i][2] !== 'Vendido') {
            sheetInv.getRange(i + 1, 3).setValue('Em Estoque'); 
            break;
          }
        }
      }
      return createCORSResponse({ success: true, message: "Repasse removido" });
    }
    return createCORSResponse({ error: "Repasse não encontrado" });
  }

  if (action === 'fechamentoParcial') {
    const sheetRep = ss.getSheetByName('Repasses');
    const sheetInv = ss.getSheetByName('Inventario');
    const rev = params.revendedor.toString().trim().toLowerCase();
    const codigosVendas = params.codigos.map(c => c.toString().trim().toLowerCase());
    
    if (sheetRep) {
      const dRep = sheetRep.getDataRange().getValues();
      for (let i = 1; i < dRep.length; i++) {
        const codItem = dRep[i][1].toString().trim().toLowerCase();
        if (dRep[i][0].toString().trim().toLowerCase() === rev && codigosVendas.includes(codItem) && dRep[i][5] === 'Pendente') {
          sheetRep.getRange(i + 1, 6).setValue('Pago');
          if (sheetInv) {
            const dInv = sheetInv.getDataRange().getValues();
            for (let j = 1; j < dInv.length; j++) {
              if (dInv[j][0].toString().trim().toLowerCase() === codItem && dInv[j][2].toString().trim().toLowerCase() === rev) { 
                sheetInv.getRange(j + 1, 3).setValue('Vendido'); 
                break; 
              }
            }
          }
        }
      }
    }
    const sheetFech = getSheet(ss, 'Fechamentos', ['Revendedor', 'Data', 'Observacoes']);
    sheetFech.appendRow([params.revendedor, new Date(), params.obs || ""]);
    return createCORSResponse({ success: true, message: "Fechamento realizado" });
  }
  
  return createCORSResponse({ error: "Ação não reconhecida" });
}

function atualizarVinculos(ss, antigo, novo) {
  const a = antigo.toString().trim().toLowerCase();
  const sInv = ss.getSheetByName('Inventario');
  if (sInv) {
    const d = sInv.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) { 
      if (d[i][2].toString().trim().toLowerCase() === a) sInv.getRange(i + 1, 3).setValue(novo); 
    }
  }
  const sRep = ss.getSheetByName('Repasses');
  if (sRep) {
    const d = sRep.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) { 
      if (d[i][0].toString().trim().toLowerCase() === a) sRep.getRange(i + 1, 1).setValue(novo); 
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