/**
 * Script Luxus v3.5 - Correção Definitiva de Contatos e Painel
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === 'getInventario') return getSheetData(ss, 'Inventario');
    if (action === 'getRepasses') return getSheetData(ss, 'Repasses');
    if (action === 'getRevendedores') return getSheetData(ss, 'Revendedores');
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  
  const range = sheet.getDataRange();
  if (range.getNumRows() < 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  
  const data = range.getValues();
  const headers = data.shift().map(h => h.toString().trim());
  const json = data.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = row[i];
    });
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let params;
  
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput("Erro no JSON: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
  
  const action = params.action;

  // 1. ADICIONAR INVENTÁRIO
  if (action === 'addInventario') {
    const sheet = getOrCreateSheet(ss, 'Inventario', ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto']);
    sheet.appendRow([params.codigo, params.data || new Date(), 'Em Estoque', '', '', '']);
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  // 2. EDITAR INVENTÁRIO
  if (action === 'editInventario') {
    const sheet = ss.getSheetByName('Inventario');
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().trim());
    
    const colCusto = headers.indexOf('Custo') + 1;
    const colVenda = headers.indexOf('Venda') + 1;
    const colFoto = headers.indexOf('Foto') + 1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() == params.codigo.toString().trim()) {
        if (colCusto > 0) sheet.getRange(i + 1, colCusto).setValue(params.custo);
        if (colVenda > 0) sheet.getRange(i + 1, colVenda).setValue(params.venda);
        if (colFoto > 0) sheet.getRange(i + 1, colFoto).setValue(params.foto);
        break;
      }
    }
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  // 3. ADICIONAR REPASSE
  if (action === 'addRepasse') {
    const sheetRepasse = getOrCreateSheet(ss, 'Repasses', ['Revendedor', 'Codigo', 'Custo', 'Venda', 'Data', 'Status']);
    const sheetInv = ss.getSheetByName('Inventario');
    
    sheetRepasse.appendRow([
      params.revendedor, 
      params.codigo, 
      params.custo, 
      params.venda, 
      params.data || new Date(), 
      'Pendente'
    ]);
    
    if (sheetInv) {
      const dataInv = sheetInv.getDataRange().getValues();
      for (let i = 1; i < dataInv.length; i++) {
        if (dataInv[i][0].toString().trim() == params.codigo.toString().trim()) {
          sheetInv.getRange(i + 1, 3).setValue(params.revendedor);
          break;
        }
      }
    }
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  // 4. ADICIONAR REVENDEDOR (COM CONTATO)
  if (action === 'addRevendedor') {
    const sheet = getOrCreateSheet(ss, 'Revendedores', ['Nome', 'Contato']);
    sheet.appendRow([params.nome.toString().trim(), params.contato ? params.contato.toString().trim() : '']);
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  // 5. EDITAR REVENDEDOR
  if (action === 'editRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() == params.nomeAntigo.toString().trim()) {
        sheet.getRange(i + 1, 1).setValue(params.novoNome.toString().trim());
        sheet.getRange(i + 1, 2).setValue(params.novoContato ? params.novoContato.toString().trim() : '');
        
        atualizarNomeRevendedorGlobal(ss, params.nomeAntigo.toString().trim(), params.novoNome.toString().trim());
        break;
      }
    }
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  // 6. EXCLUIR REVENDEDOR
  if (action === 'delRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() == params.nome.toString().trim()) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  // 7. FECHAMENTO
  if (action === 'fechamento') {
    const sheetRepasse = ss.getSheetByName('Repasses');
    const sheetInv = ss.getSheetByName('Inventario');
    const dataRep = sheetRepasse.getDataRange().getValues();
    
    for (let i = 1; i < dataRep.length; i++) {
      if (dataRep[i][0].toString().trim() == params.revendedor.toString().trim() && dataRep[i][5] == 'Pendente') {
        sheetRepasse.getRange(i + 1, 6).setValue('Pago');
        if (sheetInv) {
          const dataInv = sheetInv.getDataRange().getValues();
          for (let j = 1; j < dataInv.length; j++) {
            if (dataInv[j][0].toString().trim() == dataRep[i][1].toString().trim()) {
              sheetInv.getRange(j + 1, 3).setValue('Vendido');
            }
          }
        }
      }
    }
    
    const sheetFechamento = getOrCreateSheet(ss, 'Fechamentos', ['Revendedor', 'Data', 'Observacoes']);
    sheetFechamento.appendRow([params.revendedor, new Date(), params.obs]);
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }
}

function atualizarNomeRevendedorGlobal(ss, antigo, novo) {
  const sheetInv = ss.getSheetByName('Inventario');
  if (sheetInv) {
    const data = sheetInv.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][2].toString().trim() == antigo) sheetInv.getRange(i + 1, 3).setValue(novo);
    }
  }
  const sheetRep = ss.getSheetByName('Repasses');
  if (sheetRep) {
    const data = sheetRep.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() == antigo) sheetRep.getRange(i + 1, 1).setValue(novo);
    }
  }
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}
