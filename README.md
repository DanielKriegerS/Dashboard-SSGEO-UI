# DashboardSSGEOUi

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.13.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Planner weekends

The planner's **Recolher cabecalho / Expandir cabecalho** control hides or shows
the full heading, day display options and block toolbar. When collapsed, a compact
strip keeps **Planner - SSGEO**, the visible date range and previous/next buttons
available beside the expand control. Period navigation uses the same handlers
in both layouts; full dates remain available in the range tooltip.
The planner table remains visible. Display/block controls stay mounted and retain
their state; toggling does not reload data or change the selected period. The
header starts expanded. On small screens, the compact strip wraps into two rows
and the expand control is a labelled 44px icon button.

Planner cells use separate borders with zero spacing and only right/bottom lines.
This avoids collapsed-border repaint loss on sticky date/Coatend cells after
header toggles, without remounting the table or resetting its scroll position.

Saturday and Sunday columns have a different background and explicit weekday
labels. Weekend cells remain clickable, including cells that already contain
activities and placeholder rows. New activities have an unchecked **Incluir fins
de semana e feriados** option. When checked, every date in the inclusive range
is saved. Otherwise, weekends and Brazilian fixed-date national holidays are
excluded: January 1, April 21, May 1, September 7, October 12, November 2 and 15,
November 20 (from 2024), and December 25. Local and movable holidays are not
included in this calendar.

Working days are grouped into consecutive periods and saved atomically through
`POST /coatends/{coatendId}/timeline/batch`. October 9-15, 2026 therefore creates
October 9 and October 13-15 as two separate entries. Each entry can be edited
independently. A range with no working days cannot be submitted unless inclusion
is enabled. Blocks are checked only against included periods. Existing entries
and editing retain their previous behavior; weekend warnings remain available
when including weekends or editing an existing entry.

## Planner blocks

Use **Adicionar bloqueio**, or click a timeline cell and choose **Registro =
Bloqueio**, to create a block. The **Bloqueios (N)** panel lists all blocks,
including those outside the visible dates; click a list item or a BC/BD marker
to edit it.

- **BC / CORPORATE:** global; prevents every activity on every Coatend.
- **BD / DEPENDENCY:** prevents every activity on the selected Coatend.
- Both dates are inclusive. The activity modal explains matching blocks and
  prevents submission until the activity is moved or the block is edited.
- Display priority is BC > BD > activities. Corporate blocks can be created or
  moved over dependency blocks without deleting those blocks. Creating or editing
  either block type removes activity dates within its inclusive scope on the backend.
  Fully covered entries are deleted; remaining dates are trimmed or split into two
  entries with the same activity, developer and Coatend. Moving/shrinking a block
  does not restore removed dates. Dependency blocks cannot overlap corporate blocks.
  Duplicate blocks of the same type/scope are rejected.
  Dependency blocks on different Coatends can share dates.
- The block modal checks existing blocks, keeps entered data and
  disables Save for invalid lower/equal-priority assignments. Main repeats the same shared validation
  before sending a request; the backend remains authoritative.
- Successful saves reload the trimmed timeline without a preserved-overlap warning.
  Confirmed TU/SWAP protections reject the entire operation with HTTP 409.
  `conflictingActivityIds` remains in the API for legacy diagnostics; existing blocks
  are not migrated automatically. Re-saving a block applies the current removal rule.

The frontend uses `GET /blocks`, `POST /blocks` and `PUT /blocks/{id}`. Corporate
requests send `coatendId: null`; dependency requests send the selected Coatend ID.
There is no delete endpoint. Excel exports use `BC`/`BD` markers directly in
Coatend cells, with no dedicated block rows. Both the planner and XLSX display
BC above BD above activities. Dates are clipped to the export window; corporate
fill covers all Coatend subrows, while dependency fill is scoped to its Coatend.
Activity dates outside the block remain stored. API errors remain visible through
planner feedback.

Rule revision verified on 2026-10-09: 156 focused planner tests, development
build and 98 backend tests passed. Real HTTP tests use isolated H2/random ports
and cover clipping/splitting, scope, editing, milestone rollback and concurrent requests.
No live backend restart or browser E2E verification was performed for this revision.

Focused block/planner validation:

```bash
npm test -- --watch=false --ts-config=tsconfig.planner.spec.json --include=src/app/core/main/main/main.spec.ts --include=src/app/core/layout/planner/planner.spec.ts --include=src/app/core/layout/planner-placeholder-actions/planner-placeholder-actions.spec.ts --include=src/app/services/planning-block.spec.ts --include=src/app/shared/utils/planner-blocks.spec.ts
```

## SWAP document generation

**Exportar / Gerar** opens the choice between the existing Excel export and
**Gerar documento de SWAP**. The Excel dialog now has **Voltar**, returning to
the chooser without exporting; navigation is blocked while saving.

SWAP dates without confirmations remain visible but cannot be selected.
For a mixed date, only confirmed Coatends are included; pending ones are listed
as excluded. The selected planned date, numbers and descriptions are shown
before generation.

Upload the technical XLSX files for every included Coatend. Each filename must
identify one number, such as `COATEND8579.xlsx`. Missing, extra, ambiguous and
duplicate files prevent generation. Limits are 20 files, 10 MB each and 50 MB
total. The backend also validates content and rechecks the authoritative scope.

**Gerar Doc. SWAP** selects a DOCX destination before uploading when the browser
supports `showSaveFilePicker`. Cancelling the picker does not generate or upload.
Other browsers use their normal download destination/settings, as with Excel.
The backend must be running with the generator configured; see its README.

The result remains a draft for human review. The modal displays the separate
review report and offers its Markdown download. It never adds the report to
the operational DOCX. **Salvar DOCX novamente** retries saving the retained
result without requesting another generation. Server processing copies are
temporary; changing the selection or closing clears the modal's retained data.

Verified on 2026-10-22: 51 focused frontend tests and a development build pass.
The Python/PowerShell generator and multipart backend produced real DOCX files
in isolated tests. Browser Excel return was exercised against the real app.
The mobile upload layout was checked with a browser-only simulated confirmation,
without creating a production confirmation or requesting generation in that
scenario. Actual source fidelity still requires human review.

## Planner Excel export

The **Exportar** button above the planner opens export options for a day count,
a date period, a complete Quarter, or a complete Sprint. Count and period are
initially populated from the current planner window, including arrow navigation.
Changing export options does not change the planner display.

The frontend downloads `planner.xlsx` from `GET /planner/export` on the configured
backend. It sends only the parameters for the chosen mode: `COUNT` with
`startDate` and `count`, `PERIOD` with `startDate` and `endDate`, `QUARTER` with
`quarterId`, or `SPRINT` with `sprintId`. Dates use `yyyy-MM-dd`. The workbook
content, formatting and date clipping are determined by the backend. Count and
period exports support up to 16,383 days; server errors are shown through the
existing feedback component.

Submitting **Exportar** selects the destination, when supported, then requests
the complete workbook and awaits writing and closing the file before closing the
modal. No second export click is required. Cancelling the destination picker
does not send an export request. Browsers without the picker use a normal download.

## Administration and Features

`/admin/features` lists Features and opens create/edit screens. `/admin/developers`
reuses the existing developer registry; `/developers` redirects there. This is
navigation grouping, not a new authentication or permissions system.

Feature deletion requires explicit confirmation and succeeds only without linked
Coatends. A linked Feature returns 409 and remains visible. Links have an optional
positive decimal weight; no default weight is assigned. Transfer requires explicit
unlinking first. Unlinking preserves activities and TU/SWAP confirmations.

The Coatend page includes Feature/weight selection and explicit TU/SWAP confirmation.
SWAP requires TU first. Confirmation timestamps and authors come from the backend;
unknown authors are displayed as unidentified. Disabled confirmations explain
missing forecasts or invalid windows. The planner displays one aggregate row per
Feature below Coatends, with editable metadata/link navigation and accessible native
details. Forecasts, effective start, null reasons, estimates, confirmations and warnings
are rendered from server DTOs, without recalculating weighted progress in Angular.
An estimate of 100% is not a confirmation. Warning details do not hide activities.

For small screens, use the existing sidebar collapse control. Browser checks use
an isolated backend/database; they do not publish or restart the normal backend.
On 2026-10-09, 176 focused Angular tests, the development build and 98 backend tests
passed. Real browser flows covered CRUD, linked-delete conflict, optional/decimal
weights, explicit transfer, milestone persistence and one row across two Sprints.
Full mobile visual/touch sign-off remains pending; saved integrated-browser images
have viewport capture limitations. Standard legacy Angular tests are not covered by
this result. The detailed task/evidence record is in the backend's
`.specs/administrative-features/batch-report-b04.yaml`.

```bash
npm test -- --watch=false --ts-config=tsconfig.planner.spec.json --include=src/app/services/feature.spec.ts --include=src/app/pages/feature/feature.spec.ts --include=src/app/pages/coatend/coatend-feature.spec.ts --include=src/app/core/main/main/main.spec.ts --include=src/app/core/layout/planner/planner.spec.ts
```

## Verificacao humana - Features e planner

Ambiente iniciado e verificado em09/10/2026: frontend `http://localhost:4200`, API
`http://localhost:8080`. GET `/features` e `/blocks` responderam200 com listas
vazias; a tela `/admin/features` carregou sem alertas usando a API normal diretamente.
Inicializacao do backend com H2 vazio autorizada em 09/10/2026. O banco e em memoria:
encerrar/reiniciar o backend perde os cadastros. Nao reinicie para limpar testes sem
aceitar essa perda. O roteiro original era manual; a massa pronta abaixo foi criada
pela API em 14/10/2026, sem reiniciar os servicos.

### Massa atual - Q4/2026

Em19/10/2026 foram criados e lidos de volta na API normal: Q4 de13/10 a31/12,
S1(13/10-23/10), S2(26/10-06/11), S3(09/11-19/11), S4(23/11-04/12),
S5(07/12-18/12) e S6(21/12-31/12), todas em Q4. Features:
F1=8579/8753/8681/8754; F2=8755/8756/8757; F3=8758/8759/8760/8761/8762.
Os titulos completos foram preservados. Na versao inicial nao foram inventados
Sprint, peso, atividades, desenvolvedores ou confirmacoes para as Coatends.
Na revisao de19/10, a carga passou a associar S1=8681/8758/8759;
S2=8579/8753/8760/8761/8762; S3=8754/8755/8756; S4=8757. S5/S6 ficam sem
Coatends. A8760 em S2/F3 foi confirmada separadamente. A revisao nao foi
aplicada aos registros em execucao nem reiniciou o backend.

Na Home, F1/F2/F3 devem aparecer em tres linhas identificadas abaixo das Coatends,
mesmo sem previsao ou quando as fases estao fora dos dias visiveis. Somente as
barras sao recortadas pela janela; o nome permanece na primeira coluna existente.
Ao preencher a timeline, as barras e os percentuais continuam vindos do servidor.

A partir de20/10, a fonte unica da carga e `src/main/resources/data.sql` no
backend. O Spring executa automaticamente apos o Hibernate preparar o schema,
no H2 embarcado: basta `spring-boot:run` ou Run/Debug, sem flag adicional.
Banco preenchido ou parcialmente preenchido nao e sobrescrito nem completado.
Para desativar, use `spring.sql.init.mode=never`. O carregador Java, o JSON e o
script HTTP anteriores foram removidos. Veja o README do backend antes de
reiniciar: H2 em memoria perde os dados. A auditoria
`.specs/administrative-features/q4-test-data-20261019.json` e apenas historica;
a massa da instancia aberta nao foi alterada nem o backend reiniciado.

Evidencias iniciais em19/10:23 testes do planner,4 testes da carga Java e build
development passaram. Navegador confirmou tres linhas F1/F2/F3 e um unico +.
O seed nao cria barras porque nao foram fornecidos periodos de atividade;
atividades cadastradas manualmente depois da carga nao fazem parte do seed.

### Movimentacao e ajuste de periodo de atividades - 19/10/2026

Ao abrir uma atividade existente, o modo padrao e **Mover atividade**: somente a
nova data inicial e editavel; o termino e calculado preservando a duracao original
em dias corridos, inclusive fins de semana e feriados. Tipo e desenvolvedor ficam
bloqueados durante a movimentacao. **Ajustar periodo** libera inicio e fim.
Origem, destino e duracao ficam visiveis nos dois modos. Ao voltar para Mover,
o inicio escolhido e mantido, mas a duracao, o tipo e o desenvolvedor originais
sao restaurados. Uma nova abertura sempre inicia em Mover.

Mover e ajustar incluindo fins de semana atualizam o mesmo ID pelo PUT existente.
Ao ajustar excluindo fins de semana e feriados, o primeiro trecho conserva o ID
original e os demais sao periodos separados, sem sobreposicao, gravados em uma
unica transacao. Nao ha comando de duplicacao, exclusao ou consolidacao de outras
atividades. Bloqueios e marcos continuam sendo verificados no backend.

### Usabilidade do planner - 20/10/2026

- Criacao e Ajustar periodo oferecem **Mesmo dia**: o termino acompanha o inicio
  e fica somente leitura. Desmarcar restaura o termino anterior. Mover continua
  preservando a duracao original.
- **Incluir fins de semana e feriados** tambem aparece em Ajustar periodo;
  ao abrir uma edicao vem marcado, para preservar o comportamento original.
  Desmarcar exclui sabados, domingos e os feriados nacionais fixos ja suportados.
  O resumo mostra a quantidade efetiva de dias. Periodo sem dias uteis nao salva.
- O unico **+ Sprint** fica junto da ultima Sprint cadastrada por data final
  (S6 na massa atual), nao nas lacunas nem na ultima Sprint apenas visivel.
  Para ve-lo, navegue ate essa Sprint ou exiba o trimestre. Lacunas ficam vazias.
- A grade tem rolagem interna limitada a altura da tela; Quarter, Sprint e datas
  ficam fixos juntos no topo e a identificacao das Coatends continua fixa a esquerda.
- Alterar quantidade ou periodo mostra aviso informativo com dias efetivamente
  visiveis e datas inicial/final, inclusive quando o pedido excede as datas existentes.

A exclusao de fins de semana em edicao usa `PUT /timeline/{id}/periods`.
E necessario reiniciar o backend para disponibilizar essa nova rota. O H2 atual
e em memoria: reiniciar perde ajustes manuais e carrega apenas o SQL inicial.
Nenhum reinicio ou salvamento de atividade foi feito na verificacao do navegador.

### Correcao de atividades em Coatends sem Sprint - 19/10/2026

O modal e a edicao de Coatends agora recebem o cadastro completo, incluindo
Coatends ainda sem Sprint, em vez de apenas os registros estruturados do planner.
A ausencia na lista causava o aviso de Coatend/periodo e impedia salvar; clicar
no titulo tambem gerava "Item do planner nao encontrado para edicao".
Nao era uma restricao de datas passadas. Regras de bloqueios e marcos permanecem.

O estado de carregamento de Features agora e atualizado antes de detectar as
mudancas da tela, corrigindo o NG0100 observado na rodada inicial. Validacao:
50 testes de Main e build development passaram. Navegador real: Coatend8579,
13 a14/10/2026 e Daniel habilitam Salvar, sem o aviso; o titulo abre a edicao com
os dados corretos. Recarregamento com tres Features nao registrou console.error.
Os modais foram cancelados, sem salvar atividades ou alterar a distribuicao.
O formulario do usuario permaneceu em outra aba, sem recarregamento pela verificacao.

### Massa anterior - UAT-20261014

Registro historico da massa criada em14/10, nao representa a base Q4 atual.
Foram criados e lidos de volta pela API: 2 Quarters (Outubro/Novembro), 4 Sprints,
3 desenvolvedores com cores distintas, 9 Coatends (261401 a 261409), 28 periodos de
timeline e 7 Features. Os vinculos de Sprint no planner e os estados das Features
foram verificados; as sete Features tambem apareceram na lista do frontend.
Todos os tipos de atividade estao representados. Nao foram criados BC/BD.

### Ajustes visuais - 14/10/2026

As Coatends da massa agora usam nomes funcionais curtos, sem prefixo/status no titulo:
261401 Autenticacao; 261402 Perfis de acesso; 261403 Exportacao de relatorios;
261404 Preferencias de notificacao; 261405 Validacao cadastral; 261406 Sincronizacao
de dados; 261407 Rotinas operacionais; 261408 Consulta de pagamentos; 261409
Conciliacao de pagamentos. Numeros, Sprint, Feature/peso, periodos e marcos foram
comparados antes/depois e preservados. O historico de renomeacao, com descricoes
anteriores para rollback via PUT nos mesmos IDs, esta no backend em
`.specs/administrative-features/coatend-labels-20261014.json`.

| Criterio | Verificacao humana |
| --- | --- |
| UI-01 Nome/pendencias | Na Home, conferir nome curto e icone ! no canto superior direito. Hover mostra a quantidade; clique ou Enter abre os avisos e o acesso aos marcos. O aviso nao deve ocupar texto permanente no titulo. |
| UI-02 Bordas | Todas as celulas do planner tem bordas explicitas, inclusive vazias. No Excel, conferir as quatro bordas de celulas vazias/preenchidas e cabecalhos. Os testes de exportacao cobrem COUNT/PERIOD/QUARTER/SPRINT. |
| UI-03 Feature | Sem coluna extra de resumo. Cada Feature tem linha propria e nome clicavel na primeira coluna existente, inclusive sem previsao ou fora da janela. Barras visiveis: azul/ciano Desenvolvimento + TU; lilas Homologacao. A barra exibe apenas a fase; hover/foco de teclado substitui o texto pelo percentual, sem alterar a largura. Tooltip preserva nome, estado, previsao, inicio efetivo e causas de indisponibilidade. Clicar abre os detalhes. |
| UI-04 Mover | Abrir uma Coatend: a secao de mover inicia recolhida, abaixo dos marcos, dentro do fluxo. Expandir por clique/Enter; selecionar destino habilita Mover. Em tela estreita, selecao e comando ficam empilhados. Nao mover sem desejar alterar a Sprint. |

Percentuais continuam sendo estimativas calculadas pelo servidor, independentes
das confirmacoes TU/SWAP; este ajuste nao mudou regras, datas ou pesos.

Verificacao em14/10: testes focados do frontend25/25; exportacao Java4/4, build
development aprovado; navegador verificou bordas, barras, aviso por icone e expansao
por teclado, sem gravacoes de teste. Layout do move-to verificado em viewport375px;
capturas do navegador integrado tem limitacoes de recorte, sem sign-off mobile/touch.
O XLSX da API ativa respondeu200 com bordas THIN em todas as celulas usadas, mas
ainda com cor antiga DBE3EC. O codigo/testes agora usam8996A4; carregar esse novo
contraste no backend esta pendente. Nao houve reinicio: H2 e massa foram preservados.
Uma eventual reinicializacao exige aceite explicito da perda de dados.

### Refinamentos e massa sequencial - 14/10/2026

O planner estruturado tem apenas um **Adicionar Coatend**, depois de todas as
Coatends e antes das linhas de Features. O modal pede a Sprint de destino, sem
pre-selecao quando existem varias Sprints. Salvar exige essa escolha.

A massa atual possui 3 Quarters (Outubro a Dezembro) e 5 Sprints. Os mesmos IDs,
periodos adicionais do usuario, desenvolvedores, duracoes e confirmacoes foram
preservados. As janelas completas de Features nao se sobrepoem:

| Feature | Janela atual |
| --- | --- |
| Concluida | 01/10 a 13/10 |
| Progresso ponderado | 26/10 a 13/11 |
| Sem peso | 16/11 a 19/11 |
| Futura | 23/11 a 09/12 |
| Previsao incompleta | Desenvolvimento a partir de 10/12; TU/SWAP ausentes |
| Reserva de entrega e Vazia | Sem contribuintes |

A Coatend261406 foi desvinculada da antiga Feature TU confirmada, agora Reserva
de entrega. Continua na mesma Sprint, com os mesmos periodos e TU confirmada.
Agrupa-la com a Concluida faria um SWAP preceder a TU agregada; esse agrupamento
nao foi aplicado. A auditoria com snapshots antes/depois, operacoes e validacao
esta no backend em `.specs/administrative-features/replanned-human-test-data-20261014.json`.
O gerador foi atualizado; nao o execute na base populada. A aplicacao auditada
foi realizada uma unica vez por `replan-human-tests.mjs --apply` e recusa repeticao.

Evidencias desta rodada: 48 testes de planner/exportacao e 32 testes do modal
passaram. No navegador, um unico submit gerou uma requisicao real a API, uma
gravacao e um fechamento do arquivo em memoria, seguido do fechamento do modal.
O XLSX recebido tem5011bytes,13linhas,208celulas, rotulos das Coatends261405/261407
e atividades De/Tu/Sw. Apenas o seletor/destino foi substituido para evitar gravar
arquivos do usuario. O botao unico e o modal sem Sprint pre-selecionada foram
verificados no DOM. O navegador integrado esta em estado hidden: verificacao
fisica de hover e sign-off mobile/touch continuam pendentes.

As confirmacoes atuais registram o instante real do clique no servidor; nao sao
aprovacao de uma data futura de planejamento nem controle da execucao de cada
tarefa. Podem ocorrer antes da data prevista, exigem previsao valida e SWAP exige
TU. Confirmar TU protege DEVELOPMENT/TESTING_TU; confirmar SWAP protege SWAP.
Interpretar os botoes como aprovacao da data prevista exige decisao de negocio
antes de alterar regras. Nenhuma regra de confirmacao foi alterada nesta rodada.

### Resultados iniciais da massa

Os resultados abaixo sao historicos, anteriores ao replanejamento acima, e
correspondem a `referenceDate=2026-10-14`, no fuso retornado pelo servidor.
Percentuais e avisos mudam com a data ou apos suas alteracoes.

| Feature (prefixo UAT-20261014) | Coatends | Resultado inicial / teste sugerido |
| --- | --- | --- |
| Progresso ponderado | 261401, 261402 | Pesos 1.25/2.5; desenvolvimento 33.33%, homologacao 0%; previsao de homologacao 21 a 26/10; uma TU pendente. Na Home, conferir uma unica linha de Feature apesar de duas Sprints. |
| Sem peso | 261403 | Percentuais indisponiveis com MISSING_WEIGHT. Salvar peso positivo deve permitir o calculo; zero/negativo nao deve salvar. |
| Previsao incompleta | 261404 | Sem TU/SWAP, percentual indisponivel com INCOMPLETE_FORECAST. Completar timeline deve atualizar a previsao. |
| Concluida | 261405 | TU/SWAP confirmados, fases 100%. Homologacao prevista 07 a 13/10 e inicio efetivo 14/10; limitacao EFFECTIVE_START_AFTER_PLANNED_END deve permanecer visivel. |
| TU confirmada | 261406 | Desenvolvimento confirmado com estimativa 25%; homologacao nao confirmada, estimativa 0%, prevista 19 a 23/10 e inicio efetivo 14/10. Confirmar SWAP deve confirmar a fase sem reescrever a previsao. |
| Futura | 261408, 261409 | Pesos 3/2; ambas as estimativas 0%; homologacao prevista 24 a 27/11. Selecionar Novembro na Home para inspecionar atividades. |
| Vazia - destino de transferencia | Nenhuma | NO_COATENDS, sem percentual e sem confirmacao. Serve como destino para transferencia ou como caso de exclusao sem vinculo. |

Coatend261407 esta avulsa de Feature, na primeira Sprint de Outubro, com DEVELOPMENT
de13 a16/10 e ADMINISTRATIVE_TASKS de13 a14/10. Use-a para editar atividades, testar
BD e verificar recortes, sem tocar nos marcos dos casos confirmados. DEVELOPMENT,
TESTING_TU e PASSAGE_TH usam desenvolvedor; os demais tipos usam executor de equipe.

Ordem recomendada de verificacao humana:

1. Navegar Quarters > Sprints > Coatends; conferir descricao, numero, cor do
  desenvolvedor e periodos. Recarregar para confirmar persistencia.
2. Inspecionar as Features e o planner antes de alterar dados; comparar com a tabela.
3. Testar peso ausente, completar a previsao incompleta e editar nome/descricao.
4. Na261401, cancelar uma confirmacao TU e depois confirmar explicitamente. SWAP
  exige TU. A Feature ponderada so confirma desenvolvimento apos as duas TUs.
5. Desvincular261403 de Sem peso e vincular a Vazia, informando novo peso. Sprint e
  atividades devem permanecer; o peso antigo nao deve acompanhar o desvinculo.
6. Tentar excluir uma Feature ainda vinculada: esperar409 e preservacao dos dados.
  Para testar exclusao da Vazia, faca isso antes da transferencia ou desvincule-a.
7. Na261405, tentar editar/remover DEVELOPMENT/TU ou SWAP confirmado: esperar409.
  Use261407, nao261405, para testar recorte de atividades por BD. Evite BC, global.

Tres confirmacoes foram gravadas com timestamps reais do servidor: TU/SWAP da261405
e TU da261406. Nao existe reabertura; registros protegidos nao tem limpeza automatica.
Nao reinicie o H2 como rollback sem aceitar explicitamente a perda de todos os dados.

O gerador esta no backend em `.specs/administrative-features/seed-human-tests.mjs`;
o manifesto `.specs/administrative-features/human-test-data-20261014.json` registra
IDs, baseline, confirmacoes e respostas de planejamento. Na raiz do backend:

```bash
node .specs/administrative-features/seed-human-tests.mjs --check
node .specs/administrative-features/seed-human-tests.mjs
```

`--check` valida definicoes sem acessar a API. A execucao normal recusa repetir o
prefixo, usar numeros ocupados, sobrepor Quarters/Sprints existentes ou popular um
ambiente com bloqueios. Em falha, para na primeira resposta invalida e registra a
criacao parcial; nunca apaga dados para desfazer ou repete gravacoes automaticamente.
A massa desaparece se o backend/H2 for reiniciado. Sua validacao humana, incluindo
mobile/touch, continua pendente; esta verificacao nao representa sign-off completo.

### Preparacao manual alternativa - ambiente vazio

O roteiro historico abaixo usa numeros9001/9002/9003, diferentes da massa pronta.
Nao repita seus cadastros de Outubro no ambiente ja populado: as datas de Sprint
conflitam. Para verificar os dados atuais, use a tabela e a ordem acima.

Use nomes com prefixo `UAT Feature` para distinguir os dados de verificacao. Cadastre
um desenvolvedor com nome e cor, um Quarter de 01 a 31/10/2026 e duas Sprints sem
sobreposicao: 01 a 15/10 e 16 a 30/10. Associe ambas ao Quarter. Cadastre Coatends
9001 e 9002 e mova uma para cada Sprint. Cadastre tambem uma Coatend9003 nao
confirmada para testar bloqueios sem alterar os marcos das duas primeiras.

Em cada Coatend, abra a timeline e crie os periodos abaixo. DEVELOPMENT e TESTING_TU
exigem o desenvolvedor cadastrado; SWAP usa o executor de equipe, sem desenvolvedor.
Datas inicial/final sao inclusivas. Ainda nao confirme TU/SWAP.

| Coatend | Desenvolvimento | TU | SWAP |
| --- | --- | --- | --- |
| 9001 | 01 a 02/10/2026 | 05/10/2026 | 23/10/2026 |
| 9002 | 16 a 19/10/2026 | 20/10/2026 | 26/10/2026 |

### Casos e resultados esperados

| ID | Acao humana | Resultado esperado |
| --- | --- | --- |
| H01 | Em Administracao > Features, criar `UAT Feature A`; voltar a lista, abrir e editar descricao | Nome/descricao persistem apos recarregar a pagina. Nome vazio ou so espacos nao permite salvar. |
| H02 | Vincular somente Coatend9001 a Feature A, deixando peso vazio | Vinculo salvo; estimativa indisponivel com causa `Peso nao informado`. Nenhum peso padrao e aplicado. |
| H03 | Informar peso0 e negativo; depois salvar1.25 na9001 | Pesos nao positivos nao permitem salvar; 1.25 persiste apos recarregar. Em09/10/2026, desenvolvimento100% estimado ainda nao e TU confirmada. Aviso de TU pendente permanece. |
| H04 | Vincular9002 com peso2.5; abrir Home e detalhes da Feature | Uma unica linha de Feature abaixo das Coatends, apesar de duas Sprints. Em09/10/2026: desenvolvimento33.33% estimado; homologacao0% estimado, prevista21 a26/10. Inicio efetivo aguarda todas as TUs. Nenhuma fase confirmada. |
| H05 | Solicitar exclusao da Feature vinculada e confirmar | HTTP409, explicacao para desvincular primeiro; Feature e Coatends permanecem. Cancelar a confirmacao nao exclui. |
| H06 | Na9001, tentar SWAP antes de TU; solicitar TU e cancelar; depois confirmar TU explicitamente | SWAP inicialmente desabilitado. Cancelar nao grava. Confirmar grava timestamp de servidor e autor confiavel ou nao identificado; aviso TU some, sem ocultar atividades. Feature ainda nao tem todas as TUs confirmadas. |
| H07 | Confirmar TU da9002; depois confirmar SWAP em ambas | Inicio efetivo aparece com a data da ultima TU confirmada, separado da previsao21/10. Desenvolvimento confirmado apenas apos ambas as TUs; homologacao confirmada apenas apos ambos os SWAPs. Confirmacao antecipada nao altera previsoes nem transforma estimativa em100%. |
| H08 | Criar `UAT Feature B`; na9001 verificar transferencia; desvincular explicitamente de A e vincular a B | Outra Feature nao e selecionavel enquanto houver vinculo. Apos desvinculo, transferencia funciona; peso e limpo no desvinculo e deve ser reinformado. Sprint, atividades e timestamps TU/SWAP ficam intactos. |
| H09 | Desvincular todas as Coatends que ainda restem em A e excluir A com confirmacao | Feature A desaparece apos sucesso; Coatends, atividades e confirmacoes continuam existentes. |
| H10 | Na9003, criar DEVELOPMENT de13 a16/10 e BD de14 a15/10 | Restam atividades em13 e16/10, com mesmo executor; dias14/15 removidos de fato. Mover/reduzir BD nao restaura dias. Uma atividade nova dentro do BD e rejeitada. BC tem escopo global; use somente dados de teste. |
| H11 | Apos confirmar TU, tentar alterar/remover DEVELOPMENT/TU da9001 ou criar bloqueio sobre01/10 | HTTP409 e nenhum recorte parcial. Protecao de marco confirmado nao pode ser contornada; nao use9001 para o teste de recorte H10. |
| H12 | Mover primeiro o BD de9003 para27 a28/10; depois criar atividade09 a15/10 com inclusao de fins de semana/feriados desmarcada | Salva09/10 e13 a15/10 em lote; exclui10/11 e feriado12/10. Nao deve haver outro bloqueio nas datas incluidas. Exportar COUNT/PERIOD/Quarter/Sprint preserva datas, cores e BC/BD, sem linhas exclusivas de blocks. |
| H13 | Abrir `/developers`; usar Tab/Enter nos detalhes/links; conferir desktop e celular | Redirect para `/admin/developers`, cadastro existente preservado. Detalhes acessiveis por teclado. No celular, recolher menu; textos/botoes legiveis, sem sobreposicao, detalhes abrem por toque e tabela permite rolagem. |

H03/H04 dependem de `referenceDate=2026-10-09`, fuso America/Sao_Paulo, dos periodos
exatos e de pesos1.25/2.5. Em outra data, percentuais variam: comparar com o DTO
`GET /features/{id}/planning`, nao com um percentual fixo deste roteiro.
Homologacao fica indisponivel se alguma Coatend tiver SWAP anterior ao inicio
agregado previsto; mantenha SWAP23/26 para o caminho nominal acima.

Teste falha de conexao pelo modo Offline do navegador, sem parar o H2: salvar deve
mostrar erro, sem anunciar sucesso nem remover dados da tela. Volte Online e
recarregue antes de avaliar persistencia; perda da resposta nao prova que uma
operacao nunca foi gravada. GETs de lista com banco vazio devem exibir estado vazio,
nao erro500. Use a aba Network para distinguir sucesso200/204, conflito409 e falha
de transporte; verificacoes somente de leitura podem usar `/features` e `/blocks`.

### Registro do aceite

Os176 testes Angular focados,98 Maven e o build citados acima sao evidencias da
rodada automatizada anterior; nao equivalem a aceite humano nem a nova execucao.
Para cada caso H01-H13, registrar PASS/FAIL/NAO EXECUTADO, data/hora, responsavel,
passos, IDs envolvidos, esperado/observado e screenshot. Em conflito, registrar
status/resposta de rede; em persistencia, recarregar e comparar valores. Ocultar
dados pessoais ou segredos nas evidencias.

T024 continua parcial ate verificar visual desktop/mobile e toque em um navegador
ou dispositivo adequado. Nao excluir Coatends confirmadas para limpar testes:
a API protege esses marcos. Mantelas identificadas ou aprovar explicitamente um
reinicio do H2, que remove todos os dados. Nao ha reabertura automatica.

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
