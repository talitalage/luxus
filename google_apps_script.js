/**
 * Script Luxus v3.0
 * Certifique-se de que a aba "Inventario" tenha os cabeçalhos:
 * Codigo | Data | Status | Custo | Venda | Foto
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getInventario') return getSheetData(ss, 'Inventario');
  if (action === 'getRepasses') return getSheetData(ss, 'Repasses');
  if (action === 'getRevendedores') return getSheetData(ss, 'Revendedores');
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const json = data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const params = JSON.parse(e.postData.contents);
  const action = params.action;

  if (action === 'addInventario') {
    const sheet = ss.getSheetByName('Inventario');
    sheet.appendRow([params.codigo, params.data || new Date(), 'Em Estoque', '', '', '']);
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'editInventario') {
    const sheet = ss.getSheetByName('Inventario');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == params.codigo) {
        sheet.getRange(i + 1, 4).setValue(params.custo);
        sheet.getRange(i + 1, 5).setValue(params.venda);
        sheet.getRange(i + 1, 6).setValue(params.foto);
        break;
      }
    }
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'addRepasse') {
    const sheetRepasse = ss.getSheetByName('Repasses');
    const sheetInv = ss.getSheetByName('Inventario');
    sheetRepasse.appendRow([
      params.revendedor, 
      params.codigo, 
      params.custo, 
      params.venda, 
      params.data || new Date(), 
      'Pendente'
    ]);
    const data = sheetInv.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == params.codigo && data[i][2] == 'Em Estoque') {
        sheetInv.getRange(i + 1, 3).setValue('Com ' + params.revendedor);
        break;
      }
    }
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'addRevendedor') {
    const sheet = ss.getSheetByName('Revendedores');
    sheet.appendRow([params.nome]);
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
    const data = sheetRepasse.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == params.revendedor && data[i][5] == 'Pendente') {
        sheetRepasse.getRange(i + 1, 6).setValue('Pago');
      }
    }
    const sheetFechamento = ss.getSheetByName('Fechamentos');
    sheetFechamento.appendRow([params.revendedor, new Date(), params.obs]);
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }
}
