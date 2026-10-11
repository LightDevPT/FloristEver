# Prompt único — Update "Subsolo" (FloristEver)

> **Como usar:** cola tudo o que está entre `=== INÍCIO DO PROMPT ===` e `=== FIM DO PROMPT ===` numa sessão do agente de código (ex.: Claude Code) aberta na raiz do repositório. O prompt é **autocontido**: não precisa de mais nenhum ficheiro. O agente executa **uma fase de cada vez** e **pára no fim de cada uma** à espera da tua aprovação.
> **Pressupostos que assumi (confirma-os na Etapa S0):** o update desbloqueia ao **nível 33**; o produto é **fictício** ("Erva Noturna"); o conteúdo é **opt-in e desligado por defeito**; todos os nomes e textos ficam **em dados**, para poderes trocar para a variante "flores raras" sem retrabalho.

---

=== INÍCIO DO PROMPT ===

# PAPEL

Atuas como engenheiro de jogo sénior e designer de sistemas no **FloristEver**, um jogo de floricultura acolhedor, **offline-first (PWA)**, com saves locais, 7 flores, stock por flor, cesto, clientes, ajudantes, melhorias, ramos, livro, mapa, e uma carteira única de moedas.

A tua missão é implementar o update **"Subsolo"**: um negócio secreto subterrâneo que se desbloqueia ao **nível 33**. Fazes isso **por fases**, sem quebrar nada do que existe, sem inventar o que não está definido e sem nunca perder o progresso de jogadores existentes.

# O QUE É O UPDATE (resumo)

- Debaixo da floricultura existe um **túnel de esgoto**. O jogador entra por uma **grelha atrás da loja**, com **animação de descer**, e passa para uma **cena separada**: o **mapa principal deixa de ser carregado** e só o subsolo fica visível.
- No subsolo (e **só lá**) fica toda a produção: **cultivo → colheita → secagem → preparação → armazém oculto**, com recursos de infraestrutura (energia, água, ar).
- A **venda** acontece **na loja de cima**, de forma discreta: de vez em quando aparecem clientes de **roupa gasta/rasgada** que pedem **em código** (linguagem de jardim). **Só o jogador** os pode atender.
- O produto sobe do subsolo para a loja por **Mala**, **Cofre do balcão** e um ajudante **Mensageiro** (que **nunca vende**).
- Existe um módulo **opcional** de tensão leve (**Calor/Inspeção**), sem perder progresso e **sem eventos offline**.
- Progressão própria (**Respeito do Subsolo**, S1–S20), economia com margem alta mas **procura limitada**, tudo na **mesma carteira**.

# LINHAS VERMELHAS DE CONTEÚDO (inegociáveis)

1. **Produto e planta fictícios** ("Erva Noturna", "Sombra Verde", etc.). Folha estilizada que **não imita** uma planta real.
2. **Sem consumo:** nunca representar uso nem efeitos. Só comércio.
3. **Sem instruções reais:** as etapas de produção são apenas temporizadores, recursos e números de jogo. Não escrevas, em código, comentários, textos ou documentação, nada que funcione como guia real de cultivo, secagem ou produção.
4. **Tom cartoon e humor:** ratos simpáticos, estética do jogo atual. Consequências leves, nunca punição do progresso.
5. **Opt-in explícito**, **desligado por defeito**, desligável a qualquer momento, com **"Modo discreto"** que esconde por completo todo o conteúdo secreto.
6. **Nomes, textos, ícones e dicionário do código em ficheiros de dados**, para trocar a "variante A" (planta fictícia) pela **"variante B" (contrabando de flores raras)** sem mexer na lógica.
7. Se em algum ponto achares que um texto ou imagem se aproxima de conteúdo real ou explícito, **pára e pergunta**.

# PRINCÍPIOS TÉCNICOS (inegociáveis)

1. **Nenhum ID existente muda.** Todo o conteúdo novo usa IDs novos, estáveis e imutáveis.
2. **Com o update desligado, recusado ou em Modo discreto, o jogo é idêntico ao atual** (economia de flores e eventual Perfumaria intactas).
3. **Saves compatíveis:** campos ausentes → defeitos seguros; migração **idempotente** com **backup** do save original; nunca descartar um save; falha de migração nunca apaga progresso.
4. **Offline-first:** tudo local, tudo no pré-cache (com versão da cache atualizada), tudo calculável por **timestamps**.
5. **Sem penalizações offline:** inspeções, multas, perda de clientes e subida de Calor só acontecem com o jogador ativo.
6. **Nada se perde:** armazéns cheios **pausam** processos; nunca descartam itens.
7. **Sem becos sem saída:** existe sempre um caminho de recuperação.
8. **Só o jogador vende o produto secreto:** nenhum ajudante, consultor, automação ou "auto-venda" pode vendê-lo. Testar explicitamente.
9. **Kill-switch** `SUBSOLO_ENABLED`: desliga tudo e **nunca** deixa o jogador preso no subsolo.
10. **Resolvedor de temas:** todos os sprites novos passam pelo resolvedor de temas desde o início; cores via tokens.
11. **Desempenho e acessibilidade** ao nível do jogo atual: rato, teclado e toque; ecrã pequeno vertical; estado nunca só por cor; sem flashes; `prefers-reduced-motion` e "Reduzir efeitos".
12. **Mudanças contidas:** sem refactors não relacionados. Branch por fase (`feat/subsolo-sN-<nome>`), commits pequenos, **nunca** mexer diretamente na branch principal, **nunca** force-push, **nunca** apagar saves de teste.

# REGRAS DE TRABALHO

- **Explora o código real primeiro.** Cita ficheiros e funções concretas nas decisões. Não adivinhes a arquitetura.
- **Não inventes números de equilíbrio sem os justificar.** Os valores deste prompt são **hipóteses de partida "a validar"**. Propõe-nos numa tabela com justificação e **espera aprovação** antes de os gravar como definitivos.
- **Distingue sempre:** o que é exigido, o que é sugerido, o que és tu a propor.
- **Antes de cada alteração relevante:** diz o que vais fazer, em que ficheiros e porquê (3–5 linhas). Depois executa.
- **Verifica, não presumas:** corre build, linter e testes antes (baseline) e depois de cada passo.
- **Ambiguidade que afete saves, economia, conteúdo ou UX:** pára e pergunta (máx. 3 perguntas objetivas de cada vez, com a tua recomendação).
- **Textos em português europeu**, curtos, adequados a ecrãs pequenos, em ficheiros de dados/strings.

# PROTOCOLO DE CADA FASE (repete em todas)

1. **Reconhecer** — mapear o código relevante e confirmar pré-requisitos.
2. **Desenhar** — mini-design em `docs/subsolo/FASE_SN_DESIGN.md`: dados, IDs, impacto em saves e pré-cache, UI, riscos, tabela de números "a validar".
3. **Aprovação do design** — resumir e **esperar o "OK"**.
4. **Implementar** — passos pequenos, com verificação a cada um.
5. **Validar** — checklist transversal + checklist da fase.
6. **Relatório** no formato definido no fim.
7. **Parar** — não avançar sem aprovação explícita.

---

# ESPECIFICAÇÃO (fonte de verdade das fases)

## E1. Desbloqueio e narrativa

**Condições de entrada:** (1) **nível global 33**; (2) **aceitar o conteúdo secreto** (opt-in) no primeiro aviso ou mais tarde nas Definições; (3) encontrar e usar a **grelha de esgoto**; (4) pagar a **concessão do túnel**.
Se o jogador recusar: **nada** do update aparece (nem grelha, nem clientes, nem textos).

| Ato | Quando | O que acontece |
|---|---|---|
| 0. A carta | Nível 33 | Aviso discreto: "Conteúdo secreto disponível. Ativar?". Se aceitar, chega uma **carta anónima** ao Livro, que aponta para a grelha atrás da loja |
| 1. A descida | A seguir | A grelha ganha brilho tímido; toque → "Descer?" → **animação** → o contacto **"Corvo"** propõe alugar o túnel antigo |
| 2. A montagem | S1–S2 | Compras e primeira instalação (energia, água, 4 canteiros, 1 estendal, 1 bancada). **Pacote inicial** garante a primeira produção |
| 3. O primeiro cliente | S1–S2 | Cliente de roupa gasta pede em código; tutorial do **Caderno de Códigos**, da **Mala** e do **Cofre**; primeira venda |
| 4. A expansão | S3–S5 | Mais secções, variedade 2, Mensageiro, embalagem discreta, Regulares, contra-senhas |
| 5. A rede | S6–S10 | Qualidades ★, Calor/Inspeção, Atacadista, variedade 3, "Maço", "Reserva" |
| 6. O mestre | S11–S20 | Automação, variedade 4, Secções 5+, vitrine de honra, estatuto final |

O **Corvo** é um contacto recorrente (voz seca, humor) que só fala quando o jogador entra no subsolo ou toca no Caderno. Sem pressão.

**Progressão (Respeito do Subsolo) com dupla porta (Respeito + nível global; níveis globais são hipótese a validar):**

| Nível | Nível global mín. | Desbloqueia |
|---|---|---|
| S1 | 33 | Secção 1, 4 canteiros, 1 estendal, preparação básica, armazém pequeno, Cofre pequeno, Caderno básico |
| S2 | 33 | Gerador, produto **Ramo**, Mala (10) |
| S3 | 34 | Secção 2, variedade 2, ventilação básica |
| S4 | 34 | **Mensageiro**, embalagem discreta |
| S5 | 35 | Clientes **Regulares**, contra-senhas |
| S6 | 36 | Qualidade ★ completa, secagem controlada, produto **Maço** |
| S7 | 36 | **Calor/Inspeção** (se ativo), filtros de ar, "Ramo de fachada" |
| S8 | 37 | Secção 3, variedade 3 |
| S10 | 39 | **Atacadista**, produto **Reserva da Casa** |
| S12 | 41 | Automação (Jardineiro e Secador subterrâneos) |
| S15 | 44 | Secção 5, variedade 4, vitrine de honra |
| S20 | 50 | Estatuto final, cosméticos de topo |

Respeito ganha-se com vendas corretas, encomendas, marcos e inspeções superadas. **Nunca com moedas.** Nunca desce abaixo do limiar do nível atual.

## E2. Gestor de cenas: Superfície ↔ Subsolo

Estados: `SUPERFICIE → TRANSICAO_DESCER → SUBSOLO → TRANSICAO_SUBIR → SUPERFICIE`.

**Descer:** toque na grelha → confirmação "Descer?" (bloqueada se houver ação crítica) → a personagem caminha até à grelha, levanta a tampa e **desce a escada** (3–4 frames), com zoom, poeira e **fade** (~600 ms). Durante o fade: parar o render do mapa principal; **descarregar** o mundo visual (objetos de cena e atlas pesados), mantendo **só o estado lógico**; carregar o atlas do subsolo e montar a cena. Fade-in ao fundo da escada.
**Subir:** sequência inversa; recarregar o mapa principal; personagem junto à grelha.
**Meta:** transição **≤ 2 s** em dispositivo modesto.

| Situação | Regra |
|---|---|
| Superfície enquanto estás em baixo | Tratada como **"ausente"**: aplicam-se as **regras offline já existentes** (culturas crescem por timestamps; ajudantes e chegada de clientes em pausa) |
| Subsolo enquanto estás em cima | Produção **continua por timestamps** até aos limites de capacidade |
| Clientes secretos à espera | **Nunca desaparecem** enquanto estás em baixo |
| Fechar a app no subsolo | Reabre **na superfície**; localização **não** é estado persistente |
| Falha ao carregar uma cena | Mensagem clara, **retentar** ou **ficar onde está**; nunca ecrã preto sem saída |
| **Saída de emergência** | Botão que volta à superfície de forma segura, sem perder o save |
| Separador em segundo plano | Pausa de efeitos; timestamps garantem continuidade |

Técnica: duas cenas, **um só estado lógico**; **debounce** de interação; **pré-carregamento** do atlas do subsolo em segundo plano após o desbloqueio; teste de stress de **100 transições** sem fugas de memória nem corrupção.

## E3. O subsolo: zonas e recursos

Túnel de esgoto cartoon (tijolo, canos, poças, lâmpadas fracas, ratos simpáticos). Plantas sob **lâmpadas de cultivo** roxo-rosa. **Fofo, não sinistro.**

| Zona | Função |
|---|---|
| Escada de entrada | Subir/descer |
| Sala de Cultivo | Canteiros subterrâneos com lâmpadas |
| Sala de Secagem | Estendais |
| Oficina de Preparação | Transforma em Ramo/Maço/Reserva |
| Armazém Oculto | Stock do produto acabado |
| Sala de Controlo | Energia, água, ar, Odor |
| Quadro do Corvo | Notícias e códigos da estação |
| Saída de emergência | Subir com segurança |

O túnel expande por **Secções** compradas (1 a 6).

| Recurso | Fonte | Se faltar |
|---|---|---|
| **Energia** | Gerador (combustível comprado com moedas) | Produção a **25%** (nunca zero) |
| **Água** | Reservatório e canos | Cresce a 25% |
| **Ar** | Ventilação e filtros | Sobe o **Odor** (e o Calor) |

**Dínamo manual** de emergência (tocar para gerar energia por pouco tempo): anti soft-lock.

## E4. Cadeia de produção (abstrata)

`SEMENTES (compra) → CULTIVO → COLHEITA (folhas frescas) → SECAGEM → PREPARAÇÃO → ARMAZÉM OCULTO`

| Etapa | Entrada | Saída | Tempo base (a validar) | Ação |
|---|---|---|---|---|
| Cultivo | Semente + energia + água | 6 folhas frescas por canteiro | 20 min | Plantar/colher |
| Secagem | Folhas frescas | Folhas secas (1:1) | 10 min | Pendurar/recolher |
| Preparação | Folhas secas | Produto | 5 min por lote | Escolher produto/embalagem |

| Produto | Folhas secas | Qualidade mín. | Referência | Desbloqueio |
|---|---|---|---|---|
| Ramo | 2 | ★1 | 8u | S2 |
| Maço | 5 | ★3 | 25u | S6 |
| Reserva da Casa | 10 | ★4 | 60u | S10 |

(`u` = preço médio de uma flor pronta ao nível 33.)

**Variedades (fictícias):** Sombra Verde (S1), Luar Roxo (S3, mais lenta/rendimento alto/odor baixo), Âmbar Seco (S8, rápida/rendimento baixo), Raiz Dourada (S15, muito lenta/alto/odor alto).
**Qualidade ★1–5:** variedade, regularidade dos recursos, secagem escolhida e cuidado na preparação.
**Estados:** a aguardar material · a crescer · pronto a colher · a secar · pronto a preparar · armazém cheio · sem combustível.
**Automação (S12+):** Jardineiro e Secador subterrâneos, receitas guardadas. **Nunca** automatizam a **venda**.

## E5. Logística entre os dois mundos

| Peça | Local | Função |
|---|---|---|
| **Armazém Oculto** | Subsolo | Stock principal |
| **Mala** | Contigo | Leva produto de baixo para cima (capacidade pequena no início) |
| **Cofre do balcão** | Superfície | Stock de venda com **capacidade limitada** |
| **Mensageiro** | Ajudante | Leva produto do Armazém ao Cofre; **nunca vende** |

Fluxo manual: encher Mala → subir → depositar no Cofre. Fluxo automático (S4+): o Mensageiro mantém o Cofre até um alvo configurável. **Mais produto no Cofre = vendas mais rápidas mas mais Calor.**

## E6. A venda em código

**Aparição:** raramente, entre os clientes normais, **só com o jogador na superfície**. Visual: roupa **rasgada/remendada**, capuz, postura nervosa; símbolo no balão (não ícones de flores); pista sonora opcional discreta. **Ajudantes, Consultores e automações ignoram-nos.** Atendimento só por **ação manual explícita** (toque longo/duplo toque; alternativa por teclado).
**Pedidos pendentes:** se o jogador estiver em baixo ou sem produto, até **N clientes ficam à espera**, sem a paciência a correr (N de 3 em S1 a 8 em S20).

**O código:** cada pedido tem **produto, quantidade, qualidade mínima e (às vezes) urgência**, em linguagem de jardim. Dicionário de exemplo (fictício, a validar):

| Frase | Significado |
|---|---|
| "Uma tulipa de domingo" | 1× Ramo |
| "O buquê do avô" | 1× Maço |
| "Algo do jardim da cave" | 1× Reserva da Casa |
| "Meia dúzia de pétalas" | Quantidade 6 |
| "Bem regada" | Qualidade ★3+ |
| "Ainda com orvalho" | Urgente |
| "Sem espinhos" | Variedade Luar Roxo |

- **Caderno de Códigos** (aba no Livro): páginas que se completam ao decifrar.
- **Dicionário da estação:** ~1/3 das expressões muda **de duas em duas semanas**, determinístico e offline.
- **Contra-senhas (S5+):** o cliente diz uma frase; o jogador escolhe a resposta certa entre 3; errar não castiga (o cliente repete).
- **"Pedir que repita":** grátis, reduz ligeiramente a gorjeta.
- **Ajuda de código (acessibilidade):** mostra o significado automaticamente, **sem penalização económica**.

**Tipos de cliente:** Novato (S1), Regular (S5), Atacadista (S10), Curioso/isca (opcional, sobe Calor).

**Embalagem discreta (escolha em cada venda):** saco de papel (barato, disfarce fraco); **Ramo de fachada** (consome flores normais, melhor disfarce, liga as duas empresas); caixa de chá/cesta (meio-termo); ou nenhuma (vende, mas sobe mais o Calor).
**Resultado:** correto → preço cheio + gorjeta + Respeito; quase certo → mais barato; errado → o cliente sai sem penalização grave.

## E7. Calor e Inspeção (módulo opcional)

Medidor 0–100. Sobe com: venda (+2, +2 se sem disfarce), stock no Cofre (+0.1/min por 10 doses), Odor alto ao subir com a Mala, servir um "Curioso" (+10). Desce **1/min só com o jogador ativo**; **não corre offline**.
Limiares: 0–39 calmo · 40–69 atenção (sinais leves) · 70–89 risco (a Inspeção pode aparecer) · 90+ fiscalização (aparece o **Fiscal**).
**Inspeção:** janela generosa (~20 s) para **"Ocultar o Cofre"** (um toque). A tempo → o Calor desce e ganha-se Respeito. Falhar → **multa limitada com teto** e vendas secretas **bloqueadas 10 min**. **Nunca** se perde o Armazém, o save ou progresso. **Nunca offline** e nunca com o jogador no subsolo.
**Mitigações:** filtros, disfarces melhores, ramo de fachada, e (se a Perfumaria existir) perfumes que mascaram o Odor. **Modo tranquilo:** sem Calor nem Inspeções, com **−10%** nos preços.

## E8. Economia

**Princípios:** margem alta mas **procura limitada** (só se vende à mão, em cima); nunca obrigatório; **sem dominância**; a próxima compra ao alcance em **20–40 min** de jogo ativo; sem becos sem saída.
**Unidades:** `u` (preço médio de uma flor pronta ao nível 33); `H` (rendimento médio por hora de jogo ativo ao nível 33, todas as empresas já desbloqueadas).

```
preço = Pref(produto) × M_qualidade × M_código × M_urgência × M_respeito × M_disfarce × M_modo
```
M_qualidade 0.85–1.30 · M_código 0.85/1.00/1.10 · M_urgência 1.00/1.15 · M_respeito 1+0.02×(S−1) máx. 1.40 · M_modo 1.00 (0.90 em Modo tranquilo). **Teto:** produto dos multiplicadores positivos ≤ **2.0**.

**Custos operacionais (sumidouro contínuo):** sementes ~0.5u/folha, combustível ~0.3u, água ~0.1u, embalagem 0.2u–2u (custo por folha ≈ 0.9u vs valor bruto ~4–6u).

**Investimento (em H):** concessão do túnel ≈ **8 H**; Secções 2/3/4/5/6 = 4/8/16/32/64 H. Curvas `custo(n) = C0 × g^(n−1)`:

| Melhoria | Níveis | C0 | g |
|---|---|---|---|
| Canteiros (4→16) | — | 0.5 H | 1.5 |
| Lâmpadas e ventilação | 6 | 0.8 H | 1.65 |
| Secadores (1→8) | 8 | 0.6 H | 1.6 |
| Preparação (1→6) | 6 | 0.6 H | 1.6 |
| Armazém Oculto (capacidade) | 10 | 0.4 H | 1.5 |
| Mala (capacidade) | 8 | 0.3 H | 1.5 |
| Cofre (capacidade) | 6 | 0.5 H | 1.6 |
| Energia / Água | 6 | 1 H | 1.7 |
| Filtros de ar | 6 | 0.8 H | 1.65 |
| Mensageiro / Jardineiro / Secador | 3 cada | 3 H | 2.0 |

Custo total para 100% ≈ **200 H**; tempo típico **80–120 h** de jogo ativo. Melhorias do Subsolo **≥ 1.5×** as equivalentes da Perfumaria no mesmo nível (se existir), **validado por script**.

**Procura (clientes secretos/hora, jogador ativo na superfície):** S1–S2 ~3 (pedido médio 2) · S5 ~6 (3) · S10 ~10 (4) · S15 ~16 (5) · S20 ~24 (6).
**Quota-alvo no rendimento total (jogo completo):** Subsolo **20–35%**; nunca > 45%; nunca < 12%.

**Anti-paragem:** pacote inicial; degradação a 25%; dínamo manual; armazéns cheios pausam; produto em stock não se estraga; saída de emergência; mensagens de gargalo claras.
**Anti-exploração:** só o jogador vende; sem arbitragem com flores/perfumes; **relógio atrasado = sem progresso; adiantado = só conclui o que estava em curso, nunca cria material**; **saturação por produto** (vender o mesmo repetidamente baixa levemente a procura e recupera com o tempo); validação sem negativos/NaN/duplicação; números grandes com formatação K/M/B/T, limites seguros e avaliação de BigInt.

## E9. Interface

- **Superfície:** grelha de esgoto discreta (só com o conteúdo ativo e desbloqueado), **Cofre** no balcão, pílula "Subsolo" opcional (só alertas relevantes), abas novas em **Livro** (Caderno de Códigos) e **Melhorias** (Subsolo). **Sem sobrecarregar o HUD.**
- **Subsolo:** HUD com moedas e XP, barras de Energia/Água/Ar/Odor, botão **Subir**, Respeito. Painéis: Cultivo, Secagem, Preparação, Armazém, Mala, Melhorias, Contabilidade secreta, Caderno.
- **Definições:** Conteúdo secreto (Ativo/Desativado) · **Modo discreto** · **Modo tranquilo** · **Ajuda de código** · Reduzir efeitos.
- Máximo de **3 toques** nas ações frequentes; estados com texto/ícone; sem janelas empilhadas.

## E10. Arte

Cartoon do jogo, **mesmo traço de contorno**, mais escuro e húmido. Tokens (a validar): tijolo `#6B5A52`, água `#5E8C8A`, ferro `#3E4A52`, âmbar `#FFC857`, cultivo `#B56BFF`, contorno `#2A2F33`.
Assets: grelha (fechada/aberta), Cofre, animação de descida/subida (personagem na escada, poeira, tampa), túnel e secções 1–6, máquinas (canteiros, lâmpadas, estendais, bancada, gerador, reservatório, filtros), produtos, Mala, embalagens, jogadora com capacete/lanterna, Corvo, 4 variantes de cliente de roupa gasta, Fiscal, 3 ajudantes, ícones (códigos, Calor, Odor, Respeito, ★), molduras de UI, efeitos.

## E11. Dados e saves (nomes a confirmar)

```
subsolo: {
  conteudoSecreto: { ativo, consentimento, modoDiscreto, modoTranquilo },
  desbloqueado, concessao,
  respeito: { nivel, xp }, secoes,
  canteiros: [...], estendais: [...], preparacao: [...],
  armazemOculto: {...}, mala: {...}, cofre: {...},
  recursos: { energia, agua, combustivel, odor },
  melhorias: {...}, ajudantes: {...},
  calor: { valor, ultimoTs }, pedidosPendentes: [...],
  caderno: { paginas, versaoDicionario },
  saturacao: {...}, razao: { horas, totais }
}
```
Regras: `subsolo` ausente → "não desbloqueado" sem erros; **nada é concedido automaticamente** a quem já passou do nível 33 (aparece o aviso de opt-in); `schemaVersion` incrementa uma vez; migração idempotente com backup; **cloud**: fundir sem sobrescrever (manter o mais avançado por campo); **livro-razão em buckets agregados** para o save não crescer; timestamps absolutos em tudo o que tem duração.

## E12. Offline, PWA e desempenho

Assets, textos, dicionário, tabelas e manifestos no pré-cache, **versão da cache** atualizada; funciona em modo avião (incluindo descer/subir); atlas do subsolo pré-carregado em segundo plano; cenários: sem atualizar, atualiza antes/depois de desbloquear, atualiza com produção em curso. Subsolo com menos entidades que a superfície, culling de tiles, orçamento de animações, motor orientado a timestamps, **transições ≤ 2 s** e sem fugas de memória; o mapa descarregado liberta memória.

---

# VALIDAÇÃO TRANSVERSAL (no fim de CADA fase)

**Isolamento e saves**
- [ ] Com o update desligado, recusado ou em Modo discreto, o jogo é **idêntico** (golden master da economia).
- [ ] As 3 fixtures de saves + **uma fixture nível 33 com saldo alto** carregam sem erro nem perda.
- [ ] Save sem `subsolo` → defeitos seguros. Migração idempotente; backup criado; falha forçada não descarta o save.
- [ ] IDs únicos e estáveis; nenhum ID antigo alterado.

**Cenas e tempo**
- [ ] Descer/subir em todos os estados (a meio de colheita, cesto cheio, cliente a atender).
- [ ] 100 transições seguidas sem fugas nem corrupção; falha de carregamento nunca prende o jogador.
- [ ] Relógio atrasado/adiantado, mudança de fuso, 72 h offline com produção em curso.

**Regras especiais**
- [ ] **Só o jogador vende** (testado contra ajudantes, Consultores e automações).
- [ ] Clientes secretos não desaparecem com o jogador em baixo.
- [ ] Calor/Inspeção: limiares, janela, multa com teto, **nunca offline**.

**Soft-lock:** sem combustível, sem moedas, armazém cheio, Cofre vazio, falha de cena: sempre há saída.

**Economia e conteúdo**
- [ ] Simulação de 100 h (estratégias: só superfície [golden master], tudo Subsolo, equilibrada, jogador mínimo, muito ativo, spam de um produto): nenhuma > **1.5×** a equilibrada; Subsolo **20–35%** do rendimento total; retorno da concessão em **10–15 h**; próxima compra ≤ **40 min**.
- [ ] Script de validação de conteúdo: IDs únicos, custos finitos e inteiros, relação de custos com a Perfumaria, assets presentes **e no pré-cache**, dicionário completo.

**Offline/PWA, desempenho, acessibilidade**
- [ ] Modo avião após a primeira carga; fluxo de atualização testado; transições ≤ 2 s em dispositivo modesto.
- [ ] Rato, teclado, toque; ecrã pequeno vertical; contraste verificado; estado nunca só por cor; sem flashes; Ajuda de código funcional.
- [ ] Build, linter e todos os testes verdes; sem erros novos na consola.

---

# FASES

> Cada fase usa **branch própria**, **feature flag** `SUBSOLO_ENABLED` e termina com **relatório + aprovação**.

## FASE S0 — Auditoria, decisões e modelo económico (obrigatória; **sem código de jogo**)

**Reconhecer e documentar** em `docs/subsolo/AUDITORIA.md`, com caminhos reais: stack e scripts; onde vivem dados de conteúdo; formato do save, versão e migrações; cloud; service worker e pré-cache; loop de render, motor de cenas, cache de atlas; mapa e compra de terrenos; HUD e painéis; Livro; sistema de ramos/embrulhos; ajudantes e clientes (e **como se comportam em "ausência"/offline**); resolvedor de temas; strings; áudio; como o jogo calcula XP, níveis e **nível máximo atual**.
**Baseline:** build, linter, testes, resultados; lacunas de teste.
**Dados económicos:** extrair preços, custos, tempos e melhorias das flores e calcular **u** e **H** ao nível 33 (estimar se o jogo ainda não chega lá).
**Entregáveis:**
1. `AUDITORIA.md` (mapa, formato do save com exemplo anonimizado, IDs existentes, riscos, lacunas).
2. **Tabela económica proposta** (todos os valores "a validar") + **simulador** de 100 h.
3. **Fixtures de saves** (3 + nível 33 com saldo alto) e **script de validação de conteúdo**.
4. **Decisões a aprovar:** (a) variante A (planta fictícia) ou B (flores raras); (b) calor/inspeção sim/não; (c) política de opt-in e Modo discreto; (d) como e onde o jogo é distribuído (PWA por link, lojas) e implicações de classificação; (e) interpretação do nível 33.
5. **Perguntas em aberto** (máx. 10).

**Critério de saída:** o utilizador aprova auditoria, decisões, números e infraestrutura de suporte.

## FASE S1 — Gestor de cenas

Implementar o gestor `Superfície ↔ Subsolo` com um **subsolo vazio**: animação de descer/subir, descarregar/recarregar o mundo, saída de emergência, regra de "superfície ausente", arranque sempre na superfície, `SUBSOLO_ENABLED`.
**Checklist:** 100 transições sem fugas; falha forçada de carregamento sem prender o jogador; ≤ 2 s; fixtures carregam; flag desliga tudo; jogo idêntico com a flag desligada.

## FASE S2 — Desbloqueio e narrativa

Opt-in (aviso no nível 33 e nas Definições), carta anónima, grelha, concessão do túnel, Corvo, Secção 1, estado `subsolo` no save, migração, Respeito base, Modo discreto.
**Checklist:** quem recusa nunca vê nada; save antigo acima do nível 33 vê só o aviso de opt-in; nada é concedido automaticamente; migração idempotente; pacote inicial correto.

## FASE S3 — Produção

Cultivo, recursos (energia/água/ar), colheita, secagem, preparação, armazém, estados, degradação a 25%, dínamo manual, produto Ramo.
**Checklist:** primeiro Ramo fabricado e guardado; produção continua por timestamps; armazém cheio pausa sem perder; sem becos sem saída.

## FASE S4 — Logística

Mala, Cofre do balcão, Mensageiro, pedidos pendentes, capacidades e melhorias associadas.
**Checklist:** produto sobe e fica no Cofre; Mensageiro **não vende**; clientes pendentes não expiram; Cofre/Mala respeitam capacidades.

## FASE S5 — Venda em código

Clientes secretos (aparição, visual, atendimento manual), Caderno, dicionário da estação, contra-senhas, embalagem discreta (incl. ramo de fachada), Respeito, resultado da venda, ajuda de código, saturação por produto.
**Checklist:** **só o jogador atende**; dicionário rotativo determinístico; venda real credita a carteira; ajuda de código sem penalização; acessibilidade da pista visual/sonora.

## FASE S6 — Calor/Inspeção e integrações (se aprovado)

Calor, Odor, Fiscal, janela de ocultação, multa limitada, bloqueio de 10 min, filtros, Modo tranquilo, integrações (ramo de fachada com o sistema de ramos; perfumes a mascarar Odor se a Perfumaria existir).
**Checklist:** nunca offline; nunca perde Armazém nem save; Modo tranquilo funciona e aplica −10%; sem soft-locks.

## FASE S7 — Progressão e economia completas

Variedades 2–4, qualidades ★, Maço e Reserva, Atacadista, automação (Jardineiro/Secador), todas as melhorias e curvas de custo, níveis S1–S20 com portões duplos, calibração final.
**Checklist:** simulação cumpre os critérios; script de custos (≥ 1.5× Perfumaria) a passar; quota 20–35%; próxima compra ≤ 40 min.

## FASE S8 — Polimento e lançamento

Tutorial e dicas, arte final, desempenho, acessibilidade, textos, beta controlado com os saves de teste, pré-cache e versão da cache, publicação.
**Checklist:** toda a validação transversal ✅; reversão testada (`SUBSOLO_ENABLED = false`); capturas finais com o update ligado/desligado; decisão final de classificação/distribuição confirmada pelo utilizador **antes** de publicar.

---

# FORMATO DO RELATÓRIO DE FIM DE FASE (obrigatório)

1. **Resumo** (3–5 linhas).
2. **Alterações:** ficheiros criados/modificados com 1 linha cada.
3. **Decisões tomadas** e o que ficou **"a validar"** (números, nomes, textos).
4. **Impacto em saves** (campos novos, migração, defeitos) e **em offline/pré-cache**.
5. **Resultados de validação:** checklist transversal + da fase, com ✅/❌ e evidência (comandos e resultados).
6. **Riscos conhecidos e dívida técnica** deixada de propósito.
7. **Como testar manualmente** (passos curtos).
8. **Propostas para a fase seguinte** e **perguntas em aberto**.

Termina com: *"Fase SN concluída. Aguardo aprovação para avançar."* e **pára**.

---

# CONDIÇÕES DE PARAGEM IMEDIATA

Pára e pergunta se:
- For preciso apagar, renomear ou reutilizar IDs existentes, ou alterar o formato do save sem caminho de migração.
- Um teste de migração com uma fixture falhar e não souberes corrigir com segurança.
- O código real contradisser o plano (ex.: o jogo não tem noção de "ausência", o motor não suporta descarregar o mapa, o save não tem versão).
- Uma funcionalidade obrigar a **perder progresso, penalizar offline, deixar o jogador preso ou permitir que um ajudante venda o produto secreto**.
- Um texto, ícone ou mecânica se aproximar de **conteúdo real, explícito, de consumo ou de instruções reais**.
- Precisares de decisões de design/economia/conteúdo que o plano não cobre.
- Estimares que uma fase exige refactor grande de código não relacionado.

# COMEÇA AGORA

Executa **apenas a FASE S0 (Auditoria, decisões e modelo económico)**. Explora o repositório, produz `docs/subsolo/AUDITORIA.md`, a tabela económica proposta, o simulador, as fixtures e o script de validação, e termina com as decisões a aprovar e as tuas perguntas em aberto. **Não escrevas código de jogo e não avances para a Fase S1.**

=== FIM DO PROMPT ===
