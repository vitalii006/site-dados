// Verificação opcional, sem dependências: node verificar.cjs
// Testa a lógica; não substitui testes do Papa Parse ou do navegador.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const contexto = vm.createContext({ console, Intl, Date, document: { addEventListener() {} } });
vm.runInContext(fs.readFileSync(path.join(__dirname, "script.js"), "utf8"), contexto);

// Os dois arquivos fornecidos têm campos simples sem aspas ou vírgulas internas.
// Esta leitura serve somente para verificar a lógica com esses arquivos conhecidos.
function lerBaseSimples(nome) {
  const linhas = fs.readFileSync(path.join(__dirname, nome), "utf8").trim().split(/\r?\n/);
  assert.ok(linhas.every(linha => !linha.includes('"')), "Use o Papa Parse para bases com aspas.");
  const cabecalho = linhas.shift().split(",");
  return linhas.map(linha => {
    const valores = linha.split(",");
    assert.equal(valores.length, cabecalho.length);
    return Object.fromEntries(cabecalho.map((chave, i) => [chave, valores[i]]));
  });
}

contexto.amostra = [
  { data: "2026-07-01", produto: "A", quantidade: "2", preco_unitario: "10,50", tempo_espera_min: "0", avaliacao: "5", canal: "Balcão", categoria: "Lanche" },
  { data: "2026-07-02", produto: "B", quantidade: "1", preco_unitario: "9", tempo_espera_min: "", avaliacao: "", canal: "Delivery", categoria: "Bebida" },
  { data: "2026-07-02", produto: "A", quantidade: "0", preco_unitario: "0", tempo_espera_min: "20", avaliacao: "3", canal: "Balcão", categoria: "Lanche" }
];
vm.runInContext("globalThis.validos = validarRegistros(amostra); globalThis.indicadores = calcularIndicadores(validos.registros)", contexto);
assert.equal(contexto.validos.descartados, 0);
assert.equal(contexto.indicadores.receita, 30);
assert.equal(contexto.indicadores.unidades, 3);
assert.equal(contexto.indicadores.medio, 10);
assert.equal(contexto.indicadores.espera.valor, 10);
assert.equal(contexto.indicadores.espera.quantidade, 2);
assert.equal(contexto.indicadores.avaliacao.valor, 4);
assert.equal(contexto.validos.registros[1].tempo_espera_min, null);
assert.equal(vm.runInContext('numeroCSV("1.234,56")', contexto), 1234.56);
assert.equal(vm.runInContext('numeroCSV("")', contexto), null);
assert.ok(vm.runInContext('Number.isNaN(numeroCSV("abc"))', contexto));
assert.equal(vm.runInContext('dataValida("2026-02-30")', contexto), false);
assert.equal(vm.runInContext('dataValida("2024-02-29")', contexto), true);

contexto.invalidos = [
  { ...contexto.amostra[0], data: "2026-02-30" },
  { ...contexto.amostra[0], quantidade: "" },
  { ...contexto.amostra[0], quantidade: "1.5" },
  { ...contexto.amostra[0], preco_unitario: "" },
  { ...contexto.amostra[0], preco_unitario: "10.555" },
  { ...contexto.amostra[0], tempo_espera_min: "-1" },
  { ...contexto.amostra[0], avaliacao: "0" }
];
assert.equal(vm.runInContext("validarRegistros(invalidos).descartados", contexto), 7);
assert.equal(vm.runInContext('validarRegistros(amostra, [{row: 0}]).descartados', contexto), 1);
assert.equal(vm.runInContext("validarRegistros([amostra[0], amostra[0]]).registros.length", contexto), 2);
assert.equal(vm.runInContext('filtrarRegistros(validos.registros, {start:"2026-07-02", canal:"Balcão", categoria:"Lanche", search:"a"}).length', contexto), 1);
assert.equal(vm.runInContext('filtrarRegistros(validos.registros, {search:"DELIVERY"}).length', contexto), 1);
assert.equal(vm.runInContext('filtrarRegistros(validos.registros, {start:"2027-01-01"}).length', contexto), 0);
assert.equal(vm.runInContext('filtrarRegistros(validos.registros, {}).length', contexto), 3);
assert.equal(vm.runInContext('calcularIndicadores([]).espera.valor', contexto), null);
assert.equal(vm.runInContext('calcularIndicadores([]).medio', contexto), null);

contexto.original = lerBaseSimples("vendas_hamburgueria.csv");
contexto.exemplo = lerBaseSimples("dados-exemplo.csv");
assert.equal(vm.runInContext('CSV_EXEMPLO.trim()', contexto), fs.readFileSync(path.join(__dirname, "dados-exemplo.csv"), "utf8").trim());
vm.runInContext("globalThis.base = validarRegistros(original); globalThis.totais = calcularIndicadores(base.registros)", contexto);
assert.equal(contexto.base.registros.length, 1367);
assert.equal(contexto.base.descartados, 0);
// Totais conferidos de forma independente com Import-Csv e decimal no PowerShell.
assert.equal(contexto.totais.receita, 36506);
assert.equal(contexto.totais.unidades, 2060);
assert.equal(contexto.totais.espera.quantidade, 1367);
assert.equal(contexto.totais.espera.valor, 40329 / 1367);
assert.equal(contexto.totais.avaliacao.quantidade, 1231);
assert.equal(contexto.totais.avaliacao.valor, 4836 / 1231);
assert.equal(vm.runInContext('validarRegistros(exemplo).descartados', contexto), 0);

vm.runInContext('estado.filtrados = validos.registros; estado.ordem = "preco_unitario"; estado.direcao = 1', contexto);
assert.equal(vm.runInContext('registrosOrdenados()[0].preco_unitario', contexto), 0);
vm.runInContext('estado.direcao = -1', contexto);
assert.equal(vm.runInContext('registrosOrdenados()[0].preco_unitario', contexto), 10.5);
assert.equal(vm.runInContext('filtrarRegistros(validos.registros, {produto:"A"}).length', contexto), 2);
assert.equal(vm.runInContext('filtrarRegistros(validos.registros, {produto:"A", canal:"Delivery"}).length', contexto), 0);
assert.equal(vm.runInContext('resumirProdutos(validos.registros)[0].produto', contexto), "A");
assert.equal(vm.runInContext('resumirProdutos(validos.registros)[0].centavos', contexto), 2100);
assert.equal(vm.runInContext('resumirProdutos(validos.registros)[0].minimo', contexto), 0);
assert.equal(vm.runInContext('resumirProdutos(validos.registros)[0].maximo', contexto), 10.5);
assert.equal(vm.runInContext('resumirProdutos(validos.registros, "quantidade")[0].quantidade', contexto), 2);
assert.equal(vm.runInContext('precosRecentes(validos.registros).find(r => r.produto === "A").preco_unitario', contexto), 0);
contexto.empates = [contexto.amostra[0], { ...contexto.amostra[0], preco_unitario: "12" }];
assert.equal(vm.runInContext('precosRecentes(validarRegistros(empates).registros)[0].preco_unitario', contexto), 12);
assert.equal(vm.runInContext('resumirProdutos([]).length', contexto), 0);
assert.equal(vm.runInContext('precosRecentes([]).length', contexto), 0);
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const script = fs.readFileSync(path.join(__dirname, "script.js"), "utf8");
for (const referencia of script.matchAll(/\$\("([^"]+)"\)/g)) assert.ok(ids.has(referencia[1]), `Controle ausente: ${referencia[1]}`);
assert.ok(fs.existsSync(path.join(__dirname, "assets", "burger-arena.svg")));
console.log("Verificações aprovadas: cálculos, validações, filtros combinados e por produto, ordenação, ranking dos cards, faixa de preços, preço mais recente e referências aos controles.");
console.log("Base original: 1.367 registros, receita R$ 36.506,00, 2.060 itens, 1.231 avaliações.");
