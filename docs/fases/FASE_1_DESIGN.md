# Fase 1 — Mini-design: encomendas narrativas e clientes recorrentes

**Estado:** proposta para aprovação; ainda não implementada  
**Data:** 2026-10-05  
**Âmbito:** reconhecimento e desenho da Fase 1. Não altera mecânicas, saves de jogador ou conteúdo executável.

## 1. Objetivo e limites

Enriquecer o fluxo existente de encomendas e ramos com três pequenas histórias opcionais de clientes recorrentes. Preservar as quatro encomendas atuais, reutilizar flores, stock, livro e bancada, e permitir interromper e retomar uma preparação em sessões diferentes, inclusive offline.

Esta fase não adiciona flores, terrenos, uma moeda, um sistema de localização, eventos temporizados ou recompensas cosméticas. Também não altera o valor das quatro encomendas publicadas.

## 2. Reconhecimento do estado atual

- [`js/config/bouquets.js`](../../js/config/bouquets.js) contém `SPECIAL_ORDERS`, `WRAPPERS`, `ACCESSORIES` e `calculateBouquetHarmony()`.
- As quatro encomendas usam IDs persistentes: `apology_gift`, `summer_wedding`, `first_date` e `royal_tribute`. Cada uma tem `requiredFlowers`, `minFlowers`, embrulho/preferência, eventuais acessórios permitidos e `bonusCoins`/`bonusRep`.
- [`js/ui/bouquet.js`](../../js/ui/bouquet.js) implementa o livro em `renderBook()`, os requisitos em `getOrderRequirementCounts()`/`getOrderStatus()`, a preparação em `prepareOrder()` e a entrega em `craftBouquet()`.
- Cada entrada em `requiredFlowers` representa uma unidade exigida; repetições representam várias unidades. Atualmente, `getOrderStatus()` impõe no mínimo nível 5 e também verifica o nível de cada flor. Esse comportamento das quatro encomendas existentes deve manter-se.
- `prepareOrder()` prepara flores e seleções em `selectedFlowers`, `selectedWrap`, `selectedAccessory` e `activeOrderId`, propriedades da interface em memória. Não são incluídas em [`GameState.exportSaveData()`](../../js/state.js). O stock só é debitado em `craftBouquet()`.
- Na entrega, o jogo calcula o valor normal do ramo a partir das flores, harmonia, embrulho, acessório e melhoria da bancada; calcula reputação normal a partir desse preço; e soma o bónus da encomenda uma vez. O ramo também é registado em `discoveredBouquets`.
- [`js/state.js`](../../js/state.js) já grava `schemaVersion: 1`; [`js/save-migrations.mjs`](../../js/save-migrations.mjs) trata saves sem versão como versão 1. A Etapa 0B deixou fixtures, testes e o validador em `tests/` e `scripts/`.
- A sincronização de conta envia o save do jogo; livro, dados de conteúdo e progresso local não exigem rede. As configurações de jogo estão no pré-cache do service worker.

## 3. Modelo de dados proposto

Manter as definições de conteúdo locais e estruturadas em `js/config/bouquets.js`, já incluído no pré-cache. Não criar dependência de conta nem de recursos remotos.

### Encomenda

| Campo | Tipo/proposta | Função |
|---|---|---|
| `id` | string estável | Identificador imutável, distinto para cada encomenda. Os quatro IDs publicados não mudam. |
| `customerId` | string estável | Referência ao cliente recorrente; nulo para encomenda antiga independente. |
| `title`, `customerName`, `clue` | strings curtas | Título, apresentação no livro e contexto da ocasião. |
| `requirements.flowers` | mapa `flowerId -> quantidade` | Mínimos por flor; todas as referências devem existir e a flor deve estar desbloqueada para a encomenda poder ser entregue. |
| `requirements.minFlowers` | inteiro >= 1 | Quantidade mínima total do ramo. Flores adicionais podem ser escolhidas entre as desbloqueadas. |
| `requirements.wrapId` | ID ou nulo | Embrulho obrigatório ou nenhum. |
| `requirements.preferredWrapId` | ID ou nulo | Sugestão visual, não bloqueante. |
| `requirements.accessoryIds` | lista ou vazia | Acessório obrigatório escolhido entre os IDs permitidos; vazio significa nenhum requisito. |
| `requiredLevel` | inteiro | Nível mínimo explícito; nunca inferior ao nível de desbloqueio de nenhuma flor exigida. |
| `unlock` | discriminador e referência | `level`, `previous_order`, `progress` ou `discovery`; proposta inicial usa nível + encomenda anterior. |
| `reward.coins`, `reward.reputation` | inteiros >= 0 | Bónus único por conclusão; não substitui o valor/reputação normais do ramo. |
| `completionMessage` | string curta | Resposta calorosa do cliente após a entrega. |

Para conteúdo futuro que exija mais de uma unidade da mesma flor, a quantidade só pode ser exigida quando essa flor já estiver desbloqueável no nível do pedido. Nesta proposta, todas as quantidades por flor são 1.

### Cliente recorrente

| Campo | Tipo/proposta | Função |
|---|---|---|
| `id` | string estável | Identidade narrativa, independente dos IDs das encomendas. |
| `name` | string | Nome apresentado no jogo. |
| `description` | string curta | Identidade/contexto do cliente. |
| `orderIds` | lista ordenada | Encomendas deste arco, incluindo a encomenda publicada que inicia o arco. |

O conteúdo inicial reutiliza Afonso, Mariana e Lucas, já presentes nas encomendas atuais. `customerId` propostos: `afonso`, `mariana` e `lucas`. D. Beatriz e `royal_tribute` permanecem disponíveis sem alteração e fora destes três arcos nesta proposta.

O estado da relação é um nível inteiro calculado a partir do número de encomendas do arco concluídas, limitado ao comprimento do arco. A UI pode apresentá-lo como “a conhecer”, “conhecido” ou “próximo”; não há pontuação nem recompensa por relação separada.

### Estado no save e recuperação entre sessões

Proposta para a próxima versão global, `schemaVersion: 2`:

```json
{
  "schemaVersion": 2,
  "orderProgress": {
    "apology_gift": {
      "status": "completed",
      "draft": null
    },
    "afonso_thank_you": {
      "status": "in_progress",
      "draft": {
        "flowerIds": ["rose", "tulip", "daisy"],
        "wrapId": "kraft",
        "accessoryId": "none"
      }
    }
  },
  "customerRelationships": {
    "afonso": { "completedOrderCount": 1 }
  }
}
```

- Estados válidos: `not_started`, `in_progress`, `completed`.
- `orderProgress`, indexado pelo ID estável, é a fonte de verdade para os novos estados e drafts. A conclusão dos quatro pedidos antigos migra do seu `orders[].isCompleted`; o estado antigo continua legível/sincronizável durante a transição, sem premiar novamente.
- A migração de versão 1 para 2 cria estado por omissão para pedidos não concluídos, transfere as conclusões dos IDs conhecidos e deriva a relação inicial dos arcos a partir dessas conclusões. Não altera moedas, reputação, stock, parcelas, flores ou encomendas concluídas.
- Para as quatro encomendas publicadas, manter os campos atuais e adaptar a leitura ao modelo comum; não renomear nem reciclar IDs.
- Ao carregar, desconhecidos/ inválidos são ignorados com validação e os campos ausentes recebem defaults seguros; falha de migração preserva save e backup, como estabelecido na Etapa 0B.
- Um draft guarda seleção, embrulho, acessório e encomenda em curso; **não reserva nem desconta stock**. Ao retomar, revalidar a seleção contra o stock atual, manter o que ainda está disponível e indicar claramente o que falta. Não marcar a encomenda como concluída até uma entrega válida.
- Guardar o draft nas alterações da bancada e no autosave; ao entregar, atualizar a conclusão, o draft e a relação antes de gravar o resultado.
- A conclusão é idempotente: um ID já concluído não paga moedas/reputação outra vez. As recompensas normais do ramo mantêm as regras atuais.

## 4. Conteúdo inicial proposto — a validar

Proposta: **3 clientes com 2 encomendas cada (6 etapas de arco no total)**. A primeira etapa de cada arco é uma encomenda já publicada e preservada; a segunda é conteúdo novo. As encomendas novas são opcionais e nunca necessárias para subir nível, comprar flores, desbloquear terrenos ou melhorias essenciais.

| Cliente/arco | 1.ª encomenda existente (inalterada) | 2.ª encomenda proposta | Desbloqueio e requisitos propostos |
|---|---|---|---|
| **Afonso — reparar e agradecer** | `apology_gift`, Pedido de Desculpas Carinhoso | `afonso_thank_you`, **Um gesto de gratidão**. Depois de fazer as pazes, Afonso regressa para agradecer à irmã que o ajudou. Mensagem: “Ela vai perceber o quanto este gesto significa. Obrigado por me ajudares a dizê-lo com flores.” | Nível 5 e conclusão de `apology_gift`; 1 rosa + 1 tulipa, 3 flores no total; embrulho kraft sugerido, nenhum acessório obrigatório. As duas flores estão desbloqueáveis até ao nível 5. |
| **Mariana — casamento e comunidade** | `summer_wedding`, Casamento Campestre | `mariana_vizinhos`, **Um obrigado à aldeia**. Após o casamento, Mariana regressa para oferecer flores às pessoas que ajudaram na celebração. Mensagem: “A festa foi de todos nós. Este ramo vai levar um pouco da alegria a cada vizinho.” | Nível 3 e conclusão de `summer_wedding`; 1 girassol + 1 margarida, 3 flores no total; embrulho dourado sugerido, nenhum acessório obrigatório. Ambas estão desbloqueáveis até ao nível 3. A encomenda inicial mantém o bloqueio atual de nível 5. |
| **Lucas — primeiro encontro e aniversário** | `first_date`, Primeiro Encontro Romântico | `lucas_aniversario`, **Um ano de flores**. Lucas regressa para celebrar o aniversário do primeiro encontro. Mensagem: “O primeiro ramo marcou o início de tudo. Este vai guardar mais um ano de memórias.” | Nível 8, conclusão de `first_date` e orquídea desbloqueada; 1 orquídea + 1 rosa, 3 flores no total; embrulho rosa obrigatório e fita ou cartão obrigatórios (uma das opções). Ambas as flores estão desbloqueáveis até ao nível 8. |

As duas flores obrigatórias de cada novo pedido têm uma unidade mínima cada; as unidades restantes podem ser qualquer flor desbloqueada. Não se exige terreno extra pago. A disponibilidade final depende do jogador desbloquear e cultivar a flor normalmente, e o pedido continua opcional.

## 5. Economia — proposta “a validar”

Os montantes abaixo são **apenas o bónus da encomenda**; acrescem ao preço/reputação normal do ramo. Os valores usam custos de venda atuais como referência e ficam abaixo de uma fração do valor esperado de um ramo mínimo com os requisitos. Não alteram recompensas publicadas.

| Nova encomenda | Bónus moedas | Bónus reputação | Justificação inicial |
|---|---:|---:|---|
| `afonso_thank_you` | 25 | 15 | Ramo mínimo com rosa, tulipa e uma flor desbloqueada tem base de venda aproximada de 92 moedas antes dos multiplicadores; bónus monetário pequeno, cerca de 27% dessa base. |
| `mariana_vizinhos` | 15 | 12 | O ramo mínimo soma pelo menos 40 moedas de valor das flores antes dos multiplicadores; bónus monetário abaixo de 30% desse valor, com o embrulho sugerido não obrigatório. |
| `lucas_aniversario` | 60 | 35 | Orquídea e rosa dão base de pelo menos 275 moedas antes dos multiplicadores; o bónus é cerca de 22% dessa base. A combinação/embrulho/acessório ainda valorizam o próprio ramo. |

Os cálculos finais devem ser confirmados por testes automatizados usando `calculateBouquetHarmony()` e a fórmula exata de `craftBouquet()`, incluindo combinações que maximizem multiplicadores. Critério recomendado: para cada novo pedido, o bónus em moedas não excede 30% da menor receita bruta possível de um ramo válido, sem contar receitas de encomendas antigas. A reputação do pedido é adicional à reputação normal atual do ramo. Estes critérios e números requerem aprovação antes de serem gravados como conteúdo definitivo.

**Compatibilidade das quatro encomendas existentes:** manter IDs, texto, flores, nível efetivo, embrulho/acessório e bónus atuais. Não reequilibrar retroativamente os prémios existentes nesta fase.

## 6. Livro, bancada e experiência de utilização

- Reutilizar a secção atual de encomendas do livro e o fluxo “Preparar ramo”; evitar novo painel global ou botões no HUD.
- Apresentar as encomendas antigas sem mudanças essenciais e agrupar as novas por cliente/arco, por ordem. Estados textuais: “Bloqueada”, “Disponível”, “Em curso” e “Concluída”; nunca depender apenas da cor.
- Numa encomenda bloqueada, explicar se falta nível, encomenda anterior, desbloqueio da flor ou stock. Mostrar quantidades por flor, mínimo total, embrulho/acessório exigido ou sugerido e recompensa.
- Preparar uma encomenda a partir do livro abre a bancada existente. Retomar um pedido em curso restaura o draft possível e informa sobre unidades que deixaram de estar em stock.
- Ao entregar, mostrar mensagem curta do cliente, moedas e reputação totais, e atualizar a entrada do livro/estado do cliente. Evitar uma segunda recompensa ao concluir o mesmo ID.
- Em ecrãs pequenos, toque e teclado: reaproveitar cartões e controlos existentes; manter botões com rótulos explícitos, foco visível e estados textuais. Validar no layout vertical.
- Conteúdo e dados mantêm-se locais; não há imagens nem serviços novos. Os módulos/configurações continuam no pré-cache offline já gerado pela build.

## 7. Plano técnico após aprovação

1. Atualizar `scripts/validate-content.mjs` para validar IDs de clientes/encomendas, desbloqueios, referências, quantidade mínima por flor, níveis, limite por flor e moeda de recompensa.
2. Acrescentar os três clientes e as três encomendas novas como dados locais; preservar as quatro entradas publicadas.
3. Implementar migração pura/idempotente de schema 1 para 2, compatibilidade explícita com `orders[].isCompleted`, defaults e drafts.
4. Testar as três fixtures atuais e novos casos de compatibilidade, transição/retoma offline, falta de stock, desbloqueios e prevenção de prémio repetido.
5. Integrar progresso/draft no `GameState`; tornar livro e bancada apresentarem os estados definidos.
6. Implementar conclusão e mensagem sem alterar o preço/reputação normais nem premiar uma encomenda duas vezes.
7. Atualizar o pré-cache/cache versionada se a lista de recursos ou código exigir; não são necessários recursos remotos.
8. Atualizar tutorial apenas se os novos estados exigirem uma explicação que os textos do livro não cubram.

## 8. Riscos e salvaguardas

| Risco | Salvaguarda proposta |
|---|---|
| Perder conclusões antigas | Migrar os quatro IDs por correspondência exata; testar cada combinação de conclusão nas três fixtures. |
| Pagar duas vezes após carregar/sincronizar | Transição única para `completed`; teste de conclusão repetida e import cloud. |
| Draft ficar sem stock por vendas/ajudante | Não reservar stock; reconciliar o draft ao retomar e apresentar unidades em falta. |
| Encomenda inacessível por nível ou custo | Validar nível das flores e desbloqueio; bloquear só o pedido opcional, nunca o jogo principal. |
| Recompensa inflacionar a economia | Não alterar os quatro bónus antigos; avaliar os novos com fórmula completa, tabela e limite aprovado. |
| IDs de cliente confundirem-se com nomes | `customerId` e `orderId` distintos, estáveis e validados. |
| Preparação interrompida offline | Dados e draft locais, guardados no mesmo save e sem chamadas obrigatórias à conta. |
| Schema cloud/local incompatível | Testar export/import e conflito com saves schema 1 antes de concluir a implementação. |

## 9. Decisões pedidas antes de implementar

1. Aprovas os três arcos propostos para Afonso, Mariana e Lucas, com **três novas encomendas** e as quatro antigas preservadas?
2. Aprovas os montantes de bónus propostos (25/15, 20/15 e 60/35 moedas/reputação), sujeitos à validação pela fórmula real do ramo?
3. Aprovas a migração para schema 2 com estado por ID, relação por cliente e draft persistente que não reserva stock?

**Bloqueio operacional:** a auditoria registou que a pasta de trabalho não é um repositório Git. O protocolo do prompt exige uma branch própria por fase; antes da implementação será necessário um checkout Git ou uma autorização explícita para trabalhar sem branch nesta cópia. Esta limitação não impede a revisão/aprovação do mini-design.

**Critério de saída deste documento:** aprovação explícita do mini-design e resolução do bloqueio de branch. Até lá, a Fase 1 permanece apenas preparada; nenhum dado proposto acima está publicado no jogo.
