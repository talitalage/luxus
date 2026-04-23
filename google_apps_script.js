/**
 * LUXUS BACKEND v4.0 - ESTABILIDADE TOTAL
 * Este script gerencia a comunicação entre o site Luxus e o Google Sheets.
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === 'getInventario') return getSheetAsJSON(ss, 'Inventario');
    if (action === 'getRepasses') return getSheetAsJSON(ss, 'Repasses');
    if (action === 'getRevendedores') return getSheetAsJSON(ss, 'Revendedores');
    return createResponse({ status: "ok", message: "Luxus API Online" });
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
    headers.forEach((h, i) => {
      if (h) obj[h] = row[i];
    });
    return obj;
  });
  return createResponse(json);
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput("Erro JSON: " + err.message);
  }
  
  const action = params.action;

  // --- 1. GESTÃO DE REVENDEDORES (SALVAMENTO DE CONTATO) ---
  if (action === 'addRevendedor') {
    const sheet = getSheet(ss, 'Revendedores', ['Nome', 'Contato']);
    sheet.appendRow([params.nome.trim(), params.contato ? params.contato.trim() : ""]);
    return ContentService.createTextOutput("Sucesso");
  }

  if (action === 'editRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    const data = sheet.getDataRange().getValues();
    const nomeAntigo = params.nomeAntigo.trim();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === nomeAntigo) {
        sheet.getRange(i + 1, 1).setValue(params.novoNome.trim());
        sheet.getRange(i + 1, 2).setValue(params.novoContato ? params.novoContato.trim() : "");
        
        // Atualiza o nome em outras abas para não perder o vínculo
        atualizarVinculos(ss, nomeAntigo, params.novoNome.trim());
        break;
      }
    }
    return ContentService.createTextOutput("Sucesso");
  }

  if (action === 'delRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    const data = sheet.getDataRange().getValues();
    const nome = params.nome.trim();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === nome) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return ContentService.createTextOutput("Sucesso");
  }

  // --- 2. INVENTÁRIO ---
  if (action === 'addInventario') {
    const sheet = getSheet(ss, 'Inventario', ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto']);
    sheet.appendRow([params.codigo.trim(), params.data || new Date(), 'Em Estoque', "", "", ""]);
    return ContentService.createTextOutput("Sucesso");
  }

  if (action === 'editInventario') {
    const sheet = ss.getSheetByName('Inventario');
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().trim());
    const colCusto = headers.indexOf('Custo') + 1;
    const colVenda = headers.indexOf('Venda') + 1;
    const colFoto = headers.indexOf('Foto') + 1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === params.codigo.trim()) {
        if (colCusto > 0) sheet.getRange(i + 1, colCusto).setValue(params.custo);
        if (colVenda > 0) sheet.getRange(i + 1, colVenda).setValue(params.venda);
        if (colFoto > 0) sheet.getRange(i + 1, colFoto).setValue(params.foto);
        break;
      }
    }
    return ContentService.createTextOutput("Sucesso");
  }

  // --- 3. REPASSES E PAINEL ---
  if (action === 'addRepasse') {
    const sheetRep = getSheet(ss, 'Repasses', ['Revendedor', 'Codigo', 'Custo', 'Venda', 'Data', 'Status']);
    const sheetInv = ss.getSheetByName('Inventario');
    const revNome = params.revendedor.trim();
    const codPeça = params.codigo.trim();

    sheetRep.appendRow([revNome, codPeça, params.custo, params.venda, params.data || new Date(), 'Pendente']);
    
    if (sheetInv) {
      const dataInv = sheetInv.getDataRange().getValues();
      for (let i = 1; i < dataInv.length; i++) {
        if (dataInv[i][0].toString().trim() === codPeça) {
          sheetInv.getRange(i + 1, 3).setValue(revNome); // Status muda para o nome do revendedor
          break;
        }
      }
    }
    return ContentService.createTextOutput("Sucesso");
  }

  if (action === 'fechamento') {
    const sheetRep = ss.getSheetByName('Repasses');
    const sheetInv = ss.getSheetByName('Inventario');
    const revNome = params.revendedor.trim();
    
    // Marcar como pago no Repasses
    const dataRep = sheetRep.getDataRange().getValues();
    for (let i = 1; i < dataRep.length; i++) {
      if (dataRep[i][0].toString().trim() === revNome && dataRep[i][5] === 'Pendente') {
        sheetRep.getRange(i + 1, 6).setValue('Pago');
        
        // Marcar como vendido no Inventário
        if (sheetInv) {
          const dataInv = sheetInv.getDataRange().getValues();
          const codPeça = dataRep[i][1].toString().trim();
          for (let j = 1; j < dataInv.length; j++) {
            if (dataInv[j][0].toString().trim() === codPeça) {
              sheetInv.getRange(j + 1, 3).setValue('Vendido');
            }
          }
        }
      }
    }
    
    const sheetFech = getSheet(ss, 'Fechamentos', ['Revendedor', 'Data', 'Observacoes']);
    sheetFech.appendRow([revNome, new Date(), params.obs]);
    return ContentService.createTextOutput("Sucesso");
  }
}

function atualizarVinculos(ss, antigo, novo) {
  const abas = ['Inventario', 'Repasses'];
  abas.forEach(nome => {
    const s = ss.getSheetByName(nome);
    if (s) {
      const data = s.getDataRange().getValues();
      const col = (nome === 'Inventario') ? 2 : 0; // Coluna 3 (index 2) no Inv, Coluna 1 (index 0) no Rep
      for (let i = 1; i < data.length; i++) {
        if (data[i][col].toString().trim() === antigo) {
          s.getRange(i + 1, col + 1).setValue(novo);
        }
      }
    }
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
