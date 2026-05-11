// =====================================================
// LUXUS — Google Apps Script
// Salva todos os dados em luxus_data.json no Drive
// =====================================================

var ARQUIVO_JSON = 'luxus_data.json';
var PASTA_ID     = '1a8XrgDHZ9-jceFLQa4_7DVDP0n06We7T';

// =====================================================
// UTILITÁRIOS — ler e salvar JSON no Drive
// =====================================================
function getArquivo() {
  var files = DriveApp.getFilesByName(ARQUIVO_JSON);
  if (files.hasNext()) return files.next();
  return null;
}

function lerDados() {
  var file = getArquivo();
  if (!file) {
    return dadosVazios();
  }
  try {
    var conteudo = file.getBlob().getDataAsString();
    var dados = JSON.parse(conteudo);
    // Garantir estrutura completa
    if (!dados.inventory)    dados.inventory    = [];
    if (!dados.revendedores) dados.revendedores = [];
    if (!dados.categorias)   dados.categorias   = {'Semi Joia':[], 'Perfume':[]};
    if (!dados.fechamentos)  dados.fechamentos  = [];
    return dados;
  } catch(e) {
    return dadosVazios();
  }
}

function salvarDados(dados) {
  var conteudo = JSON.stringify(dados, null, 2);
  var file = getArquivo();
  if (file) {
    file.setContent(conteudo);
  } else {
    DriveApp.createFile(ARQUIVO_JSON, conteudo, MimeType.PLAIN_TEXT);
  }
}

function dadosVazios() {
  return {
    inventory:    [],
    revendedores: [],
    categorias:   {'Semi Joia': [], 'Perfume': []},
    fechamentos:  []
  };
}

// =====================================================
// GET — leitura
// =====================================================
function doGet(e) {
  var action  = e.parameter.action;
  var payload = e.parameter.payload;
  var result;

  try {
    // Se veio payload codificado (operações de escrita via GET para evitar CORS)
    if (payload) {
      var data = JSON.parse(decodeURIComponent(payload));
      result = processarAcao(data, lerDados());
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Leituras normais via action
    var dados = lerDados();
    if (action === 'getTudo') {
      result = dados;
    } else if (action === 'getInventario') {
      result = dados.inventory;
    } else if (action === 'getRevendedores') {
      result = dados.revendedores;
    } else if (action === 'getCategorias') {
      var lista = [];
      Object.keys(dados.categorias).forEach(function(tipo) {
        (dados.categorias[tipo] || []).forEach(function(nome) {
          lista.push({Tipo: tipo, Nome: nome});
        });
      });
      result = lista;
    } else if (action === 'getFechamentos') {
      result = dados.fechamentos;
    } else {
      result = { error: 'Ação não reconhecida: ' + action };
    }
  } catch(err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var result;
  try {
    var data  = JSON.parse(e.postData.contents);
    var dados = lerDados();
    result = processarAcao(data, dados);
  } catch(err) {
    result = { success: false, error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Processa qualquer action — usado tanto pelo GET (payload) quanto pelo POST
function processarAcao(data, dados) {
  var action = data.action;
  var result;

    if (action === 'addInventario') {
      var novoItem = {
        rowId:      Date.now(),
        Codigo:     data.codigo     || '',
        Descricao:  data.descricao  || '',
        Tipo:       data.tipo       || '',
        Categoria:  data.categoria  || '',
        Status:     data.status     || 'Em Estoque',
        Revendedor: data.revendedor || '',
        Custo:      parseFloat(data.custo) || 0,
        Venda:      parseFloat(data.venda) || 0,
        Foto:       data.foto       || '',
        Data:       data.data       || new Date().toISOString()
      };
      dados.inventory.push(novoItem);
      salvarDados(dados);
      result = { success: true, rowId: novoItem.rowId };

    } else if (action === 'editInventario') {
      var idx = dados.inventory.findIndex(function(i) {
        return String(i.rowId) === String(data.rowId);
      });
      if (idx !== -1) {
        var item = dados.inventory[idx];
        if (data.codigo     !== undefined) item.Codigo     = data.codigo;
        if (data.descricao  !== undefined) item.Descricao  = data.descricao;
        if (data.tipo       !== undefined) item.Tipo       = data.tipo;
        if (data.categoria  !== undefined) item.Categoria  = data.categoria;
        if (data.status     !== undefined) item.Status     = data.status;
        if (data.revendedor !== undefined) item.Revendedor = data.revendedor;
        if (data.custo      !== undefined) item.Custo      = parseFloat(data.custo) || 0;
        if (data.venda      !== undefined) item.Venda      = parseFloat(data.venda) || 0;
        if (data.foto       !== undefined) item.Foto       = data.foto;
        dados.inventory[idx] = item;
        salvarDados(dados);
        result = { success: true };
      } else {
        result = { success: false, error: 'Item não encontrado: ' + data.rowId };
      }

    } else if (action === 'delInventario') {
      var antes = dados.inventory.length;
      dados.inventory = dados.inventory.filter(function(i) {
        return String(i.rowId) !== String(data.rowId);
      });
      salvarDados(dados);
      result = { success: dados.inventory.length < antes };

    // ── REVENDEDORES ──
    } else if (action === 'addRevendedor') {
      var novoRev = {
        rowId:      Date.now(),
        Nome:       data.nome       || '',
        Contato:    data.contato    || '',
        Percentual: parseFloat(data.percentual) || 30
      };
      dados.revendedores.push(novoRev);
      salvarDados(dados);
      result = { success: true, rowId: novoRev.rowId };

    } else if (action === 'editRevendedor') {
      var idxR = dados.revendedores.findIndex(function(r) {
        return String(r.rowId) === String(data.rowId);
      });
      if (idxR !== -1) {
        var rev = dados.revendedores[idxR];
        if (data.nome       !== undefined) rev.Nome       = data.nome;
        if (data.contato    !== undefined) rev.Contato    = data.contato;
        if (data.percentual !== undefined) rev.Percentual = parseFloat(data.percentual) || 30;
        dados.revendedores[idxR] = rev;
        salvarDados(dados);
        result = { success: true };
      } else {
        result = { success: false, error: 'Revendedor não encontrado' };
      }

    } else if (action === 'delRevendedor') {
      dados.revendedores = dados.revendedores.filter(function(r) {
        return String(r.rowId) !== String(data.rowId);
      });
      salvarDados(dados);
      result = { success: true };

    // ── CATEGORIAS ──
    } else if (action === 'addCategoria') {
      var tipo = data.tipo; var nome = data.nome;
      if (!dados.categorias[tipo]) dados.categorias[tipo] = [];
      if (!dados.categorias[tipo].includes(nome)) {
        dados.categorias[tipo].push(nome);
        salvarDados(dados);
      }
      result = { success: true };

    } else if (action === 'delCategoria') {
      var tipoD = data.tipo; var nomeD = data.nome;
      if (dados.categorias[tipoD]) {
        dados.categorias[tipoD] = dados.categorias[tipoD].filter(function(n) { return n !== nomeD; });
        salvarDados(dados);
      }
      result = { success: true };

    // ── FECHAMENTOS ──
    } else if (action === 'addFechamento') {
      var fech = {
        id:             Date.now(),
        data:           new Date().toISOString(),
        revendedor:     data.revendedor     || '',
        percentual:     data.percentual     || 30,
        qtdConsignados: data.qtdConsignados || 0,
        qtdVendidos:    data.qtdVendidos    || 0,
        qtdDevolvidos:  data.qtdDevolvidos  || 0,
        valorConsignado:data.valorConsignado|| 0,
        valorDevolvido: data.valorDevolvido || 0,
        valorVendido:   data.valorVendido   || 0,
        comissao:       data.comissao       || 0,
        lucro:          data.lucro          || 0,
        itensVendidos:  data.itensVendidos  || [],
        itensDevolvidos:data.itensDevolvidos|| []
      };
      dados.fechamentos.unshift(fech);
      salvarDados(dados);
      result = { success: true, id: fech.id };

    // ── SYNC COMPLETO (sobrescreve tudo) ──
    } else if (action === 'syncTudo') {
      // Recebe o estado completo do localStorage e salva no Drive
      if (data.inventory)    dados.inventory    = data.inventory;
      if (data.revendedores) dados.revendedores = data.revendedores;
      if (data.categorias)   dados.categorias   = data.categorias;
      if (data.fechamentos)  dados.fechamentos  = data.fechamentos;
      salvarDados(dados);
      result = { success: true, msg: 'Sync completo realizado' };

    } else {
    result = { success: false, error: 'Ação não reconhecida: ' + action };
  }

  salvarDados(dados);
  return result;
}

// =====================================================
// FUNÇÕES AUXILIARES — executar manualmente no editor
// =====================================================

// Execute esta função para criar o arquivo JSON vazio no Drive
function criarArquivoInicial() {
  var file = getArquivo();
  if (file) {
    Logger.log('Arquivo já existe: ' + file.getUrl());
  } else {
    var novo = DriveApp.getFolderById(PASTA_ID).createFile(ARQUIVO_JSON, JSON.stringify(dadosVazios(), null, 2), MimeType.PLAIN_TEXT);
    Logger.log('Arquivo criado em: ' + novo.getUrl());
  }
}

// Execute para ver o conteúdo atual do JSON
function verDados() {
  var dados = lerDados();
  Logger.log('Inventário: '    + dados.inventory.length    + ' itens');
  Logger.log('Revendedores: '  + dados.revendedores.length + ' registros');
  Logger.log('Fechamentos: '   + dados.fechamentos.length  + ' registros');
  Logger.log('Categorias Semi Joia: ' + (dados.categorias['Semi Joia']||[]).length);
  Logger.log('Categorias Perfume: '   + (dados.categorias['Perfume']||[]).length);
}

// Execute para migrar dados da planilha para o JSON
function migrarPlanilhaParaJSON() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dados = lerDados();

  // Migrar Inventário
  var sheetInv = ss.getSheetByName('Inventario');
  if (sheetInv) {
    var rowsInv = sheetInv.getDataRange().getValues();
    var headers = rowsInv[0];
    dados.inventory = [];
    for (var i = 1; i < rowsInv.length; i++) {
      var r = rowsInv[i];
      if (!r[1]) continue; // pula se não tem código
      dados.inventory.push({
        rowId:      r[headers.indexOf('rowId')]      || Date.now() + i,
        Codigo:     r[headers.indexOf('Codigo')]     || '',
        Descricao:  r[headers.indexOf('Descricao')]  || '',
        Tipo:       r[headers.indexOf('Tipo')]        || '',
        Categoria:  r[headers.indexOf('Categoria')]  || '',
        Status:     r[headers.indexOf('Status')]     || 'Em Estoque',
        Revendedor: r[headers.indexOf('Revendedor')] || '',
        Custo:      parseFloat(r[headers.indexOf('Custo')]) || 0,
        Venda:      parseFloat(r[headers.indexOf('Venda')]) || 0,
        Foto:       r[headers.indexOf('Foto')]       || '',
        Data:       r[headers.indexOf('Data')]       || ''
      });
    }
    Logger.log('Inventário migrado: ' + dados.inventory.length + ' itens');
  }

  // Migrar Revendedores
  var sheetRev = ss.getSheetByName('Revendedores');
  if (sheetRev) {
    var rowsRev = sheetRev.getDataRange().getValues();
    var hRev = rowsRev[0];
    dados.revendedores = [];
    for (var j = 1; j < rowsRev.length; j++) {
      var rv = rowsRev[j];
      if (!rv[1]) continue;
      var pct = String(rv[hRev.indexOf('Percentual')]).replace('%','').replace(',','.').trim();
      dados.revendedores.push({
        rowId:      rv[hRev.indexOf('rowId')]  || Date.now() + j,
        Nome:       rv[hRev.indexOf('Nome')]   || '',
        Contato:    rv[hRev.indexOf('Contato')]|| '',
        Percentual: parseFloat(pct) || 30
      });
    }
    Logger.log('Revendedores migrados: ' + dados.revendedores.length);
  }

  // Migrar Categorias
  var sheetCat = ss.getSheetByName('Categorias');
  if (sheetCat) {
    var rowsCat = sheetCat.getDataRange().getValues();
    dados.categorias = {'Semi Joia': [], 'Perfume': []};
    for (var k = 1; k < rowsCat.length; k++) {
      var tipo = rowsCat[k][0]; var nome = rowsCat[k][1];
      if (!tipo || !nome) continue;
      if (!dados.categorias[tipo]) dados.categorias[tipo] = [];
      dados.categorias[tipo].push(nome);
    }
    Logger.log('Categorias migradas');
  }

  salvarDados(dados);
  Logger.log('✅ Migração concluída! Arquivo: ' + getArquivo().getUrl());
}

// =====================================================
// TESTE rápido
// =====================================================
function testar() {
  Logger.log('=== TESTE LUXUS JSON ===');
  verDados();
  Logger.log('Arquivo: ' + (getArquivo() ? getArquivo().getUrl() : 'NÃO EXISTE — execute criarArquivoInicial()'));
}
