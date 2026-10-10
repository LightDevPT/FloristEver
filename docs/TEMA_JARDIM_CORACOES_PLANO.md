# FloristEver — Tema "Jardim dos Corações" (fofo e elegante)

> **Âmbito:** tema visual **permanente e opcional**, com um modo de evento opcional à volta de 14 de fevereiro. 100% cosmético, construído sobre a arquitetura de temas já planeada (manifesto + resolvedor único + fallback).
> **Nota:** escrito sem acesso ao código; nomes de ficheiros e chaves de save aparecem como **"a confirmar"** e dependem da auditoria feita para o Halloween.

---

## 0. Conceito e diferenciação

Um jardim **romântico mas sofisticado**: rosa-blush, ouro-rosa, creme, pérolas, laços e rendas, com corações usados como **linguagem de forma** (não como confetti em todo o lado). O "elegante" vem da contenção: poucas cores bem escolhidas, detalhes metálicos suaves e corações discretos; o "fofo" vem das formas redondas e dos pequenos toques de personalidade.

| | Padrão | Halloween | Jardim Luminoso | **Jardim dos Corações** |
|---|---|---|---|---|
| Hora | Dia | Entardecer | Noite | **Dia suave, luz de fim de tarde dourada** |
| Cores | Pastel, verde | Laranja, roxo | Azul-petróleo, neon suave | **Blush, ouro-rosa, creme, borgonha, verde-sálvia** |
| Motivo | Flores | Abóboras, morcegos | Brilho das plantas | **Corações, laços, pérolas, renda** |
| Sensação | Alegre | Travesso | Encantado | **Carinhoso e refinado** |

### Atenção: o maior risco de identidade
O jogo **já usa muito rosa** (toldo, pílulas, botões). Se este tema for só "mais rosa", ninguém repara. A diferenciação tem de vir de:
1. **Forma:** corações e laços em elementos recorrentes (arcos, caminhos, canteiros, ícones).
2. **Material:** ouro-rosa, pérolas e renda, que o padrão não tem.
3. **Contraste:** acentos em borgonha e verde-sálvia, para não ficar monocromático.

### Diferenciais técnicos face aos outros temas
1. **Linguagem de forma** (corações) em vez de uma atmosfera nova: a mudança está nos sprites e nos ícones, não num overlay pesado.
2. **Sem glow nem clima pesado:** é o tema **mais barato em desempenho**.
3. **Modo de evento opcional** (7–21 fev) além do uso permanente.
4. **Inclusivo por desenho:** corações como carinho, amizade e gratidão, sem exigir "casais" nem temas românticos.

---

## 1. Regras de segurança (inegociáveis)

1. **Nenhum ID existente muda.** Só muda a aparência.
2. **Nenhuma lógica de jogo depende do tema.**
3. **Decisão "normal ou tema" num único ponto** (resolvedor). Sem `if (coracoes)` espalhado.
4. **Fallback obrigatório** ao visual normal se faltar um recurso.
5. **Saves:** nunca apagar nem reescrever progresso; campos ausentes → defeitos seguros.
6. **Sem vantagem económica:** o tema não dá moedas, XP nem bónus.
7. **Legibilidade primeiro:** rosa sobre rosa é o perigo principal; etiquetas, stock, moedas, XP, cesto e balões têm de continuar a ler-se bem.
8. **Sem pressão:** se houver modo de evento, sem login diário, sem contagens agressivas, nada obtido se perde.
9. **Desligável:** "Reduzir efeitos" mantém o visual estático.
10. **Branch própria, commits pequenos, nunca mexer diretamente na principal.**

---

## 2. Pré-requisitos

- [ ] Halloween publicado e estável; retrospetiva feita.
- [ ] Manifesto/resolvedor/preferência **genéricos por tema** (confirmar na auditoria; se não, generalizar primeiro, com regressão do Halloween a passar).
- [ ] Seletor "Tema visual" disponível (partilhado com o Jardim Luminoso, se este já existir; senão, criar já genérico).
- [ ] Branch `feat/tema-jardim-coracoes`, baseline de build/testes, **3 fixtures de saves**, capturas de referência (desktop e telemóvel vertical).
- [ ] Decisões fechadas: paleta, lista de assets, regra de desbloqueio, se haverá modo de evento.

---

## 3. Como o jogador usa o tema

### 3.1 Seleção
No seletor **"Tema visual"** das definições:

| Opção | Comportamento |
|---|---|
| Padrão | Visual atual |
| Jardim dos Corações | Tema sempre ativo |
| Automático (eventos) | Padrão, mas liga o tema de evento quando houver |

Pré-visualização antes de escolher.

### 3.2 Desbloqueio (decisão a aprovar)
| Opção | Prós | Contras |
|---|---|---|
| **A. Livre desde o início** | Zero fricção, zero risco | Sem "recompensa" |
| **B. Por nível** (ex.: nível 8) | Sensação de conquista; o jogador atual já o tem | Requer lógica de desbloqueio |
| **C. Marco opcional** (ex.: "entregar X encomendas") | Liga ao sistema de marcos | Mais trabalho |

**Recomendação:** A ou B. Nunca por moedas nem por terrenos opcionais pagos.

### 3.3 Modo de evento (opcional)
- Janela sugerida: **7 fev → 21 fev**, recorrente (`02-07` a `02-21`), sem virada de ano.
- Em **Automático**, o tema liga nessa janela; em **Padrão** ou com tema escolhido à mão, nada muda.
- Durante o evento podem existir extras temáticos (Secção 4.10), sempre opcionais; no fim, tudo o que foi obtido **permanece**.
- Se não quiseres evento, o tema funciona só como permanente: basta deixar `eventoOpcional` vazio no manifesto.

### 3.4 Prioridade com outros temas
- **Escolha manual vence** qualquer evento.
- Em **Automático**, só um tema de evento ativo de cada vez (regra de prioridade já definida).
- Kill-switches: `PERMANENT_THEMES_ENABLED` e `EVENT_THEMES_ENABLED` controlam cada tipo.

---

## 4. Visual por área

### 4.1 Atmosfera
- Luz **dourada suave** de fim de tarde (overlay quente, ~6–10%) com vinheta muito leve. É bem mais discreto do que nos outros temas, para manter a luminosidade.
- **Não cobre o HUD.**
- Intensidade parametrizada no manifesto.

### 4.2 Terreno
- **Relva:** verde-sálvia suave (menos saturado que o padrão), com pequenos pontos de pétalas.
- **Caminhos:** pedras em **forma de coração** alternadas com pedras normais (elegante se for 1 em cada ~6, não todas).
- **Canteiros de plantio:** terra mantida **escura e bem contrastada** com as flores, sem decoração em cima. É a regra de legibilidade principal.
- Sebes aparadas em forma de coração e pequenos topiários **fora** das zonas de jogo.

### 4.3 Loja
- Toldo em listras **blush e creme** com festão de renda e pequenos laços.
- Letreiro com moldura em ouro-rosa; coração discreto no topo.
- Vasos com rosas e laços à entrada; guirlanda de pérolas ou luzinhas quentes.
- Janela com cortinas de renda.

### 4.4 Jardim
- **Arco de rosas em coração** à entrada do jardim (peça-assinatura do tema, decorativa, fora do caminho de navegação).
- **Árvores:** copas verde-sálvia com flores rosa-blush e uma ou outra fita; 2–3 variantes por posição determinística.
- **Cerca:** fitas e laços pontuais, sem sobrecarregar.
- **Floreiras e bancos:** almofadas com laço, vasos com flores; um banco "para dois" decorativo.
- **Tabuleta de stock:** moldura creme com cantos em ouro-rosa e coração pequeno.
- **Fonte ou gazebo** (opcional, versão avançada).

### 4.5 Vida ambiente
| Elemento | Substitui | Notas |
|---|---|---|
| Borboletas rosa-blush/brancas | Borboletas | Mesma trajetória, asas em tons do tema |
| Pétalas a flutuar | — (novo) | Poucas e lentas |
| Corações pequenos a subir | — (novo, opcional) | Muito raros e discretos (1–2 de cada vez) |
| Pombas ou passarinhos | Abelhas | Pouco movimento, poisam em cercas/bancos |

Orçamento: ~10 partículas/entidades (ajustável no manifesto, reduzido por "Reduzir efeitos"). **Menos é mais**: o excesso de corações a voar estraga o "elegante".

### 4.6 Personagens
- **Jogadora:** laço no chapéu de palha ou fita ao pescoço; mesma silhueta e hitbox.
- **Clientes:** camada de acessório simples (laço, flor na lapela, cachecol rosa); escolha determinística por cliente. Sem acessórios que sugiram só "casal".
- **Balões de pedido:** inalterados.

### 4.7 Flores (skins cosméticas, mesmos IDs)
| Flor | Variante | Prioridade |
|---|---|---|
| Rosa | Rosa-blush profundo, pétalas macias; uma pequena pérola de orvalho | Alta |
| Peónia | Branco-rosado, mais cheia | Alta |
| Tulipa | Pétalas que formam **forma de coração** | Alta |
| Margarida | Centro em forma de coração | Média |
| Girassol | Miolo com padrão de coração | Média |
| Lavanda | Laço fino à volta da haste | Média |
| Orquídea | Rosa-pálido com pérola | Baixa |

**Regras:**
- **Todos os estados de crescimento** mantêm leitura clara: uma flor pronta distingue-se sempre de uma não pronta, sem depender da cor.
- Cuidado com flores rosa sobre fundo rosa: manter o contorno escuro e a terra escura.
- Opcional: um **brilho de coração minúsculo** nas flores prontas, só como cintilar leve (usa o pulso global; nunca substitui o indicador original).

### 4.8 Interface
- **Ícones com identidade:** moeda com coração, marcador de XP com ponta em coração, cesto com laço. Só onde for seguro e legível.
- **Botões do topo:** mesma forma e tamanho; fundo **creme-blush** com contorno **borgonha**, para manter o contraste do texto.
- **Painéis** (livro, ramos, loja): moldura creme com **canto de renda** ou laço discreto; fundo claro para preservar o contraste.
- **Pílulas de estado:** cor e forma iguais às atuais, com um detalhe de coração opcional.
- **Pílula de evento** ("💗 Jardim dos Corações") só em modo de evento.
- Estado nunca indicado só por cor.

### 4.9 Áudio (opcional, só se já existir áudio)
- Faixa suave (cordas ou piano discreto, carrilhão) e um efeito curto ao colher. Respeitar volume/mute.

### 4.10 Extras cosméticos (depois da versão mínima)
- **Embrulhos e acessórios de ramo:** papel blush, laço de cetim, selo em forma de coração, fita de renda, pérolas.
- **Decorações:** arco de rosas, bancos, gazebo, topiários, lanternas elegantes.
- **Encomendas temáticas** (opcional, só no modo de evento): texto curto, **sem bloquear nada**, só com flores acessíveis ao nível exigido, centradas em carinho, amizade e gratidão em vez de só romance.
- **"Cartas escondidas"** opcionais pelo jardim, com recompensa cosmética; nunca necessárias.
- Qualquer item novo implica IDs estáveis novos (Secção 6).

---

## 5. Arquitetura

### 5.1 Manifesto
```
id:             "jardim_coracoes"
tipo:           "permanente"
eventoOpcional: { inicio: "02-07", fim: "02-21", atravessaAno: false }   // opcional
desbloqueio:    { tipo: "livre" | "nivel", valor: 8 }                    // decisão pendente
paleta:         { ...tokens (Secção 7) }
sprites:        { <idNormal>: <idCoracoes>, ... }
iconografia:    { moeda, xp, cesto }
camadas:        { jogadora: [laco], cliente: [laco, florLapela, cachecol] }
particulas:     { petala, coracao, borboleta, passaro }   // com limites
terreno:        { pedrasCoracao: {frequencia: 6}, exclusoes: ["canteiros", "zonasInterativas"] }
textos:         { ... }
audio:          opcional
```

### 5.2 Estado do tema
`temaAtivo = f(escolha do jogador, desbloqueio, janela de evento, kill-switches)`

| Escolha | Resultado |
|---|---|
| Padrão | Visual normal |
| Jardim dos Corações (desbloqueado) | Tema ativo |
| Jardim dos Corações (bloqueado) | Visual normal + indicação de como desbloquear |
| Automático | Padrão, com tema de evento na janela |

### 5.3 Componentes técnicos
1. **Substituição de iconografia** pelo resolvedor (moeda, XP, cesto), com fallback ao ícone original.
2. **Terreno com variação determinística** (pedras de coração em posições fixas, sem "piscar").
3. **Partículas leves** reutilizando o sistema do Halloween.
4. **Cintilar opcional** nas flores prontas com o pulso global (se o Jardim Luminoso já tiver implementado esse mecanismo; senão, deixar para depois).

---

## 6. Dados e saves

### 6.1 O que se guarda (mínimo)
```
definicoes.temaVisual: "padrao" | "jardim_luminoso" | "jardim_coracoes" | "automatico"   // defeito "automatico"
```
(nome e localização a confirmar.) O seletor é **partilhado** com os outros temas permanentes. Se houver cosméticos obtidos: IDs estáveis no inventário de cosméticos.

### 6.2 Regras
- Campo ausente → defeito seguro (`automatico`).
- Valor desconhecido, inexistente ou bloqueado (ex.: save de versão futura) → `padrao`, sem erro.
- `schemaVersion` só incrementa se houver campo obrigatório novo; migração idempotente e testada com as 3 fixtures. Sem sistema de versão, **não o introduzir só para isto**.
- Não guardar "tema ativo" derivado.
- Cloud (se existir): a preferência nunca gera conflito destrutivo.
- Erro ao ler o campo → usar defeito, **nunca** descartar o save.

---

## 7. Paleta proposta (a validar)

| Papel | Atual (aprox.) | Jardim dos Corações |
|---|---|---|
| Relva | verde-menta claro | verde-sálvia `#A8BFA0` |
| Terra / canteiro | castanho | castanho-vinho `#5A3A3A` (contraste alto com as flores) |
| Contorno | verde-escuro | borgonha-escuro `#5B2A3A` (ou verde-floresta, a testar) |
| Destaque principal | rosa | rosa-blush `#F2A8B8` |
| Destaque secundário | amarelo | ouro-rosa `#D9A38B` |
| Acento profundo | — | borgonha `#9B2D4A` |
| Pérola / luz | — | marfim `#FFF5EC` |
| Painéis | creme | creme-blush `#FBEDE8` |
| Overlay | — | dourado suave, 6–10% |

Validar contraste de texto (mínimo AA onde possível). Testar duas versões do contorno (borgonha vs. verde-floresta) em capturas lado a lado: o contorno decide se o tema parece elegante ou doce demais.

---

## 8. Lista de assets

Convenção: `jc_<categoria>_<nome>[_estado].png`, mesmo tamanho e âncora do sprite que substituem. Atlas separado, só carregado com o tema ativo (mas pré-cacheado).

| Categoria | Assets |
|---|---|
| Loja | toldo, festão de renda, letreiro, cortinas, vasos com laço, guirlanda |
| Árvores | 3 variantes com flores blush e fitas |
| Terreno | relva sálvia, pedras de coração, caminhos, sebe em coração, topiário |
| Cerca/floreiras/bancos | laços, almofadas, vasos |
| Tabuleta de stock | moldura creme com ouro-rosa |
| Decoração | **arco de rosas em coração**, banco decorativo, gazebo (opcional) |
| Ambiente | borboleta blush (2–3 frames), pétala, coraçãozinho, pássaro |
| Jogadora | laço |
| Clientes | laço, flor de lapela, cachecol |
| Flores (alta) | rosa, peónia, tulipa (todos os estados) |
| Flores (média/baixa) | margarida, girassol, lavanda, orquídea |
| Ícones | moeda, XP, cesto |
| HUD | enfeites de botão |
| Painéis | moldura creme, canto de renda |
| Overlay | gradiente dourado (pode ser por código) |
| Cosméticos (opcional) | embrulhos, selos, fitas, decorações |

---

## 9. Offline, pré-cache e publicação (PWA)

- [ ] Todos os assets, textos e manifesto no pré-cache; **versão da cache atualizada**.
- [ ] Jogo funciona em modo avião após a primeira carga com o tema.
- [ ] Cenários: sem atualizar, atualiza com o tema escolhido, atualiza com o tema bloqueado, atualiza durante e depois da janela de evento.
- [ ] Atlas do tema não carrega para quem nunca o escolheu, mas fica disponível offline após o primeiro uso (ou é pré-carregado em segundo plano antes da janela de evento).
- [ ] O aviso "Atualização disponível" mantém-se; nada obriga a atualizar já.
- [ ] Se houver modo de evento, **publicar até 31 jan** para chegar a 7 fev. Como tema permanente, a data é livre.

---

## 10. Desempenho

É o tema mais leve dos três (sem glow, sem clima pesado).

- Sprites estáticos na maioria dos elementos.
- Partículas: orçamento de ~10; pausa em "Reduzir efeitos".
- Cintilar nas flores prontas (se existir) usa **pulso global único**, nunca animação por flor.
- Medir FPS e memória com o tema ligado vs. desligado em dispositivo modesto; meta: sem queda perceptível.

---

## 11. Acessibilidade

- **Contraste** verificado em todos os painéis e etiquetas (rosa sobre rosa é o ponto crítico).
- Estado (pronto, bloqueado, comprado) com texto/ícone, não só cor.
- **Daltonismo:** rosa-blush vs. verde-sálvia pode confundir em alguns tipos; testar simulação e manter as etiquetas dos canteiros.
- `prefers-reduced-motion` e "Reduzir efeitos" desligam partículas e cintilar.
- Sem flashes; qualquer variação de luz lenta e suave.
- Seletor acessível por rato, teclado e toque; utilizável em ecrã pequeno vertical.

---

## 12. Tutorial e textos

- Texto curto no seletor: o que é, que é opcional, como voltar ao padrão.
- Se bloqueado: dizer **claramente** como desbloquear.
- Em modo de evento: explicar datas e que nada se perde; sem textos de pressão.
- Linguagem **inclusiva**: carinho, amizade, gratidão; evitar pressupor relações específicas.
- Rever textos do tutorial que descrevam cores/aparência (ex.: "toldo rosa").
- Textos em dados/strings, nunca hardcoded na lógica.

---

## 13. Plano de testes

**Regressão (tema Padrão):** visual idêntico às capturas; ciclo cultivar → colher → depositar → vender intacto; encomendas, ramos, livro, loja, ajudantes e stock como antes.

**Tema ligado:**
- [ ] Canteiros com terra bem contrastada; flores legíveis em todos os estados.
- [ ] Flor pronta distingue-se de não pronta, sem depender da cor.
- [ ] Etiquetas, stock, moedas, XP, cesto e balões legíveis (rosa sobre rosa não rouba contraste).
- [ ] Hitboxes iguais; arco e decorações não tapam zonas interativas.
- [ ] Ícones substituídos legíveis a tamanho pequeno.

**Saves:** 3 fixtures carregam com o tema ligado/desligado; save sem campos novos → defeitos; preferência persiste; valor desconhecido/bloqueado → `padrao`; alternar várias vezes não corrompe nada.

**Convivência de temas:** escolha manual vence o evento; Automático liga o evento na janela; kill-switches funcionam.

**Datas (se modo de evento):** 6 fev, 7 fev, 14 fev, 21 fev, 22 fev, mudança de fuso, relógio adiantado/atrasado.

**Offline/PWA:** modo avião; pré-cache completo (verificação automática, se possível); fluxo de atualização.

**Falhas controladas:** remover um asset → usa o normal; manifesto inválido → visual normal e aviso; `PERMANENT_THEMES_ENABLED = false` → tema nunca ativa.

**Dispositivos:** desktop (rato/teclado), telemóvel vertical (toque), ecrã pequeno; sem erros novos na consola.

---

## 14. Ordem de implementação

| # | Passo | Verificação |
|---|---|---|
| 1 | Auditoria + baseline + fixtures + capturas | Aprovada |
| 2 | Confirmar/generalizar manifesto, resolvedor e seletor por tema | Halloween continua igual |
| 3 | Valor `jardim_coracoes` no seletor + save com defeitos seguros + desbloqueio | Fixtures carregam; preferência persiste |
| 4 | Prioridade com eventos + kill-switches (+ datas do evento, se houver) | Testes de seleção e datas |
| 5 | Overlay dourado + tokens de paleta + teste do contorno (borgonha vs. verde) | Legibilidade |
| 6 | Terreno (relva, caminhos com pedras de coração) com máscaras de exclusão | Canteiros intactos |
| 7 | Loja, árvores, cerca, floreiras, tabuleta | Hitboxes intactas |
| 8 | Arco de rosas e decorações-assinatura | Sem tapar zonas interativas |
| 9 | Vida ambiente + "Reduzir efeitos" | FPS e reduced-motion |
| 10 | Skins de flores (alta → baixa) | Estados legíveis |
| 11 | Iconografia (moeda, XP, cesto) + HUD, botões, painéis | Contraste e ecrã pequeno |
| 12 | Jogadora e clientes (acessórios) | Silhuetas e balões |
| 13 | Pré-cache e versão da cache | Teste offline |
| 14 | Textos/tutorial | Revisão |
| 15 | Testes completos (Secção 13) | Tudo ✅ |
| 16 | Publicação | Verificação pós-publicação |
| 17 | (Opcional) extras cosméticos, encomendas, cartas escondidas | Nova validação |

**Versão mínima:** passos 1–11 com loja, árvores, caminhos, arco de rosas, flores de prioridade alta e o seletor nas definições. O resto entra por ondas.

---

## 15. Calendário (hoje: 5 out 2026)

Já há três temas planeados (Halloween, Jardim Luminoso e este). Para não sobrecarregar a arte, a ordem proposta é:

| Datas | Trabalho |
|---|---|
| 5–23 out | Foco total no Halloween |
| 24 out – 7 nov | Só design: paleta, teste de contorno, lista final de assets |
| 8–14 nov | Retrospetiva do Halloween; decidir **a ordem** entre este tema e o Luminoso |
| Nov–dez | Construir o tema escolhido primeiro |
| Jan 2027 | Testes completos; **publicar até 31 jan** se houver modo de evento |
| 7–21 fev | Janela do evento (se existir) |

**Sugestão de ordem:** o Jardim dos Corações é bem mais barato em desempenho e risco do que o Luminoso, e tem uma data natural (14 fev). Faz sentido construí-lo primeiro e deixar o Luminoso, que precisa do protótipo de halo, para depois, ou prototipar o halo em paralelo, durante a janela do Halloween.

---

## 16. Publicação, monitorização e reversão

**Antes de publicar:** checklists da Secção 13 concluídas; capturas finais (tema ligado/desligado); diff final revisto; versão da cache atualizada.

**Depois:** abrir num dispositivo limpo e noutro com save antigo; confirmar o aviso de atualização; testar o seletor e o desbloqueio; simular datas do evento; acompanhar feedback.

| Situação | Ação |
|---|---|
| O jogador não gosta | Seletor em "Padrão" |
| Bug visual grave | Nova versão com `PERMANENT_THEMES_ENABLED = false` |
| Problema com saves (não esperado) | Parar, reverter o commit da preferência, publicar versão anterior; os saves originais não foram alterados |
| Recurso em falta | Fallback automático ao visual normal |

---

## 17. Critérios de aceitação

1. Com o tema **Padrão**, o jogo é indistinguível da versão anterior.
2. Com o tema ligado, é **reconhecível à primeira vista** como "corações, fofo e elegante", e **não** só "mais rosa".
3. Nenhum ID, lógica, economia ou save existente foi alterado, para além de uma preferência com defeito seguro.
4. Tudo funciona **offline** após a primeira carga.
5. Textos e etiquetas legíveis; canteiros com contraste; interações com as mesmas zonas.
6. Sem queda perceptível de desempenho; efeitos desligáveis.
7. Linguagem e conteúdo inclusivos.
8. Existe plano de reversão testado.

---

## 18. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Parecer só "mais rosa" que o padrão | Tema sem identidade | Corações como forma, ouro-rosa, pérolas, renda, acentos borgonha e sálvia |
| Rosa sobre rosa perde contraste | Leitura pior | Terra escura, contorno escuro, painéis claros, validação em cada passo |
| Excesso de corações | Perde o "elegante" | Corações raros e bem escolhidos; 1 em ~6 nas pedras; partículas poucas |
| Cores indistintas para daltónicos | Acessibilidade | Etiquetas mantidas; testar simulação |
| Conteúdo demasiado "romântico" | Exclui jogadores | Foco em carinho, amizade e gratidão |
| Sobreposição com temas de evento | Visual misturado | Escolha manual vence; testes de seleção |
| Manifesto do Halloween com nomes fixos | Retrabalho | Generalizar no passo 2, com regressão |
| Cansaço de arte com três temas | Atraso | Versão mínima; reutilizar estrutura; ordem definida na retrospetiva |

---

## 19. Perguntas em aberto

1. O manifesto/resolvedor do Halloween é genérico por tema ou tem nomes fixos?
2. O motor permite substituir ícones (moeda, XP, cesto) por tema sem mexer em muitos sítios?
3. Desbloqueio: **A** (livre), **B** (nível) ou **C** (marco)?
4. Queres **modo de evento** à volta de 14 fev, ou só tema permanente?
5. Contorno: **borgonha** (mais elegante) ou **verde-floresta** (mais próximo do estilo atual)? Decide-se com capturas lado a lado.
6. O jogo tem áudio? (Se não, não introduzir.)
7. Qual é o orçamento de arte realista e em que ordem queres os três temas?

---

## Anexo — Outros temas diferenciados (alternativas)

| Tema | Identidade | Diferencial técnico |
|---|---|---|
| **Hanami** | Cerejeiras, pétalas a cair, rosa e verde-claro | Partículas de pétalas, folhagem rosa |
| **Feira de Outono** | Colheitas, folhas, banca de mercado | Variante de loja como banca |
| **Jardim Zen** | Pedras, areia riscada, bambu, tons calmos | Terreno com padrões e lanternas |
| **Estufa Vitoriana** | Ferro forjado, vidro, vapor, tons latão | Moldura de vidro e reflexos |
