# FloristEver — Update "Subsolo" (negócio secreto subterrâneo)

> **O que é:** um negócio secreto que se desbloqueia ao **nível 33**. Debaixo da floricultura existe um túnel de esgoto onde o jogador monta uma **plantação, uma sala de secagem e uma oficina de produção**. A venda faz-se **discretamente na loja de cima**, a clientes de roupa gasta que pedem em **código** e que **só o jogador pode atender**.
> **Como li o pedido:** o update **desbloqueia ao atingir o nível 33** e este documento planeia tudo desde esse momento. Se querias dizer "planeado ao longo dos níveis até chegar ao 33", diz-me (Secção 24).
> **Nota importante:** escrito **sem acesso ao código**. Nomes de ficheiros e chaves de save aparecem como **"a confirmar"**. Todos os números são **hipóteses "a validar"** com dados reais e com a simulação económica (Secção 12.9).
> **Nota de conteúdo:** o plano trata tudo como **mecânica de jogo abstrata e fictícia**. Não contém nem deve conter métodos reais de cultivo, secagem ou produção de nada. O produto tem **nome fictício** ("Erva Noturna") e o jogo **não mostra consumo**, só comércio.

---

## 0. Resumo executivo

| Item | Decisão |
|---|---|
| Desbloqueio | **Nível 33** + aceitação opcional (opt-in) + compra da concessão do túnel |
| Cena | **Subsolo = cena separada**; ao descer, o **mapa principal é descarregado** e só o subterrâneo fica visível |
| Entrada | Grelha de esgoto atrás da loja → **animação de descer** → túnel |
| Produção (subterrânea) | Cultivo → Colheita → Secagem → Preparação → Armazém Oculto |
| Venda (à superfície) | Clientes de roupa gasta pedem em **código**; só o **jogador** atende; entrega por **embalagem discreta** |
| Logística | **Mala** (levar o produto para cima) e **Cofre do balcão**; ajudante **Mensageiro** que **nunca vende** |
| Risco (opcional) | **Calor/Inspeção**: tensão leve e justa, **sem perder progresso**, **sem eventos offline** |
| Progressão própria | **Respeito do Subsolo** (S1–S20), com portões também por nível global |
| Economia | Margem alta por unidade, **procura limitada** pela venda discreta; **20–35%** do rendimento total no fim; nunca obrigatório |
| Segurança | Saves compatíveis, offline-first, kill-switch, **conteúdo desligável** |

### Pilares
1. **Duas vidas:** uma florista acolhedora por cima, um segredo por baixo.
2. **Discrição como jogo:** reconhecer códigos, embalar bem, gerir a atenção.
3. **Dois mundos, uma carteira:** tudo converge para as mesmas moedas.
4. **Tensão fofa:** o risco existe, mas o tom continua cartoon e nunca castiga o progresso.
5. **Opt-in e seguro:** quem não quer, nunca vê.

---

## 1. Tom, conteúdo e decisões que têm de ser tomadas primeiro

O FloristEver é um jogo **acolhedor**. Este update muda o tom, por isso há decisões de conteúdo **antes** de qualquer arte ou código.

### 1.1 Linhas vermelhas do design (recomendadas)
- **Sem consumo:** nunca mostrar uso, efeitos nem personagens a consumir.
- **Sem instruções reais:** etapas de produção são só temporizadores e recursos de jogo.
- **Planta e produto fictícios:** "Erva Noturna", com folha estilizada que não imite uma planta real.
- **Consequências leves e justas:** o risco gera atrito, não perda de progresso.
- **Tom de comédia sombria fofa:** estética cartoon, ratos simpáticos, humor.
- **Opt-in explícito**, desligável a qualquer momento, **desligado por defeito** até o jogador aceitar.

### 1.2 Duas variantes de tema (decisão tua)

| | **A. Como pediste** | **B. Contrabando de flores raras** |
|---|---|---|
| Produto | "Erva Noturna" (planta fictícia) | "Flores Proibidas" (variedades raras) |
| Código | Pedidos disfarçados em linguagem de jardim | Idem |
| Mecânicas | Idênticas | **Idênticas** |
| Risco de classificação etária / lojas | **Mais alto** | **Muito baixo** |
| Alinhamento com o tom do jogo | Mais contraste | Mais coerente |

**As mecânicas, a economia e a arquitetura são exatamente as mesmas nas duas variantes.** Só mudam nomes, textos e ícones (tudo em dados). Recomendo desenhar já com **nomes e textos em dados** para poderes trocar de A para B sem retrabalho.

### 1.3 Classificação e distribuição
- Conteúdo que retrate comércio de drogas costuma exigir **classificação etária mais alta** e pode **conflitar com regras de lojas de aplicações**. Se o jogo for distribuído em lojas, **confirma as regras e a classificação vigentes antes de avançar**. Se for só PWA por link, o risco é menor, mas o público pode incluir menores.
- **Mitigações incluídas no plano:** opt-in com confirmação de maturidade, defeito desligado, **"Modo discreto"** (esconde todo o conteúdo secreto), kill-switch global e a **Variante B** como alternativa.

---

## 2. Regras de segurança técnica (inegociáveis)

1. **Nenhum ID existente muda.** Todo o conteúdo novo usa IDs novos e estáveis.
2. **Com o update desligado ou recusado, o jogo é idêntico ao atual** (economia de flores/perfumaria intacta).
3. **Saves compatíveis:** campos novos ausentes → defeitos seguros; migração idempotente com **backup**; nunca descartar um save.
4. **Offline-first:** tudo local, tudo no pré-cache, tudo calculável por **timestamps**.
5. **Sem penalizações offline:** inspeções, perda de clientes e multas **só** acontecem com o jogador ativo.
6. **Nada se perde:** armazéns cheios pausam processos; nunca descartam itens.
7. **Sem becos sem saída:** existe sempre caminho de recuperação (Secção 12.7).
8. **Só o jogador vende o produto secreto:** nenhum ajudante, consultor ou automação o pode vender.
9. **Kill-switch:** `SUBSOLO_ENABLED` desliga tudo e **nunca** deixa o jogador preso no subsolo.
10. **Desempenho e acessibilidade** no mesmo patamar do jogo atual.
11. **Branch própria, commits pequenos, nunca mexer diretamente na principal.**

---

## 3. Dados necessários antes de fechar números

Pelo ecrã de referência: **7 flores**, **stock da loja 20 por flor**, **cesto de 10**, botões Melhorias/Loja/Ramos/Livro/Mapa, pílulas de estado, aviso de atualização (PWA). Preciso (ou o agente extrai do código):

| Dado | Para quê |
|---|---|
| **Rendimento médio por hora ativa ao nível 33 (H)** e a curva de XP 12→50 | Calibrar custos e recompensas |
| Nível máximo atual | Mapear níveis do Subsolo |
| Estado do update de Perfumaria quando este sair | Integrações e partilha de carteira |
| Como funcionam ajudantes e clientes quando o jogador está "ausente" | Regras de pausa da superfície |
| Como é gerido o Mapa e o motor de cenas (render, atlas, cache) | Descarregar o mapa principal |
| Sistema de embrulhos/ramos | "Embalagem discreta" |
| Formato do save, versão, migrações, cloud, pré-cache, resolvedor de temas | Compatibilidade |
| **Quantos jogadores chegam ao nível 33** | Decidir se o conteúdo é alcançável (Secção 24) |

---

## 4. Desbloqueio e narrativa: da chegada ao nível 33 à rede completa

### 4.1 Condições de entrada
1. Atingir o **nível 33**.
2. **Aceitar o conteúdo secreto** (opt-in) no primeiro aviso, ou mais tarde nas Definições.
3. Encontrar e usar a **grelha de esgoto** atrás da loja.
4. Pagar a **concessão do túnel** (investimento inicial, Secção 12.5).

Se o jogador recusar, **nada** do update aparece (nem grelha, nem clientes, nem textos).

### 4.2 Linha do tempo do jogador

| Ato | Quando | O que acontece | Duração estimada |
|---|---|---|---|
| **0. A carta** | Ao chegar ao nível 33 | Aviso discreto no fim do ecrã de nível: *"Conteúdo secreto disponível. Ativar?"*. Se aceitar, chega uma **carta anónima** (Livro): *"Há mais debaixo desta terra do que raízes. Procura a grelha atrás da loja."* | 2 min |
| **1. A descida** | Logo a seguir | A grelha ganha um brilho tímido. Ao tocar, confirmação *"Descer?"* e **animação de descida**. Lá em baixo, o **Corvo** (contacto) propõe alugar o túnel antigo | 10–15 min |
| **2. A montagem** | S1–S2 | Compras e primeira instalação: energia, água, 4 canteiros, 1 estendal, 1 bancada de preparação. **Pacote inicial** garante a primeira produção | 45–75 min |
| **3. O primeiro cliente** | S1–S2 | Na loja, um cliente de roupa gasta pede em código. Tutorial do **Caderno de Códigos**, da **Mala** e do **Cofre**. Primeira venda | 20–30 min |
| **4. A expansão** | S3–S5 | Mais secções, variedade 2, Mensageiro, embalagem discreta, clientes Regulares e contra-senhas | 6–10 h |
| **5. A rede** | S6–S10 | Qualidades ★, Calor/Inspeção, Atacadista, variedade 3, "Maço" e "Reserva" | 15–25 h |
| **6. O mestre** | S11–S20 | Automação, variedade 4, Secções 5+, vitrine de honra, estatuto final | 40–60 h |

### 4.3 O Corvo (contacto)
- Personagem recorrente, **voz seca e humorística**, aparece em momentos-chave (Atos 1, 3 e 5).
- Entrega os **ganchos narrativos**: novos códigos da estação, avisos de inspeção, convites a clientes especiais.
- Sem pressão: fala só quando o jogador entra no subsolo ou toca no Caderno.

### 4.4 Portões de progressão (Respeito + nível global)

| Nível do Subsolo | Nível global mínimo (hipótese) | Desbloqueia |
|---|---|---|
| **S1** | 33 | Secção 1, 4 canteiros, 1 estendal, preparação básica, armazém pequeno, Cofre pequeno, Caderno básico |
| **S2** | 33 | Gerador, produto **"Ramo"**, Mala (10) |
| **S3** | 34 | Secção 2, variedade 2, ventilação básica |
| **S4** | 34 | **Mensageiro**, embalagem discreta (disfarces) |
| **S5** | 35 | Clientes **Regulares**, contra-senhas |
| **S6** | 36 | Qualidade ★ completa, secagem controlada, produto **"Maço"** |
| **S7** | 36 | **Calor/Inspeção** (se ativo), filtros de ar, "Ramo de fachada" |
| **S8** | 37 | Secção 3, variedade 3 |
| **S10** | 39 | **Atacadista**, produto **"Reserva da Casa"** |
| **S12** | 41 | Automação (Jardineiro e Secador subterrâneos) |
| **S15** | 44 | Secção 5, variedade 4, vitrine de honra |
| **S20** | 50 | Estatuto final e cosméticos de topo |

(O dupla porta **Respeito + nível global** impede que as moedas acumuladas ao nível 33 queimem a progressão.)

---

## 5. Gestor de cenas: Superfície ↔ Subsolo

### 5.1 Estados
`SUPERFICIE → TRANSICAO_DESCER → SUBSOLO → TRANSICAO_SUBIR → SUPERFICIE`

### 5.2 Descer (sequência)
1. Toque na grelha → confirmação ("Descer?"). Entrada bloqueada se houver ação crítica a decorrer.
2. A personagem **caminha até à grelha**, levanta a tampa e **desce a escada** (3–4 frames), com **zoom** de câmara, **poeira** e **fade** para preto (~600 ms).
3. **Durante o fade:**
   - Parar o ciclo de render do mapa principal.
   - **Descarregar** o mundo visual (objetos de cena, atlas pesados), mantendo **só o estado lógico** em memória.
   - Carregar o atlas do subsolo e montar a cena.
4. Fade-in com a personagem a aterrar ao fundo da escada. Efeitos de som e luz de ambiente.

### 5.3 Subir (sequência inversa)
- Subir pela escada, fade, descarregar subsolo, **recarregar** o mapa principal, posicionar a personagem junto à grelha.
- **Meta de tempo** (dispositivo modesto): **≤ 2 s** por transição, com ecrã de carregamento leve e dica.

### 5.4 Regras de continuidade
| Situação | Regra |
|---|---|
| Superfície enquanto estás em baixo | Tratada como **"ausente"**: aplicam-se as **regras offline já existentes** do jogo (culturas crescem por timestamps; ajudantes e chegada de clientes em pausa) |
| Subsolo enquanto estás em cima | A produção **continua por timestamps** (cultivo, secagem, preparação) até aos limites de capacidade |
| Clientes secretos à espera | **Nunca desaparecem** enquanto estás em baixo (a paciência não corre) |
| Fechar a app no subsolo | Ao reabrir, **começa na superfície** (evita ficar preso se algo falhar) |
| Falha ao carregar uma cena | Mensagem clara, **retentar** ou **ficar onde está**; nunca ecrã preto sem saída |
| Saída de emergência | Botão que volta à superfície de forma segura, sem perder o save |
| Separador em segundo plano | Pausa de efeitos; timestamps asseguram a continuidade |

### 5.5 Aspetos técnicos
- **Duas cenas, um estado:** o estado lógico do jogo é partilhado; só a camada visual troca.
- **Debounce** de interação para evitar descer/subir várias vezes seguidas.
- **Teste de stress:** 100 transições seguidas sem fugas de memória nem corrupção de estado.
- **Pré-carregamento** do atlas do subsolo em segundo plano depois do desbloqueio (para offline e para ≤ 2 s).
- O mapa principal "descarregado" é uma **otimização e uma decisão de design** (isolamento visual); a regra de ausência garante coerência económica.

---

## 6. O Subsolo: lugares e infraestrutura

### 6.1 Ambiente
Túnel de esgoto **cartoon**, tijolo, canos, poças, lâmpadas fracas, ratos simpáticos, escadas de ferro. Plantas sob **lâmpadas de cultivo** em tons roxo-rosa para contraste com o ambiente escuro.

### 6.2 Zonas

| Zona | Função | Interação |
|---|---|---|
| **Escada de entrada** | Subir/descer | Toque: Subir |
| **Galeria principal** | Circulação | Navegação |
| **Sala de Cultivo** | Canteiros subterrâneos com lâmpadas | Plantar/colher |
| **Sala de Secagem** | Estendais/racks | Pendurar/recolher |
| **Oficina de Preparação** | Transforma em produtos (Ramo/Maço/Reserva) | Preparar |
| **Armazém Oculto** | Guarda o produto acabado | Painel de stock |
| **Sala de Controlo** | Energia, água, ar, Odor | Painel de recursos |
| **Quadro do Corvo** | Notícias e códigos da estação | Toque |
| **Saída de emergência** | Subir com segurança | Toque |

**Secções:** o túnel expande-se por **Secções** compradas (1 a 6), cada uma com novas áreas e mais espaço.

### 6.3 Recursos de infraestrutura

| Recurso | Fonte | Uso | Se faltar |
|---|---|---|---|
| **Energia** | Gerador (combustível, comprado com moedas) | Lâmpadas, secadores, oficina | Produção cai para **25%** (nunca zero) |
| **Água** | Reservatório e canos | Canteiros | Cresce a 25% |
| **Ar** | Ventilação e filtros | Reduz **Odor** | Aumenta Odor (e Calor) |

- **Degradação gradual:** nunca para tudo. Há sempre um mínimo de 25%.
- **Dínamo manual** de emergência: tocar para gerar energia por pouco tempo (anti soft-lock).

---

## 7. Cadeia de produção (abstrata)

```
SEMENTES ─► CULTIVO ─► COLHEITA ─► SECAGEM ─► PREPARAÇÃO ─► ARMAZÉM OCULTO
(compra)    (canteiros)  (folhas      (estendais)  (Ramo/Maço/    (stock)
                          frescas)                   Reserva)
```

### 7.1 Etapas (hipóteses; tempos são de jogo)

| Etapa | Entrada | Saída | Tempo base | Ação do jogador |
|---|---|---|---|---|
| **Cultivo** | Semente + Energia + Água | 6 folhas frescas por canteiro | 20 min | Plantar (1 toque); colher |
| **Secagem** | Folhas frescas | Folhas secas (1:1) | 10 min | Pendurar/recolher |
| **Preparação** | Folhas secas | Produto | 5 min por lote | Escolher produto/embalagem |

### 7.2 Produtos

| Produto | Folhas secas | Qualidade mínima | Preço de referência | Desbloqueio |
|---|---|---|---|---|
| **Ramo** | 2 | ★1 | 8u | S2 |
| **Maço** | 5 | ★3 | 25u | S6 |
| **Reserva da Casa** | 10 | ★4 | 60u | S10 |

(`u` = preço médio de uma flor pronta ao nível 33. **Todos os valores a validar.**)

### 7.3 Variedades (fictícias)
| Variedade | Tempo de cultivo | Rendimento | Odor | Desbloqueio |
|---|---|---|---|---|
| **Sombra Verde** | Normal | Normal | Médio | S1 |
| **Luar Roxo** | Mais lento | Mais alto | Baixo | S3 |
| **Âmbar Seco** | Rápido | Mais baixo | Médio | S8 |
| **Raiz Dourada** | Muito lento | Alto | Alto | S15 |

### 7.4 Qualidade (★1 a ★5)
Combina **variedade, regularidade dos recursos (energia/água/ar), tempo de secagem escolhido e cuidado na preparação**. Serve para **requisitos dos clientes** e preço.

### 7.5 Estados e mensagens
*A aguardar material · A crescer · Pronto a colher · A secar · Pronto a preparar · Armazém cheio · Sem combustível*. A pílula do subsolo agrega só o que pede atenção.

### 7.6 Automação (a partir de S12)
- **Jardineiro subterrâneo:** planta e colhe sozinho.
- **Secador automático:** pendura/recolhe.
- Fabrico guiado por **receitas guardadas** (variedade + produto + embalagem).
- **Nunca** automatizam a **venda**.

---

## 8. Logística entre os dois mundos: Mala, Cofre e Mensageiro

O produto vive no **Armazém Oculto** (subsolo), mas só se vende **em cima**.

| Peça | Local | Função |
|---|---|---|
| **Armazém Oculto** | Subsolo | Stock principal (capacidade grande) |
| **Mala** | Contigo | Transporta produtos de baixo para cima (capacidade pequena no início) |
| **Cofre do balcão** | Superfície, sob o balcão | Stock de venda (**capacidade limitada**; é o que os clientes veem) |
| **Mensageiro** | Ajudante | Leva produto do Armazém ao Cofre pelo túnel, **mas nunca vende** |

- **Fluxo manual:** encher Mala → subir → depositar no Cofre.
- **Fluxo automático (S4+):** o Mensageiro mantém o Cofre cheio até um **alvo configurável**.
- **Risco/benefício:** mais produto no Cofre = vendas mais rápidas, mas **mais Calor** (Secção 10). Incentiva "só o necessário".

---

## 9. A venda discreta: clientes em código

### 9.1 Como aparecem
- **Raramente**, entre os clientes normais da loja, **só com o jogador na superfície**.
- **Visual:** roupa **rasgada/remendada**, capuz, postura nervosa. Um pequeno **símbolo** no balão em vez de ícones de flores, e uma **pista sonora opcional** discreta (não só visual).
- **Só o jogador os vê como "especiais":** ajudantes, Consultores e automações **ignoram-nos por completo**. Não podem ser atendidos por nada além de uma **ação manual explícita** (toque longo ou duplo toque; alternativa por teclado).
- **Pedidos pendentes:** se o jogador estiver em baixo ou sem produto, **até N clientes ficam à espera** (patience não corre), para o regresso ser sempre recompensador.

### 9.2 O código
Cada pedido tem: **produto, quantidade, qualidade mínima e (às vezes) urgência**, tudo dito em **linguagem de jardim**. Exemplo de dicionário (fictício, a validar):

| Frase do cliente | Significado |
|---|---|
| *"Uma tulipa de domingo"* | 1× **Ramo** |
| *"O buquê do avô"* | 1× **Maço** |
| *"Algo do jardim da cave"* | 1× **Reserva da Casa** |
| *"Meia dúzia de pétalas"* | Quantidade **6** |
| *"Bem regada"* | Qualidade **★3+** |
| *"Ainda com orvalho"* | **Urgente** (bónus se servido já) |
| *"Sem espinhos"* | Variedade **Luar Roxo** |

- **Caderno de Códigos** (no Livro): o jogador consulta e **vai completando páginas** à medida que decodifica.
- **Dicionário da estação:** cerca de **1/3** das expressões muda **de duas em duas semanas** (determinístico, offline), para o jogo não ficar trivial. O Caderno atualiza.
- **Contra-senhas** (S5+): clientes de confiança dizem uma frase de abertura; o jogador escolhe **a resposta certa entre 3**. Errar não castiga: o cliente repete.
- **Pedir que repita** (grátis, mas reduz ligeiramente a gorjeta).

### 9.3 Modo de ajuda (acessibilidade)
- Opção **"Mostrar significado do código"**: mostra a tradução automaticamente, **sem penalização económica**. Garante acessibilidade para quem tem dificuldades de leitura ou de memória.

### 9.4 Tipos de cliente secreto

| Tipo | Procura | Notas |
|---|---|---|
| **Novato** | Ramo, quantidades pequenas | Desconfiado, paga bem pouco |
| **Regular** | Ramo/Maço, ★ média | Usa contra-senha; gorjetas |
| **Atacadista (S10)** | Grandes quantidades | Exige Respeito e estoque |
| **Curioso (isca, opcional)** | Fala parecido, mas **não é** cliente secreto | Servi-lo sobe o Calor; pede atenção |

### 9.5 Embalagem discreta
Cada venda inclui uma **escolha de disfarce**:
- **Saco de papel liso** (barato, disfarce fraco).
- **Ramo de fachada:** consome **flores normais** e dá o melhor disfarce (reduz mais Calor). **Liga o negócio secreto à floricultura.**
- **Caixa de chá / cesta:** meio-termo.
Pode ser **saltada** (sem disfarce): vende, mas sobe mais o Calor.

### 9.6 Resultado da venda
- **Correto** (produto, quantidade e qualidade certos): preço cheio + gorjeta + Respeito.
- **Quase certo:** vende mais barato.
- **Errado:** o cliente sai **sem penalização grave** (Respeito não desce abaixo do limiar do nível atual).

---

## 10. Calor e Inspeção (módulo opcional, decisão tua)

Camada de tensão **leve e justa**. Pode ser desligada em "Modo tranquilo".

### 10.1 Medidor de Calor (0–100)
| Fonte | Efeito |
|---|---|
| Cada venda | +2 (+2 se sem disfarce) |
| Stock no Cofre | +0.1/min por cada 10 doses |
| **Odor** alto ao subir com a Mala | +pontos |
| Servir um "Curioso" | +10 |

- **Descida natural:** −1/min **com o jogador ativo**. **Não corre offline.**

### 10.2 Limiares
| Calor | Estado | Efeito |
|---|---|---|
| 0–39 | Calmo | Normal |
| 40–69 | Atenção | Pequenos sinais (olhares de clientes) |
| 70–89 | Risco | A **Inspeção** pode aparecer |
| 90+ | Fiscalização | Aparece o **Fiscal** |

### 10.3 A Inspeção
- Aparece um **Fiscal** (personagem cartoon). O jogador tem uma janela generosa (ex.: **20 s**) para **"Ocultar o Cofre"** (um toque).
- **Se ocultar a tempo:** o Calor desce; pequena recompensa de Respeito.
- **Se falhar:** **multa limitada** (um pequeno % do rendimento/hora, com teto) e **vendas secretas bloqueadas 10 minutos**. **Nunca** se perde o Armazém, o save ou o progresso.
- **Nunca ocorre offline** e nunca com o jogador no subsolo.

### 10.4 Mitigações
- **Filtros de ar** e ventilação reduzem o Odor.
- **Ramo de fachada** e **disfarces melhores** reduzem Calor.
- **Integração com a Perfumaria (opcional):** perfumes consumíveis "mascaram" o Odor.
- **Modo tranquilo:** sem Calor nem Inspeções, com **−10%** nos preços para equilibrar.

---

## 11. Interface e experiência

### 11.1 Superfície
- **Grelha de esgoto** atrás da loja (discreta; só aparece com o conteúdo secreto ativo e desbloqueado).
- **Cofre do balcão** (pequeno ícone no balcão).
- **Pílula "Subsolo"** (opcional) junto às pílulas existentes, só com alertas relevantes.
- **Caderno de Códigos** no **Livro** (nova aba) e **Melhorias → Subsolo** (nova aba). Sem sobrecarregar o HUD.

### 11.2 No subsolo
- HUD adaptado: **moedas e XP** mantêm-se; **Energia/Água/Ar/Odor** em barras pequenas; botão **Subir**; **Respeito**.
- Painéis: Cultivo, Secagem, Preparação, Armazém, Mala, Melhorias, Contabilidade secreta, Caderno.

### 11.3 Princípios
- Máximo de **3 toques** para ações frequentes.
- Estados **sempre com texto/ícone**, nunca só cor.
- Painéis responsivos, ecrã pequeno vertical utilizável.
- Sem janelas empilhadas nem notificações em excesso.

### 11.4 Definições
- **Conteúdo secreto:** Ativo / Desativado.
- **Modo discreto:** esconde por completo grelha, clientes especiais, Caderno e textos, como se o update não existisse (útil para partilhar o ecrã).
- **Modo tranquilo:** sem Calor/Inspeção.
- **Ajuda de código:** mostrar significado.
- **Reduzir efeitos.**

---

## 12. Economia

### 12.1 Princípios
1. **Alta margem, procura limitada:** cada unidade vale muito, mas só se vende **à mão**, na superfície, a poucos clientes.
2. **Nunca obrigatório:** o conteúdo principal não depende deste update.
3. **Sem dominância:** o Subsolo nunca ultrapassa as outras empresas.
4. **Próxima compra a 20–40 min** de jogo ativo.
5. **Sem becos sem saída.**

### 12.2 Unidades
- **u** = preço médio de uma flor pronta ao nível 33.
- **H** = rendimento médio por hora de jogo ativo ao nível 33 (todas as empresas já desbloqueadas).

### 12.3 Preço de venda
```
preço = Pref(produto) × M_qualidade × M_código × M_urgência
              × M_respeito × M_disfarce × M_modo
```

| Multiplicador | Intervalo |
|---|---|
| M_qualidade (★1–5) | 0.85 a 1.30 |
| M_código (decifrou bem) | 0.85 / 1.00 / 1.10 |
| M_urgência | 1.00 / 1.15 |
| M_respeito | 1 + 0.02×(S−1), máx. 1.40 |
| M_disfarce | 1.00 (sem disfarce reduz o Calor, não o preço) |
| M_modo | 1.00 (ou 0.90 em Modo tranquilo) |

**Teto:** produto dos multiplicadores positivos ≤ **2.0** sobre a base.

### 12.4 Custos operacionais (sumidouros contínuos)
| Item | Custo (hipótese) |
|---|---|
| Sementes | ~0.5u por folha |
| Combustível | ~0.3u por folha |
| Água | ~0.1u por folha |
| Embalagem | 0.2u a 2u (ramo de fachada usa flores) |

**Custo por folha ≈ 0.9u**, contra um valor bruto de ~4–6u por folha (varia com o produto).

### 12.5 Investimento e melhorias (em H)

| Item | Custo |
|---|---|
| **Concessão do túnel (entrada)** | ≈ 8 H |
| Secção 2 / 3 / 4 / 5 / 6 | 4 H / 8 H / 16 H / 32 H / 64 H |
| Canteiros (4 → 16) | C0 0.5 H, g 1.5 |
| Lâmpadas e ventilação | C0 0.8 H, g 1.65 |
| Secadores (1 → 8) | C0 0.6 H, g 1.6 |
| Preparação (1 → 6) | C0 0.6 H, g 1.6 |
| Armazém Oculto (capacidade) | C0 0.4 H, g 1.5 |
| Mala (capacidade) | C0 0.3 H, g 1.5 |
| Cofre (capacidade) | C0 0.5 H, g 1.6 |
| Energia / Água | C0 1 H, g 1.7 |
| Filtros de ar | C0 0.8 H, g 1.65 |
| Mensageiro / Jardineiro / Secador (3 níveis cada) | C0 3 H, g 2.0 |
| Cosméticos (disfarces, decoração) | Pequenas taxas |

- **Custo total para 100%:** alvo ≈ **200 H**; tempo típico **80–120 h** de jogo ativo.
- **Relação com outras linhas (recomendação):** melhorias do Subsolo **≥ 1.5×** as equivalentes da Perfumaria no mesmo nível, **validada por script**.

### 12.6 Procura e capacidade

| Respeito | Clientes secretos/hora (ativo, superfície) | Pedido médio |
|---|---|---|
| S1–S2 | ~3 | 2 unidades |
| S5 | ~6 | 3 |
| S10 | ~10 | 4 |
| S15 | ~16 | 5 |
| S20 | ~24 | 6 |

- **Pedidos pendentes máx.:** 3 (S1) a 8 (S20).
- Como o jogador só vende em cima e a produção é em baixo, **a atenção é dividida** por natureza; a automação (Mensageiro, Jardineiro, Secador) reduz o tempo em baixo, **nunca** o de venda.

**Participação-alvo no rendimento total:** Subsolo **20–35%** em jogo completo; nunca > 45%; nunca < 12%.

### 12.7 Anti-paragem (soft-lock)
1. **Pacote inicial** (sementes, combustível, embalagens) na concessão.
2. **Degradação gradual** a 25% (nunca zero) sem energia/água.
3. **Dínamo manual** de emergência.
4. **Armazéns cheios pausam**, nunca descartam.
5. **Sem moedas?** O resto do jogo gera moedas; o Subsolo nunca é a única fonte.
6. **Sem clientes a pedir?** O produto fica em stock sem se estragar.
7. **Saída de emergência** sempre disponível.
8. **Mensagens de gargalo** claras ("Sem combustível", "Cofre vazio").

### 12.8 Anti-exploração
- **Só o jogador vende**; **nada** compra produto secreto; **sem arbitragem** com flores/perfumes.
- **Relógio:** atrasado → sem progresso; adiantado → só conclui o que estava em curso; **nunca cria material**. Nada de eventos de risco offline.
- **Teto de multiplicadores** e **saturação por tipo** de produto (vender o mesmo produto repetidamente baixa levemente a procura, recupera com o tempo).
- Validação: sem negativos, sem NaN, sem duplicação.
- **Números grandes:** formatação K/M/B/T, limites seguros, avaliar BigInt.

### 12.9 Simulação obrigatória (100 h)
Estratégias: **só superfície** (golden master igual ao atual), **tudo para o Subsolo**, **equilibrada**, **jogador mínimo**, **muito ativo**, **spam de um produto**.
**Critérios:** nenhuma estratégia > **1.5×** a equilibrada; Subsolo 20–35% do rendimento total em jogo completo; retorno da concessão em **10–15 h**; próxima compra ≤ 40 min.

### 12.10 Ajustes pós-lançamento
Todos os parâmetros em **tabelas de dados** para recalibrar sem tocar em lógica.

---

## 13. Arte e animações

### 13.1 Direção de arte
Cartoon do jogo, **mesmo traço de contorno**, mas **mais escuro e húmido**: tijolo, ferro, água turva, âmbar das lâmpadas e **roxo-rosa** das lâmpadas de cultivo. **Fofo, não sinistro.**

**Tokens de cor (a validar):** tijolo `#6B5A52`, água `#5E8C8A`, ferro `#3E4A52`, âmbar `#FFC857`, cultivo `#B56BFF`, contorno `#2A2F33`.

### 13.2 Assets

| Categoria | Assets |
|---|---|
| **Superfície** | Grelha de esgoto (fechada/aberta), Cofre do balcão, ícones |
| **Animação de descida/subida** | Personagem na escada (3–4 frames), poeira, tampa |
| **Túnel** | Tijolo, canos, poças, escadas, secções 1–6, lâmpadas, ratos |
| **Máquinas** | Canteiros, lâmpadas de cultivo, estendais, bancada, gerador, reservatório, filtros |
| **Produtos** | Folha fresca, folha seca, Ramo, Maço, Reserva, Mala, embalagens |
| **Personagens** | Jogadora com capacete e lanterna, **Corvo**, **clientes de roupa gasta** (4 variantes), **Fiscal**, ajudantes (Mensageiro, Jardineiro, Secador) |
| **Ícones** | Códigos, Calor, Odor, Respeito, qualidade ★ |
| **UI** | Molduras dos painéis, pílulas, barras |
| **Efeitos** | Poeira, vapor, gotas, brilho das lâmpadas |

**Integração com temas visuais:** todos os sprites passam pelo **resolvedor de temas** desde o início (para eventos poderem substituir elementos sem retrabalho). Cores via **tokens**.

---

## 14. Dados e saves

### 14.1 Estrutura nova (proposta, nomes a confirmar)
```
subsolo: {
  conteudoSecreto: { ativo: bool, consentimento: bool, modoDiscreto: bool, modoTranquilo: bool },
  desbloqueado: bool,
  concessao: bool,
  respeito: { nivel, xp },
  secoes: nivel,
  canteiros: [ { variedade, estado, inicioTs, duracaoMs } ],
  estendais: [ { folhas, inicioTs, duracaoMs } ],
  preparacao: [ { produto, qtd, inicioTs, duracaoMs, qualidade } ],
  armazemOculto: { <produtoId>: { qtd, qualidade } },
  mala: { ... },
  cofre: { <produtoId>: qtd },
  recursos: { energia, agua, combustivel, odor },
  melhorias: { <melhoriaId>: nivel },
  ajudantes: { mensageiro, jardineiro, secador },
  calor: { valor, ultimoTs },
  pedidosPendentes: [ ... ],
  caderno: { paginas: [...], versaoDicionario },
  saturacao: { <produtoId>: { nivel, ts } },
  razao: { horas: [...], totais: {...} }
}
```

### 14.2 Regras
- **`subsolo` ausente → "não desbloqueado"** sem erros. Nada é concedido automaticamente a quem já passou do nível 33; aparece o aviso de opt-in.
- `schemaVersion` incrementa uma vez; migração **idempotente** com **backup do save original**.
- **IDs estáveis e imutáveis** (variedades, produtos, melhorias, personagens).
- **Cloud (se existir):** fundir campos do subsolo sem sobrescrever progresso; em conflito, manter o mais avançado por campo.
- **Tamanho do save:** livro-razão em buckets agregados; histórico limitado.
- **Localização atual** não é guardada como estado persistente (arranca sempre na superfície).

### 14.3 Tempo e offline
- **Timestamps absolutos** para tudo o que tem duração.
- Relógio atrasado → sem progresso; adiantado → conclui só o que estava em curso.
- O Calor **não desce nem sobe offline**; **sem inspeções offline**.

---

## 15. Offline, PWA e pré-cache

- [ ] Assets, textos, dicionário, tabelas de economia e manifestos no pré-cache; **versão da cache** atualizada.
- [ ] Funciona em modo avião após a primeira carga, **incluindo** a descida e a subida.
- [ ] Atlas do subsolo **pré-carregado em segundo plano** depois do desbloqueio.
- [ ] Cenários: sem atualizar, atualiza antes/depois de desbloquear, atualiza com produção em curso.
- [ ] O aviso "Atualização disponível" mantém-se.

---

## 16. Desempenho

- Subsolo com **menos entidades** que a superfície; **culling** de tiles fora do ecrã.
- **Orçamento** de animações (lâmpadas, vapor, ratos) e opção "Reduzir efeitos".
- Motor **orientado a timestamps** (sem verificar tudo por frame).
- Transições ≤ **2 s** em dispositivo modesto; **sem fugas de memória** em transições repetidas.
- A cena descarregada **liberta memória** do mapa principal.

---

## 17. Acessibilidade

- Rato, teclado e toque em tudo; ecrã pequeno vertical.
- Clientes especiais identificáveis por **texto/ícone/som opcional**, não só por roupa ou cor.
- **Ajuda de código** sem penalização.
- Contraste verificado em painéis escuros do subsolo.
- Sem flashes; animações suaves; `prefers-reduced-motion` respeitado.
- Textos curtos, preparados para outros idiomas (o código tem de ser **localizado com cuidado**, não traduzido literalmente).

---

## 18. Plano de testes

**Isolamento:** com o update desligado/recusado/em modo discreto, o jogo é **idêntico** ao anterior (golden master da economia).

**Cenas:**
- [ ] Descer/subir em todos os estados (a meio de uma colheita, com cesto cheio, com cliente a atender).
- [ ] 100 transições seguidas: sem fuga de memória, sem corrupção.
- [ ] Falha forçada de carregamento: o jogador nunca fica preso.
- [ ] Fechar a app no subsolo → arranca na superfície, save intacto.

**Fluxo completo:** cultivar → secar → preparar → armazenar → mala → cofre → cliente em código → decifrar → embalar → vender → moedas.

**Regras especiais:**
- [ ] **Só o jogador vende:** ajudantes, Consultores e automações **nunca** atendem clientes secretos.
- [ ] Clientes secretos **não desaparecem** com o jogador em baixo.
- [ ] Calor/Inspeção: limiares, janela de 20 s, multa limitada, **nunca** offline.

**Saves:** 3 fixtures + **fixture nível 33 com saldo alto**; migração idempotente; backup; save sem `subsolo` → defeitos seguros.

**Tempo:** relógio atrasado/adiantado, mudança de fuso, 72 h offline com produção em curso.

**Soft-lock:** sem combustível, sem moedas, armazém cheio, cofre vazio, falha de cena.

**Economia:** simulação da Secção 12.9; validação automática de custos (Subsolo ≥ 1.5× Perfumaria equivalente).

**Conteúdo (script):** IDs únicos, custos finitos, assets presentes e no pré-cache, dicionário completo e localizável.

**Dispositivos:** desktop, telemóvel vertical, ecrã pequeno; sem erros novos na consola.

---

## 19. Roadmap em fases (cada fase termina com aprovação)

> Todas as fases usam **branch própria**, **feature flag** `SUBSOLO_ENABLED`, e relatório de fim de fase.

| Fase | Foco | Entrega | Critério de saída |
|---|---|---|---|
| **S0** | Auditoria + decisões de conteúdo + modelo económico | Documento de auditoria, decisão A/B, política de opt-in, simulador, fixtures | Decisões e números aprovados |
| **S1** | **Gestor de cenas** | Superfície ↔ Subsolo (vazio), animação, descarregar/recarregar mundo, saída de emergência, flag | 100 transições estáveis |
| **S2** | **Desbloqueio e narrativa** | Opt-in, nível 33, carta, grelha, concessão, Corvo, Secção 1, save/migração | Fixtures carregam; flag desliga tudo |
| **S3** | **Produção** | Cultivo, recursos, colheita, secagem, preparação, armazém, estados | Primeiro Ramo fabricado, offline-safe |
| **S4** | **Logística** | Mala, Cofre, Mensageiro, pedidos pendentes | Produto sobe e é guardado |
| **S5** | **Venda em código** | Clientes secretos, Caderno, dicionário, contra-senhas, embalagem discreta, Respeito, resultado de venda | Venda real a funcionar |
| **S6** | **Calor/Inspeção + integrações** | Calor, Fiscal, filtros, Modo tranquilo, Ramo de fachada, perfumes (se existirem) | Sem soft-locks |
| **S7** | **Progressão e economia completas** | Variedades, qualidades, Maço/Reserva, automação, melhorias, Atacadista, simulação | Critérios económicos cumpridos |
| **S8** | **Polimento e lançamento** | Tutorial, arte final, desempenho, acessibilidade, beta, publicação | Todos os critérios da Secção 22 |

---

## 20. Calendário (estimativa, hoje: 5 out 2026)

Estimativa para **uma pessoa com assistente de código**; ajustar à realidade.

| Período | Trabalho |
|---|---|
| Até ~mai 2027 | Halloween, temas e The Perfume Update (ordem a decidir) |
| Com folga | **S0** pode começar já em papel (decisões de conteúdo e modelo) |
| ~18–20 semanas de construção | S1 (2) · S2 (2) · S3 (3) · S4 (2) · S5 (3) · S6 (2) · S7 (3) · S8 (3) |
| **Lançamento sugerido** | **Verão/outono de 2027**, depois de beta |

Como o conteúdo só está disponível no **nível 33**, convém confirmar **quantos jogadores lá chegam** (Secção 24).

---

## 21. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| **Classificação etária / regras de lojas** | Bloqueio de distribuição | Opt-in, defeito desligado, Modo discreto, **Variante B**, confirmar regras antes |
| **Tom do jogo vs conteúdo** | Perda de identidade | Cartoon, comédia sombria fofa, sem consumo, desligável |
| **Descarregar o mundo principal** | Bugs, fugas de memória, jogador preso | Estado lógico separado, stress de 100 transições, saída de emergência, arrancar na superfície |
| **Exploração por tempo/relógio** | Vantagem injusta | Só conclui o que está em curso, nada offline |
| **Domínio económico** | Outras linhas deixam de importar | Procura limitada, tetos, saturação, quota-alvo 20–35%, simulação |
| **Tensão (Calor) demasiado punitiva** | Frustração | Multas com teto, nunca perde progresso, Modo tranquilo |
| **Código ilegível ou injusto** | Frustração/exclusão | Caderno, ajuda de código, dicionário rotativo moderado |
| **Poucos jogadores no nível 33** | Esforço sem retorno | Medir alcance antes; ajustar nível de desbloqueio |
| **Sobrecarga de arte** | Atrasos | Fases, reutilizar bases, versão mínima por fase |
| **Conflito com Perfumaria e temas** | Retrabalho | Resolvedor de temas e tokens desde o início; carteira única |

---

## 22. Critérios de aceitação finais

1. Com o conteúdo secreto desligado, recusado ou em Modo discreto, o jogo é **indistinguível** do anterior.
2. Nenhum save perdido ou corrompido; migração idempotente com backup.
3. **Descer/subir** funciona em todos os estados, **≤ 2 s**, com o mapa principal **descarregado** e sem fugas.
4. Ciclo completo **subsolo → cofre → cliente em código → venda → carteira** funciona **offline**.
5. **Só o jogador** pode vender o produto secreto (testado contra todas as automações).
6. Simulação económica cumpre os critérios (Secção 12.9).
7. **Zero soft-locks** nos cenários de teste.
8. Textos e painéis legíveis e acessíveis; ajuda de código disponível.
9. Tudo parametrizado por **dados**, com kill-switch testado.
10. Decisão de conteúdo (A/B), classificação e distribuição **confirmadas por ti** antes de publicar.

---

## 23. Mais à frente

- **Segunda zona do subsolo** (galerias novas, mais Secções).
- **Rivais** simulados offline e **leilões** de reservas raras.
- **Cruzamentos de variedades** (novas fictícias).
- **Missões do Corvo** com mini-arcos narrativos.
- **Coleção de códigos** e conquistas.
- **Integração com eventos sazonais** (códigos temáticos, disfarces de época).
- **Localização** completa do código desde o início.

---

## 24. Perguntas em aberto

1. **Interpretação do nível 33:** o update **desbloqueia no nível 33** (como assumi) ou queres que o **plano de progressão se estenda até chegar ao 33**?
2. **Variante A ou B** (planta fictícia vs flores raras)? E **onde vais distribuir** o jogo (PWA por link, lojas de apps)?
3. **Público:** o jogo é aberto a menores? (Define o rigor do opt-in.)
4. **Calor/Inspeção:** queres este módulo, ou só a venda em código?
5. **Quantos jogadores chegam ao nível 33** e qual é o nível máximo atual?
6. **Regras da superfície em "ausência":** como se comportam hoje ajudantes e clientes offline?
7. **Integração com a Perfumaria:** queres os perfumes a mascarar o Odor?
8. **Ramos como disfarce:** o sistema de ramos permite consumir flores para o "Ramo de fachada"?
9. **Nome do produto e do local:** "Erva Noturna" e "Subsolo" servem?
10. **Áudio:** existe? (Se não, não introduzir.)
11. **Ordem de entrega** face à Perfumaria e aos temas.
