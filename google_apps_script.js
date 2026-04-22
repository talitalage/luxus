/**
 * Script para Gestão de Semi Joias
 * 1. Crie uma planilha no Google Sheets com 3 abas: "Inventario", "Repasses" e "Fechamentos".
 * 2. No menu Extensões > Apps Script, cole este código.
 * 3. Clique em Implantar > Nova Implantação > App da Web.
 * 4. Configure: Executar como "Eu" e Quem tem acesso "Qualquer pessoa".
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getInventario') {
    const sheet = ss.getSheetByName('Inventario');
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    const json = data.map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getRepasses') {
    const sheet = ss.getSheetByName('Repasses');
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    const json = data.map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const params = JSON.parse(e.postData.contents);
  const action = params.action;

  if (action === 'addInventario') {
    const sheet = ss.getSheetByName('Inventario');
    sheet.appendRow([params.codigo, new Date(), 'Em Estoque']);
    return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'addRepasse') {
    const sheetRepasse = ss.getSheetByName('Repasses');
    const sheetInv = ss.getSheetByName('Inventario');
    
    // Adicionar ao repasse
    sheetRepasse.appendRow([
      params.revendedor, 
      params.codigo, 
      params.custo, 
      params.venda, 
      new Date(), 
      'Pendente'
    ]);

    // Atualizar status no inventário
    const data = sheetInv.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == params.codigo && data[i][2] == 'Em Estoque') {
        sheetInv.getRange(i + 1, 3).setValue('Com ' + params.revendedor);
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
