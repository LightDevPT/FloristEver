# FloristEver — "The Perfume Update"

> **O que é:** um grande update que acrescenta uma **segunda empresa dentro da floricultura**: a Perfumaria. O jogador desbloqueia-a por nível, compra um novo terreno com **boutique de perfumes** e **fábrica**, leva as suas flores até lá por **logística própria**, fabrica perfumes e vende-os, tudo na **mesma carteira**.
> **Nota de grafia:** assumi "Perfume" (e não "Perfum"). Diz-me se o título é mesmo "Perfum".
> **Nota importante:** este documento foi escrito **sem acesso ao código**. Nomes de ficheiros e chaves de save aparecem como **"a confirmar"**. **Todos os números são hipóteses de partida "a validar"** com os dados reais do jogo (Secção 3) e com a simulação económica (Secção 11.13).

---

## 0. Resumo executivo

| Item | Decisão |
|---|---|
| Natureza | Nova linha de negócio integrada, não um jogo à parte |
| Desbloqueio | Por **nível** + compra de **terreno** + **Prestígio da Perfumaria** (progressão própria) |
| Carteira | **Uma só** (moedas partilhadas) |
| Cadeia | Jardim → Doca → **Transporte** → Armazém → **Extração** → Laboratório → **Maturação** → Armazém de perfumes → **Boutique** |
| Mecânica central | **Pirâmide olfativa** (topo / coração / fundo) com harmonia, concentração e maturação |
| Gestão de flores | **Canteiros com destino** (Loja / Fábrica / Auto) e excedente que vai para a fábrica em vez de se perder |
| Economia | Perfumes rendem mais **por flor**, mas têm **limites de capacidade e procura**; melhorias da perfumaria custam **3× a 8×** as equivalentes das flores |
| Anti-paragem | Sem becos sem saída, sem perdas, sem punição por ausência, caminho mínimo sempre disponível |
| Segurança | Saves compatíveis, offline-first, tudo por dados, kill-switch |
| Entrega | **9 fases** com portões de aprovação (Secção 21) |

### Os 5 pilares
1. **Empresa dentro da empresa:** a Perfumaria tem o seu terreno, a sua boutique, os seus clientes, a sua progressão e a sua contabilidade, mas partilha a carteira.
2. **Cada flor conta:** cada flor tem carácter olfativo; escolher que flor vai para onde é uma decisão, não uma tarefa repetitiva.
3. **A paciência recompensa, nunca pune:** maturar mais tempo dá melhor perfume; ausentar-se nunca custa nada.
4. **Economia saudável:** sem estratégia dominante, sem inflação descontrolada, sem becos sem saída.
5. **Segurança primeiro:** nenhum save se perde, nenhum ID muda, funciona offline.

---

## 1. Fantasia do jogador e fluxo geral

**Fantasia:** de florista a **perfumista**. Planto, colho, destilo, componho, deixo maturar, dou nome, apresento na vitrine e vendo a quem procura exatamente aquele aroma.

```
JARDIM ──colheita──► CESTO ──depósito──► LOJA DE FLORES (stock 20 por flor)
  │                                          │ excedente (stock cheio)
  │  canteiros com destino "Fábrica"         ▼
  └──────────────────────────────────► DOCA DE CARGA / CAIXA DE REMESSA
                                             │  veículo (carrinho → carroça → carrinha)
                                             ▼
                                    ARMAZÉM DE MATÉRIA-PRIMA
                                             │  EXTRAÇÃO (destilação · maceração · absoluto)
                                             ▼
                                         ESSÊNCIAS
                                             │  LABORATÓRIO: pirâmide + base + frasco
                                             ▼
                                   CUBAS DE MATURAÇÃO (adega)
                                             │  engarrafamento
                                             ▼
                                 ARMAZÉM DE PERFUMES ──► BOUTIQUE ──► MOEDAS (mesma carteira)
```

---

## 2. O que torna este update único (mecânicas-assinatura)

| # | Mecânica | Porque é diferente de "mais um crafting" |
|---|---|---|
| 1 | **Pirâmide olfativa** (topo, coração, fundo) | Cada flor tem família e afinidade; a combinação cria uma **fragrância única** com harmonia |
| 2 | **Um método, uma camada** | A mesma flor rende notas diferentes conforme o método de extração (destilação, maceração, absoluto) |
| 3 | **Canteiros com destino** | Tu decides que canteiros alimentam a loja e quais alimentam a fábrica; o excedente da loja vai para a fábrica em vez de se desperdiçar |
| 4 | **Logística visível** | Veículos que percorrem a estrada, com capacidade, velocidade e rotas |
| 5 | **Maturação escolhida** | Curta, normal ou longa: mais espera = melhor qualidade, sempre seguro offline |
| 6 | **Assinatura própria** | Dás nome ao perfume, escolhes frasco e rótulo: viram a tua **marca** |
| 7 | **Consultoria olfativa** | Os clientes descrevem o que querem (família, intensidade, ocasião) e tu escolhes o perfume certo |
| 8 | **Tendências semanais** | Procura por família que muda de semana a semana (determinística, funciona offline) |
| 9 | **Saturação de mercado** | Vender sempre o mesmo perfume baixa o preço: incentiva variedade e criatividade |
| 10 | **Cestas-presente** | Ramo (já existente) + perfume + cartão: as duas empresas juntam-se |
| 11 | **Livro de Fragrâncias** | Coleção de composições descobertas, com "clássicos" a desbloquear |
| 12 | **Contabilidade com custo de oportunidade** | Vês quanto ganharias se vendesses as flores em vez de as transformar |
| 13 | **Mini-jogo de mistura (opcional)** | Equilíbrio tátil que melhora a qualidade; sempre com alternativa automática |
| 14 | **Edições limitadas sazonais** | Perfumes ligados aos temas visuais (Halloween, Corações, Luminoso) |

---

## 3. Dados necessários antes de fechar números

O jogo atual (pelo ecrã de referência) mostra: **7 flores** (margarida, tulipa, girassol, rosa, orquídea, lavanda, peónia), **nível 12**, **895K moedas**, **stock da loja 20 por flor (140 no total)**, **cesto de 10**, botões Melhorias, Loja, Ramos, Livro e Mapa, e pílulas de estado. Preciso (ou o agente tem de extrair do código) de:

| Dado | Para quê |
|---|---|
| Preço de venda, custo de semente, tempo de crescimento e nível de cada flor | Definir a unidade **u** (Secção 11.2) |
| Rendimento médio por hora ativa (**H**) nos níveis 10, 12, 15, 20 | Calibrar custos em múltiplos de H |
| Nível máximo atual e curva de XP | Escolher o nível de desbloqueio |
| Custo e efeito de todas as melhorias de flores | Garantir a regra "perfumaria > flores" (Secção 11.7) |
| Cadência de clientes na loja (chegadas por minuto) | Calibrar procura da boutique |
| Número de canteiros, ajudantes e como colhem | Calibrar o fluxo de flores para a fábrica |
| Como funciona o "Mapa" e a compra de terrenos | Colocar o novo terreno |
| Sistema de encomendas e clientes recorrentes (Fase 1 do plano de expansão) | Reutilizar em vez de duplicar |
| Formato do save, versão, migrações, cloud, pré-cache, resolvedor de temas | Compatibilidade |

**Observação:** com 895K moedas, um jogador de nível 12 pode comprar o terreno de imediato. Por isso o **portão não pode ser só moedas**: usa-se nível + Prestígio + tempo (maturação) para ritmar a progressão (Secção 4).

---

## 4. Desbloqueio e progressão

### 4.1 Portões de entrada
1. **Nível global ≥ L_u** (a decidir). Sugestão: o nível em que o jogador já tem as 7 flores desbloqueadas e pelo menos 2 expansões de stock. Se o nível 12 já cumprir, usar 12–15.
2. **Compra do terreno da Perfumaria** (investimento grande, Secção 11.7).
3. **Pré-requisito suave:** ter pelo menos X canteiros (a confirmar), para existir fluxo de flores sobrante.

### 4.2 Primeiros 5 minutos (onboarding)
1. Aviso não intrusivo: *"Nova oportunidade: Perfumaria"* (entrada no Livro, pílula, sem janela forçada).
2. Compra do terreno → câmara abre no novo terreno.
3. **Pacote inicial** (para garantir o primeiro lote sem bloquear): frascos simples, 1 base perfumante e 1 essência de cada camada.
4. Tutorial guiado em 5 passos, **saltável**: marcar canteiros → primeira remessa → extrair → misturar a primeira Colónia → vender na boutique.

### 4.3 Prestígio da Perfumaria (progressão própria)
Ganha-se com: lotes concluídos, fragrâncias novas descobertas, vendas, encomendas e marcos. **Nunca com moedas.**

| Nível | Desbloqueia |
|---|---|
| P1 | Fábrica base (1 alambique, 1 prensa de maceração, 1 cuba), carrinho, Colónia (2 camadas), 1 prateleira |
| P2 | Livro de Fragrâncias, Quadro de Tendências, 2.ª prateleira |
| P3 | **Câmara de Absoluto** (camada de fundo) → **Eau de Toilette** (3 camadas); frasco de cristal |
| P4 | Maturação normal e longa; 2.ª cuba |
| P5 | Encomendas de clientes recorrentes de perfumaria |
| P6 | Carroça; rotas por flor |
| P7 | **Eau de Parfum**; Operador de fábrica (automação) |
| P8 | Vitrine premium; gestão de preços |
| P10 | **Parfum Extrait**; edições limitadas; reserva especial |
| P12 | Carrinha; cestas-presente |
| P15 | Marca própria avançada (rótulos e frascos personalizados) |
| P20 | Vitrine de honra, estatuto "Maison", extras cosméticos finais |

---

## 5. O novo terreno e os edifícios

Novo terreno acessível pelo **Mapa**, ligado ao jardim por uma **estrada** (cosmética e funcional para os veículos). Posição, tamanho e acesso: a confirmar na auditoria.

| Edifício / zona | Função | Interação |
|---|---|---|
| **Boutique de Perfumes** | Venda a clientes, vitrine, prateleiras | Toque: atender; abre painel da boutique |
| **Fábrica** (edifício principal) | Extração, laboratório, maturação, engarrafamento | Toque nas estações |
| **Armazém de Matéria-Prima** | Guarda flores recebidas | Painel de stock de MP |
| **Doca de Carga** (no jardim) | Ponto de partida das remessas | Toque: enviar remessa |
| **Doca de Receção** (na fábrica) | Chegada das remessas | Automático |
| **Adega / Cubas de Maturação** | Lotes a maturar | Toque: ver estado/colher |
| **Fornecedor** (balcão) | Compra de frascos e base com moedas | Painel de compras |
| **Quadro de Tendências** | Mostra a procura da semana | Toque: ver |
| **Escritório (opcional)** | Painel da Empresa (Secção 10) | Toque: abre painel |
| **Jardim da boutique** | Decoração opcional | Cosmético |

**Regras de layout:** decorações nunca tapam zonas interativas; hitboxes claras; navegação por toque, rato e teclado.

---

## 6. Logística: levar as flores até à fábrica

### 6.1 Destino dos canteiros
Cada canteiro tem um **destino**:

| Destino | Efeito |
|---|---|
| **Loja** (defeito) | Comportamento atual |
| **Fábrica** | A colheita deste canteiro é encaminhada para a Doca |
| **Auto** | Vai para a loja; **o excedente** (stock cheio) segue para a Doca |

- Marcador visual discreto no canteiro (ícone + texto, não só cor).
- **Opção global "Excedente vai para a fábrica"** (ligada por defeito depois do desbloqueio): resolve desperdício de stock cheio.
- **Depósito inteligente:** ao depositar na loja, as flores com destino "Fábrica" seguem sozinhas para a Doca, sem obrigar o jogador a andar mais.

### 6.2 Doca e remessas
- **Caixa de Remessa** na Doca acumula flores (capacidade limitada, ex.: 60 no início).
- Quando um veículo está livre, parte **automaticamente** ou por toque ("Enviar agora").
- **Nada se perde:** se a Caixa estiver cheia, as flores ficam no cesto/stock da loja.
- O veículo percorre a estrada (animação por **interpolação de tempo**, não por simulação física) e descarrega no Armazém de MP. Se o Armazém estiver cheio, espera sem descartar nada.

### 6.3 Veículos

| Tier | Veículo | Capacidade | Viagem | Nº | Desbloqueio |
|---|---|---|---|---|---|
| T1 | Carrinho de mão | 20 | 60 s | 1 | P1 |
| T2 | Carroça | 60 | 45 s | 2 | P6 |
| T3 | Carrinha | 150 | 30 s | 3 | P12 |
| T4 | Carrinha elétrica | 400 | 25 s | 4 | P15+ |

Todos **a validar** e escaláveis por melhorias (capacidade, velocidade, número de veículos).

### 6.4 Rotas (a partir de P6)
- O jogador define **prioridades por flor** ("levar primeiro rosas"), **limiares** ("enviar quando houver ≥ 40") e **reserva de flores para a loja**.
- Defeito seguro: rota única, automática, sem configuração.

### 6.5 Transferência da loja para a fábrica
- Só por **destino/excedente**, ou por ação manual **"Transferir do stock da loja"**, que respeita uma **reserva mínima** para encomendas pendentes e pede confirmação.
- Sem compra/venda entre linhas (anti-arbitragem, Secção 11.11).

### 6.6 Frescura (bónus, nunca penalização)
- Flores entregues dentro da janela de frescura dão **até +10% de qualidade**. Passada a janela, **sem penalização** (qualidade base). Melhoria "Refrigeração" alarga a janela.

### 6.7 Ajudante "Estafeta"
- Automatiza o carregamento e a escolha de rotas, acelera a carga. Sem ordenados nem custos recorrentes (apenas contratação e melhorias).

### 6.8 Offline
- Remessas em curso calculam-se pelos **timestamps**: ao regressar, as que já chegaram descarregam-se. Sem produção "do nada": só se transporta o que já estava na Caixa.

---

## 7. A fábrica

### 7.1 Estações

| Estação | Faz | Entrada | Saída |
|---|---|---|---|
| **Armazém de MP** | Guarda flores | Remessas | Flores disponíveis |
| **Alambique** (destilação) | Extração **de topo** | Flores | Essência de topo |
| **Prensa de Maceração** | Extração **de coração** | Flores | Essência de coração |
| **Câmara de Absoluto** (P3) | Extração **de fundo** | Flores | Essência de fundo |
| **Laboratório** | Composição da pirâmide | Essências + base | Lote por maturar |
| **Cubas de Maturação** | Maturação | Lote | Lote maturado |
| **Engarrafadora** | Enche e rotula | Lote + frascos | Perfumes |
| **Armazém de Perfumes** | Guarda produto final | Perfumes | Stock para a boutique |

### 7.2 Essências
- **21 essências** (7 flores × 3 métodos), cada uma com um ícone-frasco simples e uma cor.
- Rendimento base **5 flores → 1 essência** (20%). Melhorias levam até **3 flores → 1** (33%).
- **Afinidade natural:** usar uma flor no seu método de afinidade dá **+10% de qualidade** (Secção 8.1).
- Qualquer flor serve qualquer camada (sem becos sem saída); só varia rendimento/qualidade.

### 7.3 Etapas e duração (início, a validar)

| Etapa | Duração base | Ação do jogador |
|---|---|---|
| Extração | 30 s por essência | 1 toque para iniciar (ou automático) |
| Composição | instantânea | Escolher flores/essências, base e frasco (ou "Repetir receita") |
| Maturação | ver Secção 8.4 | Escolher duração |
| Engarrafamento | 20 s por lote | Automático após maturação |

**Meta de "toques por lote":** ≤ 4 sem automação; 0 com Operador e receita guardada.

### 7.4 Capacidade e dimensionamento
- **Regra:** capacidade inicial de processamento ≈ **40%** do fluxo típico de flores do jogador; máximo com todas as melhorias ≈ **100%**. Assim a loja de flores nunca fica "sugada" e a fábrica cresce com o jogador.
- Slots iniciais: 1 alambique, 1 prensa, 1 cuba. Máximos: 6 extratores por tipo, 10 cubas (melhorias caras).

### 7.5 Receitas guardadas e automação
- **Receita guardada:** composição + base + frasco + maturação. Botão "Repetir".
- **Operador de fábrica** (P7): corre receitas guardadas quando há material. Sem material: **pausa** e mostra o gargalo (nunca falha em silêncio).

### 7.6 Estados e mensagens claras
Estados: *a aguardar material*, *em extração*, *em maturação*, *pronto*, *parado (armazém cheio / sem frascos)*. A pílula agregada (Secção 14) mostra **só o que precisa de atenção**.

---

## 8. O sistema olfativo

### 8.1 Dados olfativos por flor (proposta, "a validar")

| Flor | Família | Afinidade (método → camada) | Carácter |
|---|---|---|---|
| Margarida | Fresca | Destilação → Topo | Verde, limpa |
| Tulipa | Fresca | Destilação → Topo | Orvalho, aquosa |
| Lavanda | Aromática | Destilação → Topo | Calmante, herbal |
| Rosa | Floral | Maceração → Coração | Clássica, aveludada |
| Peónia | Floral | Maceração → Coração | Macia, delicada |
| Girassol | Solar | Maceração → Coração | Quente, mel e sementes |
| Orquídea | Exótica | Absoluto → Fundo | Profunda, baunilhada |

Isto é **dado novo por flor** (campos novos), **sem alterar IDs**. A validação de conteúdo exige que **toda a flor presente e futura** tenha ficha olfativa (Secção 23).

### 8.2 Pirâmide
- **Topo** (primeira impressão), **Coração** (corpo), **Fundo** (permanência).
- Colónia: **2 camadas** (topo + coração). Toilette e acima: **3 camadas**.
- Escolher essência de qualquer flor e método para cada camada.

### 8.3 Harmonia (0–100)
Cada par de famílias tem valor de compatibilidade (**a validar**):

| | Fresca | Aromática | Floral | Solar | Exótica |
|---|---|---|---|---|---|
| **Fresca** | +1 | +2 | +1 | 0 | −1 |
| **Aromática** | +2 | +1 | +2 | 0 | 0 |
| **Floral** | +1 | +2 | +1 | +1 | +2 |
| **Solar** | 0 | 0 | +1 | +1 | +2 |
| **Exótica** | −1 | 0 | +2 | +2 | 0 |

`harmonia = (soma dos 3 pares + 3) / 9 × 100` (a pirâmide tem 3 pares). Rótulos: **Desarmónico** (<35), **Equilibrado** (35–60), **Harmonioso** (60–85), **Sublime** (>85).
Combinações "más" **não são proibidas**; só valem menos (nunca há beco sem saída).

### 8.4 Concentrações (tiers) e maturação

| Tier | Camadas | Essências/lote | Frascos/lote | Maturação curta / normal / longa | Desbloqueio |
|---|---|---|---|---|---|
| **Colónia** | 2 | 2 | 6 | 2 min / 6 min / 15 min | P1 |
| **Eau de Toilette** | 3 | 6 | 6 | 15 min / 45 min / 2 h | P3 |
| **Eau de Parfum** | 3 | 9 | 6 | 1 h / 3 h / 8 h | P7 |
| **Parfum Extrait** | 3 | 15 | 6 | 4 h / 10 h / 24 h | P10 |

- Maturação **normal** e **longa** só a partir de P4.
- Bónus de valor: curta ×1.00, normal ×1.10, longa ×1.25.
- **Offline-safe:** a maturação continua sem o jogo aberto (timestamps). Nunca expira, nunca estraga.

### 8.5 Qualidade (★1 a ★5)
Combina harmonia, método de afinidade, maturação e frescura. Serve para **requisitos de encomendas** e prestígio. Exemplo de pontuação (a validar):
`pontos = harmonia×0.5 + afinidade×15 + maturação(0/10/20) + frescura×10`, depois limiares para ★.

### 8.6 Identidade, nomes e Livro de Fragrâncias
- **ID estável da fragrância** = chave da composição (ex.: `T:lavanda|C:rosa|F:orquidea`). Com 7 flores há **343 composições** possíveis de 3 camadas.
- **Nome automático** por padrão ("Eau de Toilette Lavanda & Rosa"); o jogador pode **renomear** (limite de caracteres, filtro básico) e escolher **frasco e rótulo**.
- **24 "Clássicos"** desenhados à mão (nome, arte, descrição curta, bónus pequeno) que se desbloqueiam ao acertar certas composições.
- **Livro de Fragrâncias:** coleção das descobertas (nome, pirâmide, família, melhor qualidade obtida). Marcos de coleção dão **cosméticos** e Prestígio.

### 8.7 Mini-jogo opcional "Mestre Perfumista"
- Equilíbrio tátil (arrastar gotas para manter a pirâmide equilibrada), **sem tempo limite**.
- Dá **+0 a +10 pontos de qualidade**. **Sempre** existe "Misturar automaticamente" com resultado base.
- Acessível por teclado e toque; alternativa sem destreza.

### 8.8 Preparado para o futuro
Novas flores (Fase 4 do plano de expansão) entram no sistema só preenchendo a **ficha olfativa** (família, afinidade, carácter). Sem tocar em código.

---

## 9. A boutique de perfumes (venda)

### 9.1 Stock, prateleiras e vitrine
- **Prateleiras:** slots para fragrâncias (início 6, até 24 com melhorias). Cada slot mostra frasco, nome, quantidade e preço.
- **Vitrine premium (P8):** 1 a 4 slots que **atraem mais clientes** e valorizam o perfume exposto.
- Limite de stock por fragrância (ex.: 12) para evitar acumulação infinita.
- **Não há perda:** excedentes ficam no Armazém de Perfumes.

### 9.2 Clientes da boutique

| Tipo | Procura | Notas |
|---|---|---|
| **Curioso** | Colónias e preços acessíveis | Muito frequente |
| **Entusiasta** | Famílias específicas | Tolera Toilette/Parfum |
| **Colecionador** | Raridade e qualidade ★4+ | Compra caro e pouco |
| **Presente** | Cestas-presente, embalagem | Liga ao sistema de Ramos |
| **VIP/Recorrente** | Pedidos especiais | Usa o sistema de encomendas |

### 9.3 Consultoria olfativa
Cada cliente mostra no balão **preferências** (ícones + texto): família, intensidade mínima, ocasião.
- O jogador (ou o **Consultor**) escolhe o perfume da prateleira.
- **Correspondência ≥ 70%:** venda a preço cheio + gorjeta.
- **Correspondência baixa:** o cliente compra, mas a preço reduzido, **ou** sai educadamente, **sem penalizar** reputação.
- Defeito automático: se o jogador não fizer nada, o cliente é atendido com a melhor opção (se existir Consultor).

### 9.4 Saturação de mercado
Cada venda de uma fragrância reduz temporariamente a procura dessa fragrância em ~3% (mínimo ×0.60) e recupera ~1% por minuto (calculado por timestamps, também offline). **Incentiva variedade**, impede spam de uma única receita.

### 9.5 Tendências semanais
- Todas as semanas, 1 a 2 famílias estão "em alta" (+25% procura) e 1 "em baixa" (−10%).
- **Determinístico** pelo número da semana (sem servidor, funciona offline, igual para todos).
- Mostradas no Quadro; nada obriga o jogador a seguir.

### 9.6 Gestão de preços (P8)
- Defeito: preço de referência do jogo.
- Opcional: controlo de **±20%** com curva de procura (mais caro → menos compradores). Ótimo ligeiramente acima da referência; nunca obrigatório.

### 9.7 Encomendas e clientes recorrentes
- **Reutilizar** o sistema de encomendas/clientes recorrentes da Fase 1 do plano de expansão (se já existir); senão, implementar primeiro a versão genérica.
- Exemplos de pedidos: *"Algo fresco para o verão, mínimo ★3"*, *"Um Parfum Extrait com fundo exótico"*.
- Recompensas: moedas, Prestígio, **frascos/rótulos exclusivos**, fragrâncias clássicas.
- **Nunca bloqueiam** a progressão; podem ser feitas em várias sessões.

### 9.8 Cestas-presente (P12)
- Combinação: **ramo** (bancada atual) + **perfume** + **cartão**.
- Valor = soma + bónus de ~15%. Disponíveis em encomendas e no balcão de presentes.
- É a ponte entre as duas empresas.

### 9.9 Cross-sell
Clientes da loja de flores podem perguntar por perfume (pequeno ícone) e levar o jogador à boutique. Efeito leve, sem pressão.

---

## 10. Gestão integrada: Painel da Empresa

Painel opcional (acessível pelo Escritório ou por uma aba existente) com **duas colunas**: Floricultura e Perfumaria.

| Secção | Conteúdo |
|---|---|
| **Resumo** | Receita da última hora/dia por empresa; stock; estado dos lotes |
| **Gargalos** | "A fábrica está parada: sem frascos" · "Armazém de MP cheio" · "Excedente de rosas" |
| **Prioridades** | Reserva mínima de flores para a loja; destino dos canteiros; transferência do excedente |
| **Contabilidade** | Receitas, custos (frascos, base), **valor das flores usadas** (custo de oportunidade), lucro líquido |
| **Metas** | Próxima melhoria alcançável e tempo estimado |

- A **carteira é uma só** (moedas globais no HUD). O painel mostra a **origem** das receitas.
- Livro-razão guardado em **buckets agregados** (por hora, últimas 72 h e totais), para o save não crescer.

---

## 11. Economia

### 11.1 Princípios
1. **Mais valor por flor, menos volume:** perfumes rendem mais por flor, mas são limitados por capacidade, tempo e procura.
2. **Sem estratégia dominante:** nenhuma linha (só flores, só perfumes) vence sempre.
3. **Sempre algo para comprar:** a próxima melhoria está ao alcance em **20–40 min de jogo ativo** durante todo o jogo.
4. **Sem becos sem saída:** nunca falta algo que o jogador não consiga obter.
5. **Custos crescem mais depressa do que o rendimento** (curvas geométricas), mas nunca ao ponto de travar.
6. **A Perfumaria não invalida a floricultura:** as melhorias e flores continuam relevantes.

### 11.2 Unidades de referência
- **u** = preço médio de venda de uma flor pronta ao nível de desbloqueio (média ponderada pelo mix típico).
- **H** = rendimento médio de **1 hora de jogo ativo** na floricultura ao nível de desbloqueio (moedas/hora).
Tudo abaixo está em **u** e **H** e converte-se em moedas depois de recolher os dados (Secção 3).

### 11.3 Retorno por flor (hipótese inicial)

| Tier | Flores/lote (rend. 20%) | Preço/frasco | Bruto/lote | Bruto por flor | Com rend. 33% e multiplicadores máx. |
|---|---|---|---|---|---|
| Colónia | 10 | 4.0u | 24u | 2.4× | ~5× |
| Toilette | 30 | 9.0u | 54u | 1.8× | ~4× |
| Parfum | 45 | 16.0u | 96u | 2.1× | ~5× |
| Extrait | 75 | 30.0u | 180u | 2.4× | ~6× |

(Colónia usa 2 camadas = 10 flores/lote; as restantes 3 camadas.)
**Faixas-alvo efetivas por flor, já líquidas de custos, saturação e procura:**
- Início (P1–P5): **1.5× a 2.5×**
- Meio (P6–P12): **3× a 4×**
- Fim (P15+): **5× a 7×**

### 11.4 Fórmula do preço de venda
```
preço = Pref(tier) × M_harmonia × M_maturação × M_método × M_frasco
              × M_prestígio × M_tendência × M_saturação × M_correspondência
```

| Multiplicador | Intervalo |
|---|---|
| M_harmonia | 0.85 a 1.25 |
| M_maturação | 1.00 / 1.10 / 1.25 |
| M_método (afinidade) | 1.00 a 1.10 |
| M_frasco | 1.00 / 1.15 / 1.35 |
| M_prestígio | 1 + 0.02×(P−1), máx. 1.40 |
| M_tendência | 0.90 / 1.00 / 1.25 |
| M_saturação | 0.60 a 1.00 |
| M_correspondência | 0.85 / 1.00 / 1.15 |

**Tetos (anti-descontrolo):** produto de harmonia × maturação × método ≤ **1.8**; produto total dos multiplicadores **positivos** ≤ **2.2** sobre a base.

### 11.5 Custos operacionais (sumidouro contínuo)

| Item | Custo por lote (hipótese) |
|---|---|
| Base perfumante | 1u (Colónia) a 3u (Extrait) |
| Frascos (×6) | Simples 0.5u / Cristal 1.5u / Premium 4u cada |
| Rótulo personalizado (cosmético) | Pequena taxa única por design |

- Comprados no **Fornecedor** com **moedas**, oferta **ilimitada** (sem beco sem saída).
- **Preço fixo**: nunca aumenta por hostilidade de design.

### 11.6 Investimento inicial (em H)

| Item | Custo |
|---|---|
| Terreno da Perfumaria | ≈ 6 H |
| Construção da Fábrica | ≈ 4 H |
| Construção da Boutique | ≈ 4 H |
| Doca, estrada e carrinho | ≈ 1 H |
| **Total** | **≈ 15 H** |

**Meta de retorno:** investimento inicial recuperado em **10 a 15 horas de jogo ativo**.

### 11.7 Melhorias (cada uma mais cara do que o equivalente em flores)

**Regra pedida:** *todo o produto de melhoria da Perfumaria custa mais do que o equivalente da floricultura.*

| Equivalente (flores) | Melhoria (perfumaria) | Fator mínimo |
|---|---|---|
| Expansão de stock da loja | Capacidade do Armazém de MP e prateleiras | ≥ 3× (níveis 1–3), ≥ 5× (4–6), ≥ 8× (7+) |
| Capacidade do cesto | Capacidade dos veículos | idem |
| Melhorias de crescimento/colheita | Velocidade e rendimento da fábrica | idem |
| Ajudante colheitador | Operador, Estafeta, Consultor | idem |

**Curva de custo:** `custo(n) = C0 × g^(n−1)`.

| Melhoria | Níveis | C0 | g | Efeito |
|---|---|---|---|---|
| Armazém de MP: capacidade | 10 | 0.3 H | 1.45 | +capacidade de flores |
| Veículos: capacidade | 10 | 0.4 H | 1.50 | +carga |
| Veículos: velocidade | 8 | 0.5 H | 1.55 | −tempo de viagem |
| Nº de veículos | 3 | 2 H / 6 H / 18 H | — | +1 veículo cada |
| Extratores (slots por método) | 5 | 1 H | 1.80 | +slots |
| Rendimento de extração | 6 | 1.5 H | 1.90 | 20% → 33% |
| Velocidade de extração | 8 | 0.6 H | 1.55 | −tempo |
| Cubas de maturação | 8 | 1 H | 1.70 | 2 → 10 cubas |
| Engarrafadora | 6 | 0.8 H | 1.60 | −tempo |
| Prateleiras da boutique | 6 | 0.8 H | 1.50 | 6 → 24 slots |
| Vitrine premium | 3 | 2 H | 2.00 | até 4 slots |
| Refrigeração (frescura) | 4 | 1.2 H | 1.70 | janela maior |
| Operador / Estafeta / Consultor | 3 níveis cada | 3 H | 2.00 | automação |

**Custo total para 100%:** alvo ≈ **150 H**; tempo típico até 100%: **60 a 100 h** de jogo ativo.
**Payback de cada melhoria:** 1–6 h no início, a subir até ≤ 12 h no fim, sempre com a **próxima compra a 20–40 min**.

### 11.8 Fontes e sumidouros

| Fontes de moedas | Sumidouros |
|---|---|
| Vendas de flores | Terreno e edifícios |
| Vendas de perfumes | Melhorias da Perfumaria |
| Encomendas (flores e perfumes) | Frascos e base (recorrente) |
| Cestas-presente | Cosméticos (rótulos, decoração) |
| Marcos (pequenas) | Melhorias das flores (já existentes) |

### 11.9 Evitar domínio e paragem
- **Saturação por fragrância** (Secção 9.4) → incentiva variedade.
- **Procura limitada:** procura média da boutique ≈ **70%** da capacidade da fábrica na mesma fase → o stock de perfumes acumula e a saturação atua; sobrar capacidade não gera lucro infinito.
- **Capacidade da fábrica ≈ 40% do fluxo de flores** no início (≈ 100% no fim) → a loja de flores continua a ser relevante.
- **Participação-alvo no rendimento total (jogo completo):** Perfumaria **40–60%**; nunca > 70%, nunca < 25%.
- **Reserva mínima da loja** protege os clientes de flores.

### 11.10 Regras anti-paragem (soft-lock)
1. **Caminho mínimo sempre disponível:** Colónia de 2 camadas, com qualquer flor, base e frascos simples compráveis com moedas.
2. **Pacote inicial** na entrada da Perfumaria.
3. **Nada se perde:** armazém cheio pausa o processo, nunca descarta.
4. **Cancelar lote** devolve 100% das essências antes de iniciar a maturação.
5. **Entrega rápida manual** (levar do cesto até à Doca) como alternativa a um veículo bloqueado.
6. **Sem moedas nem flores?** A floricultura continua intacta; as moedas voltam sempre pela loja de flores.
7. **Mensagens de gargalo** explicam o que falta.

### 11.11 Anti-exploração
- **Sem arbitragem:** não há compra de flores, venda de essências/frascos nem conversão perfume → flor.
- **Transferência** loja → fábrica só por destino/excedente ou por ação limitada com reserva.
- **Tempo do dispositivo:** relógio atrasado → sem progresso; relógio adiantado → conclui apenas **o que já estava em curso** (nunca cria material). A saturação recupera mais depressa; impacto baixo e aceite.
- **Validação de números:** sem negativos, sem NaN, sem duplicação de itens.

### 11.12 Números grandes
O jogo já mostra "895K". Com perfumes, valores sobem. Garantir:
- Formatação **K / M / B / T** consistente.
- Valores inteiros seguros (limite de segurança tipo `Number.MAX_SAFE_INTEGER`); teto de saturação definido; **avaliar BigInt** se necessário.
- Testes de arredondamento e de somas acumuladas.

### 11.13 Simulação económica (obrigatória antes de lançar)
Script que simula **100 h** de jogo com estratégias:

| Estratégia | O que testa |
|---|---|
| Só flores (golden master: **igual ao jogo atual**) | A economia de flores não mudou |
| Tudo para perfumes | Domínio |
| Equilibrada | Cenário-alvo |
| Jogador mínimo (offline) | Progresso sem pressão |
| Jogador muito ativo | Teto de ganhos |
| Spam de uma única receita | Saturação funciona |

**Critérios de aceitação:**
- Nenhuma estratégia > **1.5×** a melhor equilibrada.
- Perfumaria com **40–60%** do rendimento em jogo completo.
- Retorno do investimento inicial em **10–15 h**.
- A próxima melhoria nunca a mais de **40 min** de jogo ativo.
- Jogador offline progride, mas **menos** do que o ativo.

### 11.14 Ajustes depois do lançamento
Todos os parâmetros em **dados** (tabelas e manifestos) para recalibrar com uma atualização leve, sem mexer em lógica.

---

## 12. Mais à frente: preparar o terreno

Pensar já no que vem a seguir evita retrabalho:
- **Flores aromáticas exclusivas** (jasmim, alecrim, ylang...) entram via ficha olfativa.
- **Linhas derivadas** reutilizando essências e fábrica: velas, sabonetes, óleos de banho (Atelier).
- **Feira de Perfumaria** (evento sazonal) com edições limitadas.
- **Coleções de perfume ligadas aos temas visuais** (Halloween "Noir", Corações "Rosé", Luminoso "Lueur").
- **Concurso de perfumistas** (rivais simulados offline).
- **Leilão de edições raras** (mercado simulado, sem servidor).
- **Marca própria** com reputação e "Maison".
- **Localização** de textos desde o início.

---

## 13. Conteúdo de lançamento

| Categoria | Quantidade |
|---|---|
| Essências | 21 (7 flores × 3 métodos) |
| Tiers de concentração | 4 |
| Fragrâncias "Clássicas" | 24 |
| Frascos | 5 (simples, cristal, âmbar, esmaltado, edição) |
| Rótulos/estampas | 12 |
| Tipos de cliente da boutique | 5 |
| Clientes recorrentes de perfumaria | 8, com mini-arcos |
| Encomendas de perfumaria | ~30 |
| Melhorias | ~20 (Secção 11.7) |
| Veículos | 4 |
| Marcos/coleção | ~40 |
| Passos de tutorial | 5 principais + dicas contextuais |

---

## 14. Interface e experiência

### 14.1 Pontos de entrada (sem poluir o HUD)
- **Tocar nos edifícios** no mundo (fábrica, boutique, doca): painéis contextuais.
- **Abas novas** em painéis existentes: **Loja → Perfumaria** (terreno, frascos, base), **Melhorias → Perfumaria**, **Livro → Fragrâncias**.
- **Uma pílula agregada** "Perfumaria" junto às pílulas atuais, a mostrar só ações pendentes (ex.: "2 lotes prontos").
- **Mapa:** botão "Ir à Perfumaria" (viagem rápida).

### 14.2 Princípios de UX
- Máximo de **3 toques** para ações frequentes.
- Informação visível: o que falta, quanto tempo falta, o que rende.
- Painéis responsivos: ecrã pequeno vertical utilizável.
- Sem janelas empilhadas nem notificações em excesso.
- Estados **sempre com texto/ícone**, não só cor.

### 14.3 Feedback
- Animações breves e suaves: vapor no alambique, bolhas na maceração, frasco a encher, veículo a andar.
- Sons opcionais (se já existir áudio): borbulhar, vidro, sinal discreto de lote pronto.

---

## 15. Arte e integração com temas

**Estilo:** elegante e acolhedor, mantendo o cartoon atual: **cobre, latão, vidro, rosa-dourado, creme**, contorno escuro no mesmo traço do jogo.

**Integração com os temas visuais (Halloween, Luminoso, Corações):**
- Todos os sprites novos passam pelo **resolvedor de temas** desde o primeiro dia, para os temas poderem substituí-los sem retrabalho.
- Cores via **tokens**, nunca valores fixos.

| Categoria | Assets |
|---|---|
| Edifícios | Boutique, fábrica, armazéns, escritório, doca |
| Máquinas | Alambique, prensa, câmara de absoluto, cubas, engarrafadora (com 2–3 frames de animação) |
| Veículos | Carrinho, carroça, carrinha, elétrica (laterais + parado) |
| Terreno | Estrada, canteiros decorativos, cercas, árvores da zona |
| Itens | 21 essências, 5 frascos, 12 rótulos, base perfumante, caixa de remessa |
| Personagens | 5 tipos de cliente, 3 ajudantes (Estafeta, Operador, Consultor) |
| Ícones | Famílias olfativas, camadas, qualidade ★, estados |
| UI | Molduras de painel, pílula, barras de progresso |
| Efeitos | Vapor, bolhas, cintilar leve |

---

## 16. Dados e saves

### 16.1 Estrutura nova (proposta, nomes a confirmar)
```
perfumaria: {
  desbloqueada: bool,
  terrenoComprado: bool,
  edificios: { fabrica: nivel, boutique: nivel, ... },
  prestigio: { nivel, xp },
  armazemMP: { <florId>: qtd },
  caixaRemessa: { <florId>: qtd },
  veiculos: [ { tier, estado, partidaTs, chegadaTs, carga } ],
  essencias: { "<florId>:<metodo>": qtd },
  base: qtd,
  frascos: { <tipo>: qtd },
  lotes: [ { id, composicao, tier, fase, inicioTs, duracaoMs, qualidade, frasco, nomeProprio } ],
  armazemPerfumes: { <fragrancaId>: { qtd, qualidade } },
  boutique: { prateleiras: [...], vitrine: [...], precos: {...} },
  saturacao: { <fragrancaId>: { nivel, ts } },
  fragrancasDescobertas: [ <fragrancaId> ],
  receitasGuardadas: [ ... ],
  melhorias: { <melhoriaId>: nivel },
  ajudantes: { ... },
  destinoCanteiros: { <canteiroId>: "loja" | "fabrica" | "auto" },
  definicoes: { excedenteParaFabrica: bool, reservaLoja: {...} },
  razao: { horas: [...], totais: {...} }
}
```

### 16.2 Regras
- **Campo `perfumaria` ausente → "não desbloqueada"**, sem erros. Jogadores acima do nível de desbloqueio veem a oportunidade, **nada é concedido automaticamente**.
- `schemaVersion` incrementa **uma vez** para este update; migração **idempotente**, testada com as fixtures e com **backup do save original** antes de migrar.
- Falha de migração **nunca** descarta o save.
- IDs de fragrância, essência, melhoria, veículo e cliente são **estáveis e imutáveis**.
- Cloud (se existir): **mesclar** campos da perfumaria sem sobrescrever progresso; conflito → manter o mais avançado por campo, nunca descartar.
- Tamanho do save: limites e agregação (livro-razão em buckets; histórico limitado).

### 16.3 Tempo e offline
- Tudo o que tem duração guarda **timestamps absolutos** (início, fim).
- Ao carregar: calcular o que já concluiu; **relógio atrasado** → sem progresso, sem corrupção; **relógio adiantado** → conclui apenas o que estava em curso.
- Nenhum processo cria material sem consumir entradas.

---

## 17. Offline, PWA e pré-cache

- [ ] Todos os assets, textos, tabelas de economia e manifestos no pré-cache; **versão da cache** atualizada.
- [ ] Funciona em modo avião após a primeira carga, **incluindo** fábrica, boutique, remessas e maturações.
- [ ] Atlas da perfumaria carregado só quando o terreno é visitado/comprado; **pré-carregado em segundo plano** depois do desbloqueio para uso offline.
- [ ] Cenários: sem atualizar, atualiza antes/depois de desbloquear, atualiza com lotes em curso.
- [ ] O aviso "Atualização disponível" mantém-se; nada obriga a atualizar já.

---

## 18. Desempenho

- Motor **orientado a eventos por timestamp** (não verificar tudo a cada frame).
- Veículos animados por **interpolação**; máximo de entidades animadas simultâneas definido.
- Animações das máquinas: poucos frames, só quando visíveis.
- Atlas separados e leves; carregamento lazy.
- Limites: n.º de lotes, remessas e entradas de histórico.
- Medir FPS e memória em **dispositivo modesto** com a Perfumaria ativa; meta: sem queda perceptível.
- "Reduzir efeitos" desliga animações decorativas.

---

## 19. Acessibilidade

- Rato, teclado e toque em todos os painéis; ecrã pequeno vertical.
- Famílias olfativas e qualidade **com ícone + texto**, nunca só cor.
- Mini-jogo com alternativa automática e sem limite de tempo.
- Contraste verificado em painéis e etiquetas.
- Sem flashes; animações lentas e suaves; `prefers-reduced-motion` respeitado.
- Textos curtos, preparados para outros idiomas.

---

## 20. Plano de testes

**Regressão (Perfumaria não desbloqueada):** jogo **idêntico** ao anterior; golden master da economia de flores igual.

**Lógica:**
- [ ] Fórmulas de preço, tetos e saturação (testes unitários e de propriedade: nunca negativos, nunca NaN, tetos respeitados).
- [ ] Harmonia, qualidade, rendimento e custos.
- [ ] Todas as 343 composições calculam sem erro.

**Fluxo completo:**
- [ ] Marcar canteiro → remessa → extração → composição → maturação → boutique → venda.
- [ ] Armazéns cheios pausam sem perder itens; cancelar lote devolve essências.
- [ ] Reserva da loja protege clientes de flores.

**Saves:**
- [ ] As 3 fixtures + **fixture nível 12 com 895K moedas** carregam sem erro nem perda.
- [ ] Migração idempotente; backup criado; falha forçada não descarta o save.
- [ ] Save sem `perfumaria` → defeitos seguros.

**Tempo:**
- [ ] Relógio atrasado, adiantado, mudança de fuso, 72 h offline, lotes em curso ao fechar.

**Soft-lock:**
- [ ] Zero moedas, zero flores, armazéns cheios, veículo bloqueado: sempre existe caminho de saída.

**Economia:** simulação da Secção 11.13 com critérios cumpridos.

**Validação de conteúdo (script):**
- [ ] Toda flor tem ficha olfativa; IDs únicos; custos finitos e inteiros; relação de custo perfumaria ≥ k × flores; assets referenciados existem e estão no pré-cache.

**Offline/PWA e dispositivos:** modo avião, fluxo de atualização, desktop, telemóvel vertical, ecrã pequeno; sem erros novos na consola.

---

## 21. Roadmap em fases (cada fase termina com aprovação)

> Todas as fases usam **branch própria**, **feature flag** `PERFUMARIA_ENABLED` e relatório de fim de fase.

| Fase | Foco | Entrega | Critério de saída |
|---|---|---|---|
| **P0** | Auditoria + modelo económico | `AUDITORIA_PERFUMARIA.md`, tabela económica, simulador, fixtures, script de validação | Números aprovados; baseline verde |
| **P1** | Fundações | Desbloqueio, terreno, Prestígio, dados e save, migração, flag, ledger básico | Fixtures carregam; flag desliga tudo |
| **P2** | Logística | Destino dos canteiros, Doca, Caixa de Remessa, veículo T1, Armazém de MP | Remessa completa offline-safe |
| **P3** | Fábrica núcleo | Extração (2 métodos), Laboratório, Colónia, maturação curta, engarrafamento, frascos, base | Primeira Colónia fabricada e guardada |
| **P4** | Boutique | Stock, prateleiras, clientes, vendas, saturação, saldo na carteira | Venda real a funcionar |
| **P5** | Profundidade olfativa | Pirâmide completa, harmonia, tiers, absoluto, maturação normal/longa, qualidade, Livro de Fragrâncias | 343 composições OK |
| **P6** | Melhorias e automação | Todas as melhorias, veículos T2–T4, rotas, Operador, Estafeta, Consultor, receitas guardadas | Curvas de custo validadas |
| **P7** | Camada de gestão | Tendências, consultoria, encomendas, recorrentes, Painel da Empresa, cestas-presente, gestão de preços | Sem soft-locks |
| **P8** | Polimento e lançamento | Tutorial, mini-jogo, arte final, desempenho, acessibilidade, simulação final, publicação | Todos os critérios da Secção 24 |

**Beta controlado:** antes de lançar, jogar com os saves de teste e, se possível, com alguns jogadores reais, usando a flag para desligar rapidamente.

---

## 22. Calendário (estimativa; hoje: 5 out 2026)

Estimativa para **uma pessoa com assistente de código**; ajustar à realidade.

| Período | Trabalho |
|---|---|
| 5–23 out | Halloween em foco; **P0 só em papel** (dados, modelo económico) |
| 24 out – 7 nov | P0: recolha de dados, simulador, validação do modelo |
| 8 nov – ... | Retrospetiva do Halloween; **decidir a ordem** face ao Jardim dos Corações e ao Luminoso |
| ~21 semanas de construção | P1 (2) · P2 (3) · P3 (3) · P4 (3) · P5 (2) · P6 (2) · P7 (3) · P8 (3) |
| **Lançamento sugerido** | **Primavera de 2027 (abril–maio)**, depois de beta |

Sugestão: o **Jardim dos Corações** é mais barato e tem data natural (14 fev), por isso pode sair **antes**, durante P1–P2, sem bloquear o update grande.

---

## 23. Segurança e reversão

| Situação | Ação |
|---|---|
| Bug grave na Perfumaria | `PERFUMARIA_ENABLED = false` numa nova versão; os dados ficam guardados no save e não afetam o resto |
| Economia desequilibrada | Recalibrar **tabelas de dados** com atualização leve |
| Problema de migração (não esperado) | Reverter; o **backup do save original** permite recuperar |
| Recurso em falta | Fallback automático (nunca ecrã vazio) |

---

## 24. Critérios de aceitação finais

1. Sem Perfumaria desbloqueada, o jogo é **indistinguível** do anterior (economia de flores idêntica).
2. Nenhum save perdido ou corrompido; migração idempotente com backup.
3. Fluxo completo **jardim → fábrica → boutique → carteira** funcional **offline**.
4. Simulação económica cumpre os critérios (Secção 11.13).
5. Melhorias da Perfumaria **sempre mais caras** que as equivalentes das flores (validação automática).
6. **Zero soft-locks** nos cenários de teste.
7. Textos e painéis legíveis e acessíveis em ecrã pequeno; sem queda perceptível de desempenho.
8. Tudo parametrizado por **dados**, com kill-switch testado.
9. Novas flores futuras entram só com **ficha olfativa**.

---

## 25. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Economia desequilibrada | Jogo trivial ou travado | Modelo em u/H, simulação, tetos, saturação, dados recalibráveis |
| Complexidade excessiva | Jogadores perdidos | Defeitos seguros, automação, tutorial, caminho mínimo |
| Canibalização da floricultura | Loja de flores abandonada | Capacidade ≈ 40% do fluxo, reserva da loja, destinos por canteiro |
| Soft-lock por logística | Frustração | Entrega manual, nada se perde, mensagens de gargalo |
| Trabalho de arte enorme | Atrasos | Reutilizar bases, fases, versão mínima por fase |
| Tamanho do save | Lentidão | Buckets, limites e agregação |
| Números enormes | Erros de precisão | Formatação, limites, testes, avaliar BigInt |
| Manipulação do relógio | Vantagem injusta | Só conclui o que está em curso; nunca cria material |
| Conflito com temas visuais | Retrabalho | Resolvedor e tokens desde o início |
| Conflito de ordem de entrega | Sobrecarga | Decidir a ordem na retrospetiva do Halloween |

---

## 26. Perguntas em aberto

1. **Dados económicos:** podes dar-me (ou extraio do código) preços, custos, tempos e melhorias das flores?
2. **Nível de desbloqueio** L_u: qual é o nível máximo atual e o ritmo de XP?
3. **Terreno:** onde fica no Mapa e quantos terrenos já existem?
4. **Ajudantes atuais:** como colhem e qual o custo?
5. **Encomendas/recorrentes (Fase 1):** já estão implementados?
6. **Mini-jogo de mistura:** queres incluí-lo no lançamento ou depois?
7. **Marca própria:** nomes livres dos perfumes (com filtro) ou só nomes pré-definidos?
8. **Cestas-presente:** o sistema de Ramos permite acrescentar um item (perfume)?
9. **Áudio:** existe? (Se não, não introduzir.)
10. **Ordem:** Perfumaria antes ou depois dos temas Jardim dos Corações e Luminoso?
11. **Nome:** "The Perfume Update" ou "The Perfum Update"?
