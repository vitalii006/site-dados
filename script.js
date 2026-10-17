"use strict";

// O exemplo também fica embutido para funcionar ao abrir index.html por file://.
// Mantenha este texto igual a dados-exemplo.csv ao editar a demonstração.
const CSV_EXEMPLO = `id_venda,data,dia_semana,periodo,produto,categoria,quantidade,preco_unitario,forma_pagamento,canal,tempo_espera_min,avaliacao
DEMO-01,2026-07-01,Quarta,Almoço,X-Burger,Lanche,2,22.90,Pix,Balcão,10,5
DEMO-02,2026-07-01,Quarta,Noite,X-Bacon,Lanche,1,29.90,Cartão,Delivery,35,4
DEMO-03,2026-07-01,Quarta,Noite,Refrigerante,Bebida,2,6.90,Pix,Delivery,35,
DEMO-04,2026-07-02,Quinta,Almoço,Batata frita,Acompanhamento,1,14.90,Dinheiro,Balcão,12,4
DEMO-05,2026-07-02,Quinta,Noite,X-Bacon,Lanche,3,29.90,Cartão,Delivery,40,3
DEMO-06,2026-07-02,Quinta,Tarde,Milkshake,Sobremesa,1,16.90,Pix,Balcão,8,5
DEMO-07,2026-07-03,Sexta,Almoço,X-Burger,Lanche,2,22.90,Pix,Balcão,0,5
DEMO-08,2026-07-03,Sexta,Noite,X-Tudo,Lanche,2,34.90,Cartão,Delivery,45,3
DEMO-09,2026-07-03,Sexta,Noite,Refrigerante,Bebida,3,6.90,Pix,Delivery,,4
DEMO-10,2026-07-04,Sábado,Almoço,Batata frita,Acompanhamento,2,14.90,Dinheiro,Balcão,15,
DEMO-11,2026-07-04,Sábado,Tarde,Milkshake,Sobremesa,2,16.90,Pix,Balcão,9,5
DEMO-12,2026-07-04,Sábado,Noite,X-Tudo,Lanche,3,34.90,Cartão,Delivery,38,4`;
const COLUNAS = [
  ["id_venda", "ID"], ["data", "Data"], ["dia_semana", "Dia"],
  ["periodo", "Período"], ["produto", "Produto"], ["categoria", "Categoria"],
  ["quantidade", "Quantidade"], ["preco_unitario", "Preço unitário"],
  ["receita", "Receita"], ["forma_pagamento", "Pagamento"], ["canal", "Canal"],
  ["tempo_espera_min", "Espera (min)"], ["avaliacao", "Avaliação (1–5)"]
];
const OBRIGATORIAS = ["data", "produto", "quantidade", "preco_unitario"];
const NUMERICAS = new Set(["quantidade", "preco_unitario", "receita", "tempo_espera_min", "avaliacao"]);
const TAMANHO_PAGINA = 25;
const estado = { registros: [], filtrados: [], pagina: 1, ordem: "data", direcao: 1, graficos: {} };
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const $ = id => document.getElementById(id);

function numeroCSV(valor) {
  const texto = String(valor ?? "").trim();
  if (!texto) return null; // Campo vazio não é zero.
  const normalizado = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalizado)) return NaN;
  return Number(normalizado);
}

function dataValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || texto.startsWith("0000")) return false;
  const data = new Date(`${texto}T12:00:00Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === texto;
}

function validarRegistros(linhas, erros = []) {
  const motivos = {};
  const invalidasCSV = new Set(erros.filter(e => Number.isInteger(e.row)).map(e => e.row));
  const registros = [];
  let descartados = 0;
  linhas.forEach((linha, indice) => {
    const registro = {};
    COLUNAS.filter(([chave]) => chave !== "receita").forEach(([chave]) => {
      registro[chave] = String(linha[chave] ?? "").trim();
    });
    const falhas = [];
    if (invalidasCSV.has(indice)) falhas.push("estrutura CSV inconsistente");
    if (!dataValida(registro.data)) falhas.push("data ausente ou inválida (use AAAA-MM-DD)");
    if (!registro.produto) falhas.push("produto ausente");
    NUMERICAS.forEach(chave => { if (chave !== "receita") registro[chave] = numeroCSV(registro[chave]); });
    if (!Number.isSafeInteger(registro.quantidade) || registro.quantidade < 0) falhas.push("quantidade ausente, negativa ou não inteira");
    if (registro.preco_unitario === null || !Number.isFinite(registro.preco_unitario) || registro.preco_unitario < 0 || Math.abs(registro.preco_unitario * 100 - Math.round(registro.preco_unitario * 100)) > 0.000001) falhas.push("preço ausente, negativo ou inválido (máximo 2 casas decimais)");
    if (registro.tempo_espera_min !== null && (!Number.isFinite(registro.tempo_espera_min) || registro.tempo_espera_min < 0)) falhas.push("tempo de espera inválido ou negativo");
    if (registro.avaliacao !== null && (!Number.isInteger(registro.avaliacao) || registro.avaliacao < 1 || registro.avaliacao > 5)) falhas.push("avaliação inválida (use inteiro de 1 a 5)");
    // Cálculos monetários em centavos evitam diferenças de ponto flutuante.
    registro.centavos = Math.round(registro.preco_unitario * 100) * registro.quantidade;
    if (!falhas.length && !Number.isSafeInteger(registro.centavos)) falhas.push("receita fora do limite numérico seguro");
    if (falhas.length) {
      descartados++;
      falhas.forEach(motivo => { motivos[motivo] = (motivos[motivo] || 0) + 1; });
    } else {
      registro.receita = registro.centavos / 100;
      registros.push(registro);
    }
  });
  return { registros, descartados, motivos };
}

function calcularIndicadores(registros) {
  const media = chave => {
    const presentes = registros.filter(r => r[chave] !== null);
    return { valor: presentes.length ? presentes.reduce((soma, r) => soma + r[chave], 0) / presentes.length : null, quantidade: presentes.length };
  };
  const centavos = registros.reduce((soma, r) => soma + r.centavos, 0);
  return { receita: centavos / 100, unidades: registros.reduce((soma, r) => soma + r.quantidade, 0),
    medio: registros.length ? centavos / 100 / registros.length : null,
    espera: media("tempo_espera_min"), avaliacao: media("avaliacao") };
}

function importarCSV(conteudo, nome, demonstracao = false) {
  if (!window.Papa) { $("status").textContent = "Não foi possível carregar o leitor CSV. Verifique a conexão e recarregue a página."; return; }
  $("status").textContent = "Lendo e validando o CSV…";
  Papa.parse(conteudo, {
    header: true, skipEmptyLines: "greedy", encoding: "UTF-8",
    transformHeader: cabecalho => cabecalho.replace(/^\uFEFF/, "").trim(),
    complete: resultado => {
      const campos = resultado.meta.fields || [];
      const ausentes = OBRIGATORIAS.filter(c => !campos.includes(c));
      if (ausentes.length) { $("status").textContent = `Importação cancelada. Colunas obrigatórias ausentes: ${ausentes.join(", ")}. A base anterior foi mantida.`; return; }
      if (resultado.meta.renamedHeaders || resultado.errors.some(e => e.type === "Quotes" || e.code === "UndetectableDelimiter")) {
        $("status").textContent = "Importação cancelada: cabeçalhos duplicados, separador não reconhecido ou aspas malformadas. Corrija o CSV. A base anterior foi mantida."; return;
      }
      const validacao = validarRegistros(resultado.data, resultado.errors);
      if (!Number.isSafeInteger(validacao.registros.reduce((total, r) => total + r.centavos, 0))) {
        $("status").textContent = "Importação cancelada: receita total excede o limite numérico seguro. A base anterior foi mantida."; return;
      }
      estado.registros = validacao.registros;
      const ehDemo = demonstracao || (estado.registros.length > 0 && estado.registros.every(r => r.id_venda.startsWith("DEMO-")));
      $("source").className = `source${ehDemo ? " demo" : ""}`;
      $("source").textContent = ehDemo ? `BASE FICTÍCIA · ${nome} · Demonstração para aprendizado; não representa vendas reais.` : `BASE IMPORTADA · ${nome} · Origem e natureza dos dados conforme o arquivo fornecido.`;
      exibirQualidade(validacao, resultado.data.length, campos);
      preencherFiltros();
      preencherCombo();
      limparFiltros();
      $("status").textContent = `Importação concluída: ${numero.format(estado.registros.length)} registros válidos; ${numero.format(validacao.descartados)} descartados. Consulte os motivos em “Qualidade e validação dos dados”.`;
    },
    error: erro => { $("status").textContent = `Não foi possível ler o arquivo: ${erro.message}. A base anterior foi mantida.`; }
  });
}

function exibirQualidade(validacao, total, campos) {
  const registros = validacao.registros;
  const linhasUnicas = new Set(registros.map(r => JSON.stringify(r)));
  const ids = registros.map(r => r.id_venda).filter(Boolean);
  const extras = campos.filter(c => !COLUNAS.some(([chave]) => chave === c));
  const motivos = Object.entries(validacao.motivos).map(([motivo, qtd]) => `• ${qtd}: ${motivo}`).join("\n");
  $("quality").textContent = `${total} registros lidos; ${registros.length} válidos; ${validacao.descartados} descartados.\n${motivos ? `${motivos}\nUma linha pode ter mais de um motivo de descarte.\n` : "Nenhum registro descartado.\n"}Espera ausente: ${registros.filter(r => r.tempo_espera_min === null).length}. Avaliação ausente: ${registros.filter(r => r.avaliacao === null).length}. Ausências são excluídas somente da respectiva média.\nLinhas idênticas adicionais: ${registros.length - linhasUnicas.size}; IDs repetidos adicionais: ${ids.length - new Set(ids).size}. Todos foram preservados.\n${extras.length ? `Colunas extras ignoradas: ${extras.join(", ")}.\n` : ""}Datas aceitas: AAAA-MM-DD. Valores zero são preservados para quantidade, preço e espera. O dia da semana exibido é calculado pela data.`;
}

function preencherFiltros() {
  const campos = { category: "categoria", channel: "canal", period: "periodo", payment: "forma_pagamento", product: "produto" };
  Object.entries(campos).forEach(([id, chave]) => {
    const select = $(id);
    select.replaceChildren(new Option(id === "category" ? "Todas" : "Todos", ""));
    const valores = [...new Set(estado.registros.map(r => r[chave]))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    valores.forEach(valor => select.add(new Option(valor || "Não informado", valor || "__ausente__")));
  });
}

function filtrarRegistros(registros, filtros) {
  const consulta = (filtros.search || "").toLocaleLowerCase("pt-BR");
  return registros.filter(r => (!filtros.start || r.data >= filtros.start) && (!filtros.end || r.data <= filtros.end)
    && ["categoria", "canal", "periodo", "forma_pagamento", "produto"].every(chave => !filtros[chave] || (r[chave] || "__ausente__") === filtros[chave])
    && (!consulta || COLUNAS.some(([chave]) => String(chave === "dia_semana" ? diaSemana(r.data) : r[chave] ?? "").toLocaleLowerCase("pt-BR").includes(consulta))));
}

function obterFiltros() {
  return { start: $("start").value, end: $("end").value, categoria: $("category").value,
    canal: $("channel").value, periodo: $("period").value, forma_pagamento: $("payment").value,
    produto: $("product").value, search: $("search").value.trim() };
}

function atualizar() {
  const filtros = obterFiltros();
  estado.filtrados = filtrarRegistros(estado.registros, filtros);
  estado.pagina = 1;
  const datasInvertidas = filtros.start && filtros.end && filtros.start > filtros.end;
  $("count").textContent = `${numero.format(estado.filtrados.length)} de ${numero.format(estado.registros.length)} registros válidos após os filtros.${datasInvertidas ? " A data inicial deve ser anterior ou igual à final." : ""}`;
  $("empty").hidden = estado.filtrados.length > 0;
  $("export").disabled = !estado.filtrados.length;
  const valores = calcularIndicadores(estado.filtrados);
  $("revenue").textContent = moeda.format(valores.receita);
  $("units").textContent = numero.format(valores.unidades);
  $("average").textContent = valores.medio === null ? "—" : moeda.format(valores.medio);
  $("wait").textContent = valores.espera.valor === null ? "—" : `${numero.format(valores.espera.valor)} min`;
  $("rating").textContent = valores.avaliacao.valor === null ? "—" : `${numero.format(valores.avaliacao.valor)} / 5`;
  $("wait-count").textContent = `${numero.format(valores.espera.quantidade)} tempos preenchidos`;
  $("rating-count").textContent = `${numero.format(valores.avaliacao.quantidade)} avaliações preenchidas`;
  renderizarGraficos();
  renderizarTabela();
  renderizarCardapio();
}

function limparFiltros() {
  $("filters").reset();
  $("search").value = "";
  atualizar();
}

function agruparReceita(chave) {
  const grupos = new Map();
  estado.filtrados.forEach(r => { const categoria = r[chave] || "Não informado"; grupos.set(categoria, (grupos.get(categoria) || 0) + r.centavos); });
  return [...grupos].map(([categoria, centavos]) => [categoria, centavos / 100]);
}

function desenharGrafico(id, tipo, pares, legenda, unidade, horizontal = false, cor = "#b49aff") {
  if (!window.Chart) return;
  if (estado.graficos[id]) estado.graficos[id].destroy();
  const eixoValor = horizontal ? "x" : "y";
  estado.graficos[id] = new Chart($(id), {
    type: tipo,
    data: { labels: pares.map(p => id === "timeline" ? dataFormatada(p[0]) : p[0]), datasets: [{
      label: legenda, data: pares.map(p => p[1]), backgroundColor: tipo === "line" ? "rgba(180,154,255,.12)" : cor,
      borderColor: cor, borderWidth: tipo === "line" ? 2 : 0, fill: tipo === "line", tension: 0.15,
      pointRadius: pares.length > 35 ? 0 : 3, pointHitRadius: 12, borderRadius: 4, maxBarThickness: 32
    }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, indexAxis: horizontal ? "y" : "x",
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, color: "#b5bdc9", font: { size: 11 } } },
        tooltip: { callbacks: { label: contexto => `${legenda}: ${unidade === "R$" ? moeda.format(contexto.parsed[eixoValor]) : `${numero.format(contexto.parsed[eixoValor])} min`}` } } },
      scales: {
        x: { border: { color: "#363d49" }, grid: { display: horizontal, color: "#363d49" }, ticks: { color: "#b5bdc9", maxRotation: 0, autoSkip: true, maxTicksLimit: horizontal ? 6 : 7 } },
        y: { border: { color: "#363d49" }, grid: { display: !horizontal, color: "#363d49" }, ticks: { color: "#b5bdc9" } }
      }
    }
  });
  const eixo = estado.graficos[id].options.scales[eixoValor];
  eixo.beginAtZero = true;
  eixo.title = { display: true, text: unidade === "R$" ? "Receita (R$)" : "Tempo médio (min)", color: "#b5bdc9" };
  eixo.ticks.callback = valor => numero.format(valor);
  estado.graficos[id].update();
}

function renderizarGraficos() {
  // Os pontos representam apenas dias com registros: não presumimos vendas zero nos dias ausentes.
  desenharGrafico("timeline", "line", agruparReceita("data").sort((a, b) => a[0].localeCompare(b[0])), "Receita nos dias com registros", "R$");
  desenharGrafico("products", "bar", agruparReceita("produto").sort((a, b) => b[1] - a[1]).slice(0, 10), "Receita por produto", "R$", true);
  desenharGrafico("channels", "bar", agruparReceita("canal").sort((a, b) => b[1] - a[1]), "Receita por canal", "R$", true);
  const canais = [...new Set(estado.filtrados.map(r => r.canal))];
  const esperas = canais.map(canal => {
    const presentes = estado.filtrados.filter(r => r.canal === canal && r.tempo_espera_min !== null);
    return [canal || "Não informado", presentes.length ? presentes.reduce((total, r) => total + r.tempo_espera_min, 0) / presentes.length : null];
  });
  desenharGrafico("waiting", "bar", esperas, "Espera média por canal", "min", true, "#ff9547");
}

function dataFormatada(data) { return data.split("-").reverse().join("/"); }
function diaSemana(data) { return new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${data}T12:00:00Z`)); }
function valorOrdenacao(registro, chave) { return chave === "dia_semana" ? diaSemana(registro.data) : registro[chave]; }

function registrosOrdenados() {
  return [...estado.filtrados].sort((a, b) => {
    const valorA = valorOrdenacao(a, estado.ordem), valorB = valorOrdenacao(b, estado.ordem);
    if (valorA === null || valorA === "") return valorB === null || valorB === "" ? 0 : 1;
    if (valorB === null || valorB === "") return -1;
    const comparacao = NUMERICAS.has(estado.ordem) ? valorA - valorB : String(valorA).localeCompare(String(valorB), "pt-BR", { numeric: true });
    return comparacao * estado.direcao;
  });
}

function formatarCelula(registro, chave) {
  const valor = registro[chave];
  if (chave === "dia_semana") return diaSemana(registro.data);
  if (valor === null || valor === "") return "Não informado";
  if (chave === "data") return dataFormatada(valor);
  if (chave === "preco_unitario" || chave === "receita") return moeda.format(valor);
  return NUMERICAS.has(chave) ? numero.format(valor) : valor;
}

function renderizarTabela() {
  const cabecalho = document.createElement("tr");
  COLUNAS.forEach(([chave, titulo]) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.setAttribute("aria-sort", estado.ordem === chave ? (estado.direcao === 1 ? "ascending" : "descending") : "none");
    const botao = document.createElement("button");
    botao.textContent = titulo + (estado.ordem === chave ? (estado.direcao === 1 ? " ↑" : " ↓") : " ↕");
    botao.addEventListener("click", () => {
      estado.direcao = estado.ordem === chave ? -estado.direcao : 1;
      estado.ordem = chave;
      renderizarTabela();
      $("table-head").querySelectorAll("button")[COLUNAS.findIndex(([c]) => c === chave)].focus();
    });
    th.append(botao); cabecalho.append(th);
  });
  $("table-head").replaceChildren(cabecalho);
  const ordenados = registrosOrdenados();
  const inicio = (estado.pagina - 1) * TAMANHO_PAGINA;
  const fragmento = document.createDocumentFragment();
  ordenados.slice(inicio, inicio + TAMANHO_PAGINA).forEach(registro => {
    const tr = document.createElement("tr");
    COLUNAS.forEach(([chave]) => {
      const td = document.createElement("td");
      td.textContent = formatarCelula(registro, chave); // Não interpretamos o CSV como HTML.
      if (NUMERICAS.has(chave)) td.className = "numeric";
      tr.append(td);
    });
    fragmento.append(tr);
  });
  if (!ordenados.length) {
    const tr = document.createElement("tr"), td = document.createElement("td");
    td.colSpan = COLUNAS.length; td.textContent = "Nenhum registro encontrado."; tr.append(td); fragmento.append(tr);
  }
  $("table-body").replaceChildren(fragmento);
  $("page-info").textContent = ordenados.length ? `Registros ${inicio + 1}–${Math.min(inicio + TAMANHO_PAGINA, ordenados.length)} de ${numero.format(ordenados.length)} · Página ${estado.pagina} de ${Math.ceil(ordenados.length / TAMANHO_PAGINA)}` : "0 registros";
  $("previous").disabled = estado.pagina === 1;
  $("next").disabled = inicio + TAMANHO_PAGINA >= ordenados.length;
}

function exportarCSV() {
  if (!window.Papa || !estado.filtrados.length) return;
  const linhas = registrosOrdenados().map(registro => Object.fromEntries(COLUNAS.map(([chave]) => [chave,
    chave === "dia_semana" ? diaSemana(registro.data) : NUMERICAS.has(chave) && registro[chave] !== null ? String(registro[chave]).replace(".", ",") : registro[chave] ?? ""
  ])));
  const csv = Papa.unparse(linhas, { delimiter: ";", newline: "\r\n", escapeFormulae: true });
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url; link.download = "vendas-filtradas.csv"; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Os cards usam somente os preços e as vendas presentes na base.
function resumirProdutos(registros, ordem = "receita") {
  const produtos = new Map();
  registros.forEach(r => {
    if (!produtos.has(r.produto)) produtos.set(r.produto, { produto: r.produto, categoria: r.categoria,
      quantidade: 0, centavos: 0, minimo: r.preco_unitario, maximo: r.preco_unitario });
    const item = produtos.get(r.produto);
    item.quantidade += r.quantidade;
    item.centavos += r.centavos;
    item.minimo = Math.min(item.minimo, r.preco_unitario);
    item.maximo = Math.max(item.maximo, r.preco_unitario);
  });
  return [...produtos.values()].sort((a, b) => (ordem === "quantidade" ? b.quantidade - a.quantidade : b.centavos - a.centavos) || a.produto.localeCompare(b.produto, "pt-BR"));
}

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function renderizarCardapio() {
  // Os demais produtos continuam disponíveis quando um card é selecionado.
  const filtros = { ...obterFiltros(), produto: "" };
  const produtos = resumirProdutos(filtrarRegistros(estado.registros, filtros), $("menu-order").value);
  const icones = { lanche: "🍔", bebida: "🥤", acompanhamento: "🍟", sobremesa: "🍨" };
  const fragmento = document.createDocumentFragment();
  produtos.forEach((item, indice) => {
    const card = criarElemento("button", "product-card");
    card.type = "button";
    card.dataset.produto = item.produto;
    card.setAttribute("aria-pressed", String($("product").value === item.produto));
    const topo = criarElemento("span", "card-top");
    topo.append(criarElemento("span", "", item.categoria || "Produto"), criarElemento("span", "rank", `#${indice + 1}`));
    const icone = criarElemento("span", "product-icon", icones[item.categoria.toLocaleLowerCase("pt-BR")] || "🍽️");
    icone.setAttribute("aria-hidden", "true");
    const preco = item.minimo === item.maximo ? moeda.format(item.minimo) : `${moeda.format(item.minimo)} – ${moeda.format(item.maximo)}`;
    const rodape = criarElemento("span", "card-stats");
    const numeros = criarElemento("span");
    numeros.append(criarElemento("strong", "", moeda.format(item.centavos / 100)), criarElemento("small", "", `${numero.format(item.quantidade)} itens vendidos · receita`));
    const seta = criarElemento("span", "card-arrow", $("product").value === item.produto ? "✓" : "↗");
    seta.setAttribute("aria-hidden", "true");
    rodape.append(numeros, seta);
    card.append(topo, icone, criarElemento("span", "product-name", item.produto), criarElemento("span", "product-price", `Preço registrado: ${preco}`), rodape);
    card.addEventListener("click", () => {
      $("product").value = $("product").value === item.produto ? "" : item.produto;
      atualizar();
      // Mantém o foco no card após redesenhar a lista, inclusive pelo teclado.
      [...$("product-cards").children].find(elemento => elemento.dataset.produto === item.produto)?.focus();
    });
    fragmento.append(card);
  });
  if (!produtos.length) fragmento.append(criarElemento("p", "muted", "Nenhum produto neste recorte. Importe uma base ou ajuste os filtros da arena."));
  $("product-cards").replaceChildren(fragmento);
  $("product-selection").textContent = $("product").value ? `Analisando: ${$("product").value}. Clique novamente no card para desmarcar.` : "Todos os produtos selecionados. Clique em um card para explorar.";
  $("clear-product").disabled = !$("product").value;
}

function precosRecentes(registros) {
  const produtos = new Map();
  registros.forEach(r => {
    const atual = produtos.get(r.produto);
    if (!atual || r.data >= atual.data) produtos.set(r.produto, r);
  });
  return [...produtos.values()].sort((a, b) => a.produto.localeCompare(b.produto, "pt-BR"));
}

function preencherCombo() {
  const produtos = precosRecentes(estado.registros);
  const categorias = { "combo-main": "lanche", "combo-side": "acompanhamento", "combo-drink": "bebida" };
  Object.entries(categorias).forEach(([id, categoria]) => {
    const select = $(id);
    select.replaceChildren(new Option("Não adicionar", ""));
    produtos.filter(r => r.categoria.toLocaleLowerCase("pt-BR") === categoria).forEach(r => {
      const opcao = new Option(`${r.produto} · ${moeda.format(r.preco_unitario)}`, r.produto);
      opcao.dataset.centavos = String(Math.round(r.preco_unitario * 100));
      select.add(opcao);
    });
    select.disabled = select.options.length === 1;
  });
  atualizarCombo();
}

function atualizarCombo() {
  const opcoes = ["combo-main", "combo-side", "combo-drink"].map(id => $(id).selectedOptions[0]).filter(opcao => opcao && opcao.value);
  const centavos = opcoes.reduce((total, opcao) => total + Number(opcao.dataset.centavos), 0);
  $("combo-total").textContent = moeda.format(centavos / 100);
  $("combo-note").textContent = opcoes.length ? `${opcoes.length} produto(s) no combo. Simulação pronta para explorar.` : "Escolha seus itens. Produtos disponíveis dependem das categorias da base importada.";
}

function iniciar() {
  $("menu-order").addEventListener("change", renderizarCardapio);
  $("clear-product").addEventListener("click", () => { $("product").value = ""; atualizar(); });
  $("open-combo").addEventListener("click", () => $("combo-dialog").showModal());
  $("close-combo").addEventListener("click", () => $("combo-dialog").close());
  $("combo-form").addEventListener("submit", evento => evento.preventDefault());
  $("combo-form").addEventListener("change", atualizarCombo);
  preencherCombo();
  renderizarCardapio();
  $("filters").addEventListener("submit", evento => evento.preventDefault());
  $("filters").addEventListener("input", atualizar);
  $("search").addEventListener("input", atualizar);
  $("clear").addEventListener("click", limparFiltros);
  $("demo").addEventListener("click", () => importarCSV(CSV_EXEMPLO, "dados-exemplo.csv", true));
  $("csv-file").addEventListener("change", evento => {
    const arquivo = evento.target.files[0];
    if (arquivo) importarCSV(arquivo, arquivo.name);
    evento.target.value = "";
  });
  $("export").addEventListener("click", exportarCSV);
  $("previous").addEventListener("click", () => { estado.pagina--; renderizarTabela(); });
  $("next").addEventListener("click", () => { estado.pagina++; renderizarTabela(); });
  importarCSV(CSV_EXEMPLO, "dados-exemplo.csv", true);
  if (!window.Chart) $("status").textContent += " Os gráficos não carregaram. Verifique a conexão com a internet e recarregue a página.";
}

document.addEventListener("DOMContentLoaded", iniciar);
