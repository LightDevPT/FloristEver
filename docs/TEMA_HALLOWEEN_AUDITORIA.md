# Auditoria de implementação do sistema de temas

## Âmbito e baseline

- Aplicação auditada: FloristEver, fonte ativa em outubro de 2026.
- O diretório de trabalho não tem metadados Git; não é possível criar a branch recomendada sem inicializar/configurar um repositório. Não foi inicializado um repositório nem alterado o histórico.
- Baseline antes das alterações: `npm run validate` passou; `npm run test:game` passou (17 testes).
- A verificação visual foi feita no browser em ecrã desktop e móvel (390 × 844). As capturas foram usadas para inspeção nesta sessão, mas não foram guardadas como artefactos do projeto.

## Mapa confirmado

| Área | Ficheiro e comportamento |
|---|---|
| Loop, câmara, mundo, terreno, caminhos, cerca, placa, árvores e criaturas ambiente | `js/main.js`; `Game.render()` compõe o canvas em coordenadas do mundo. `renderTerrain`, `renderPaths`, `renderFieldFence`, `renderMapDecor`, `renderShopStockSign` e `renderDayNightOverlay` desenham as respetivas áreas. |
| Loja, jogador, clientes, flores, árvores e criaturas | `js/assets.js`; `AssetManager` desenha sprites vetoriais com Canvas 2D e suporta imagens personalizadas opcionais. |
| Flores em parcelas | `js/entities/field.js`; chama `assetManager.drawFlower()` mantendo os estados existentes de crescimento. |
| Jogadora | `js/entities/player.js` delega o desenho a `assetManager.drawPlayer()`. |
| Clientes | `js/entities/customer.js` delega cada sprite a `assetManager.drawCustomer()`; personagens e balões são desenhados na mesma chamada, mas em camadas Canvas internas. |
| HUD e menus responsivos | `index.html`, dentro de `#hud-menu-items`; `style.css` contém as regras dos botões, modais e breakpoints. O texto da interface está maioritariamente inline, não há um catálogo central de traduções identificado. |
| Definições e save | `js/main.js` configura as definições; `js/state.js` cria `settings`, serializa o objeto completo em `exportSaveData()` e combina settings antigos com defaults ao carregar. |
| Migração e proteção de save | `js/save-migrations.mjs`; saves antigos carregam sem exigir incremento de esquema. A preferência deve usar valor por omissão e nunca provocar reset/import parcial. |
| Chave local e backup | `floristever_save_v1` e `floristever_save_backup_v1`, em `js/state.js`. |
| Sincronização cloud | `js/ui/account.js`; sincroniza o save completo e resolve conflitos ao nível do save. Não existe sincronização isolada por campo. O sistema de temas limita-se a persistir a preferência na estrutura existente. |
| CSS/paleta | `style.css` define tokens CSS em `:root`; `js/utils.js` define `PALETTE` usada pela renderização vetorial. |
| Service worker e offline | `sw.js` mantém o cache `floristever-v33`; `scripts/build-web.js` gera a lista completa de pré-cache a partir de `dist`. Um novo módulo tem de ser incluído na build e a versão de cache incrementada. |
| Atualização PWA | O service worker gere a instalação/ativação e a versão da cache; o build mantém o fluxo atual de atualização da aplicação. |
| Desempenho/partículas | `js/main.js` atualiza/renderiza criaturas a cada frame; o tema deve evitar novos timers, não alterar o orçamento de partículas e omitir efeitos decorativos com a opção de reduzir efeitos. |
| Hitboxes e interação | As decorações são visuais; a interação usa coordenadas e limites existentes. Variantes de tema não podem modificar bounds, posições ou geometria de parcelas/interação. |

## Decisões de implementação

- Usar um resolvedor central com manifesto local para escolher o tema visual e resolver as datas; sem `if (halloween)` dispersos na lógica de jogo.
- O seletor apresenta **Automático**, **Halloween** e **Clássico**. Automático liga o tema de 24 de outubro a 7 de novembro, inclusive, no relógio local. Halloween permite pré-visualizar fora da janela; Clássico mantém o visual base.
- A troca é imediata, sem reiniciar o jogo. O tema afeta apenas desenho e variáveis CSS.
- Guardar apenas a preferência e a redução de efeitos em `settings`, mantendo os defaults compatíveis com saves existentes.
- Usar desenhos Canvas/CSS leves e locais, sem downloads em runtime. Por isso o tema permanece disponível offline depois da atualização; o precache continua a ser gerado pela build.
- Manter as paletas semânticas de estados (stock, aviso, sucesso/erro) e os balões/textos sobre fundos legíveis.
- Aplicar um kill-switch global no resolvedor; uma falha ou escolha inválida resulta no visual clássico.
- Não alterar IDs de jogo, economia, progressão, geometria de interação, esquema do save ou mecânicas.

## Limitações da auditoria

- O documento `HALLOWEEN_UPDATE.md` lista uma produção artística ampla. Esta implementação utiliza desenhos vetoriais simples existentes no Canvas, em vez de criar um atlas/ficheiros de imagem, para manter a build pequena e offline.
- Não foi possível criar uma branch porque a pasta não é um repositório Git.
- A troca automática foi verificada por testes de fronteira de data; a seleção, o save, o badge de evento, o layout móvel e o retorno imediato a Clássico/Automático foram verificados no browser.
