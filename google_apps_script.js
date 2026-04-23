/**
 * LUXUS BACKEND v8.0 - EDIÇÃO MANUAL DE LOCALIZAÇÃO
 * Permite alterar o status/localização de uma joia diretamente no inventário.
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === 'getInventario') return getSheetAsJSON(ss, 'Inventario');
    if (action === 'getRepasses') return getSheetAsJSON(ss, 'Repasses');
    if (action === 'getRevendedores') return getSheetAsJSON(ss, 'Revendedores');
    return createResponse({ status: "online" });
  } catch (err) {
    return createResponse({ error: err.message });
  }
}

function getSheetAsJSON(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return createResponse([]);
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return createResponse([]);
  
  const headers = data[0].map(h => h.toString().trim());
  const rows = data.slice(1);
  
  const json = rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
    // Força mapeamento de campos críticos
    if (sheetName === 'Revendedores') { obj.Nome = row[0]; obj.Contato = row[1]; }
    if (sheetName === 'Inventario') { obj.Codigo = row[0]; obj.Status = row[2]; obj.Custo = row[3]; obj.Venda = row[4]; obj.Foto = row[5]; }
    if (sheetName === 'Repasses') { obj.Revendedor = row[0]; obj.Codigo = row[1]; obj.Custo = row[2]; obj.Venda = row[3]; obj.Data = row[4]; obj.Status = row[5]; }
    return obj;
  });
  return createResponse(json);
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let params;
  try { params = JSON.parse(e.postData.contents); } catch (err) { return ContentService.createTextOutput("Erro JSON"); }
  
  const action = params.action;

  if (action === 'addRevendedor') {
    const sheet = getSheet(ss, 'Revendedores', ['Nome', 'Contato']);
    sheet.appendRow([params.nome.toString().trim(), params.contato ? params.contato.toString().trim() : ""]);
    return ContentService.createTextOutput("Sucesso");
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
        return ContentService.createTextOutput("Sucesso");
      }
    }
    return ContentService.createTextOutput("Erro");
  }

  if (action === 'delRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    const data = sheet.getDataRange().getValues();
    const n = params.nome.toString().trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === n) { sheet.deleteRow(i + 1); break; }
    }
    return ContentService.createTextOutput("Sucesso");
  }

  if (action === 'addInventario') {
    const sheet = getSheet(ss, 'Inventario', ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto']);
    sheet.appendRow([params.codigo.toString().trim(), params.data || new Date(), 'Em Estoque', "", "", ""]);
    return ContentService.createTextOutput("Sucesso");
  }

  if (action === 'editInventario') {
    const sheet = ss.getSheetByName('Inventario');
    const data = sheet.getDataRange().getValues();
    const cod = params.codigo.toString().trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim().toLowerCase() === cod) {
        sheet.getRange(i + 1, 3).setValue(params.status || data[i][2]); // Altera localização/status
        sheet.getRange(i + 1, 4).setValue(params.custo);
        sheet.getRange(i + 1, 5).setValue(params.venda);
        sheet.getRange(i + 1, 6).setValue(params.foto);
        return ContentService.createTextOutput("Sucesso");
      }
    }
    return ContentService.createTextOutput("Erro");
  }

  if (action === 'addRepasse') {
    const sheetRep = getSheet(ss, 'Repasses', ['Revendedor', 'Codigo', 'Custo', 'Venda', 'Data', 'Status']);
    const sheetInv = ss.getSheetByName('Inventario');
    const rev = params.revendedor.toString().trim();
    const cod = params.codigo.toString().trim();
    sheetRep.appendRow([rev, cod, params.custo, params.venda, params.data || new Date(), 'Pendente']);
    if (sheetInv) {
      const dInv = sheetInv.getDataRange().getValues();
      for (let i = 1; i < dInv.length; i++) {
        if (dInv[i][0].toString().trim().toLowerCase() === cod.toLowerCase()) { sheetInv.getRange(i + 1, 3).setValue(rev); break; }
      }
    }
    return ContentService.createTextOutput("Sucesso");
  }

  if (action === 'fechamentoParcial') {
    const sheetRep = ss.getSheetByName('Repasses');
    const sheetInv = ss.getSheetByName('Inventario');
    const rev = params.revendedor.toString().trim().toLowerCase();
    const codigosBipados = params.codigos.map(c => c.toString().trim().toLowerCase());
    
    if (sheetRep) {
      const dRep = sheetRep.getDataRange().getValues();
      for (let i = 1; i < dRep.length; i++) {
        const codItem = dRep[i][1].toString().trim().toLowerCase();
        if (dRep[i][0].toString().trim().toLowerCase() === rev && codigosBipados.includes(codItem) && dRep[i][5] === 'Pendente') {
          sheetRep.getRange(i + 1, 6).setValue('Pago');
          if (sheetInv) {
            const dInv = sheetInv.getDataRange().getValues();
            for (let j = 1; j < dInv.length; j++) {
              if (dInv[j][0].toString().trim().toLowerCase() === codItem) { sheetInv.getRange(j + 1, 3).setValue('Vendido'); break; }
            }
          }
        }
      }
    }
    
    const sheetFech = getSheet(ss, 'Fechamentos', ['Revendedor', 'Data', 'Observacoes']);
    sheetFech.appendRow([params.revendedor, new Date(), params.obs]);
    return ContentService.createTextOutput("Sucesso");
  }
}

function atualizarVinculos(ss, antigo, novo) {
  const a = antigo.toString().trim().toLowerCase();
  const sInv = ss.getSheetByName('Inventario');
  if (sInv) {
    const d = sInv.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) { if (d[i][2].toString().trim().toLowerCase() === a) sInv.getRange(i + 1, 3).setValue(novo); }
  }
  const sRep = ss.getSheetByName('Repasses');
  if (sRep) {
    const d = sRep.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) { if (d[i][0].toString().trim().toLowerCase() === a) sRep.getRange(i + 1, 1).setValue(novo); }
  }
}

function getSheet(ss, name, headers) {
  let s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.appendRow(headers); }
  return s;
}
