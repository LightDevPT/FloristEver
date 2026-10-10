# FloristEver — Tema de Halloween: alterações detalhadas e seguras

> **Âmbito:** visual de evento de Halloween (cosmético), por cima do jogo atual.
> **Não faz parte:** novas mecânicas, alterações de economia, novas flores, novos terrenos.
> **Nota importante:** este documento foi escrito sem acesso ao código. Os nomes de ficheiros, funções e chaves de save aparecem como **"a confirmar"**. A Secção 2 (auditoria) define como os confirmar antes de mexer em qualquer coisa.

---

## 0. Resumo executivo

| Item | Decisão |
|---|---|
| Natureza | 100% cosmética, reversível, opcional |
| Mecanismo | Camada de tema guiada por dados (manifesto) + resolução central de sprites/cores |
| Save | Só guarda a preferência do tema e cosméticos obtidos. Saves antigos não são migrados à força |
| Offline | Tudo no pré-cache; fallback para visual normal se faltar um recurso |
| Janela do evento | 24 out 2026 → 7 nov 2026 (relógio do dispositivo) |
| Publicação | Até 23 out, para dar tempo ao aviso "Atualização disponível" |
| Reversão | Interruptor do jogador + interruptor global no código + nova versão sem o tema |

---

## 1. Regras de segurança (inegociáveis)

1. **Nenhum ID existente é alterado.** Flores, encomendas, melhorias, clientes e decorações mantêm o ID. O tema só troca a *aparência*.
2. **Nenhuma lógica de jogo depende do tema.** Se o tema for removido do código, o jogo comporta-se igual.
3. **Sem `if (halloween)` espalhado.** Toda a decisão "visual normal ou do evento" passa por **um único ponto** (o resolvedor de tema).
4. **Fallback obrigatório.** Recurso do evento em falta ou erro de carregamento → usa o recurso normal. Nunca ecrã vazio, nunca exceção que pare o jogo.
5. **Saves:** nunca apagar nem reescrever progresso. Campos novos ausentes → valores predefinidos seguros. Nunca substituir o save por um estado vazio.
6. **Sem pressão:** sem login diário, sem contagem decrescente agressiva, sem energia, sem perda de nada obtido no fim do evento.
7. **Legibilidade antes de estética.** Etiquetas, stock, moedas, XP e balões de pedido têm de continuar legíveis com o tema ativo.
8. **Desempenho:** o tema não pode degradar visivelmente o jogo em dispositivos modestos. Efeitos desligáveis.
9. **Alterações pequenas e revisáveis:** uma branch, commits por tema de trabalho, sem refactors não relacionados.
10. **Nunca trabalhar diretamente na branch principal.** Nunca fazer force-push. Nunca apagar saves de teste.

---

## 2. Pré-requisitos e auditoria (antes de qualquer alteração)

### 2.1 Preparação
- [ ] Criar branch `feat/tema-halloween-2026`.
- [ ] Correr build, linter e testes atuais e registar o resultado (**baseline**).
- [ ] Guardar **3 saves de teste** só de leitura (jogo novo, meio de jogo, avançado — idealmente nível 12+ com stock e ajudantes), para validar que nada se perde.
- [ ] Tirar **capturas de ecrã de referência** do visual atual (desktop e telemóvel vertical) para comparar com o tema desligado.

### 2.2 Mapa do código (preencher e guardar em `docs/TEMA_HALLOWEEN_AUDITORIA.md`)
Identificar, com caminhos de ficheiro reais:

| O que localizar | Porquê |
|---|---|
| Como e onde são desenhados o mundo, o jardim, a loja, as árvores, a cerca, os caminhos | Para aplicar variantes visuais |
| Onde estão definidos sprites/atlas/imagens e como são carregados | Para criar o resolvedor de tema |
| Onde estão as cores/estilos (variáveis CSS, constantes, ficheiros de estilo) | Para a paleta do tema |
| Como são desenhadas as flores (por ID, por estado de crescimento) | Para as skins sazonais |
| Como são desenhados clientes e jogadora (sprite único ou camadas) | Para adereços como camada extra |
| Onde está o HUD (moedas, nível/XP, cesto, pílulas de estado, botões) | Para pílula de evento e enfeites |
| Onde estão as definições (settings) | Para o interruptor do tema |
| Formato do save, chave de armazenamento, versão do esquema, migrações | Para guardar a preferência com segurança |
| Service worker / lista de pré-cache / versão da cache | Para incluir os recursos do evento |
| Sistema de partículas/animações/loop de render | Para morcegos e luzes |
| Sistema de strings/textos (se existir) | Para os textos do evento |
| Aviso "Atualização disponível" e ciclo de atualização da PWA | Para planear a publicação |
| Sincronização cloud (se existir) | Para garantir que a preferência não gera conflitos |

### 2.3 Decisões a fechar antes de avançar
- [ ] Paleta final aprovada (Secção 5).
- [ ] Lista final de assets aprovada (Secção 7).
- [ ] Janela de datas confirmada (Secção 9).
- [ ] Se existe suporte para camadas em clientes (afeta a abordagem dos adereços).

**Critério de saída:** auditoria escrita e aprovada. Só então se escreve código.

---

## 3. Arquitetura do tema

### 3.1 Manifesto de tema (dados)
Criar um ficheiro de dados (local e nome a confirmar; sugestão: `themes/halloween_2026.json` ou módulo equivalente) com:

```
id:            "halloween_2026"
recorrencia:   { inicio: "10-24", fim: "11-07" }   // MM-DD, local, anual
paleta:        { ...tokens de cor (Secção 5) }
sprites:       { <idSpriteNormal>: <idSpriteHalloween>, ... }
camadas:       { cliente: [chapéuBruxa, lençol, orelhasGato, capa], jogadora: [chapéuBruxa] }
particulas:    { morcego, pirilampo, folha }  // com limites
textos:        { pilulaEvento, descricaoEvento, interruptor, ... }
audio:         opcional
```

### 3.2 Resolvedor de tema (ponto único)
Uma função/módulo central, por exemplo `resolveVisual(idNormal)`, que devolve:
- o recurso do tema, **se** o tema estiver ativo **e** o recurso existir e tiver carregado;
- caso contrário, o recurso normal.

Todos os pontos de desenho passam a chamar este resolvedor (em vez de referirem sprites diretamente), **apenas onde o tema tem substituição**.

### 3.3 Estado do tema
`temaAtivo = f(preferência do jogador, data atual, interruptor global)`:

| Preferência | Resultado |
|---|---|
| `auto` (por defeito) | Ativo só dentro da janela de datas |
| `ligado` | Ativo sempre (permite ver o tema fora de época) |
| `desligado` | Nunca ativo |

Interruptor global no código (constante `EVENT_THEMES_ENABLED`): se `false`, o tema nunca ativa. É o **kill-switch** de emergência para uma nova versão.

### 3.4 Mudança de tema em tempo real
Ativar/desativar o tema nas definições deve atualizar o visual **sem recarregar** o jogo, ou então pedir reinício de forma clara. Decidir na auditoria o que é mais seguro para o motor atual.

---

## 4. Alterações por área

### 4.1 Camada de atmosfera (maior efeito, menor custo)
- Overlay "entardecer" por cima do mundo: cor roxo-alaranjada, opacidade ~10–15%, modo de mistura multiplicar (ou equivalente).
- Vinheta suave nos cantos.
- **Não** cobrir o HUD (o overlay só afeta o mundo).
- Parâmetros de intensidade no manifesto, para ajustar sem mexer em código.

### 4.2 Paleta e tokens de cor
- Introduzir **tokens de cor** (variáveis CSS ou constantes) se os estilos atuais usarem cores fixas. Tema ligado/desligado troca o conjunto de tokens.
- Alterar apenas as zonas definidas na Secção 5. Não mexer em cores que codificam estado (ex.: indicadores de erro, aviso, sucesso) para não prejudicar a leitura.

### 4.3 Loja
- Toldo: variante laranja/roxo.
- Abóboras à entrada (2–3 sprites decorativos).
- Teias nos cantos do telhado.
- Guirlanda de luzes pequenas (animação leve, opcional).
- Garantir que **zona de clique/interação da loja não muda** (hitbox intacta).

### 4.4 Jardim
- Árvores: 2–3 variantes de folhagem (laranja, ocre, roxo), escolhidas de forma determinística por posição (para não "piscar" entre frames nem variar a cada carregamento).
- Cerca: variante com teias e velas pontuais.
- Caminhos: folhas caídas como decalques decorativos.
- Floreiras decorativas e bancos: mini abóboras e velas.
- Tabuleta "Stock da loja": lanterna ao lado.
- **Não** sobrepor decorações a zonas de plantio, colheita ou caminhos de navegação.

### 4.5 Vida ambiente
| Elemento | Substitui | Notas |
|---|---|---|
| Morcegos pequenos | Borboletas | Mesma trajetória/lógica, outro sprite |
| Pirilampos / luzes-fantasma | Abelhas | Movimento lento, brilho suave |
| Gato preto | — (novo, decorativo) | Parado num banco ou a passear devagar; sem colisão relevante |
| Folhas a cair | — (novo, opcional) | Poucas, baratas |

Limites: máx. ~10–15 partículas/entidades ambientais em simultâneo (ajustável no manifesto).

### 4.6 Personagens
- **Clientes:** camada de adereço sobreposta ao sprite base (chapéu de bruxa, lençol de fantasma, orelhas de gato, capa). Escolha determinística por cliente. Se o motor não suportar camadas, versões completas só para os modelos de cliente mais comuns.
- **Jogadora:** variante com chapéu de bruxa, mesma silhueta e hitbox.
- **Balões de pedido:** inalterados, para não confundir o jogador.

### 4.7 Flores (skins cosméticas, mesmos IDs)
| Flor | Variante proposta | Prioridade |
|---|---|---|
| Girassol | Centro com carinha de abóbora | Alta |
| Lavanda | Tom mais profundo com brilho roxo | Alta |
| Orquídea | Tom mais profundo com brilho roxo | Alta |
| Rosa | Vermelho-escuro, pétalas mais pontiagudas | Média |
| Margarida | Fantasminha minúsculo junto à planta | Baixa |
| Peónia | Teia ou detalhe discreto | Baixa |
| Tulipa | Laço laranja ou sem alteração | Baixa |

Regras: manter **todos os estados de crescimento** (semente, a crescer, madura) com a mesma leitura visual. Uma flor pronta tem de continuar a distinguir-se claramente de uma não pronta. Manter etiquetas dos canteiros iguais.

### 4.8 Interface (HUD e painéis)
- **Pílula "🎃 Evento de Halloween"** junto às pílulas de estado; ao tocar, abre explicação curta (o que é, que é opcional, até quando, como desligar). Visível só com tema ativo.
- **Botões do topo** (Melhorias, Loja, Ramos, Livro, Mapa, Definições): mesma forma e tamanho; só cor e, no máximo, um pequeno enfeite em 1–2 botões.
- **Ícones:** troca discreta de ícones apenas onde seja segura e legível.
- **Painéis** (livro, ramos, loja): moldura em creme mais quente e enfeite de canto, sem alterar o layout.
- **Aviso "Atualização disponível":** estilo atual mantido.
- **Definições:** novo controlo "Tema de Halloween" com 3 opções (Automático / Ligado / Desligado) e texto explicativo curto. Opcional: "Reduzir efeitos".
- Estado nunca indicado só por cor.

### 4.9 Áudio (opcional)
- Se existir áudio no jogo: uma faixa ambiente suave e/ou 1–2 efeitos (toque numa abóbora). Respeitar o volume/mute atuais. Se não existir áudio, **não introduzir**.

### 4.10 Conteúdo cosmético complementar (opcional, fase 2 do evento)
- Embrulhos e acessórios de Halloween na bancada de ramos (papel roxo, laço laranja, mini abóbora). Cosméticos, sem vantagem económica.
- Uma ou duas encomendas temáticas, com texto curto, **sem bloquear nada** e só com flores já acessíveis ao nível exigido.
- Decorações de época que ficam no inventário depois do evento.
- "Achados" opcionais (abóboras escondidas) com recompensa cosmética, nunca necessários.
- Qualquer item novo implica IDs estáveis novos e entrada no save (ver Secção 6).

---

## 5. Paleta proposta (a validar)

| Papel | Atual (aprox.) | Halloween |
|---|---|---|
| Relva | verde-menta claro | verde-azeitona/musgo suave `#9DB07A` |
| Contorno | verde-escuro | verde-ameixa `#33403A` |
| Destaque principal | rosa | laranja-abóbora `#F28A2E` |
| Destaque secundário | amarelo | roxo suave `#8E6BBF` |
| Luz / vela | — | amarelo-vela `#FFD36B` |
| Painéis | creme | creme quente / pergaminho |
| Overlay entardecer | — | roxo-alaranjado, 10–15% |

Validar **contraste de texto** (mínimo AA onde possível) sobre os novos fundos, e comparar lado a lado com as capturas de referência.

---

## 6. Dados e saves

### 6.1 O que se guarda (mínimo)
```
definicoes.temasEvento.halloween: "auto" | "ligado" | "desligado"   // defeito: "auto"
```
(nome e localização a confirmar na auditoria.)

Se houver cosméticos obtidos (Secção 4.10): lista de IDs estáveis no inventário de cosméticos existente ou novo campo com defeito vazio.

### 6.2 Regras
- Campo ausente (save antigo) → valor predefinido seguro (`auto`, lista vazia).
- Se o projeto tem `schemaVersion`: só incrementar se houver campo obrigatório novo; migração idempotente e testada com as 3 fixtures. Se não tem, **não introduzir migração só para isto** — ler com defeitos seguros.
- Não guardar "tema ativo" derivado (calcula-se por data a cada arranque).
- Sincronização cloud (se existir): a preferência não pode gerar conflito destrutivo; em caso de dúvida, última escrita ganha só para este campo, nunca para o progresso.
- Nunca apagar o save em caso de erro ao ler o campo novo.

---

## 7. Lista de assets (a produzir e a pré-carregar)

Convenção de nomes sugerida: `hw26_<categoria>_<nome>[_estado].png`. Manter o mesmo tamanho/âncora dos sprites normais que substituem.

| Categoria | Assets | Substitui/Novo |
|---|---|---|
| Loja | toldo, abóbora ×3, teia canto, guirlanda | Substitui toldo; novos |
| Árvores | 3 variantes de folhagem | Substitui |
| Cerca | variante com teia, vela | Substitui/novo |
| Floreiras/bancos | mini abóbora, vela | Novos |
| Tabuleta de stock | lanterna | Novo |
| Caminhos | decalques de folhas ×3 | Novos |
| Ambiente | morcego (2–3 frames), pirilampo, folha, gato preto | Substitui/novo |
| Clientes | adereços: chapéu bruxa, lençol, orelhas gato, capa | Camadas novas |
| Jogadora | chapéu bruxa | Variante |
| Flores | girassol, lavanda, orquídea (todos os estados) | Variantes |
| Flores (fase 2) | rosa, margarida, peónia, tulipa | Variantes |
| HUD | ícone da pílula, enfeites de botão | Novos |
| Painéis | moldura quente, enfeite de canto | Variantes |
| Overlay | gradiente/vinheta (pode ser gerado por código) | Novo |
| Cosméticos (opcional) | embrulhos, laços, decorações | Novos |

Cada asset: **formato leve**, otimizado, num atlas separado carregado só com tema ativo.

---

## 8. Offline, pré-cache e atualização (PWA)

- [ ] Todos os assets, textos e o manifesto do tema entram na lista de pré-cache.
- [ ] A **versão da cache** é atualizada, para forçar a renovação correta.
- [ ] Carregar o atlas do tema só quando o tema está ativo (ou em segundo plano, para estar disponível offline quando a data chegar).
- [ ] Confirmar que o jogo abre e funciona em modo avião após a primeira carga **com** o tema.
- [ ] Testar o cenário "jogador não atualizou": continua a jogar a versão antiga sem erros.
- [ ] Testar o cenário "atualiza durante a janela do evento" e "atualiza depois do fim".
- [ ] O aviso "Atualização disponível" mantém-se; nada obriga atualização imediata.

**Publicação:** até **23 out**, para a maioria dos jogadores ter tempo de atualizar antes de 24 out.

---

## 9. Lógica de datas

- Janela: **24 out → 7 nov**, em hora local do dispositivo, recorrente todos os anos (`MM-DD`).
- Comparação de datas feita **uma vez ao arrancar** e ao regressar à app (visibilidade), não em cada frame.
- Dispositivo offline: usa o relógio local, sem depender de servidor.
- **Relógio errado ou manipulado:** o pior caso permitido é ver o tema mais cedo/tarde. Nunca perder, bloquear ou alterar progresso.
- Fim do evento: o tema desliga em modo `auto`; tudo o que foi obtido (cosméticos) **permanece**.
- Testar: antes da janela, primeiro dia, meio, último dia, depois, mudança de ano, fuso horário, relógio adiantado/atrasado.

---

## 10. Desempenho

- Orçamento de partículas/entidades ambientais definido no manifesto.
- Animações leves (poucos frames, sem física).
- Respeitar `prefers-reduced-motion` e a opção "Reduzir efeitos" (desliga partículas e animações decorativas, mantém o visual estático).
- Atlas do tema pequeno; sem texturas gigantes.
- Medir FPS e memória com tema ligado vs. desligado num dispositivo modesto. Meta: sem queda perceptível.

---

## 11. Acessibilidade

- Contraste de texto verificado em todos os painéis e etiquetas com o tema ativo.
- Estado (pronto, bloqueado, comprado, ativo) com texto/ícone, não só cor.
- Interruptor do tema acessível por rato, teclado e toque.
- Pílula de evento e respetivo painel utilizáveis em ecrã pequeno vertical.
- Textos curtos, capazes de suportar outros comprimentos/idiomas.
- Efeitos de brilho/piscar suaves; nada de flashes rápidos.

---

## 12. Tutorial e textos

- Texto curto de apresentação do evento (na pílula): o que é, que é opcional, datas, como desligar.
- Nenhum texto de pressão (sem "última hipótese!", sem contagem agressiva).
- Se o tutorial atual descreve cores ou aparência (ex.: "o toldo rosa"), rever esses textos para não ficarem incoerentes com o tema ativo.
- Textos no ficheiro de dados/strings, nunca hardcoded na lógica.

---

## 13. Plano de testes

### 13.1 Regressão (tema DESLIGADO)
- [ ] Visual idêntico às capturas de referência.
- [ ] Ciclo principal intacto: cultivar → colher → depositar → vender → moedas/reputação.
- [ ] Encomendas, ramos, livro, loja de melhorias, ajudantes e stock funcionam como antes.

### 13.2 Tema LIGADO
- [ ] Todas as zonas do jardim e da loja mostram o visual do evento sem artefactos.
- [ ] Flores prontas distinguem-se claramente das não prontas.
- [ ] Etiquetas dos canteiros, stock, moedas, XP, cesto e balões legíveis.
- [ ] Hitboxes e interações (loja, canteiros, caminhos) iguais.
- [ ] Decorações não tapam zonas interativas.

### 13.3 Saves
- [ ] As 3 fixtures carregam sem erro e sem perda, com tema ligado e desligado.
- [ ] Save sem campos novos → defeitos seguros.
- [ ] Recarregar mantém a preferência do tema.
- [ ] Alternar a preferência várias vezes não corrompe nada.

### 13.4 Offline / PWA
- [ ] Modo avião após primeira carga: tema funciona.
- [ ] Pré-cache contém todos os assets (verificação automática, se possível).
- [ ] Fluxo de atualização testado (antes, durante, depois da janela).

### 13.5 Datas
- [ ] Todos os cenários da Secção 9.

### 13.6 Falhas controladas
- [ ] Remover manualmente um asset do tema → o jogo usa o normal e não falha.
- [ ] `EVENT_THEMES_ENABLED = false` → tema nunca ativa.
- [ ] Manifesto inválido → jogo arranca com visual normal e regista aviso.

### 13.7 Dispositivos
- [ ] Desktop (rato/teclado), telemóvel vertical (toque), ecrã pequeno.
- [ ] Navegadores/dispositivos mais usados pelos jogadores.
- [ ] Sem erros novos na consola.

---

## 14. Ordem de implementação (com pontos de verificação)

| # | Passo | Verificação ao fim |
|---|---|---|
| 1 | Auditoria + baseline + fixtures + capturas | Aprovada |
| 2 | Manifesto + resolvedor + estado do tema (sem assets ainda) | Tema desligado = jogo idêntico |
| 3 | Preferência nas definições + save com defeitos seguros | Fixtures carregam, preferência persiste |
| 4 | Lógica de datas + interruptor global | Testes de datas a passar |
| 5 | Overlay de entardecer + tokens de paleta | Legibilidade validada |
| 6 | Loja e árvores (maior impacto visual) | Comparação com referência |
| 7 | Floreiras, cerca, tabuleta, caminhos | Hitboxes intactas |
| 8 | Morcegos, pirilampos, gato + opção de reduzir efeitos | FPS e reduced-motion OK |
| 9 | HUD: pílula de evento, botões, painéis | Contraste e ecrã pequeno OK |
| 10 | Clientes e jogadora (adereços) | Silhuetas e balões intactos |
| 11 | Skins de flores (alta prioridade → baixa) | Estados de crescimento legíveis |
| 12 | Pré-cache + versão da cache | Teste offline OK |
| 13 | Textos/tutorial | Revisão |
| 14 | Testes completos (Secção 13) | Tudo ✅ |
| 15 | Publicação (até 23 out) | Verificação pós-publicação |
| 16 | (Opcional) Cosméticos, encomendas temáticas, achados | Nova ronda de validação |

**Versão mínima (se o tempo apertar):** passos 1–9 + abóboras/árvores/morcegos + pílula de evento + interruptor. O resto entra por ondas.

---

## 15. Calendário (hoje: 5 out 2026)

| Datas | Trabalho |
|---|---|
| 5–9 out | Passo 1 e decisões da Secção 2.3; arte: paleta e lista final |
| 10–16 out | Arte dos assets principais; passos 2–5 em paralelo |
| 17–21 out | Passos 6–12 |
| 22 out | Passos 13–14 (testes completos) |
| **23 out** | **Publicação** |
| 24 out | Início da janela do evento |
| 31 out | Halloween |
| 7 nov | Fim da janela |
| 8–14 nov | Retirar/arrumar: manter assets para o próximo ano; rever o que correu mal |

(Nota: este calendário corrige o anterior, que previa publicar a 26 out, depois do início da janela.)

---

## 16. Publicação, monitorização e reversão

### 16.1 Antes de publicar
- [ ] Todas as checklists da Secção 13 concluídas.
- [ ] Capturas de ecrã finais do tema ligado e desligado guardadas.
- [ ] Alterações revistas num diff final (só ficheiros esperados).
- [ ] Versão da cache atualizada.

### 16.2 Depois de publicar
- [ ] Abrir a versão publicada num dispositivo limpo e noutro com save antigo.
- [ ] Confirmar que o aviso de atualização aparece e que atualizar funciona.
- [ ] Verificar que o tema liga na data certa (simular data) e que o interruptor funciona.
- [ ] Acompanhar feedback voluntário e relatos de erros durante a janela.

### 16.3 Plano de reversão
| Situação | Ação |
|---|---|
| O jogador não gosta do tema | Interruptor "Desligado" nas definições |
| Bug visual grave | Publicar nova versão com `EVENT_THEMES_ENABLED = false` |
| Problema com saves (não esperado) | Parar, reverter o commit da preferência, publicar versão anterior; os saves originais não foram alterados por este tema |
| Recurso em falta | Fallback automático ao visual normal |

---

## 17. Critérios de aceitação finais

1. Com o tema **desligado**, o jogo é indistinguível da versão anterior.
2. Com o tema **ligado**, o jardim e a loja têm identidade clara de Halloween e mantêm o estilo cartoon atual.
3. Nenhum ID, lógica, economia ou save existente foi alterado, para além de uma preferência com valor predefinido seguro.
4. Tudo funciona **offline** após a primeira carga.
5. Todos os textos e etiquetas continuam **legíveis**; as interações têm as mesmas zonas.
6. Sem queda perceptível de desempenho; efeitos desligáveis.
7. O evento termina sem remover nada que o jogador tenha obtido.
8. Existe um caminho de **reversão** testado.

---

## 18. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Sprites referenciados diretamente em muitos sítios | Alterações espalhadas | Resolvedor central; introduzir só onde há substituição |
| Contraste fraco com a nova paleta | Perda de legibilidade | Validar contraste; manter cores de estado |
| Pré-cache incompleto | Tema quebra offline | Verificação automática da lista; teste em modo avião |
| Jogadores sem atualizar antes de 24 out | Não veem o tema | Publicar cedo; janela longa; não é obrigatório |
| Decorações a tapar zonas interativas | Frustração | Regra de não sobreposição; teste de hitboxes |
| Excesso de partículas | FPS baixo | Orçamento, reduzir efeitos, medir |
| Prazo apertado | Evento incompleto | Versão mínima definida; resto por ondas |
| Relógio do dispositivo errado | Tema fora de época | Aceitável; nunca afeta progresso |

---

## 19. Perguntas em aberto (responder na auditoria)

1. O motor suporta camadas (adereços sobre clientes) ou só sprites completos?
2. O jogo tem áudio? (Se não, não introduzir.)
3. Existe `schemaVersion`/sistema de migração, ou o save é lido com defeitos?
4. Há sincronização cloud? Como trata conflitos?
5. A troca de tema deve ser imediata ou exigir reinício?
6. Qual é o orçamento de arte (quantos assets são realistas até 17 out)?
7. Os textos do jogo estão centralizados ou espalhados?
8. Quais os dispositivos mínimos a suportar?
