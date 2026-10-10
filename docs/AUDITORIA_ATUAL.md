# Auditoria do estado atual do FloristEver

**Etapa:** 0 — Auditoria do estado atual  
**Estado:** Etapa 0 FEITA; Etapa 0B FEITA  
**Data:** 2026-10-05  
**Âmbito da Etapa 0:** leitura e validação baseline. Não foram alterados código de jogo, saves ou conteúdo do jogo durante a auditoria.

## 1. Resumo executivo

O jogo é uma aplicação web modular em JavaScript ES modules, distribuída também com Capacitor para Android e Electron para Windows. Na auditoria inicial, o estado local era guardado em `localStorage` com cópia de recuperação, mas sem versão global do esquema. A Etapa 0B acrescentou `schemaVersion: 1` e leitura retrocompatível dos saves anteriores.

O ciclo de encomendas existente tem quatro encomendas estáticas. A conclusão é persistida como `isCompleted` no save por ID, mas o livro não guarda uma encomenda em curso nem a seleção atual de flores da bancada. A bancada e os recursos necessários são locais e estão incluídos no pré-cache; a conta e sincronização cloud são opcionais e dependem da rede.

O baseline da API de contas passou com 7 testes. A validação inicial da build web falhou porque `build-web.js` esperava o ficheiro de Termos na raiz do projeto, enquanto ele está em `docs/`. Com a autorização do utilizador, a Etapa 0B alinhou a origem e o destino sem mover nem modificar o documento. A build, a validação de conteúdo e os testes direcionados passam agora.

## 2. Mapa da arquitetura

### Stack, builds e comandos

- **Jogo:** JavaScript ES modules, HTML5 Canvas, HTML/CSS e estado local no browser.
- **Empacotamento móvel:** Capacitor 7; configuração em [`capacitor.config.json`](../capacitor.config.json).
- **Empacotamento Windows:** Electron 44 e electron-builder; configuração em [`electron/`](../electron).
- **Gestor de pacotes:** npm; dependências raiz em [`package.json`](../package.json) e dependências do serviço de contas em [`light-group-login/package.json`](../light-group-login/package.json).
- **Build web:** [`scripts/build-web.js`](../scripts/build-web.js) copia HTML, CSS, service worker, módulos JS, imagens e música para [`dist/`](../dist); copia os Termos de `docs/` para a raiz da build sem alterar o original, injeta a origem da API e gera os ficheiros de cabeçalhos.
- **Validação da build:** [`scripts/validate-build.js`](../scripts/validate-build.js).
- **Servidor de desenvolvimento:** [`server.js`](../server.js), por omissão na porta 8080. O serviço de contas tem servidor próprio em [`light-group-login/src/server.js`](../light-group-login/src/server.js), por omissão na porta 4000.
- **Comandos raiz disponíveis:** `start`, `build:web`, `validate`, `validate:content`, `test:game`, `standalone`, `electron:start`, `win:pack`, `win:installer`, `android:add`, `android:sync`, `android:open`, `android:apk:debug`, `android:apk:release`, `android:share:debug`, `android:share:release`, `android:share:existing`, `login:dev`, `login:test` e `security:audit`.
- **Testes do jogo:** na baseline inicial não existia comando de teste próprio; a Etapa 0B acrescentou `test:game`, executado com o test runner nativo do Node.js. Continua sem comando `lint` na raiz.
- **Git:** esta pasta não está configurada como repositório Git; não há branch ou histórico local disponíveis para criar uma branch por fase.

### Dados de conteúdo

| Conteúdo | Localização principal | Representação/integrações |
|---|---|---|
| Flores e ordem | [`js/config/flowers.js`](../js/config/flowers.js) | `FLOWERS_CONFIG` e `FLOWER_ORDER`; valores, tempos, níveis, cores, aparência, custos e descrições. |
| Melhorias | [`js/config/upgrades.js`](../js/config/upgrades.js) | `UPGRADES_CONFIG`; níveis, custos, requisitos, efeitos e salários. |
| Encomendas | [`js/config/bouquets.js`](../js/config/bouquets.js) | `SPECIAL_ORDERS`; requisitos e recompensas estáticas. |
| Receitas/harmonia | [`js/config/bouquets.js`](../js/config/bouquets.js) | `calculateBouquetHarmony`; combinação, embrulho e acessório influenciam o multiplicador. |
| Embrulhos e acessórios | [`js/config/bouquets.js`](../js/config/bouquets.js) | `WRAPPERS` e `ACCESSORIES`. |
| Clientes e diálogos | [`js/config/customers.js`](../js/config/customers.js) | Nomes e frases de saudação, espera, sucesso e saída; seleção aleatória em [`js/entities/customer.js`](../js/entities/customer.js). |
| Terrenos/progressão | [`js/state.js`](../js/state.js), [`js/config/flowers.js`](../js/config/flowers.js) | Parcelas iniciais no estado; desbloqueio baseado em nível e ordem das flores; parcelas extra opcionais após duas parcelas da flor. |
| Recursos visuais do mundo | [`js/assets.js`](../js/assets.js), [`js/entities/field.js`](../js/entities/field.js), [`js/main.js`](../js/main.js) | Renderização Canvas; os parâmetros das flores alimentam o campo e a placa de stock. |
| Termos | [`docs/FloristEver_Termos_e_Condicoes.md`](./FloristEver_Termos_e_Condicoes.md) no estado observado | Referências da build e do jogo ainda esperam `FloristEver_Termos_e_Condicoes.md` na raiz. |

### Estado, save e migrações atuais

- A classe `GameState` está em [`js/state.js`](../js/state.js).
- Save principal: chave `floristever_save_v1`; cópia de recuperação: `floristever_save_backup_v1`.
- O save é serializado como JSON através de [`exportSaveData`](../js/state.js#L568). O carregamento usa [`parseSaveData`](../js/state.js#L18) e [`load`](../js/state.js#L615).
- Campos incluem economia, nível, stock, cesto, melhorias, emprego/contratos, loja, configurações, flores desbloqueadas, receitas descobertas, encomendas, estatísticas, tutorial, parcelas e hora de gravação.
- Na baseline inicial não existia `schemaVersion` global. `economyVersion: 2` e `employmentVersion: 1` são versões locais desses subsistemas. A Etapa 0B acrescentou `schemaVersion: 1`; saves sem versão são interpretados como versão 1. `load()` mantém as adaptações retrocompatíveis existentes, incluindo defaults, leitura dos campos antigos de contratos/economia, posições antigas de parcelas e conclusão de encomendas conhecidas.
- Ao gravar, o save principal válido anterior é copiado para a chave de backup. Saves inválidos não são sobrescritos pelo próprio carregamento; se o principal falhar e o backup for válido, o backup é carregado.
- [`importSaveData`](../js/state.js#L782) valida a estrutura, preserva o save local atual como backup e só depois escreve e carrega o save recebido.
- O cliente cloud guarda tokens e revisão em `localStorage`. Os saves cloud são associados ao utilizador/app e incluem revisão, checksum e ID do dispositivo no serviço.

**Exemplo anonimizado do formato atual** — valores ilustrativos; não é um save de jogador:

```json
{
  "schemaVersion": 1,
  "economyVersion": 2,
  "employmentVersion": 1,
  "coins": 0,
  "reputation": 0,
  "level": 1,
  "stock": { "daisy": 0, "tulip": 0, "sunflower": 0, "rose": 0, "orchid": 0 },
  "basket": [],
  "upgrades": {},
  "employment": { "active": { "cashier": false, "harvester": false }, "nextPayrollAt": null },
  "storeName": "[nome local]",
  "settings": {},
  "unlockedFlowers": {},
  "discoveredBouquets": [],
  "orders": [{ "id": "[id estável]", "isCompleted": false }],
  "stats": {},
  "tutorial": { "currentStep": 0, "completed": false },
  "plots": [{ "id": 0, "flowerId": "daisy", "unlocked": true, "flowers": [] }],
  "lastSaveTime": 0
}
```

Este exemplo mostra a representação depois da Etapa 0B. As fixtures de saves sem `schemaVersion` representam o formato legado lido como versão 1. `parseSaveData()` continua a validar a estrutura geral; não é um esquema completo de todos os campos do jogo.

### IDs e conteúdo publicado no código

**Flores ([`FLOWER_ORDER`](../js/config/flowers.js#L105)):**

- `daisy` — Margarida, nível 1.
- `tulip` — Tulipa, nível 2.
- `sunflower` — Girassol, nível 3.
- `rose` — Rosa, nível 5.
- `orchid` — Orquídea, nível 8.

Os dados da flor são usados pelo campo, colheita, clientes, stock, receitas, livro, placa da loja, requisitos de terrenos e ferramentas de desenvolvimento. Há referências e defaults adicionais de IDs no estado inicial e nas interfaces; uma nova flor exigiria percorrer todos esses pontos.

**Encomendas especiais (`SPECIAL_ORDERS`, em [`js/config/bouquets.js`](../js/config/bouquets.js)):**

- `apology_gift` — Pedido de Desculpas Carinhoso, Afonso.
- `summer_wedding` — Casamento Campestre, Mariana.
- `first_date` — Primeiro Encontro Romântico, Lucas.
- `royal_tribute` — Homenagem Botânica Sublime, D. Beatriz.

As encomendas são dados estáticos em `js/config/bouquets.js`. O estado de conclusão é guardado no array `orders` do save e restaurado por correspondência com esses IDs.

**Melhorias ([`UPGRADES_CONFIG`](../js/config/upgrades.js)):** `cashier`, `harvester`, `basketCapacity`, `speedBoots`, `growthSpeed`, `counterUpgrade`, `shopDecor`, `shopExpansion`, `bouquetBench`.

**Embrulhos:** `kraft`, `pink`, `lavender`, `gold`.  
**Acessórios:** `none`, `ribbon`, `heart`, `card`, `glitter`.

Os IDs acima já fazem parte de saves, de condições de jogo ou de receitas. Devem ser tratados como imutáveis.

### Encomendas: descoberta, preparação e recompensa

- O livro e a bancada são geridos por [`js/ui/bouquet.js`](../js/ui/bouquet.js), em [`renderBook`](../js/ui/bouquet.js#L664), [`prepareOrder`](../js/ui/bouquet.js#L276), [`renderWorkbench`](../js/ui/bouquet.js#L213) e [`craftBouquet`](../js/ui/bouquet.js#L589).
- O estado atual da encomenda é derivado do nível do jogador e de flores desbloqueadas; o nível necessário é calculado a partir de nível 5 e dos níveis exigidos pelas flores do pedido.
- A preparação seleciona automaticamente as flores disponíveis para o pedido e abre a bancada.
- **A seleção de flores, embrulho, acessório e encomenda ativa na bancada não é persistida no save.** Se o jogo for fechado antes da criação do ramo, é necessário preparar novamente.
- Ao criar um ramo correspondente, `craftBouquet()` define `isCompleted`, soma `bonusCoins` e `bonusRep`, soma o valor do ramo, atualiza estatísticas, regista a combinação em `discoveredBouquets` e chama `state.save()`.
- O save persiste a conclusão booleana por ID, mas não guarda cliente recorrente, arco, estado de relação nem contexto separado. O texto atual da encomenda é um campo `clue`.
- As quatro encomendas são marcadas como concluídas uma única vez e deixam de poder ser preparadas.

### Sincronização cloud

- O cliente está em [`js/light-login-client.js`](../js/light-login-client.js); a interface está em [`js/ui/account.js`](../js/ui/account.js); o serviço está em [`light-group-login/`](../light-group-login).
- Login e registo requerem rede. Jogar como convidado usa o save local.
- Com sessão e sincronização ativadas, `syncNow()` faz autosync a cada 30 segundos, ao esconder o documento e no `pagehide`.
- Quando o login/bootstrap compara uma revisão remota superior à revisão cloud conhecida, pode importar o save remoto. Caso contrário, envia o save local.
- Num conflito HTTP 409 durante autosync silencioso, não substitui silenciosamente o save local; apresenta estado para resolução posterior. Na sincronização manual, pergunta se deve prevalecer o save local ou o remoto.
- As alterações locais não são colocadas numa fila cloud transacional: permanecem no save local e são reenviadas por autosync/tentativas futuras.
- A identidade e autenticação são opcionais para o jogo local e para o conteúdo planeado.

### Service worker e pré-cache

- Service worker em [`sw.js`](../sw.js); nome atual da cache: `floristever-v30`.
- A lista em `ASSETS_TO_CACHE` no ficheiro de origem é manual e contém a origem dos Termos em `docs/`. O processo [`scripts/build-web.js`](../scripts/build-web.js) gera uma lista abrangente para `dist/`, enumerando ficheiros copiados, e [`scripts/validate-build.js`](../scripts/validate-build.js) verifica que os ficheiros da build estão no manifesto.
- A instalação usa `cache.addAll()` e falha a instalação se um recurso obrigatório não puder ser guardado. A ativação apaga caches antigas com prefixo `floristever-` e reclama os clientes.
- Requisições same-origin à lista de pré-cache e navegações são network-first, com fallback à cache; chamadas não GET, API cross-origin e recursos locais fora da lista ficam fora desta estratégia.
- A UI de atualização e registo do worker estão em [`setupServiceWorkerUpdatePrompt`](../js/main.js#L832).
- A versão da cache tem de ser atualizada quando a estratégia ou os recursos essenciais mudam.

### UI, tutorial, HUD e diálogos

| Área | Localização |
|---|---|
| Ciclo principal e ligação dos subsistemas | [`js/main.js`](../js/main.js) |
| HUD, botões e indicadores de estado | [`js/ui/hud.js`](../js/ui/hud.js), marcação em [`index.html`](../index.html), estilos em [`style.css`](../style.css) |
| Livro de encomendas e herbário de receitas | [`js/ui/bouquet.js`](../js/ui/bouquet.js), secção `renderBook()` |
| Bancada de ramos e encomendas | [`js/ui/bouquet.js`](../js/ui/bouquet.js), secções `renderWorkbench()`, `prepareOrder()` e `craftBouquet()` |
| Loja de melhorias, objetivos e contratos | [`js/ui/shop.js`](../js/ui/shop.js) |
| Loja de terrenos extra | [`js/ui/optional-store.js`](../js/ui/optional-store.js) |
| Dicas contextuais iniciais | [`js/ui/tutorial.js`](../js/ui/tutorial.js) |
| Tutorial temático/rejogável | [`js/ui/game-tutorial.js`](../js/ui/game-tutorial.js) |
| Nomes e diálogo de clientes | [`js/config/customers.js`](../js/config/customers.js) e [`js/entities/customer.js`](../js/entities/customer.js) |

### Stock por flor e ajudantes

- O estado e os métodos de capacidade estão em [`js/state.js`](../js/state.js): [`getFlowerStockCapacity`](../js/state.js#L411), [`getAvailableShopStockSpace`](../js/state.js#L422) e [`depositBasketToStock`](../js/state.js#L452).
- O limite base atual é 20 por flor; cada nível de `shopExpansion` aumenta em 20 o limite por flor. A capacidade agregada soma apenas as flores desbloqueadas.
- O depósito examina cada flor separadamente, deixa no cesto as unidades inválidas, bloqueadas ou sem espaço e permite depositar outros tipos que ainda tenham espaço.
- O jogador deposita automaticamente ao aproximar-se do balcão; lógica em `js/main.js`.
- `Worker` em [`js/entities/worker.js`](../js/entities/worker.js) pede ao campo a flor madura mais próxima para a qual tenha espaço, descontando também as unidades dessa flor no seu próprio cesto. [`findNearestReadyFlower`](../js/entities/field.js#L128) aceita um predicado de elegibilidade.
- Os ajudantes têm cestos individuais pequenos; ao chegar ao balcão, tentam depositar e conservam o excedente.
- Clientes podem pedir qualquer flor desbloqueada, selecionada a partir do conjunto disponível; o atendimento vende apenas se existir quantidade pedida em stock.
- A UI do livro e bancada, placa visual do stock, ferramenta de desenvolvimento e validador da build também usam os limites por flor.

### Localização e strings

- Não foi encontrado um sistema dedicado de localização, catálogo de traduções ou seleção de idioma.
- A maioria dos textos está escrita diretamente em português nos ficheiros HTML, UI, configurações e entidades.
- Diálogos dos clientes estão em [`js/config/customers.js`](../js/config/customers.js), mas textos de encomendas, estados e botões estão distribuídos por [`js/config/bouquets.js`](../js/config/bouquets.js) e [`js/ui/bouquet.js`](../js/ui/bouquet.js).
- Conteúdo narrativo futuro deve ser mantido como dados estruturados, não misturado com lógica de desbloqueio.

## 3. Baseline (2026-10-05)

| Verificação | Resultado | Evidência |
|---|---|---|
| `npm run validate` | ❌ Falhou antes do validador da build | [`scripts/build-web.js`](../scripts/build-web.js) tentou copiar `C:\Users\euafo\Downloads\FloristEver\FloristEver_Termos_e_Condicoes.md`, inexistente. O ficheiro observado está em [`docs/FloristEver_Termos_e_Condicoes.md`](./FloristEver_Termos_e_Condicoes.md). |
| `npm run login:test` | ✅ Passou | 3 ficheiros de teste; 7 testes aprovados (`crypto`, política de palavra-passe e papéis). |
| Linter | ⚠️ Não configurado | Não há script `lint` no [`package.json`](../package.json) raiz nem configuração de linter identificada no projeto do jogo. |
| Testes de save/migração/conteúdo | ⚠️ Em falta | Não há testes próprios de `GameState`, migrações, encomendas ou validação cruzada de conteúdo. |
| Fixtures de save | ⚠️ Em falta | Não foram encontradas fixtures próprias para jogo novo, intermédio ou avançado. |
| Repositório/branch | ⚠️ Indisponível | A pasta não contém metadados `.git`; não é possível executar protocolo de branch/commit nesta cópia. |

O script de build começa por remover e recriar `dist/` antes de copiar os ficheiros. Na execução baseline, a cópia dos Termos falhou e a geração da build foi interrompida. É necessária decisão/aprovação para resolver a localização de origem dos Termos antes de se poder declarar uma build baseline verde; esta auditoria não alterou ficheiros de jogo nem moveu documentos.

## 4. Inventário de riscos e lacunas

1. **Sem versão global do save:** novos campos terão de ser compatíveis e a migração deve ser explícita, testada e idempotente.
2. **Sem testes de save e conteúdo:** o comportamento atual é descrito por código e não tem fixtures que protejam saves de jogador contra regressões.
3. **Build baseline bloqueada por caminho de Termos:** o script espera o documento na raiz enquanto a cópia observada está em `docs/`; `dist/` é limpo antes da falha.
4. **Conclusão de encomenda é o único estado narrativo persistido:** não existe entidade cliente/arco/relação nem estado de encomenda em curso.
5. **Preparação da bancada não é retomável após fechar o jogo:** seleção atual e pedido ativo não são guardados.
6. **Dados de encomenda e diálogos em locais diferentes:** parte dos textos está estruturada, parte é construída no JS da UI.
7. **Sem sistema de localização:** texto de conteúdo e UI estão acoplados à língua atual.
8. **IDs de flor distribuídos por vários subsistemas:** `FLOWER_ORDER` centraliza a sequência, mas há mapas/defaults e fluxos de renderização/stock que também precisam ser atualizados para novas flores.
9. **Pré-cache de origem manual:** build de produção complementa a lista por varrimento, mas o service worker fonte usado no desenvolvimento continua a depender da lista escrita à mão.
10. **Sem Git nesta cópia:** o fluxo exigido de branch isolada por fase não pode ser cumprido sem um checkout Git apropriado.
11. **Sem evidência de validação visual/tátil automatizada para conteúdo novo:** a build verifica estrutura, mas não substitui testes de usabilidade em ecrãs pequenos e controlos.
12. **Economia narrativa ainda sem números aprovados:** requisitos e recompensas precisam de análise conjunta com valor das flores, níveis e limite do stock antes de serem gravados como definitivos.

## 5. Proposta de infraestrutura mínima de suporte

Esta proposta foi aprovada pelo utilizador e implementada na Etapa 0B, com os resultados registados na secção 7.

### A. Validação de conteúdo

Criar um comando Node.js de validação que leia as configurações reais e falhe com mensagens por ID/campo. Escopo mínimo:

- IDs únicos, estáveis e válidos em cada categoria de conteúdo.
- Referências de flores existentes em encomendas/receitas e níveis desbloqueáveis para os requisitos.
- Requisitos e quantidades inteiros, finitos e não negativos; quantidades de encomenda não superiores ao limite de stock atingível no nível.
- Recompensas e custos finitos e não negativos.
- Referências a recursos locais existentes e incluídos no pré-cache.
- Regras específicas de encomenda: sem dependência de terrenos opcionais e sem bloqueio da progressão principal.

Integrar o comando em `npm run validate` depois de a baseline web estar reparada/aprovada.

### B. Fixtures de save

Criar fixtures **sintéticas e sem dados de utilizadores** para:

1. Jogo novo.
2. Progresso intermédio com algumas flores/terrenos, receitas e encomendas concluídas.
3. Progresso avançado com todas as flores atuais desbloqueadas, expansões, empregados, receitas e encomendas concluídas.

Guardar as fixtures numa pasta de testes própria e tratá-las como dados de referência só de leitura. Os testes devem executar migrações sobre cópias em memória, confirmar idempotência, defaults seguros e preservação do backup. Não recolher saves pessoais para criar estas fixtures.

### C. Versão global do save

Introduzir, após aprovação, `schemaVersion` no save exportado. Proposta inicial, alinhada com a regra de compatibilidade do prompt:

- Saves atuais sem `schemaVersion` são interpretados como versão 1; ao serem gravados, passam a incluir `schemaVersion: 1`.
- Mudanças futuras incompatíveis avançam a versão explicitamente (versão 2 ou superior), com migrações puras e idempotentes entre versões.
- A migração valida o resultado antes da escrita; se falhar, mantém o save original e backup intactos e comunica o erro, sem substituição por defaults.
- Manter `economyVersion` e `employmentVersion` até haver plano explícito para removê-los; não confundir versões locais com a versão global.

Os detalhes de armazenamento do backup e recuperação devem ser exercitados com falha forçada nas fixtures antes de a migração ser usada em saves reais.

## 6. Perguntas em aberto

1. ✅ **Auditoria e infraestrutura da Etapa 0B aprovadas pelo utilizador.**
2. ✅ Confirmado e implementado: [`docs/FloristEver_Termos_e_Condicoes.md`](./FloristEver_Termos_e_Condicoes.md) é a fonte da build; o documento é copiado para a raiz do artefacto sem ser movido ou reescrito.
3. A pasta atual não é um repositório Git. Para as fases que exigem branch própria, vais fornecer/abrir um checkout Git ou autorizas a continuação sem branch nesta cópia?
4. Antes de escrever conteúdo da Fase 1, deveremos aprovar separadamente quantidade de encomendas/clientes, nomes/arcos, textos e recompensas; confirmas esse fluxo de aprovação?

## 7. Etapa 0B — infraestrutura implementada

### Alterações entregues

- [`js/save-migrations.mjs`](../js/save-migrations.mjs) expõe uma migração pura e idempotente para `schemaVersion: 1`. Um campo ausente é interpretado como versão 1; versões inválidas ou superiores à versão suportada geram erro explícito.
- [`js/state.js`](../js/state.js) grava `schemaVersion` nas exportações, migra saves locais antes de os carregar e valida saves cloud antes de os gravar localmente. Se um save não puder ser carregado, bloqueia as gravações automáticas e preserva o ficheiro principal e o backup.
- [`js/main.js`](../js/main.js) informa o jogador quando bloqueia gravações; [`js/ui/account.js`](../js/ui/account.js) suspende a sincronização cloud para evitar enviar o estado predefinido por cima de um save não carregável.
- Foram criadas três fixtures sintéticas e só de leitura: [`new-game.json`](../tests/fixtures/saves/new-game.json), [`mid-game.json`](../tests/fixtures/saves/mid-game.json) e [`advanced-game.json`](../tests/fixtures/saves/advanced-game.json).
- [`scripts/validate-content.mjs`](../scripts/validate-content.mjs) verifica IDs de categorias, ordem e referências de flores, embrulhos e acessórios, níveis/custos/recompensas/quantidades, requisitos das encomendas, referências a recursos locais e inclusão desses recursos no pré-cache.
- [`sw.js`](../sw.js) foi atualizado para a cache `floristever-v31` e inclui o módulo de migrações. [`scripts/validate-build.js`](../scripts/validate-build.js) exige o módulo na build e verifica a lista de pré-cache gerada, incluindo ficheiros adicionados.
- Foram adicionados testes do jogo em [`tests/save-migrations.test.mjs`](../tests/save-migrations.test.mjs) e [`tests/content-validation.test.mjs`](../tests/content-validation.test.mjs), executados por `npm run test:game`. `npm run validate:content` executa o validador diretamente.

### Validação após as alterações

| Verificação | Resultado |
|---|---|
| `npm run validate:content` | ✅ Passou: 5 flores, 4 encomendas e 9 melhorias. |
| `npm run test:game` | ✅ Passou: 8 testes, incluindo migração/idempotência das três fixtures, compatibilidade do carregamento, preservação do backup em falha e presença do módulo no pré-cache. |
| `npm run login:test` (baseline) | ✅ Passou: 7 testes. |
| `npm run validate` | ✅ Passou após alinhar a cópia dos Termos e atualizar o pré-cache: build web, validação de conteúdo e validador da build. |

**Estado:** Etapa 0 e Etapa 0B concluídas. A baseline da build e os testes estão verdes. A Fase 1 não foi iniciada.
