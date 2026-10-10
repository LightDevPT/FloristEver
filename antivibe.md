## Sinais visuais

- Gradiente roxo-azul: O "default" universal — hero com gradiente violeta→azul sobre fundo escuro (quase sempre gray-900)
- Emojis como ícones: Em vez de um icon set, emojis soltos em headings, cards e sidebar
- Glassmorphism indiscriminado: backdrop-blur + borda translúcida em todos os cards, sem hierarquia
- Neon / glow em tudo: box-shadow colorido, animações de "pulse" ou "breathe" em cada elemento
- Cantos arredondados excessivos: border-radius: 9999px em botões, cards, inputs — tudo pill-shaped
- Fontes genéricas: Inter em tudo, ou Space Grotesk + Instrument Serif como par "moderno"
- Hierarquia tipográfica quebrada: Heading gigante (900) + body fino (300), espaçamento inconsistente
- Cards idênticos em grid: Toda seção é "3 cards com ícone + título + descrição" — sem variação
- Borda colorida à esquerda: Card ou blockquote com 3-4px de stripe colorido (roxo/azul)
- Status dots sem função: Bolinhas coloridas pulsando em labels que não representam estado real
- Tabs laterais multicoloridas: Cada bloco de conteúdo com uma barra colorida diferente, sem lógica   

## Sinais de copy / conteúdo

- Frase hero genérica: "Launch faster", "Build your dreams", "Create without limits"
- Em-dashes em excesso no hero ("Next-gen tool — for everyone — today")
- Testemunhos fake com nomes tipo "Sarah Chen", "John Smith"
- Lorem ipsum ou "Your headline here" ainda no ar
- Microcopy entusiasmada: "Let's Go!", "Awesome!", exclamações em todo estado de sucesso   


## Sinais de UX / interatividade

- Sem loading states — nada de skeleton, spinner ou progress
- Botões que não indicam progresso ao submeter
- Carrossel que não desliza, toggle que não toggle
- Hover states inconsistentes — alguns elementos têm, outros não
- Links que vão pra 404 (scaffold gerou a nav, mas só 2 páginas existem)
- Elementos com hover que sugerem clique mas não fazem nada   

## Sinais de acessibilidade / estrutura

- Sem alt em imagens
- Contraste ruim (texto cinza-claro sobre branco)
- Sem focus state visível ao navegar com Tab
- <div onClick> em vez de <button> ou <a>
- Múltiplos <h1> na mesma página   

## Sinais de "builder fingerprint"

- Badge no canto: "Built with v0", "Made in Bolt", "Edit with Lovable"
- Subdomínio padrão: *.lovable.app, *.bolt.new, *.v0.dev
- Scripts injetados pelo builder no <head>
- Favicon padrão do builder (não customizado)
- Arquivos de config do agente no repo: CLAUDE.md, .cursorrules, v0.config.ts   


## Sinais de "pretty but broken"

- Landing page polida, mas o produto é alpha
- Sem estados vazios (empty state), erro, offline
- Sem validação server-side nos forms
- Stack trace exposta no error message
- Chaves de API visíveis no client-side (network tab)
- Score Lighthouse de acessibilidade < 70 com visual "bonito"   