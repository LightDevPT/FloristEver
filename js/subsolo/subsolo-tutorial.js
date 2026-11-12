import { getIcon } from '../icons.js';

const TOPICS = [
  {
    id: 'orientation',
    title: 'Orientação e controlos',
    icon: 'player',
    summary: 'O Subsolo tem uma área própria e quatro postos de trabalho. O jogo fica pausado enquanto este guia está aberto.',
    steps: [
      { icon: 'player', title: 'Move a personagem', text: 'No computador, usa W, A, S, D ou as setas. No telemóvel, arrasta o joystick virtual. A câmara acompanha a personagem pelo túnel.' },
      { icon: 'check', title: 'Interage com os postos', text: 'Aproxima-te de uma estação e usa E ou Espaço; no telemóvel, toca em “Clique em Agir”. Também podes clicar diretamente na estufa, no estendal, na bancada de preparação ou no posto de logística para abrir o painel correspondente.' },
      { icon: 'map', title: 'Regressa à floricultura', text: 'Usa “Subir” para voltar à superfície. Aí podes atender clientes secretos; volta a descer quando quiseres gerir a produção.' }
    ]
  },
  {
    id: 'resources',
    title: 'Recursos e indicadores',
    icon: 'upgrade',
    summary: 'Energia e água aceleram o cultivo; o calor indica o risco de fiscalização.',
    steps: [
      { icon: 'upgrade', title: 'Energia e água', text: 'Vê as percentagens na HUD. Com ambas acima de 5%, os canteiros crescem à velocidade normal; se faltar uma, continuam a crescer a 25% da velocidade, por isso não ficas bloqueado.' },
      { icon: 'check', title: 'Recupera os recursos', text: 'O botão Dínamo dá imediatamente +15% de energia. Em Cultivo, “Encher Água” repõe o reservatório. “Comprar Combustível” acrescenta 20 L por 4 000 moedas; o gerador consome combustível ao longo do tempo.' },
      { icon: 'coin', title: 'Lê os restantes indicadores', text: 'Respeito (S) mostra a progressão subterrânea; a Mala indica o espaço ocupado. O medidor de Calor pode avisar de uma fiscalização. Se vires a pomba, o Modo Tranquilo está ativo.' }
    ]
  },
  {
    id: 'cultivation',
    title: 'Cultivo UV',
    icon: 'sprout',
    summary: 'Semeia canteiros vazios, acompanha o crescimento e colhe quando estiverem maduros.',
    steps: [
      { icon: 'sprout', title: 'Escolhe uma semente', text: 'Abre Cultivo, escolhe uma variedade disponível e carrega em “Semear”. Cada semente custa moedas; variedades de nível superior exigem mais Respeito. “Semear Todos Vazios” usa a variedade selecionada em cada canteiro livre.' },
      { icon: 'flower', title: 'Escolhe o teu ritmo', text: 'Sombra Verde (S1) demora 15 min e rende 6 folhas; Luar Roxo (S3), 22 min e 8 folhas, com menos odor; Âmbar Seco (S8), 10 min e 5 folhas; Raiz Dourada (S15), 32 min e 12 folhas. Os tempos são os base e o crescimento abranda quando falta energia ou água.' },
      { icon: 'basket', title: 'Colhe no momento certo', text: 'Quando o canteiro indicar “Maduro”, carrega em “Colher Flores” ou “Colher Todos”. As folhas vão para um estendal livre; se todos estiverem ocupados, seguem diretamente para as folhas secas do Armazém.' }
    ]
  },
  {
    id: 'drying',
    title: 'Secagem e recolha',
    icon: 'flower',
    summary: 'As folhas frescas precisam de passar pela cura antes de serem usadas na Bancada.',
    steps: [
      { icon: 'flower', title: 'Acompanha os estendais', text: 'Abre Secagem para ver o estado e a percentagem de cada lote. A cura decorre automaticamente, mesmo enquanto consultas outras áreas do jogo.' },
      { icon: 'check', title: 'Recolhe o lote pronto', text: 'Quando aparecer “Curado!”, carrega em “Guardar no Armazém” ou em “Recolher Todas Folhas”. O lote passa a fazer parte do stock de folhas secas.' },
      { icon: 'book', title: 'Confere o Armazém', text: 'A Bancada mostra quantas folhas secas tens. Se ainda não houver nenhuma disponível, deixa a produção terminar e recolhe um estendal antes de preparar produtos.' }
    ]
  },
  {
    id: 'workbench',
    title: 'Bancada e produtos',
    icon: 'bouquet',
    summary: 'Transforma folhas secas em produtos prontos e guarda cada lote no Armazém.',
    steps: [
      { icon: 'book', title: 'Lê os requisitos', text: 'Cada cartão indica o produto, folhas necessárias, tempo de preparação e Respeito mínimo. Um cartão desativado mostra o que falta — folhas, nível ou bancada livre.' },
      { icon: 'upgrade', title: 'Prepara um lote', text: 'Carrega em “Preparar Lote”. As folhas são descontadas logo no início; a preparação continua em segundo plano. Só podes ter a bancada ocupada com um lote de cada vez.' },
      { icon: 'check', title: 'Guarda o produto', text: 'Quando o estado mudar para “Pronto!”, carrega em “Guardar no Armazém”. O produto fica disponível para a etapa de logística. O stock inicial também inclui alguns produtos para poderes experimentar o fluxo.' }
    ]
  },
  {
    id: 'logistics',
    title: 'Armazém, Mala e Cofre',
    icon: 'basket',
    summary: 'A Logística explica onde está cada produto e quanto espaço resta.',
    steps: [
      { icon: 'book', title: 'Segue o percurso do produto', text: 'Armazém do Túnel → Mala de Transporte → Cofre Oculto. Usa os botões “+1 Mala” e “+1 Cofre” para mover unidades, ou as ações rápidas para transferir o máximo possível.' },
      { icon: 'basket', title: 'Respeita as capacidades', text: 'A Mala começa com espaço para 10 produtos e o Cofre para 15. Os contadores mostram o total ocupado; se um destino estiver cheio, liberta espaço ou compra uma melhoria antes de transferir mais.' },
      { icon: 'check', title: 'Prepara o stock para clientes', text: 'Apenas os produtos no Cofre podem ser vendidos a Clientes Secretos. Confirma o tipo e a quantidade do pedido e deixa stock suficiente no Cofre antes de subir.' }
    ]
  },
  {
    id: 'customers',
    title: 'Clientes e Respeito',
    icon: 'coin',
    summary: 'As vendas são manuais e aumentam as moedas e o Respeito do Subsolo.',
    steps: [
      { icon: 'player', title: 'Atende na superfície', text: 'Os clientes secretos aparecem na floricultura. Sobe, aproxima-te do cliente que está à espera e interage com E/Espaço ou com “Clique em Agir”. Clientes à espera não expiram enquanto estás no Subsolo; a venda é sempre manual.' },
      { icon: 'book', title: 'Confere antes de concluir', text: 'Lê a frase do pedido, o produto e a quantidade no painel. A venda só pode ser concluída se o Cofre tiver stock suficiente; escolhe também a embalagem que preferires e verifica o custo ou os requisitos apresentados.' },
      { icon: 'upgrade', title: 'Evolui com as vendas', text: 'Uma venda concluída dá moedas e XP de Respeito. Os novos níveis desbloqueiam variedades, produtos e outras possibilidades; o indicador S e a barra de progresso mostram o teu avanço.' }
    ]
  },
  {
    id: 'heat',
    title: 'Calor e fiscalizações',
    icon: 'lock',
    summary: 'Acompanha o medidor de Calor para saber quando precisas de agir.',
    steps: [
      { icon: 'upgrade', title: 'O que significa o Calor', text: 'Fora do Modo Tranquilo, as vendas aumentam o Calor e este baixa gradualmente enquanto jogas. Quanto mais alto estiver, maior a possibilidade de surgir uma fiscalização.' },
      { icon: 'lock', title: 'Responde ao alerta', text: 'Se a fiscalização começar, tens 20 segundos de jogo para abrir Logística e carregar em “Ocultar Cofre da Fiscalização”. Se o prazo terminar sem o ocultar, recebes uma multa e o negócio fica temporariamente bloqueado.' },
      { icon: 'check', title: 'Mantém a calma', text: 'O Modo Tranquilo desativa o Calor e as fiscalizações, mas reduz em 10% a receita das vendas. Consulta o estado do modo no indicador de Calor.' }
    ]
  },
  {
    id: 'quick-start',
    title: 'Roteiro rápido',
    icon: 'check',
    summary: 'Uma sequência simples para perceber o ciclo completo sem perder o fio à meada.',
    steps: [
      { icon: 'sprout', title: '1. Cultiva', text: 'Abre Cultivo, semeia um canteiro e acompanha a percentagem até ficar maduro. Mantém energia e água em níveis saudáveis para não abrandar o crescimento.' },
      { icon: 'flower', title: '2. Cura e prepara', text: 'Colhe as folhas, recolhe-as depois da secagem e usa a Bancada para preparar um produto que já tenhas desbloqueado.' },
      { icon: 'basket', title: '3. Organiza e vende', text: 'Move o produto do Armazém para o Cofre usando a Mala. Sobe à floricultura, atende um cliente com stock suficiente e volta ao Subsolo para continuar a produção.' }
    ]
  }
];

export class SubsoloTutorial {
  constructor(manager, hud) {
    this.manager = manager;
    this.hud = hud;
    this.overlay = document.getElementById('subsolo-tutorial');
    this.topicNav = document.getElementById('subsolo-tutorial-topics');
    this.content = document.getElementById('subsolo-tutorial-content');
    this.progress = document.getElementById('subsolo-tutorial-progress');
    this.progressLabel = document.getElementById('subsolo-tutorial-progress-label');
    this.previousButton = document.getElementById('btn-subsolo-tutorial-previous');
    this.nextButton = document.getElementById('btn-subsolo-tutorial-next');
    this.skipButton = document.getElementById('btn-subsolo-tutorial-skip');
    this.closeButton = document.getElementById('btn-subsolo-tutorial-close');
    this.currentTopicIndex = 0;

    this.topicNav?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-subsolo-tutorial-topic]');
      if (!button) return;
      const index = TOPICS.findIndex((topic) => topic.id === button.dataset.subsoloTutorialTopic);
      if (index >= 0) this.showTopic(index);
    });
    this.previousButton?.addEventListener('click', () => this.showTopic(this.currentTopicIndex - 1));
    this.nextButton?.addEventListener('click', () => {
      if (this.currentTopicIndex === TOPICS.length - 1) this.finish();
      else this.showTopic(this.currentTopicIndex + 1);
    });
    this.skipButton?.addEventListener('click', () => this.finish());
    this.closeButton?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !this.isOpen()) return;
      event.preventDefault();
      event.stopPropagation();
      this.close();
    });
    this.renderNavigation();
  }

  isOpen() {
    return Boolean(this.overlay && !this.overlay.classList.contains('hidden'));
  }

  openIfNeeded() {
    if (this.manager.data.tutorial?.completed === true) return false;
    this.open();
    return this.isOpen();
  }

  open() {
    if (!this.overlay) return;
    this.currentTopicIndex = 0;
    this.showTopic(0);
    this.overlay.classList.remove('hidden');
    this.closeButton?.focus();
  }

  renderNavigation() {
    if (!this.topicNav) return;
    this.topicNav.replaceChildren();
    TOPICS.forEach((topic, index) => {
      const button = document.createElement('button');
      button.className = 'game-tutorial-topic';
      button.type = 'button';
      button.dataset.subsoloTutorialTopic = topic.id;
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
    kicker.textContent = `TEMA ${String(index + 1).padStart(2, '0')} DE ${String(TOPICS.length).padStart(2, '0')}`;
    const title = document.createElement('h3');
    title.textContent = topic.title;
    const summary = document.createElement('p');
    summary.id = 'subsolo-tutorial-summary';
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
    if (this.progressLabel) this.progressLabel.textContent = `${index + 1} / ${TOPICS.length}`;
    if (this.previousButton) this.previousButton.disabled = index === 0;
    if (this.nextButton) {
      this.nextButton.textContent = index === TOPICS.length - 1 ? 'Concluir guia' : 'Próximo tema';
    }
  }

  close() {
    if (!this.overlay) return;
    this.overlay.classList.add('hidden');
    document.getElementById('btn-toggle-subsolo-menu')?.focus();
  }

  finish() {
    if (!this.overlay) return;
    this.manager.data.tutorial.completed = true;
    if (!this.manager.gameState.save()) {
      this.hud?.showToast('Não foi possível guardar a conclusão do tutorial neste dispositivo.', 'book');
    }
    this.close();
  }
}
