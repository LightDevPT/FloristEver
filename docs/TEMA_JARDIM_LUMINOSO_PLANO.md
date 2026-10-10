# FloristEver — Tema "Jardim Luminoso"

## Estado da execução local — 5 out 2026

- Implementados o tema permanente, a seleção explícita com prioridade sobre eventos e o desbloqueio gratuito no nível 10.
- O visual usa desenho Canvas e halos gerados uma vez e reutilizados; não foram adicionados ficheiros de imagem nem áudio.
- A preferência reutiliza `settings.themePreference`; o esquema do save e os dados de progresso não foram alterados.
- O tema está incluído no pré-cache de origem e a cache foi incrementada para `floristever-v35`.
- Validação local: testes automatizados e inspeção visual em desktop e telemóvel servidos diretamente da fonte.
- Pendentes antes de qualquer publicação: teste offline em dispositivo real, medição de FPS/memória num dispositivo modesto e verificação completa de regressão visual/dispositivos.
- A pasta não tem metadados Git; por isso, não foi criada a branch indicada no plano. Não foi gerada build de distribuição nem feito deploy.

> **Âmbito:** tema visual **permanente e opcional** (sem janela de datas), 100% cosmético, construído sobre a arquitetura de temas já planeada (manifesto + resolvedor único + fallback).
> **Nota:** escrito sem acesso ao código; nomes de ficheiros e chaves de save aparecem como **"a confirmar"** e dependem da auditoria feita para o Halloween.

---

## 0. Conceito e diferenciação

Uma **noite mágica e serena**, em que o jardim ganha vida própria: flores bioluminescentes, cogumelos que brilham, pirilampos, lanternas de pedra e pétalas luminosas a flutuar. É o oposto do visual diurno e pastel atual, e não depende de nenhuma época do ano.

| | Padrão | Halloween | **Jardim Luminoso** |
|---|---|---|---|
| Hora | Dia | Entardecer | **Noite azul-esverdeada** |
| Cores | Pastel, verde | Laranja, roxo | **Azul-petróleo, ciano, magenta, violeta** |
| Luz | Natural | Velas | **Brilho das próprias flores** |
| Sensação | Alegre | Travesso | **Encantado e calmo** |
| Duração | Sempre | 24 out–7 nov | **Sempre disponível, à escolha** |

**Ideia central:** a luz vem das plantas. Cada flor tem a sua cor de brilho, o que dá identidade própria ao tema e, bem feito, até melhora a leitura das flores prontas.

**Diferenciais técnicos face aos outros temas:**
1. **Tema permanente**, escolhido nas definições (sem janela de datas, sem auto-ativação).
2. **Brilho por flor** com orçamento de desempenho rigoroso (há dezenas de flores no ecrã).
3. **Pulso de luz global** (uma única fase partilhada) em vez de animar cada flor.
4. **Convivência com temas de evento:** regra clara de quem prevalece.

---

## 1. Regras de segurança (inegociáveis)

1. **Nenhum ID existente muda.** Só muda a aparência.
2. **Nenhuma lógica de jogo depende do tema.** O brilho é cosmético e **não substitui** os indicadores de "pronta" já existentes.
3. **Decisão "normal ou tema" num único ponto** (resolvedor). Sem `if (luminoso)` espalhado.
4. **Fallback obrigatório** ao visual normal se faltar um recurso ou o dispositivo não aguentar.
5. **Saves:** nunca apagar nem reescrever progresso; campos ausentes → defeitos seguros.
6. **Sem vantagem económica:** o tema não dá moedas, XP nem bónus. Se tiver desbloqueio, é por critério simples e não prejudica quem não o tiver.
7. **Legibilidade primeiro:** etiquetas, stock, moedas, XP, cesto e balões continuam a ler-se bem.
8. **Sem flashes:** variações de luz lentas e suaves (segurança fotossensível).
9. **Desligável:** "Reduzir efeitos" mantém o visual estático.
10. **Branch própria, commits pequenos, nunca mexer diretamente na principal.**

---

## 2. Pré-requisitos

- [ ] Halloween publicado e estável; retrospetiva feita (o que custou, o que correu mal).
- [ ] Manifesto/resolvedor/preferência **genéricos por tema** (confirmar na auditoria; se não, generalizar primeiro, com regressão do Halloween a passar).
- [ ] Branch `feat/tema-jardim-luminoso`, baseline de build/testes, **3 fixtures de saves**, capturas de referência (desktop e telemóvel vertical).
- [ ] Decisões fechadas: paleta, lista de assets, regra de desbloqueio, prioridade entre temas.

---

## 3. Como o jogador usa o tema

### 3.1 Seleção
Nas definições, um seletor **"Tema visual"**:

| Opção | Comportamento |
|---|---|
| Padrão | Visual atual |
| Jardim Luminoso | Tema luminoso sempre ativo |
| Automático (eventos) | Padrão, mas liga o tema de evento quando houver (ex.: Halloween) |

Pré-visualização antes de escolher (miniatura ou cena de exemplo).

### 3.2 Desbloqueio (decisão a aprovar)
Três opções, da mais simples à mais elaborada:

| Opção | Prós | Contras |
|---|---|---|
| **A. Livre desde o início** | Zero fricção, zero risco | Sem "recompensa" |
| **B. Desbloqueia por nível** (ex.: nível 10) | Sensação de conquista; o jogador atual (nível 12) já o tem | Requer lógica de desbloqueio |
| **C. Marco opcional** (ex.: "vender X ramos") | Liga ao sistema de marcos | Mais trabalho; não pode ser pay-to-unlock |

**Recomendação:** A ou B. Em qualquer caso, **nunca** bloquear por moedas do jogo de forma que prejudique a economia, e **nunca** exigir terrenos opcionais.

### 3.3 Prioridade com eventos
- Se o jogador escolher **Jardim Luminoso** explicitamente, **esse tema mantém-se** durante eventos (a escolha manual ganha).
- Se estiver em **Automático**, os temas de evento ligam na sua janela.
- Kill-switch global `EVENT_THEMES_ENABLED = false` desliga os temas de **evento**; o tema permanente é controlado por um interruptor próprio (`PERMANENT_THEMES_ENABLED`).

---

## 4. Visual por área

### 4.1 Atmosfera
- Overlay **azul-petróleo escuro** sobre o mundo (~25–35%, mais forte do que Halloween/Natal porque é uma noite verdadeira), com vinheta suave.
- **Não cobre o HUD.**
- Intensidade parametrizada no manifesto (ajustável sem mexer em código).
- **Cuidado:** noite demasiado escura prejudica a leitura. Validar contraste em cada passo.

### 4.2 Terreno
- **Relva:** verde-azulado escuro, com manchas de musgo luminoso.
- **Caminhos:** pedra/terra escura com pequenos pontos de luz.
- **Canteiros de plantio:** terra escura mantida **bem contrastada** com as flores (mesma regra de leitura do tema de inverno).
- Cogumelos luminosos, tufos de erva e pedras com brilho suave nas bordas, **fora** das zonas de jogo.

### 4.3 Loja
- Toldo em listras **violeta e azul-petróleo**.
- Janela com luz âmbar quente (contraste de cor).
- Lanternas de papel/pedra à porta; fio de luzinhas.
- Pequenas flores luminosas em vasos à entrada.

### 4.4 Jardim
- **Árvores:** copas azul-esverdeadas escuras com orbes de luz a flutuar; 2–3 variantes por posição determinística.
- **Cerca:** vegetação com pontinhos de luz.
- **Floreiras e bancos:** flores luminosas e uma lanterna.
- **Tabuleta de stock:** moldura em madeira escura com luz âmbar suave.
- Lanternas de pedra decorativas (sem colisão relevante).

### 4.5 Vida ambiente
| Elemento | Substitui | Notas |
|---|---|---|
| Pirilampos | Abelhas | Movimento lento, brilho âmbar |
| Borboletas luminosas (ciano/violeta) | Borboletas | Mesma trajetória, asas com brilho |
| Pétalas luminosas a flutuar | — (novo) | Poucas, muito lentas |
| Esporos/partículas de cogumelo | — (novo, opcional) | Cintilar discreto |

Orçamento: ~12 partículas/entidades ambientais, ajustável; reduzido por "Reduzir efeitos".

### 4.6 Personagens
- **Jogadora:** com uma **lanterna** na mão (mesma silhueta e hitbox).
- **Clientes:** camada de acessório simples (lanterninha, frasco de pirilampos, laço luminoso). Escolha determinística por cliente.
- **Balões de pedido:** inalterados.

### 4.7 Flores (skins cosméticas, mesmos IDs)

Cada flor tem a **sua cor de brilho**:

| Flor | Brilho | Prioridade |
|---|---|---|
| Orquídea | Azul elétrico | Alta |
| Lavanda | Lilás | Alta |
| Rosa | Magenta | Alta |
| Girassol | Dourado | Média |
| Peónia | Rosa suave | Média |
| Margarida | Ciano-pálido | Média |
| Tulipa | Magenta-coral | Baixa |

**Regras de brilho:**
- O brilho aparece **só nas flores maduras (prontas)**, ou numa versão muito suave nas restantes. Assim reforça o estado, sem substituir o indicador original.
- **Todos os estados de crescimento** mantêm leitura clara: uma flor pronta distingue-se sempre de uma não pronta, mesmo com o brilho desligado e sem depender da cor.
- Brilho feito com **sprite de halo pré-desenhado** (não filtros dinâmicos).

### 4.8 Interface
- Pílula **"✨ Jardim Luminoso"** só se fizer sentido (como tema permanente, **não é necessária**; a escolha fica nas definições). Opcional: um pequeno ícone no botão de definições.
- Botões do topo: mesma forma e tamanho; **fundo creme/luar** com contorno azul-petróleo, para manter o contraste do texto.
- Painéis (livro, ramos, loja): moldura em tons luar/marfim com enfeite de canto discreto (folha ou cogumelo luminoso). **Não escurecer o fundo dos painéis** a ponto de perder contraste.
- Estado nunca indicado só por cor.

### 4.9 Áudio (opcional, só se já existir áudio)
- Faixa ambiente calma (grilos, vento suave, notas cristalinas). Respeitar volume/mute.

### 4.10 Extras cosméticos (depois da versão mínima)
- **Embrulhos e acessórios** de ramo: papel azul-petróleo, laço violeta, mini lanterna.
- **Decorações luminosas** (lanternas, cogumelos, tochas) para a personalização da floricultura.
- **Variante dia/noite do tema** (versão mais clara, "Alvorecer luminoso") como segunda opção.
- Qualquer item novo implica IDs estáveis novos (Secção 6).

---

## 5. Arquitetura

### 5.1 Manifesto
```
id:            "jardim_luminoso"
tipo:          "permanente"          // sem janela de datas
desbloqueio:   { tipo: "livre" | "nivel", valor: 10 }   // decisão pendente
paleta:        { ...tokens (Secção 7) }
sprites:       { <idNormal>: <idLuminoso>, ... }
brilho:        { halos: {...}, pulso: { periodoMs, amplitude }, maxHalosAtivos: N }
camadas:       { jogadora: [lanterna], cliente: [lanterninha, frascoPirilampos] }
particulas:    { pirilampo, borboletaLuminosa, petala, esporo }  // com limites
terreno:       { musgo, pontosLuz, exclusoes: ["canteiros", "zonasInterativas"] }
textos:        { ... }
audio:         opcional
```

### 5.2 Estado do tema
`temaAtivo = f(escolha do jogador, desbloqueio, janela de eventos, kill-switches)`

| Escolha | Resultado |
|---|---|
| Padrão | Visual normal |
| Jardim Luminoso (desbloqueado) | Tema luminoso |
| Jardim Luminoso (bloqueado) | Visual normal + indicação de como desbloquear |
| Automático | Padrão, com tema de evento na janela |

### 5.3 Novos componentes técnicos
1. **Camada de halos:** desenha sprites de brilho por cima das flores prontas, com limite de halos simultâneos (`maxHalosAtivos`).
2. **Pulso global:** uma única fase de animação partilhada por todos os halos (barato), em vez de uma animação por flor.
3. **Camada de terreno com máscaras de exclusão** (reutilizada do tema de inverno, se já existir).
4. **Fallback de desempenho:** se o FPS cair abaixo de um limiar durante X segundos, o jogo reduz automaticamente o brilho (estático) e avisa nas definições (sem pop-ups agressivos).

---

## 6. Dados e saves

### 6.1 O que se guarda (mínimo)
```
definicoes.temaVisual: "padrao" | "jardim_luminoso" | "automatico"   // defeito "automatico"
```
(nome e localização a confirmar.) Se houver desbloqueio por marco/nível: o estado deriva do progresso existente (não duplicar). Se houver cosméticos obtidos: IDs estáveis no inventário de cosméticos.

### 6.2 Regras
- Campo ausente → defeito seguro (`automatico`).
- Se a preferência apontar para um tema **inexistente ou bloqueado** (ex.: save vindo de versão futura), cair para `padrao` sem erro.
- `schemaVersion` só incrementa se houver campo obrigatório novo; migração idempotente e testada com as 3 fixtures. Se não existir sistema de versão, **não o introduzir só para isto**.
- Não guardar "tema ativo" derivado.
- Cloud (se existir): a preferência nunca gera conflito destrutivo.
- Erro ao ler o campo → usar defeito, **nunca** descartar o save.

---

## 7. Paleta proposta (a validar)

| Papel | Atual (aprox.) | Jardim Luminoso |
|---|---|---|
| Relva | verde-menta claro | verde-petróleo escuro `#2F5A5A` |
| Terra / canteiro | castanho | castanho-arroxeado escuro `#3E2F3A` (alto contraste com as flores) |
| Contorno | verde-escuro | azul-noite `#14233A` |
| Destaque principal | rosa | magenta `#E04FA0` |
| Destaque secundário | amarelo | ciano `#4FD6D0` |
| Luz quente | — | âmbar `#FFB347` |
| Luz fria | — | violeta `#9B7BFF` |
| Painéis | creme | marfim-luar `#F2EEDD` |
| Overlay noturno | — | azul-petróleo, 25–35% |

Validar contraste de texto (mínimo AA onde possível) e comparar com as capturas de referência. **Não** usar a cor de brilho como único sinal de estado.

---

## 8. Lista de assets

Convenção: `jl_<categoria>_<nome>[_estado].png`, mesmo tamanho e âncora do sprite que substituem. Atlas separado, só carregado com o tema ativo (mas pré-cacheado).

| Categoria | Assets |
|---|---|
| Loja | toldo, janela âmbar, lanternas, fio de luzes, vasos luminosos |
| Árvores | 3 variantes com orbes de luz |
| Terreno | relva escura, musgo luminoso, caminhos com pontos de luz, cogumelos ×3, pedras com brilho |
| Cerca/floreiras/bancos | vegetação com luz, lanterna |
| Tabuleta de stock | moldura escura com luz âmbar |
| Decoração | lanterna de pedra ×2 |
| Ambiente | pirilampo, borboleta luminosa (2–3 frames), pétala, esporo |
| Jogadora | lanterna |
| Clientes | lanterninha, frasco de pirilampos |
| Halos de flor | 7 halos (um por flor) em 2 tamanhos |
| Flores (alta) | orquídea, lavanda, rosa (todos os estados) |
| Flores (média/baixa) | girassol, peónia, margarida, tulipa |
| HUD | ícone opcional, enfeites de botão |
| Painéis | moldura luar, enfeite de canto |
| Overlay | gradiente/vinheta (pode ser por código) |
| Cosméticos (opcional) | embrulhos, laços, decorações luminosas |

---

## 9. Offline, pré-cache e publicação (PWA)

- [ ] Todos os assets, textos e manifesto no pré-cache; **versão da cache atualizada**.
- [ ] Jogo funciona em modo avião após a primeira carga com o tema.
- [ ] Cenários: sem atualizar, atualiza com o tema escolhido, atualiza com o tema bloqueado.
- [ ] Atlas do tema não carrega para quem nunca o escolheu (poupa memória/dados), mas fica disponível offline após o primeiro uso.
- [ ] O aviso "Atualização disponível" mantém-se; nada obriga a atualizar já.
- [ ] Como não há janela de datas, **não existe pressa de publicação**: pode sair quando estiver pronto.

---

## 10. Desempenho (o maior risco deste tema)

O ecrã de exemplo mostra dezenas de flores em simultâneo; brilho em todas pode custar caro.

- Halos **pré-desenhados** (sprites), nunca desfoque/sombra dinâmica.
- Halos só nas flores **prontas**; as restantes sem brilho (ou muito suave, estático).
- `maxHalosAtivos` no manifesto; excedentes ficam sem halo (prioridade às mais próximas ou visíveis).
- **Pulso global único**; nada de uma animação por flor.
- Partículas: orçamento de ~12; pausa em "Reduzir efeitos".
- Medir FPS e memória com tema ligado vs. desligado em **dispositivo modesto**; meta: sem queda perceptível.
- Fallback automático para brilho estático se o FPS cair (Secção 5.3).

---

## 11. Acessibilidade

- Contraste verificado em todos os painéis e etiquetas com o tema ativo (noite não pode custar legibilidade).
- Estado (pronto, bloqueado, comprado) com texto/ícone, não só cor ou brilho.
- Daltonismo: as 7 cores de brilho **não** podem ser o único modo de distinguir flores (as etiquetas dos canteiros mantêm-se).
- `prefers-reduced-motion` e "Reduzir efeitos" desligam pulso, partículas e brilhos animados.
- Sem flashes rápidos; pulso lento (período longo, amplitude baixa).
- Seletor de tema acessível por rato, teclado e toque; utilizável em ecrã pequeno vertical.

---

## 12. Tutorial e textos

- Texto curto no seletor: o que é, que é opcional, como voltar ao padrão.
- Se bloqueado: dizer **claramente** como desbloquear (ex.: "Chega ao nível 10").
- Rever textos do tutorial que descrevam cores/aparência.
- Textos em dados/strings, nunca hardcoded na lógica.

---

## 13. Plano de testes

**Regressão (tema Padrão):** visual idêntico às capturas; ciclo cultivar → colher → depositar → vender intacto; encomendas, ramos, livro, loja, ajudantes e stock como antes.

**Tema ligado:**
- [ ] Canteiros com terra bem contrastada; flores legíveis em todos os estados.
- [ ] Flor pronta distingue-se de não pronta **com e sem** brilho.
- [ ] Etiquetas, stock, moedas, XP, cesto e balões legíveis.
- [ ] Hitboxes iguais; decorações não tapam zonas interativas.
- [ ] Sem artefactos nas bordas do mundo.

**Saves:** 3 fixtures carregam com o tema ligado/desligado; save sem campos novos → defeitos; preferência persiste; preferência para tema inexistente/bloqueado → `padrao`; alternar várias vezes não corrompe nada.

**Convivência de temas:** escolha manual vence o evento; "Automático" liga o evento na janela; kill-switches funcionam.

**Offline/PWA:** modo avião; pré-cache completo (verificação automática, se possível); fluxo de atualização.

**Falhas controladas:** remover um asset → usa o normal; manifesto inválido → visual normal e aviso; `PERMANENT_THEMES_ENABLED = false` → tema nunca ativa.

**Desempenho:** FPS/memória com e sem o tema; fallback automático dispara e reverte corretamente.

**Dispositivos:** desktop (rato/teclado), telemóvel vertical (toque), ecrã pequeno; sem erros novos na consola.

---

## 14. Ordem de implementação

| # | Passo | Verificação |
|---|---|---|
| 1 | Auditoria + baseline + fixtures + capturas | Aprovada |
| 2 | Confirmar/generalizar manifesto, resolvedor e preferência por tema | Halloween continua igual |
| 3 | Seletor "Tema visual" + save com defeitos seguros + lógica de desbloqueio | Fixtures carregam; preferência persiste |
| 4 | Regra de prioridade com eventos + kill-switches | Testes de seleção |
| 5 | Overlay noturno + tokens de paleta | Legibilidade |
| 6 | Terreno (musgo, cogumelos) com máscaras de exclusão | Canteiros intactos |
| 7 | Loja, árvores, cerca, floreiras, tabuleta | Hitboxes intactas |
| 8 | Vida ambiente + "Reduzir efeitos" | FPS e reduced-motion |
| 9 | Camada de halos + pulso global + fallback de desempenho | Medição em dispositivo modesto |
| 10 | Skins de flores (alta → baixa) | Estados legíveis |
| 11 | HUD, botões, painéis | Contraste e ecrã pequeno |
| 12 | Jogadora (lanterna) e clientes (acessórios) | Silhuetas e balões |
| 13 | Pré-cache e versão da cache | Teste offline |
| 14 | Textos/tutorial | Revisão |
| 15 | Testes completos (Secção 13) | Tudo ✅ |
| 16 | Publicação | Verificação pós-publicação |
| 17 | (Opcional) extras cosméticos e variante "Alvorecer" | Nova validação |

**Versão mínima:** passos 1–11 com árvores/loja/terreno, halos nas 3 flores de prioridade alta e o seletor nas definições. O resto entra por ondas.

---

## 15. Calendário (hoje: 5 out 2026)

Sem janela de datas, o ritmo é livre. Proposta, para não atropelar o Halloween:

| Datas | Trabalho |
|---|---|
| 5–23 out | Foco total no Halloween |
| 24 out – 7 nov | Só design: paleta, lista final de assets, **protótipo do halo numa flor** para medir desempenho cedo |
| 8–14 nov | Retrospetiva do Halloween; passos 1–5 |
| 15–28 nov | Arte principal e passos 6–12 |
| 29 nov – 5 dez | Passos 13–15 (testes completos) |
| ~6 dez | Publicação (data flexível) |

O protótipo do halo, feito cedo, mostra se a ideia aguenta o desempenho **antes** de investir na arte toda.

---

## 16. Publicação, monitorização e reversão

**Antes de publicar:** checklists da Secção 13 concluídas; capturas finais (tema ligado/desligado); diff final revisto; versão da cache atualizada.

**Depois:** abrir num dispositivo limpo e noutro com save antigo; confirmar aviso de atualização; testar o seletor e o desbloqueio; acompanhar feedback.

| Situação | Ação |
|---|---|
| O jogador não gosta | Seletor em "Padrão" |
| Bug visual grave | Nova versão com `PERMANENT_THEMES_ENABLED = false` |
| FPS baixo reportado | Ajustar `maxHalosAtivos`/pulso numa atualização; entretanto "Reduzir efeitos" |
| Problema com saves (não esperado) | Parar, reverter o commit da preferência, publicar versão anterior; os saves originais não foram alterados |
| Recurso em falta | Fallback automático ao visual normal |

---

## 17. Critérios de aceitação

1. Com o tema **Padrão**, o jogo é indistinguível da versão anterior.
2. Com o tema ligado, tem identidade clara de noite mágica luminosa, diferente do Halloween, e mantém o estilo cartoon atual.
3. Nenhum ID, lógica, economia ou save existente foi alterado, para além de uma preferência com defeito seguro.
4. Tudo funciona **offline** após a primeira carga.
5. Textos e etiquetas legíveis; canteiros com contraste; interações com as mesmas zonas.
6. Sem queda perceptível de desempenho em dispositivo modesto; efeitos desligáveis; fallback automático testado.
7. O brilho não é o único indicador de estado das flores.
8. Existe plano de reversão testado.

---

## 18. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Brilho em dezenas de flores pesa | FPS baixo | Halos pré-desenhados, só flores prontas, `maxHalosAtivos`, pulso global, fallback automático |
| Noite demasiado escura | Leitura pior | Overlay moderado, painéis claros, validação de contraste em cada passo |
| Brilho confunde estados das flores | Erros de jogo | Brilho nunca é o único indicador; manter sinais originais |
| Cores de brilho indistintas para daltónicos | Acessibilidade | Etiquetas dos canteiros mantidas; testar simulação de daltonismo |
| Sobreposição com temas de evento | Visual misturado | Prioridade explícita (escolha manual vence) e testes |
| Manifesto do Halloween com nomes fixos | Retrabalho | Generalizar no passo 2, com regressão |
| Desbloqueio mal desenhado | Frustração ou desigualdade | Opção A/B simples; nunca por moedas nem terrenos pagos |
| Cansaço de arte após o Halloween | Atraso | Versão mínima; reutilizar adereços e estrutura; sem data fixa |

---

## 19. Perguntas em aberto

1. O manifesto/resolvedor do Halloween é genérico por tema ou tem nomes fixos?
2. O motor permite desenhar sprites de halo por cima de cada flor com custo aceitável? (Validar com o protótipo.)
3. Desbloqueio: **A** (livre), **B** (nível) ou **C** (marco)?
4. O jogo tem áudio? (Se não, não introduzir.)
5. Qual é o orçamento de arte realista entre 15 e 28 nov?
6. Há uma plataforma/dispositivo mínimo a garantir (para calibrar `maxHalosAtivos`)?
7. Queres a variante clara "Alvorecer luminoso" desde o início ou só depois?

---

## Anexo — Outros temas diferenciados (alternativas)

| Tema | Identidade | Diferencial técnico |
|---|---|---|
| **Hanami** | Cerejeiras, pétalas a cair, rosa e verde-claro | Partículas de pétalas, folhagem rosa |
| **Feira de Outono** | Colheitas, folhas, banca de mercado | Variante de loja como banca |
| **Jardim Zen** | Pedras, areia riscada, bambu, tons calmos | Terreno com padrões e lanternas |
| **Estufa Vitoriana** | Ferro forjado, vidro, vapor, tons latão | Moldura de vidro e reflexos |
