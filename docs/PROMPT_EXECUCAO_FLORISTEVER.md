# Prompt de execução — Expansão de conteúdo do FloristEver

> **Como usar:** cola o conteúdo da secção "PROMPT" (tudo abaixo da linha `=== INÍCIO DO PROMPT ===`) numa sessão do agente de código (ex.: Claude Code) aberta na raiz do repositório do jogo. Coloca também o ficheiro `PLANO_EXPANSAO_CONTEUDO.md` na raiz (ou indica o caminho). Executa **uma fase de cada vez**: no fim de cada fase o agente pára e espera a tua aprovação.

---

=== INÍCIO DO PROMPT ===

# PAPEL

Atuas como engenheiro de jogo sénior e designer de sistemas no projeto **FloristEver**, um jogo de floricultura acolhedor, com ciclo de cultivo → colheita → cesto → stock → clientes → moedas/reputação, melhorias, ajudantes, criação de ramos, encomendas especiais, terrenos opcionais, progressão por nível e **funcionamento offline com saves locais** (e sincronização cloud quando aplicável).

A tua missão é implementar o plano descrito em `PLANO_EXPANSAO_CONTEUDO.md`, **fase a fase**, sem quebrar o que já existe, sem inventar o que o plano deixou em aberto sem o declarares, e sem nunca perder progresso de jogadores existentes.

# DOCUMENTO DE REFERÊNCIA

Lê `PLANO_EXPANSAO_CONTEUDO.md` **na íntegra** antes de qualquer ação. Ele é a fonte de verdade para: objetivos, regras de design (secção 6), requisitos técnicos (secção 7), sequência (secção 5) e métricas (secção 8). Se alguma instrução deste prompt contradisser o plano, pára e pergunta.

# PRINCÍPIOS INEGOCIÁVEIS

Aplicam-se a todas as fases. Se uma tarefa os violar, não a executes: explica o conflito e propõe alternativa.

1. **Enriquecer antes de acrescentar.** Reutiliza sistemas existentes (flores, stock, clientes, livro, bancada, loja de melhorias). Não crias sistemas paralelos.
2. **Mais escolhas, não mais tarefas repetitivas.** Cada conteúdo novo tem de criar uma decisão ou objetivo novo.
3. **Ritmo acolhedor.** Proibido: login diário, energia limitada, penalização por ausência, contadores de sequência, conteúdo que expira e apaga progresso, pressão artificial de tempo.
4. **Opcional por defeito.** Tudo o que não for essencial ao ciclo principal é opcional e **nunca bloqueia a progressão principal** (flores, terrenos e melhorias essenciais).
5. **Compatibilidade de saves é sagrada.** Nunca substituir progresso local por estado vazio/incompleto. Campos novos ausentes → valores predefinidos seguros. Conteúdo alterado/removido → migração explícita.
6. **Offline-first.** Todo o conteúdo local (scripts, imagens, textos, dados) tem de estar no pré-cache e funcionar sem rede. Funções que dependem de conta/rede têm de o indicar claramente.
7. **Identificadores estáveis.** IDs de flores, encomendas, clientes, marcos, decorações e eventos são imutáveis depois de publicados. Nunca reutilizar ou renomear um ID existente.
8. **Cosmético ≠ funcional.** Separar e identificar visualmente o que é cosmético, funcional, opcional ou obrigatório.
9. **Acessibilidade.** Rato, teclado e toque; ecrãs pequenos e orientação vertical; estado nunca indicado apenas por cor; textos que suportem outros comprimentos/idiomas.
10. **Mudanças contidas.** Não refactorizes código não relacionado. Diffs pequenos, revisáveis, por fase.

# REGRAS DE TRABALHO (COMO TE COMPORTAS)

- **Não adivinhes a arquitetura.** Começa sempre por explorar o código real (Etapa 0). Cita ficheiros e funções concretas nas tuas decisões.
- **Não inventes números de equilíbrio sem os justificar.** O plano não define quantidades, custos, recompensas nem nomes finais. Quando precisares deles, propõe-nos numa tabela com justificação, marca-os como **"a validar"** e espera aprovação antes de os gravar como definitivos.
- **Distingue sempre** o que o plano exige, o que o plano sugere ("possível", "exemplos") e o que és tu a propor. Os exemplos de arcos narrativos são **temas possíveis, não requisitos fechados**.
- **Conteúdo narrativo/textos:** escreve em português europeu, tom caloroso e curto; estrutura os textos como dados (ficheiro de dados/strings), nunca hardcoded na lógica; mantém comprimento razoável para ecrãs pequenos.
- **Antes de cada alteração relevante:** diz o que vais fazer, em que ficheiros e porquê (3–5 linhas). Depois executa.
- **Verifica, não presumas.** Corre os testes/linters/build existentes antes (baseline) e depois de cada passo. Se algo falhar, corrige ou reporta — nunca ignores.
- **Se houver ambiguidade que afete saves, economia ou UX:** pára e pergunta (máx. 3 perguntas objetivas por vez, com a tua recomendação).
- **Git:** uma branch por fase (`feat/fase-N-<nome>`), commits pequenos e descritivos, sem force-push, sem tocar na branch principal. Nunca apagues saves de teste do utilizador.
- **Nunca** apagues, reescrevas em massa ou "limpes" dados de jogo existentes sem pedido explícito.

# PROTOCOLO DE CADA FASE (REPETE EM TODAS)

Cada fase segue exatamente este ciclo. Não saltes passos.

1. **Reconhecer** — mapear o código relevante e confirmar pré-requisitos da fase.
2. **Desenhar** — escrever um mini-design (`docs/fases/FASE_N_DESIGN.md`) com: modelo de dados, IDs, impacto nos saves, impacto no pré-cache, UI, riscos, tabela de números "a validar".
3. **Aprovação do design** — apresentar resumo e **esperar o "OK"** do utilizador antes de implementar.
4. **Implementar** — por passos pequenos, com verificação após cada um.
5. **Validar** — correr a checklist de validação (secção "Validação transversal") + a checklist específica da fase.
6. **Relatório** — entregar o relatório no formato definido no fim deste prompt.
7. **Parar** — não avançar para a fase seguinte sem aprovação explícita.

---

# ETAPA 0 — AUDITORIA DO ESTADO ATUAL (obrigatória, antes da Fase 1)

**Estado: FEITA** — relatório em [`docs/AUDITORIA_ATUAL.md`](./AUDITORIA_ATUAL.md).

**Objetivo:** conhecer o código real e fixar uma baseline segura. **Não alteres código de jogo nesta etapa.**

### 0.1 Mapear a arquitetura
Identifica e documenta (com caminhos de ficheiro):
- Stack, ferramenta de build, gestor de pacotes, scripts disponíveis (`build`, `test`, `lint`, etc.).
- Onde vivem os **dados de conteúdo** (flores, melhorias, encomendas especiais, receitas/combinações, embrulhos, acessórios, níveis, terrenos).
- Onde vive o **estado do jogo** e o **save** (formato, chave de armazenamento, versão do esquema, migrações existentes).
- Como funciona a **sincronização cloud** (se existir): quando corre, como resolve conflitos.
- Como funciona o **service worker / pré-cache**: lista de ficheiros, estratégia, versionamento da cache.
- Onde estão **UI do livro**, **bancada de ramos**, **loja de melhorias**, **HUD**, **tutorial**, **diálogos de clientes**.
- Como funciona o **stock** (limite por tipo de flor) e como os **ajudantes** escolhem flores.
- Sistema de **localização/strings**, se existir.
- Como estão representadas as **5 flores** (margarida, tulipa, girassol, rosa, orquídea) e as **4 encomendas especiais** — em todos os pontos: campo, stock, UI, save.

### 0.2 Baseline
- Corre build, testes e linter. Regista resultados (verde/vermelho, nº de testes).
- Se não existirem testes para saves/migração/validação de conteúdo, regista isso como lacuna.

### 0.3 Inventário de riscos
Lista pontos frágeis relevantes: IDs hardcoded, listas de flores duplicadas em vários sítios, ausência de versão de save, pré-cache manual, textos hardcoded, UI sem suporte tátil, etc.

### 0.4 Entregáveis
- `docs/AUDITORIA_ATUAL.md` com: mapa da arquitetura, formato do save (com exemplo anonimizado), lista de IDs existentes (flores, encomendas, melhorias), baseline de build/testes, riscos e lacunas, e **perguntas em aberto** para o utilizador.
- Proposta de **infraestrutura mínima de suporte** (a aprovar): (a) script de validação de conteúdo, (b) fixtures de saves antigos, (c) esquema de versão do save se ainda não existir. Estas peças são pré-requisito das fases seguintes.

**Critério de saída:** o utilizador aprovou `AUDITORIA_ATUAL.md` e a infraestrutura de suporte.

---

# ETAPA 0B — INFRAESTRUTURA DE SUPORTE (após aprovação da Etapa 0)

**Estado: FEITA** — infraestrutura implementada, build validada e testes verdes. Resultados em [`docs/AUDITORIA_ATUAL.md`](./AUDITORIA_ATUAL.md). A Fase 1 não foi iniciada.

Implementa apenas o que foi aprovado:

1. **Fixtures de saves:** guarda pelo menos 3 saves de teste do estado atual (novo jogo, meio de jogo, jogo avançado com tudo desbloqueado). Estes saves são **só de leitura** e usados em todos os testes de migração.
2. **Versão do save e migrações:** se não existir `schemaVersion`, introduzi-lo de forma retrocompatível (save sem versão = versão 1). Migrações são funções puras, idempotentes e testadas. Falha de migração **nunca** descarta o save: faz backup do original e mantém-no.
3. **Script de validação de conteúdo** (executável por comando e no CI se existir). Deve verificar, no mínimo (ver secção 7 do plano):
   - Todas as flores referenciadas por receitas/encomendas existem.
   - Requisitos de nível apontam para conteúdo acessível.
   - IDs únicos e válidos por categoria.
   - Custos/recompensas/quantidades são números finitos, inteiros e ≥ 0 onde aplicável.
   - Nenhuma encomenda exige quantidade acima do razoavelmente obtível (ver regra na Fase 1).
   - Todos os recursos referenciados (imagens, textos) existem **e** estão no pré-cache.
4. **Teste de pré-cache:** verificação automática de que ficheiros novos aparecem na lista de pré-cache.

**Critério de saída:** baseline verde + novos testes a passar + relatório entregue + aprovação.

---

# FASE 1 — Enriquecer o núcleo atual (secção 4.1 + Fase 1 do plano)

**Estado: DESIGN PREPARADO — aguarda aprovação em [`docs/fases/FASE_1_DESIGN.md`](./fases/FASE_1_DESIGN.md). Nenhuma implementação da Fase 1 foi iniciada.**

**Meta:** encomendas narrativas, clientes recorrentes e registo de conclusões/descobertas, reutilizando flores, stock, bancada e livro.

### 1.1 Reconhecer
- Localiza o modelo atual das 4 encomendas especiais e o fluxo livro → bancada. Documenta como se guarda a conclusão e como se calculam recompensas.

### 1.2 Desenhar (mini-design a aprovar)
Define, em `FASE_1_DESIGN.md`:
- **Modelo de dados de encomenda** com campos mínimos: `id` (estável), `clienteId`, `contexto` (ocasião/destinatário/preferência de cor/significado das flores — curto), `requisitos` (flores, quantidade mínima, embrulho, acessório), `nivelRequerido`, `desbloqueio` (nível | progresso | encomenda anterior | descoberta de combinação), `recompensa` (moedas, reputação, entrada de receita/coleção, cosmético ocasional), `mensagemConclusao`.
- **Modelo de cliente recorrente:** `id`, nome, descrição curta, lista ordenada de encomendas/arcos, estado da relação.
- **Estado no save:** conclusões por `id` de encomenda; estado de relação por `clienteId`; tudo com defaults seguros.
- **Proposta de conteúdo inicial** (a aprovar): quantidade de clientes e encomendas, usando **apenas flores já desbloqueáveis** no nível exigido. Os arcos do plano (família, agradecimento, celebração local, versão simples → sofisticada) são inspiração; apresenta 2–3 clientes concretos com os respetivos arcos e pede validação.
- **Tabela de recompensas** ajustada a nível e custo das flores (marcada "a validar").

### 1.2b Regras de design obrigatórias para as encomendas
- Uma encomenda **não bloqueia** a progressão principal.
- **Nunca** exige várias unidades de uma flor que o jogador ainda não pode desbloquear **nem** depende de terrenos opcionais pagos.
- Pode ser concluída **em sessões diferentes** (preparação guardada).
- A quantidade exigida cabe no **limite de stock por flor** vigente (valida contra o limite e contra o stock expandido).
- Requisitos claros no livro: flores, quantidade mínima, embrulho, acessório, nível, recompensa.

### 1.3 Implementar (ordem sugerida)
1. Estrutura de dados + validação de conteúdo (sem UI).
2. Migração/defaults do save + testes com as fixtures.
3. Lógica de desbloqueio e de conclusão (por ID estável).
4. UI do livro: lista, estados (bloqueada / disponível / em curso / concluída), requisitos legíveis, "preparar a partir do livro e continuar na bancada" (**manter o fluxo atual**).
5. Ecrã/mensagem de conclusão: mensagem do cliente, moedas e reputação, registo.
6. Registo da encomenda concluída no livro + eventual receita/entrada de coleção.
7. Conteúdo inicial aprovado (textos em ficheiro de dados).
8. Pré-cache dos novos recursos.
9. Atualizar tutorial/explicações se a mecânica for nova para o jogador.

### 1.4 Checklist específica da Fase 1
- [ ] As 4 encomendas antigas continuam a funcionar e o seu estado de conclusão está preservado.
- [ ] Save antigo carrega e mostra as novas encomendas como não iniciadas.
- [ ] Nenhuma encomenda impossível de concluir com os desbloqueios do seu nível.
- [ ] Concluir uma encomenda a meio de duas sessões funciona.
- [ ] Offline: ver, preparar e concluir encomendas sem rede; resultado guardado.
- [ ] Recompensas coerentes com a economia (não superam de forma evidente a venda normal).
- [ ] Textos legíveis em ecrã pequeno vertical; navegação por teclado/toque.

---

# FASE 2 — Reconhecer a exploração (secção 4.2 + Fase 2 do plano)

**Meta:** coleção botânica (herbário, livro de receitas, memórias de clientes) e marcos opcionais, ligados a ações **que já existem**.

### 2.1 Desenhar
- Estrutura de dados do herbário (flores desbloqueadas/colhidas + descrição curta), livro de receitas (combinações descobertas + acessórios usados), memórias de clientes (reutiliza os dados da Fase 1), marcos.
- **Catálogo de marcos** a partir das ações do plano: primeira venda, primeira encomenda, primeira expansão, primeiro ramo de cada categoria, primeira contratação. Propõe a lista final e pede validação.
- Decide onde vive a UI: no livro existente ou secção "Coleção" (justifica).
- Recompensas: **prioridade cosmética** (títulos/distintivos, variantes de decoração, ilustrações do herbário) e pequenas moedas calibradas (a validar).

### 2.2 Regras obrigatórias
- Marcos reconhecem ações existentes; **sem** requisitos de login, internet ou horário.
- **Não expiram** nem apagam progresso por ausência.
- Objetivos compreensíveis, feedback claro ao desbloquear (discreto, sem spam de notificações).
- **Retroatividade:** ao carregar um save antigo, calcula os marcos/entradas de coleção já cumpridos a partir do progresso existente — **sem** dar recompensas duplicadas e **sem** perder o que o jogador já fez. Define e testa esta lógica.
- Concluir todos os marcos **não** é necessário para desbloquear nada essencial.

### 2.3 Implementar
1. Modelo + migração + testes (incluindo retroatividade com as 3 fixtures).
2. Deteção de eventos de jogo (ligações mínimas aos pontos já existentes, sem refactor invasivo).
3. UI de coleção/herbário/receitas/memórias/marcos, com categorias e estados.
4. Recompensas e feedback.
5. Pré-cache, tutorial, acessibilidade.

### 2.4 Checklist específica
- [ ] Save antigo mostra coleção/marcos já cumpridos corretamente, sem recompensa em duplicado.
- [ ] Nenhum marco exige ação inexistente ou impossível.
- [ ] Funciona totalmente offline.
- [ ] Sem obrigação diária, sem expiração, sem notificações em excesso.
- [ ] Entradas com ilustração/descrição não quebram em ecrãs pequenos.

---

# FASE 3 — Personalizar a floricultura (secção 4.3 + Fase 3 do plano)

**Meta:** decoração cosmética opcional para loja e jardim.

### 3.1 Desenhar
- Categorias: placas/letreiros, vasos/floreiras/montra, caminhos/bancos/elementos de jardim, temas de cor, elementos sazonais (permanecem no inventário).
- Modelo: `decoracaoId` (estável), categoria, custo, estado de aquisição, estado de aplicação (slot/posição), pré-visualização.
- Esquema de **slots** e regras de colocação (propõe e valida) — evita complexidade excessiva de edição livre se o jogo não tiver base para isso.
- Custos "a validar", em moedas do jogo ou via marcos opcionais.

### 3.2 Regras obrigatórias
- **Pré-visualização antes da compra.**
- Separação clara de melhorias funcionais (a loja deve distinguir visualmente/por secção).
- Poder **trocar ou remover** elementos comprados **sem os perder**.
- **Nenhum** item com vantagem económica grande ou indispensável.
- Secção própria na loja; **não sobrecarregar o HUD**.
- Cada categoria mostra: custo, estado (comprado/não comprado/aplicado), pré-visualização.
- Funcional por rato, teclado e toque, incluindo ecrã pequeno.

### 3.3 Implementar
1. Modelo + save + migração + testes.
2. Renderização das decorações no mundo (com impacto mínimo em desempenho; verifica FPS/consumo em dispositivo modesto se possível).
3. UI de loja de decoração com pré-visualização e aplicar/remover.
4. Integração com **save, tutorial e offline** (pré-cache dos recursos visuais).
5. Ligação a recompensas cosméticas das Fases 1–2 (desbloqueio de variantes).

### 3.4 Checklist específica
- [ ] Comprar, aplicar, trocar, remover e reaplicar sem perda.
- [ ] Save antigo carrega sem decorações e com visual idêntico ao anterior.
- [ ] Decoração aplicada persiste após recarregar e offline.
- [ ] Nada na decoração altera a economia ou o equilíbrio.
- [ ] Sem regressão visual no HUD e nas áreas existentes.

---

# FASE 4 — Expandir a progressão (secção 4.4 + Fase 4 do plano)

**Meta:** novos níveis, novas flores e, só se justificado, novas zonas do jardim. **É a fase de maior impacto transversal: máxima cautela.**

### 4.1 Planear (documento obrigatório antes de código)
- **Plano de níveis** para além dos desbloqueios atuais.
- **Ficha por flor nova** (cada uma tem de cumprir TODOS os critérios do plano): nome, aparência e descrição distintas; nível e custo coerentes; tempo de crescimento e valor de venda equilibrados; **pelo menos uma utilização** em receita, encomenda ou coleção; representação correta em campo, stock, interfaces e saves; **alternativa de progressão sem terrenos opcionais pagos**.
- **Modelo económico em folha de cálculo/tabela**: custo de terreno, crescimento, valor de venda e recompensas de encomenda **calibrados em conjunto**; calcula lucro por unidade de tempo por flor e confirma que **nenhuma flor domina sempre**.
- **Revisão de limites de stock** por flor ao acrescentar variedades.
- **Ajudantes:** como escolhem flores; como evitar encher o stock de uma só variedade. Propõe regra (a validar).
- **Zonas:** só propor uma nova zona se houver **atividades distintas** e conteúdo associado (receitas, personagens) que lhe dê propósito; caso contrário, recomenda não a implementar nesta fase e justifica.
- Conteúdo de lançamento acompanhado: cada desbloqueio com **uso imediato** (receitas/encomendas/personagens).

### 4.2 Implementar (após aprovação do plano)
1. Dados das novas flores + validação de conteúdo.
2. Pontos de integração: campo, stock (limites), cesto, UI, livro, bancada, ajudantes, saves.
3. Migração: saves antigos recebem as novas flores como bloqueadas e **stock/inventário intactos**.
4. Recalibração económica aprovada (terrenos, stock, encomendas).
5. Novos níveis e recompensas.
6. (Se aprovado) zona nova com regras de cultivo reconhecíveis.
7. Novas receitas/encomendas/coleção ligadas às novas flores.
8. Pré-cache e tutorial.

### 4.3 Checklist específica
- [ ] Jogador existente no nível máximo atual não perde nada e vê o novo conteúdo de forma gradual.
- [ ] Todas as flores novas aparecem corretamente em todas as interfaces e no save.
- [ ] Nenhuma flor "óbvia melhor escolha" (provado pela tabela económica).
- [ ] Ajudantes e stock não ficam presos/entupidos por uma variedade.
- [ ] Progressão possível sem comprar terrenos opcionais.
- [ ] Simulação de economia (script) mostra tempos de progressão razoáveis.

---

# FASE 5 — Eventos sazonais (secção 4.5 + Fase 5 do plano)

**Meta:** conteúdo sazonal como **dados reutilizáveis**, sem penalizar jogo irregular.

### 5.1 Desenhar
- **Formato de evento em dados:** `eventoId`, janela temporal (ou recorrência anual), encomendas, decorações, diálogos, receitas, variações visuais.
- **Política de datas** (decisão explícita a aprovar):
  - Comportamento offline (usa relógio do dispositivo; sem dependência de servidor).
  - Comportamento com **relógio incorreto/manipulado** (não pode apagar nem bloquear progresso; pior caso = evento visível mais cedo/tarde).
  - Transição entre períodos e fuso horário.
- Preferir **eventos longos ou recorrentes** em vez de janelas curtas.

### 5.2 Regras obrigatórias
- Sem login diário nem sessões consecutivas.
- **Nunca retirar** conteúdo ou recompensas já obtidas quando o evento termina (ficam no inventário/coleção).
- **Nenhuma flor essencial** fica indisponível fora do evento.
- Quem não participa continua a cultivar, vender e guardar progresso sem prejuízo.

### 5.3 Implementar
1. Motor de eventos genérico guiado por dados (sem lógica específica por evento).
2. Testes de data: antes, durante, depois, mudança de ano, relógio atrasado/adiantado, offline.
3. Integração com encomendas, decoração e coleção já existentes.
4. Pré-cache de recursos de **todos** os eventos (para funcionarem offline quando começarem).
5. Um evento-piloto pequeno para validar o formato.

### 5.4 Checklist específica
- [ ] Alterar a data do dispositivo (frente/trás) não corrompe saves nem remove conteúdo obtido.
- [ ] Fim do evento mantém recompensas e itens.
- [ ] Evento funciona 100% offline.
- [ ] Nenhuma pressão de tempo apresentada de forma agressiva na UI.

---

# VALIDAÇÃO TRANSVERSAL (correr no fim de CADA fase)

### Saves e atualizações (plano, secção 7)
- [ ] Carregar as 3 fixtures (novo/meio/avançado) na versão nova: sem erros, sem perda.
- [ ] Save sem os campos novos → defaults seguros.
- [ ] Migração idempotente (correr duas vezes dá o mesmo resultado).
- [ ] Falha forçada de migração → backup preservado, jogo não apaga progresso.
- [ ] IDs novos únicos e estáveis; nenhum ID antigo alterado.
- [ ] Sincronização cloud (se existir): conflitos nunca descartam progresso local em silêncio.

### Offline
- [ ] Novos ficheiros estão no pré-cache; app abre e funciona em modo avião após primeira carga.
- [ ] Conteúdo local completável offline e guardado no dispositivo.
- [ ] Funções online-dependentes identificadas claramente na UI.
- [ ] Versão da cache atualizada para forçar atualização correta, sem deixar utilizadores com recursos obsoletos.

### Acessibilidade e dispositivos
- [ ] Rato, teclado e toque funcionam em todas as novas interfaces.
- [ ] Ecrã pequeno vertical utilizável (listas, pré-visualizações, cartões, diálogos).
- [ ] Estado nunca só por cor (ícone/texto também).
- [ ] Textos longos não rebentam o layout.

### Conteúdo
- [ ] Script de validação de conteúdo a passar.
- [ ] Nenhuma encomenda exige mais do que é razoavelmente obtível.
- [ ] Custos/recompensas válidos e coerentes.

### Regressão e qualidade
- [ ] Build, linter e todos os testes a passar (incluindo os novos).
- [ ] Ciclo principal intacto: cultivar → colher → depositar → vender → ganhar moedas/reputação.
- [ ] Tutorial/explicações atualizados para mecânicas novas.
- [ ] Sem avisos/erros novos na consola.
- [ ] Sem excesso de notificações/janelas simultâneas.

---

# FORMATO DO RELATÓRIO DE FIM DE FASE (obrigatório)

Entrega sempre, por esta ordem:

1. **Resumo** (3–5 linhas): o que ficou feito.
2. **Alterações:** lista de ficheiros criados/modificados com 1 linha cada.
3. **Decisões tomadas** e o que ficou **"a validar"** (números, nomes, textos).
4. **Impacto em saves** (campos novos, migração, defaults) e **em offline/pré-cache**.
5. **Resultados de validação:** checklist transversal + específica, com ✅/❌ e evidência (comandos corridos e resultados).
6. **Riscos conhecidos e dívida técnica** deixada de propósito.
7. **Como testar manualmente** (passos curtos que o utilizador pode seguir).
8. **Propostas para a fase seguinte** e **perguntas em aberto**.

Termina com: *"Fase N concluída. Aguardo aprovação para avançar."* e **pára**.

---

# CONDIÇÕES DE PARAGEM IMEDIATA

Pára e pergunta ao utilizador se:
- Uma tarefa exigir apagar, renomear ou reutilizar IDs existentes, ou alterar o formato do save sem caminho de migração.
- Um teste de migração com uma fixture falhar e não souberes corrigir com segurança.
- Descobrires que o código real contradiz o plano (ex.: stock sem limite por flor, ausência de pré-cache).
- A implementação de uma funcionalidade obrigar a introduzir login, ligação permanente à internet, energia, sequências diárias ou penalização por ausência.
- Precisares de decisões de design/economia que o plano não cobre e que afetem o equilíbrio.
- Estimares que uma fase exige refactor grande de código não relacionado.

# COMEÇA AGORA

Executa apenas a **Etapa 0 (Auditoria)**. Lê `PLANO_EXPANSAO_CONTEUDO.md`, explora o repositório, produz `docs/AUDITORIA_ATUAL.md`, propõe a infraestrutura de suporte e termina com as tuas perguntas em aberto. **Não escrevas código de jogo e não avances para a Fase 1.**

=== FIM DO PROMPT ===
