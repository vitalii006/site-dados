# Dashboard da hamburgueria

Painel didático em HTML, CSS e JavaScript puro, sem instalação, backend ou compilação. O arquivo original `vendas_hamburgueria.csv` foi preservado. A natureza real ou fictícia dessa base não foi presumida.

O visual tem identidade própria de hamburgueria gamer: **Respawn Burger**, uma marca conceitual criada para este projeto. Fundo carvão, laranja, violeta e uma ilustração vetorial local de hambúrguer compõem o tema. `assets/burger-arena.svg` é uma ilustração conceitual, não uma foto dos produtos vendidos. Os nomes e preços nos cards vêm da base atual.

O cardápio interativo mostra receita, itens e faixa de preços registrada por produto. Clicar em um card filtra todos os indicadores, gráficos, tabela e exportação; clicar novamente ou em “Ver todos os produtos” remove apenas esse filtro. O ranking pode ser ordenado por receita ou quantidade. Os cards respeitam os demais filtros, mas permanecem disponíveis ao selecionar um produto.

“Montar combo” abre um simulador acessível por teclado, fechado por Escape ou pelo botão de fechar. Permite adicionar um produto de cada categoria Lanche, Acompanhamento e Bebida. Soma um item de cada pelo preço do registro mais recente; em datas empatadas, usa a última linha do arquivo. Usa a base válida completa, independentemente dos filtros da arena. Não aplica promoções, não realiza pedidos e não altera a base ou os indicadores. Categorias indisponíveis ficam desabilitadas.

A ilustração tem movimento discreto, desativado quando o sistema solicita movimento reduzido. O visual e a ilustração não precisam de fontes ou imagens externas.

## Abrir e usar

1. Abra `index.html` no navegador, com acesso à internet.
2. A página começa com **12 registros fictícios**, identificados por IDs `DEMO-`, da base `dados-exemplo.csv`.
3. Clique em **Importar CSV** e selecione `vendas_hamburgueria.csv` para trabalhar com os 1.367 registros fornecidos, ou selecione outro CSV compatível.
4. Combine datas, categoria, canal, período, pagamento e pesquisa. Todos atualizam os indicadores, gráficos e tabela. Use **Limpar filtros** para voltar à base completa.
5. Clique em um cabeçalho para ordenar; a tabela apresenta 25 linhas por página. **Exportar CSV filtrado** exporta todas as linhas filtradas, na ordenação escolhida, incluindo a receita calculada.

A leitura do CSV ocorre localmente no navegador; o arquivo não é enviado a um servidor. As bibliotecas [Chart.js 4.5.1](https://www.chartjs.org/docs/4.5.1/getting-started/) e [Papa Parse 5.5.3](https://www.papaparse.com/docs) são carregadas por URLs com versões fixadas no CDN jsDelivr e **exigem acesso à internet**. Se o CDN falhar, a página avisa. O exemplo fica também embutido em `script.js` para evitar restrições à leitura de arquivos locais via `file://`.

## Arquivos

| Arquivo | Função |
| --- | --- |
| `index.html` | Estrutura, controles e referências às bibliotecas |
| `styles.css` | Cores, espaçamento e layout responsivo |
| `assets/burger-arena.svg` | Ilustração própria e local da identidade Respawn Burger |
| `script.js` | Importação, validação, filtros, indicadores, gráficos e exportação |
| `dados-exemplo.csv` | Base fictícia com 12 linhas para aprendizado |
| `vendas_hamburgueria.csv` | Arquivo original fornecido, preservado |
| `verificar.cjs` | Verificação opcional da lógica, usando Node.js sem dependências |

## Colunas e tipos

Cada linha é tratada como um **registro de venda de um produto**. Não há evidência suficiente para considerar cada linha um pedido completo. IDs e linhas repetidas são mantidos; suas quantidades são reportadas na validação.

| Coluna | Tipo e regra |
| --- | --- |
| `id_venda` | Texto; pode ficar vazio; preserva zeros à esquerda |
| `data` | Obrigatória; data válida em `AAAA-MM-DD` |
| `dia_semana` | Texto de origem; o painel e a exportação recalculam pela data |
| `periodo` | Texto, como Almoço, Tarde ou Noite |
| `produto` | Texto obrigatório |
| `categoria` | Texto, como Lanche ou Bebida |
| `quantidade` | Obrigatória; inteiro não negativo |
| `preco_unitario` | Obrigatório; número não negativo em reais, até duas casas decimais |
| `forma_pagamento` | Texto, como Pix, Cartão ou Dinheiro |
| `canal` | Texto, como Balcão ou Delivery |
| `tempo_espera_min` | Número não negativo em minutos; vazio é ausente |
| `avaliacao` | Inteiro de 1 a 5; vazio é ausente |
| `receita` | Calculada; qualquer receita no CSV é substituída por quantidade × preço |

Somente `data`, `produto`, `quantidade` e `preco_unitario` exigem cabeçalhos. Colunas opcionais ausentes são tratadas como valores ausentes. Colunas extras são informadas e ignoradas na análise e na exportação. Cabeçalhos diferenciam maiúsculas e minúsculas. Use UTF-8; vírgula e ponto e vírgula são detectados automaticamente. Números aceitos: `29.90`, `29,90` e `1.234,56`. Valores com vírgula decimal precisam estar entre aspas se o separador do CSV também for vírgula.

Datas inexistentes, números inválidos, campos obrigatórios vazios, preços com mais de duas casas e linhas com quantidade de campos inconsistente causam descarte da linha. Valores opcionais preenchidos, mas inválidos, também causam descarte. O painel informa o total e cada motivo; uma linha pode ter vários motivos. Aspas malformadas, cabeçalhos duplicados e colunas obrigatórias ausentes cancelam a importação inteira, mantendo a base anterior. Valores monetários acima do limite seguro do JavaScript são rejeitados.

Zero é válido para preço, quantidade e espera. Vazio é diferente de zero: aparece como “Não informado”, e não entra na média de espera ou avaliação. Uma média sem observações aparece como “—”. Textos opcionais vazios podem ser filtrados como “Não informado”.

## Fórmulas e gráficos

Todos os cálculos usam apenas os registros válidos que passam por **todos** os filtros e pela pesquisa.

- **Receita por linha:** quantidade × preço unitário. Cálculos monetários usam centavos inteiros e apresentação em reais.
- **Receita total:** soma das receitas por linha. É receita de vendas, sem desconto de custos, impostos ou taxas; não representa lucro.
- **Itens vendidos:** soma das quantidades.
- **Valor médio por registro:** receita total ÷ quantidade de registros. Não é ticket médio por pedido.
- **Espera média:** soma dos tempos preenchidos ÷ número de registros com tempo preenchido, incluindo zero.
- **Avaliação média:** soma das avaliações preenchidas ÷ número de registros com avaliação preenchida. A contagem de avaliações acompanha o indicador.
- **Evolução diária:** receita agrupada por data, em ordem cronológica. Apenas dias com registros aparecem; o espaçamento é por categoria, não proporcional a intervalos entre datas. Dias ausentes não são tratados como vendas zero.
- **Produtos:** barras dos até 10 produtos com maior receita; a tabela e os totais continuam incluindo todos os produtos.
- **Canais:** barras de receita e de espera média por canal. Canal sem tempo preenchido fica sem barra de espera.

As médias são por registro, sem ponderação por quantidade. O painel não afirma relações de causa e efeito. A pesquisa procura o texto nas colunas, sem diferenciar maiúsculas de minúsculas; os números são pesquisados pelo valor interno (ex.: `29.9`).

A exportação usa UTF-8 com BOM, separador `;`, vírgula decimal e datas ISO, e pode ser reimportada. Valores ausentes continuam vazios. Textos iniciados por caracteres de fórmula recebem proteção para abertura em planilhas; isso pode adicionar um apóstrofo a esses textos.

## Modificar e publicar

Para alterar a aparência, edite as variáveis de cor no início de `styles.css`. Para estudar os cálculos, comece por `validarRegistros`, `calcularIndicadores` e `filtrarRegistros` em `script.js`. `resumirProdutos` calcula os cards e `precosRecentes` escolhe os preços do simulador. Ao mudar o exemplo, atualize tanto `dados-exemplo.csv` quanto `CSV_EXEMPLO` em `script.js`.

Para publicar, envie `index.html`, `styles.css`, `script.js`, `dados-exemplo.csv` e a pasta `assets` para uma hospedagem de arquivos estáticos, como GitHub Pages: crie um repositório, envie os arquivos e ative **Settings → Pages → Deploy from a branch**, escolhendo a branch e a pasta raiz. Não publique bases privadas. O site publicado começa com a demonstração e cada visitante importa seu próprio CSV localmente. Nenhuma publicação foi feita automaticamente.

## Verificação

Foram conferidos a sintaxe JavaScript e os cálculos com uma amostra conhecida: receitas de R$ 21,00, R$ 9,00 e R$ 0,00 resultam em receita total de R$ 30,00, 3 itens, valor médio de R$ 10,00, espera média de 10 minutos (0 e 20, ignorando um vazio) e avaliação média 4 (5 e 3, ignorando um vazio). Também foram verificadas validações, preservação de duplicatas, filtros combinados, pesquisa, ausência de resultados, retorno aos filtros vazios e ordenação numérica.

Na base original, os 1.367 registros passam pela validação, com receita total de **R$ 36.506,00**, **2.060 itens** e **1.231 avaliações preenchidas**. Esses totais foram comparados a um cálculo independente em PowerShell. Para repetir os testes de lógica, caso tenha Node.js instalado, execute `node verificar.cjs`. Node.js não é necessário para abrir ou publicar o dashboard.

Também foram conferidos o filtro por produto combinado com canal, o ranking por receita/quantidade, a faixa de preços dos cards, a escolha do preço mais recente e o desempate pela última linha. As referências aos controles da página foram verificadas.

O ambiente de execução bloqueou acesso ao CDN e impediu o navegador automatizado de iniciar. Portanto, a importação pelo Papa Parse, a exportação/reimportação, os cliques dos cards, a abertura do simulador e a aparência renderizada em desktop/celular não foram verificadas de ponta a ponta. O layout foi revisado no código, com adaptações para telas de 760 e 1.100 px.

Para conferir no navegador: importe o original, combine filtros e pesquisa, ordene, exporte e reimporte; teste datas sem vendas, limpe os filtros e compare totais. Reduza a janela a 390 px para conferir o layout móvel. A tabela tem rolagem horizontal para preservar a leitura das colunas.
