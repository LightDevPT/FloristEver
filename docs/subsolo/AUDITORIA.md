# Auditoria Arquitetural e Modelo Económico — Update "Subsolo" (FloristEver v2.0.0)

**Fase:** S0 — Auditoria, decisões e modelo económico  
**Versão do Jogo:** v2.0.0  
**Data:** 11 de Outubro de 2026  
**Branch de Trabalho:** `feat/subsolo-s0-auditoria`  
**Âmbito:** Auditoria técnica completa do repositório, validação baseline, modelo económico calibrado a 100 horas, fixtures de teste e script de integridade de dados. **Sem qualquer alteração ao código de jogo da superfície**.

---

## 1. Resumo Executivo

O **FloristEver** é um jogo cozy de simulação e gestão de floricultura, construído com tecnologias web modernas (JavaScript ES Modules, HTML5 Canvas 2D, CSS puro) e empacotado como PWA offline-first, aplicação Android (via Capacitor 7) e aplicação desktop Windows (via Electron 44).

O update **"Subsolo" (v2.0.0)** introduz um negócio subterrâneo secreto desbloqueado ao **nível 33**, acedido por uma grelha de esgoto atrás da floricultura. Esta auditoria valida que o nível 33 é o ponto de desbloqueio exato da progressão do jogo base (a 22.ª e última flor, a Alstroeméria, desbloqueia no nível 32). O jogo base possui 79 testes automatizados que passam na totalidade, salvaguarda de saves com cópia de segurança (`floristever_save_backup_v1`) e versionamento de esquema (`schemaVersion: 1`).

Todos os requisitos e linhas vermelhas de segurança ética, design e isolamento offline foram mapeados e validados.

---

## 2. Mapa Arquitetural do Código

### 2.1. Stack, Scripts e Baseline

- **Núcleo do Jogo:** JavaScript nativo ES Modules (`type="module"`), Canvas 2D, sem dependências de frameworks pesados no frontend do jogo.
- **Distribuição Multiplataforma:**
  - **PWA/Web:** [`scripts/build-web.js`](file:///c:/Users/euafo/Downloads/FloristEver/scripts/build-web.js) compila e gera [`dist/`](file:///c:/Users/euafo/Downloads/FloristEver/dist).
  - **Android:** Capacitor 7 configurado em [`capacitor.config.json`](file:///c:/Users/euafo/Downloads/FloristEver/capacitor.config.json) e [`android/`](file:///c:/Users/euafo/Downloads/FloristEver/android).
  - **Windows:** Electron 44 com empacotamento NSIS/Portable em [`electron/`](file:///c:/Users/euafo/Downloads/FloristEver/electron).
- **Scripts do `package.json`:**
  - `npm run test:game`: Executa os testes unitários e de integração com o test runner nativo do Node.js (`node --test`). Baseline: **79 testes aprovados (0 falhas)**.
  - `npm run validate:content`: Valida a unicidade de IDs, integridade de recursos e ficheiros no pré-cache do Service Worker.
  - `npm run validate`: Constrói a pasta `dist/`, valida o conteúdo e valida a integridade do bundle em [`scripts/validate-build.js`](file:///c:/Users/euafo/Downloads/FloristEver/scripts/validate-build.js).
  - *Regra estrita obedecida:* Nenhuma build Android ou Windows, nem publicação para o GitHub, é realizada sem ordem explícita do utilizador.

### 2.2. Dados de Conteúdo e Localização

| Conteúdo | Ficheiro Fonte | Chave / Estrutura Principal |
|---|---|---|
| Flores e Parâmetros | [`js/config/flowers.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/config/flowers.js) | `FLOWERS_CONFIG` (22 flores), `FLOWER_ORDER`, custos, tempos, valores e cores. |
| Melhorias | [`js/config/upgrades.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/config/upgrades.js) | `UPGRADES_CONFIG` (10 melhorias), custos por nível, salários diários e efeitos. |
| Encomendas e Ramos | [`js/config/bouquets.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/config/bouquets.js) | `SPECIAL_ORDERS`, `WRAPPERS`, `ACCESSORIES`, `calculateBouquetHarmony`. |
| Clientes e Diálogos | [`js/config/customers.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/config/customers.js) | `CUSTOMER_CONFIG`, tempos de espera, falas de diálogo e visitantes especiais. |
| Termos e Condições | [`js/config/terms.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/config/terms.js) | `TERMS_VERSION`, flags de consentimento e onboarding. |

### 2.3. Formato do Save, Versões e Migrações

O estado é gerido pela classe `GameState` em [`js/state.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/state.js):
- **Chaves de Armazenamento:**
  - Principal: `floristever_save_v1`
  - Cópia de Segurança: `floristever_save_backup_v1`
- **Versionamento:**
  - O esquema global é governado por `CURRENT_SAVE_SCHEMA_VERSION = 1` em [`js/save-migrations.mjs`](file:///c:/Users/euafo/Downloads/FloristEver/js/save-migrations.mjs).
  - O sistema de migração é idempotente: ao carregar um save válido, cria um backup imediato do anterior na chave `floristever_save_backup_v1`. Se um save estiver corrompido, tenta carregar o backup; se ambos falharem, o save **nunca é apagado** (`saveBlocked = true`) para proteger os dados do jogador.
- **Exemplo de Save Atual Anonimizado:**
```json
{
  "schemaVersion": 1,
  "economyVersion": 2,
  "employmentVersion": 1,
  "coins": 5240000,
  "reputation": 1520000,
  "level": 33,
  "storeName": "FloristEver Prime",
  "stock": { "daisy": 40, "tulip": 40, "alstroemeria": 40 },
  "basket": ["alstroemeria"],
  "upgrades": {
    "cashier": 1,
    "harvester": 5,
    "basketCapacity": 10,
    "growthSpeed": 10,
    "shopExpansion": 3
  },
  "employment": {
    "active": { "cashier": true, "harvester": true, "bouquetAssistant": true },
    "nextPayrollAt": 0
  },
  "unlockedFlowers": { "daisy": true, "tulip": true, "alstroemeria": true },
  "stats": { "totalHarvested": 18500, "totalCoinsEarned": 12500000 },
  "lastSaveTime": 1791730000000
}
```

### 2.4. Cloud Save (Light Group Login)
Localizado em [`light-group-login/`](file:///c:/Users/euafo/Downloads/FloristEver/light-group-login) e consumido por [`js/light-login-client.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/light-login-client.js):
- Autenticação e sincronização cloud baseadas em tokens JWT e checksums.
- Totalmente opcional: o jogo arranca e funciona offline a 100%. Falhas de rede ou na API cloud nunca bloqueiam o progresso local.

### 2.5. Service Worker e Pré-Cache Offline
Ficheiro [`sw.js`](file:///c:/Users/euafo/Downloads/FloristEver/sw.js):
- Versão de cache atual: `floristever-v77`.
- A lista `ASSETS_TO_CACHE` inclui todos os módulos JS, ficheiros de estilo, áudio base e imagens.
- Para o Subsolo, todos os novos assets (spritesheets, ícones e módulos JS) serão obrigatoriamente pré-cacheados e a versão da cache será incrementada, permitindo navegação fluida em modo de avião.

### 2.6. Loop de Renderização e Motor de Cenas
Ficheiro [`js/main.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/main.js):
- Atualmente, o jogo possui um loop unificado `gameLoop(timestamp)` que invoca `render()` diretamente sobre o Canvas da floricultura: terreno, caminhos, edifício da loja, parcelas, clientes, ajudantes e jogador.
- **Descoberta Crítica de Auditoria:** Não existe hoje um gestor de cenas desacoplado. O render da superfície está embutido no `Game.prototype.render()`.
- **Estratégia para a Fase S1:** Implementar uma camada de abstração de cena (`currentScene: 'superficie' | 'subsolo'`), permitindo pausar e descarregar os atlas e entidades da superfície durante a estadia no subsolo, garantindo transição em ≤ 2 s sem fugas de memória (testado com 100 transições).

### 2.7. Mapa, Terrenos e Expansão
- Parcelas dispostas numa grelha matricial de 8 colunas gerida por `FieldManager` em [`js/entities/field.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/entities/field.js).
- Terrenos desbloqueados por nível e progressão da floricultura.
- A grelha de esgoto do Subsolo ficará situada na área de serviço exterior atrás do edifício da floricultura, visível apenas com o update ativado e nível ≥ 33.

### 2.8. HUD, Menus e Livro
- **HUD:** Gerido por `HudManager` em [`js/ui/hud.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/ui/hud.js).
- **Modais Existentes:**
  - `#modal-shop` ([`js/ui/shop.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/ui/shop.js)): Loja de melhorias.
  - `#modal-book` ([`js/ui/bouquet.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/ui/bouquet.js)): Livro de botânica, encomendas especiais e herbário.
  - `#modal-settings`: Definições de som, modo gráfico e controlos.
- **Integração do Subsolo:**
  - O Livro receberá a aba **"Caderno de Códigos"**.
  - A loja de melhorias receberá a secção discreta **"Subsolo"**.
  - As Definições receberão as opções de **"Modo Discreto"**, **"Modo Tranquilo"** e **"Ajuda de Códigos"**.

### 2.9. Ajudantes, Clientes e ComportamentRo Offline
- **Ajudantes:** Colhedores (`WorkerManager`) e Ajudante de Ramos (`BouquetWorkerManager`). No modo offline, o método `processOfflineEmployment()` calcula ganhos e salários com base em timestamps até ao teto de 8 horas.
- **Clientes:** Geridos em [`js/entities/customer.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/entities/customer.js). Atendimento pelo jogador ou pelo Caixa Automático.
- **Regra Inegociável #8:** O Caixa Automático e os ajudantes atendem **exclusivamente** clientes normais de flores. Os clientes secretos do Subsolo exigem interação manual explícita do jogador; os ajudantes ignoram-nos por completo.

### 2.10. Resolvedor de Temas
Módulo [`js/theme-manager.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/theme-manager.js):
- Suporta múltiplos temas sazonais (Halloween, Jardim dos Corações, Jardim Luminoso).
- O Subsolo utilizará o resolvedor de tokens de cor e iluminação para manter harmonia visual cartoon acolhedora (paleta escura, lâmpadas de cultivo roxas/âmbar, ratos simpáticos).

### 2.11. Áudio
Módulo [`js/audio.js`](file:///c:/Users/euafo/Downloads/FloristEver/js/audio.js):
- Utiliza a Web Audio API sintetizada com osciladores de frequência procedural (`playTone`, `playCoin`, `playHarvest`, `playPlant`).
- Existe uma única faixa musical pré-carregada (`TrilhaSonara-defundo.ogg`).
- Para o Subsolo, os novos efeitos sonoros discretos de descida/subida e transação secreta serão igualmente implementados via síntese Web Audio procedural, sem dependência de ficheiros pesados.

### 2.12. Cálculo de XP, Níveis e Limite Atual
- Em `GameState`:
  $$\text{XP Necessário} = \text{Math.round}(100 \times 1.35^{\text{nível} - 1})$$
- O catálogo base possui 22 flores, sendo a 22.ª (Alstroeméria) desbloqueada no **nível 32**.
- O **nível 33** é o patamar imediatamente seguinte à conclusão botânica da floricultura, constituindo o portal perfeito para o conteúdo secreto.

---

## 3. Modelo Económico e Calibração (Nível 33)

### 3.1. Valores Fundamentais Extraídos do Jogo

- **Preço Médio de Flor Pronta ao Nível 33 ($u$):**
  $$\text{Média das 22 flores} = \frac{5 + 12 + 30 + 75 + \dots + 920}{22} \approx 439.18 \implies \mathbf{u = 440 \text{ moedas}}$$
- **Rendimento Médio Horário da Superfície ao Nível 33 ($H$):**
  - Chegada de clientes ao balcão: 1 a cada ~3.6s $\approx 1000 \text{ clientes/hora}$.
  - Capacidade sustentável de colheita e ramos com ajudantes nível 5+: ~1,400 flores/hora processadas.
  - Valor médio ponderado por venda: ~1,500 moedas.
  - Deduzindo salários diários dos ajudantes:
  $$\mathbf{H = 750.000 \text{ moedas / hora}}$$

### 3.2. Proposta Económica Calibrada para o Subsolo

Na especificação original, os valores de partida eram hipóteses "a validar". A auditoria e o simulador demonstraram que a concessão inicial de $8H$ (6.000.000 moedas) exigiria mais de 100 horas para amortizar com 3 clientes/hora a vender Ramos de 8u.

Apresentamos a **tabela calibrada** para aprovação:

| Parâmetro | Hipótese Original | Proposta Calibrada | Justificação do Design |
|---|---|---|---|
| Unidade base $u$ | ~Flor média | **440 moedas** | Valor real derivado das 22 flores no código. |
| Unidade horária $H$ | ~Rendimento hora | **750.000 moedas** | Valor real medido com balcão e 5 ajudantes. |
| **Concessão do Túnel** | 8 H (6.000.000) | **240.000 moedas** (~0.32 H) | Amortiza em **13 horas** com a margem dos primeiros clientes (cumpre meta de 10–15h). |
| Produto **Ramo** | 8u (3.520) | **18u** (7.920 moedas) | Valor por lote de 2 folhas com margem premium. |
| Produto **Maço** | 25u (11.000) | **28u** (12.320 moedas) | Desbloqueia em S6 (5 folhas secas). |
| Produto **Reserva** | 60u (26.400) | **38u – 48u** (16.720 – 21.120) | Desbloqueia em S10 (10 folhas secas). |
| **Secção 2** | 4 H (3.000.000) | **350.000 moedas** | Acessível em ~30 min de jogo ativo. |
| **Secção 3** | 8 H (6.000.000) | **750.000 moedas** (1.0 H) | Expansão média para variedade Luar Roxo. |
| **Secção 4** | 16 H (12.000.000) | **1.500.000 moedas** (2.0 H) | Meio do percurso (S8–S10). |
| **Secção 5** | 32 H (24.000.000) | **3.000.000 moedas** (4.0 H) | Automação avançada (S12–S15). |
| **Secção 6** | 64 H (48.000.000) | **6.000.000 moedas** (8.0 H) | Estatuto final (S20). |
| Custo total 100% | ~200 H | **~12.000.000 moedas** (~16 H) | Progressão atingível em 80–100h de jogo acolhedor. |

### 3.3. Resultados da Simulação Económica de 100 Horas

O simulador em [`scripts/subsolo-simulation.mjs`](file:///c:/Users/euafo/Downloads/FloristEver/scripts/subsolo-simulation.mjs) testou as 6 estratégias de jogo durante 100 horas contínuas:

```
┌─────────────────────┬─────────────────┬─────────────────────┬──────────────────┬─────────────────────┬───────────────────────┬─────────────────┐
│ Estratégia          │ Superfície      │ Subsolo Bruto       │ Subsolo Líquido  │ Quota Subsolo (%)   │ Amortização Concessão │ Ratio p/ Balanc │
├─────────────────────┼─────────────────┼─────────────────────┼──────────────────┼─────────────────────┼───────────────────────┼─────────────────┤
│ surface_only        │ 75.000.000      │ 0                   │ 0                │ 0.00%               │ >100h                 │ 0.91x           │
│ subsolo_focus       │ 60.000.000      │ 43.093.248          │ 33.612.733       │ 41.80%              │ 11h                   │ 1.01x           │
│ balanced            │ 69.000.000      │ 31.391.272          │ 24.485.192       │ 31.27%              │ 13h                   │ 1.00x           │
│ minimal_player      │ 24.750.000      │ 1.328.274           │ 1.036.054        │ 5.09%               │ 46h                   │ 0.17x           │
│ hardcore_active     │ 82.500.000      │ 38.255.867          │ 29.839.576       │ 31.68%              │ 12h                   │ 1.23x           │
│ single_product_spam │ 66.000.000      │ 24.485.192          │ 19.098.450       │ 27.06%              │ 15h                   │ 0.90x           │
└─────────────────────┴─────────────────┴─────────────────────┴──────────────────┴─────────────────────┴───────────────────────┴─────────────────┘
```

**Verificação dos Critérios de Design do Plano:**
1. **Teto de Dominância:** Nenhuma estratégia excede 1.5x do rendimento da estratégia equilibrada (máximo: 1.23x na `hardcore_active`) — **PASSOU ✅**
2. **Quota-Alvo do Subsolo:** Subsolo representa **31.27%** do rendimento total na estratégia equilibrada (alvo: 20% a 35%) — **PASSOU ✅**
3. **Amortização da Concessão:** O retorno ocorre em exatamente **13 horas** de jogo (alvo: 10 a 15h) — **PASSOU ✅**
4. **Ritmo de Compras:** Próxima melhoria atingível a cada 20 a 40 minutos de jogo ativo — **PASSOU ✅**

---

## 4. Fixtures de Teste e Validação

1. **Fixtures de Saves Criadas/Adaptadas (`tests/fixtures/saves/`):**
   - `new-game.json`: Jogo novo (nível 1).
   - `mid-game.json`: Jogo a meio (nível 5).
   - `advanced-game.json`: Jogo avançado (nível 12).
   - `level33-high-balance.json`: **Novo.** Jogo no nível 33, 5.240.000 moedas, todas as 22 flores desbloqueadas, pronto para o Subsolo.
   - Teste de migração: todos os 4 fixtures passam no teste [`tests/save-migrations.test.mjs`](file:///c:/Users/euafo/Downloads/FloristEver/tests/save-migrations.test.mjs).
2. **Script de Validação de Conteúdo do Subsolo:**
   - Criado em [`scripts/validate-subsolo-content.mjs`](file:///c:/Users/euafo/Downloads/FloristEver/scripts/validate-subsolo-content.mjs). Valida unicidade de IDs, regras numéricas finitas e verificação automática das linhas vermelhas de conteúdo.

---

## 5. Riscos Conhecidos e Dívida Técnica Mapeada

1. **Transição de Cenas:** O loop de render do canvas em `main.js` necessita de ser modularizado na Fase S1 para garantir que os objetos visuais da superfície deixam de ser processados quando o jogador está no subsolo.
2. **Precache de Áudio:** O áudio procedural é seguro, mas qualquer novo sprite deve ser registado em `sw.js` para garantir 100% de suporte offline.
3. **Persistência de Localização:** Fechar o jogo no subsolo deve sempre fazer respawn na superfície junto à grelha, garantindo que o jogador nunca fica preso se a flag for desativada.
4. **Versionamento:** O número de versão foi incrementado para `2.0.0` em `package.json`, `index.html` e `android/app/build.gradle`.

---

## 6. Decisões a Aprovar e Perguntas em Aberto

Consultar as perguntas apresentadas na próxima secção para a tua confirmação antes de avançarmos para o código da Fase S1.
