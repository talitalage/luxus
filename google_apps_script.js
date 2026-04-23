/**
 * Script Luxus v3.2 - Suporte a Contatos e Localização
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
  if (range.getNumRows() < 2) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  
  const data = range.getValues();
  const headers = data.shift();
  const json = data.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      if (h) obj[h.toString().trim()] = row[i];
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

  if (action === 'addInventario') {
    const sheet = getOrCreateSheet(ss, 'Inventario', ['Codigo', 'Data', 'Status', 'Custo', 'Venda', 'Foto']);
    sheet.appendRow([params.codigo, params.data || new Date(), 'Em Estoque', '', '', '']);
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'editInventario') {
    const sheet = ss.getSheetByName('Inventario');
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().trim());
    
    const colCusto = headers.indexOf('Custo') + 1;
    const colVenda = headers.indexOf('Venda') + 1;
    const colFoto = headers.indexOf('Foto') + 1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == params.codigo) {
        if (colCusto > 0) sheet.getRange(i + 1, colCusto).setValue(params.custo);
        if (colVenda > 0) sheet.getRange(i + 1, colVenda).setValue(params.venda);
        if (colFoto > 0) sheet.getRange(i + 1, colFoto).setValue(params.foto);
        break;
      }
    }
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

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
        if (dataInv[i][0] == params.codigo && dataInv[i][2] == 'Em Estoque') {
          sheetInv.getRange(i + 1, 3).setValue(params.revendedor); // Agora salva o nome do revendedor direto no status/localização
          break;
        }
      }
    }
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'addRevendedor') {
    const sheet = getOrCreateSheet(ss, 'Revendedores', ['Nome', 'Contato']);
    sheet.appendRow([params.nome, params.contato || '']);
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'delRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == params.nome) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'fechamento') {
    const sheetRepasse = ss.getSheetByName('Repasses');
    const sheetInv = ss.getSheetByName('Inventario');
    const dataRep = sheetRepasse.getDataRange().getValues();
    
    // Marcar repasses como pagos
    for (let i = 1; i < dataRep.length; i++) {
      if (dataRep[i][0] == params.revendedor && dataRep[i][5] == 'Pendente') {
        sheetRepasse.getRange(i + 1, 6).setValue('Pago');
        
        // Se foi pago, volta para o estoque ou fica como vendido? 
        // Geralmente fechamento de semi joia o item sai do controle.
        // Vou manter como 'Vendido' no inventário para histórico.
        if (sheetInv) {
          const dataInv = sheetInv.getDataRange().getValues();
          for (let j = 1; j < dataInv.length; j++) {
            if (dataInv[j][0] == dataRep[i][1] && dataInv[j][2] == params.revendedor) {
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

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  } else {
    // Garantir que cabeçalhos existam
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      sheet.appendRow(headers);
    }
  }
  return sheet;
}
