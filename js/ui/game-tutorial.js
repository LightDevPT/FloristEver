import { getIcon } from '../icons.js';

const TUTORIAL_SEEN_KEY = 'floristever_game_tutorial_v1_completed';

const TOPICS = [
  {
    id: 'controls',
    title: 'Controlos',
    icon: 'player',
    summary: 'Move-te pelo jardim e interage com o balcão e os bancos.',
    steps: [
      { icon: 'player', title: 'Explora o jardim', text: 'No computador, usa W, A, S, D ou as setas. No telemóvel, arrasta o joystick virtual na direção em que queres andar.' },
      { icon: 'basket', title: 'Aproxima-te dos objetos', text: 'A colheita e o depósito de flores acontecem automaticamente quando estás suficientemente perto.' },
      { icon: 'check', title: 'Usa a ação quando aparece', text: 'Perto de um cliente ou banco, usa E ou Espaço no computador. No telemóvel, toca em “Clique em Agir”.' }
    ]
  },
  {
    id: 'harvest',
    title: 'Colher flores',
    icon: 'flower',
    summary: 'Flores maduras são colhidas ao passar perto delas.',
    steps: [
      { icon: 'flower', title: 'Encontra uma flor madura', text: 'Espera que a flor no canteiro esteja pronta para colher. O indicador do jardim também mostra quantas flores estão prontas.' },
      { icon: 'player', title: 'Passa por cima dela', text: 'Guia a personagem até perto da flor madura. A colheita é automática: não precisas de premir um botão.' },
      { icon: 'basket', title: 'Vê o cesto no HUD', text: 'Cada flor colhida entra no cesto. O contador mostra quantas levas e a capacidade máxima; quando enche, tens de o esvaziar no balcão.' }
    ]
  },
  {
    id: 'sales',
    title: 'Stock e vendas',
    icon: 'coin',
    summary: 'Abastece a loja e atende clientes para ganhar moedas e reputação.',
    steps: [
      { icon: 'basket', title: 'Leva as flores ao balcão', text: 'Aproxima-te do balcão de madeira com flores no cesto. As flores são transferidas automaticamente para o stock disponível da loja.' },
      { icon: 'book', title: 'Confere o pedido do cliente', text: 'Os clientes esperam junto ao balcão e pedem uma flor e uma quantidade. O indicador do jardim avisa se algum pedido não tem stock suficiente.' },
      { icon: 'coin', title: 'Conclui a venda', text: 'Com stock suficiente, aproxima-te e usa E ou Espaço; no telemóvel, toca em “Clique em Agir”. Recebes moedas e reputação. Um Caixa Automático atende por ti enquanto o contrato estiver ativo.' }
    ]
  },
  {
    id: 'upgrades',
    title: 'Melhorias',
    icon: 'upgrade',
    summary: 'Investe moedas em melhorias e automação para a floricultura.',
    steps: [
      { icon: 'upgrade', title: 'Abre “Melhorias”', text: 'No menu do HUD, escolhe Melhorias. Cada cartão explica o efeito, o custo, o nível atual e os requisitos para a próxima compra.' },
      { icon: 'sprout', title: 'Escolhe o que te ajuda', text: 'Aumenta o cesto, anda mais depressa, acelera o crescimento, amplia o stock ou melhora a reputação recebida nas vendas.' },
      { icon: 'cashier', title: 'Atenção aos contratos', text: 'O Caixa Automático e os Floristas Ajudantes automatizam tarefas, mas têm salários diários. Consulta o estado dos contratos e mantém moedas para os pagar.' }
    ]
  },
  {
    id: 'optional-store',
    title: 'Loja opcional',
    icon: 'shop',
    summary: 'Compra espaço de cultivo extra sem bloquear a progressão principal.',
    steps: [
      { icon: 'shop', title: 'Abre “Loja” no HUD', text: 'Esta loja apresenta terrenos extra para flores de que já tens pelo menos dois terrenos.' },
      { icon: 'flower', title: 'Escolhe um terreno extra', text: 'Cada opção indica a flor, quantos terrenos já tens e o preço. O nível mínimo da flor também tem de estar desbloqueado.' },
      { icon: 'check', title: 'Compra apenas se quiseres', text: 'Estes terrenos são opcionais: dão mais espaço para cultivar, mas não são necessários para desbloquear o próximo terreno principal.' }
    ]
  },
  {
    id: 'book',
    title: 'Livro',
    icon: 'book',
    summary: 'Consulta encomendas especiais e as combinações de ramos descobertas.',
    steps: [
      { icon: 'book', title: 'Abre o Livro', text: 'A página Encomendas reúne os pedidos especiais. Lê as flores, quantidades e restantes condições antes de preparar um ramo.' },
      { icon: 'flower', title: 'Prepara e verifica os requisitos', text: 'Seleciona uma encomenda para veres a lista de verificação e preparares o ramo com o stock disponível. A bancada de ramos desbloqueia no nível 5.' },
      { icon: 'sprout', title: 'Consulta o Herbário', text: 'A outra página regista os ramos que já descobriste. Usa o índice do livro para alternar entre Encomendas e Herbário.' }
    ]
  },
  {
    id: 'map',
    title: 'Mapa',
    icon: 'map',
    summary: 'Localiza a personagem e orienta-te entre o jardim e a loja.',
    steps: [
      { icon: 'map', title: 'Abre o mapa no HUD', text: 'Toca ou clica em Mapa para abrir o minimapa. O marcador mostra a posição atual da personagem no jardim.' },
      { icon: 'flower', title: 'Orienta-te pelo espaço', text: 'Usa o mapa para perceber onde estão os canteiros, a loja e os caminhos. Fecha-o quando acabares de consultar.' },
      { icon: 'player', title: 'Continua a deslocar-te normalmente', text: 'O mapa serve para orientação. No telemóvel, move a personagem com o joystick virtual; não precisas de tocar no mapa para caminhar.' }
    ]
  },
  {
    id: 'progression',
    title: 'Nível e progressão',
    icon: 'sprout',
    summary: 'As vendas aumentam a reputação e abrem novas possibilidades.',
    steps: [
      { icon: 'coin', title: 'Ganha reputação com vendas', text: 'Cada cliente satisfeito dá moedas e reputação. As vendas melhores e as melhorias de montra podem aumentar a reputação recebida.' },
      { icon: 'sprout', title: 'Acompanha o nível no HUD', text: 'A barra mostra a reputação acumulada e o valor necessário para o próximo nível. O requisito aumenta à medida que a loja progride.' },
      { icon: 'flower', title: 'Desbloqueia novos terrenos', text: 'Os níveis abrem novas flores e melhorias. Para comprar o próximo terreno principal, precisas do nível mínimo e de já ter comprado o terreno principal anterior. Terrenos extra continuam opcionais.' }
    ]
  }
];

export class GameTutorial {
  constructor(hud) {
    this.hud = hud;
    this.overlay = document.getElementById('game-tutorial');
    this.topicNav = document.getElementById('game-tutorial-topics');
    this.content = document.getElementById('game-tutorial-content');
    this.progress = document.getElementById('game-tutorial-progress');
    this.progressLabel = document.getElementById('game-tutorial-progress-label');
    this.previousButton = document.getElementById('btn-tutorial-previous');
    this.nextButton = document.getElementById('btn-tutorial-next');
    this.skipButton = document.getElementById('btn-tutorial-skip');
    this.currentTopicIndex = 0;
    this.topicNav?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-tutorial-topic]');
      if (!button) return;
      const index = TOPICS.findIndex((topic) => topic.id === button.dataset.tutorialTopic);
      if (index >= 0) this.showTopic(index);
    });
    this.previousButton?.addEventListener('click', () => this.showTopic(this.currentTopicIndex - 1));
    this.nextButton?.addEventListener('click', () => {
      if (this.currentTopicIndex === TOPICS.length - 1) this.finish();
      else this.showTopic(this.currentTopicIndex + 1);
    });
    this.skipButton?.addEventListener('click', () => this.finish());
    this.renderNavigation();
  }

  isOpen() {
    return Boolean(this.overlay && !this.overlay.classList.contains('hidden'));
  }

  startIfNeeded() {
    try {
      if (localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true') return false;
    } catch (error) {
      console.error('Não foi possível verificar o estado do tutorial:', error);
    }
    this.open();
    return true;
  }

  open() {
    if (!this.overlay) return;
    this.currentTopicIndex = 0;
    this.showTopic(0);
    this.overlay.classList.remove('hidden');
    this.skipButton?.focus();
  }

  renderNavigation() {
    if (!this.topicNav) return;
    this.topicNav.replaceChildren();
    TOPICS.forEach((topic, index) => {
      const button = document.createElement('button');
      button.className = 'game-tutorial-topic';
      button.type = 'button';
      button.dataset.tutorialTopic = topic.id;
      button.setAttribute('aria-current', String(index === this.currentTopicIndex));
      const number = document.createElement('span');
      number.className = 'game-tutorial-topic-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const icon = document.createElement('span');
      icon.className = 'game-tutorial-topic-icon';
      icon.innerHTML = getIcon(topic.icon, getIcon('flower'));
      const title = document.createElement('span');
      title.className = 'game-tutorial-topic-title';
      title.textContent = topic.title;
      button.append(number, icon, title);
      this.topicNav.appendChild(button);
    });
  }

  showTopic(index) {
    if (!this.content || index < 0 || index >= TOPICS.length) return;
    this.currentTopicIndex = index;
    const topic = TOPICS[index];
    this.renderNavigation();
    this.content.replaceChildren();

    const heading = document.createElement('div');
    heading.className = 'game-tutorial-heading';
    const icon = document.createElement('span');
    icon.className = 'game-tutorial-heading-icon';
    icon.innerHTML = getIcon(topic.icon, getIcon('flower'));
    const copy = document.createElement('div');
    const kicker = document.createElement('p');
    kicker.className = 'game-tutorial-kicker';
    kicker.textContent = `ETAPA ${String(index + 1).padStart(2, '0')} DE ${String(TOPICS.length).padStart(2, '0')}`;
    const title = document.createElement('h3');
    title.textContent = topic.title;
    const summary = document.createElement('p');
    summary.className = 'game-tutorial-summary';
    summary.textContent = topic.summary;
    copy.append(kicker, title, summary);
    heading.append(icon, copy);
    this.content.appendChild(heading);

    const steps = document.createElement('div');
    steps.className = 'game-tutorial-steps';
    topic.steps.forEach((step, stepIndex) => {
      const card = document.createElement('article');
      card.className = 'game-tutorial-step';
      const stepIcon = document.createElement('span');
      stepIcon.className = 'game-tutorial-step-icon';
      stepIcon.innerHTML = getIcon(step.icon, getIcon('flower'));
      const number = document.createElement('span');
      number.className = 'game-tutorial-step-number';
      number.textContent = `PASSO ${stepIndex + 1}`;
      const stepTitle = document.createElement('h4');
      stepTitle.textContent = step.title;
      const description = document.createElement('p');
      description.textContent = step.text;
      card.append(stepIcon, number, stepTitle, description);
      steps.appendChild(card);
    });
    this.content.appendChild(steps);

    if (this.progress) {
      this.progress.max = TOPICS.length;
      this.progress.value = index + 1;
    }
    if (this.progressLabel) {
      this.progressLabel.textContent = `${index + 1} / ${TOPICS.length}`;
    }
    if (this.previousButton) this.previousButton.disabled = index === 0;
    if (this.nextButton) {
      this.nextButton.textContent = index === TOPICS.length - 1 ? 'Começar a jogar' : 'Próximo tema';
    }
  }

  finish() {
    if (!this.overlay) return;
    this.overlay.classList.add('hidden');
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    } catch (error) {
      console.error('Não foi possível guardar que o tutorial foi concluído:', error);
      this.hud?.showToast('Não foi possível guardar a conclusão do tutorial neste dispositivo.', 'book');
    }
    document.getElementById('btn-open-settings')?.focus();
  }
}
