import {
  DEFAULT_PLAYER_DISPLAY_NAME,
  formatPlayerId,
  VERSION_REGISTRATION_ACTIVE_MS
} from '../player-data-store.js';
import { BETA_PROGRAM, isBetaProgramVersionEligible } from '../config/beta-program.js';
import { drawBetaStatue, isBetaTester } from '../statue-beta.js';

function formatPlayTime(milliseconds) {
  const minutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours} h ${remainingMinutes} min` : `${minutes} min`;
}

function formatDate(timestamp) {
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleDateString() : '—';
}

export class PlayerProfileUi {
  constructor(store, campaignEngine, gameState, hud, onBetaStatueClaimed = () => {}) {
    this.store = store;
    this.campaignEngine = campaignEngine;
    this.gameState = gameState;
    this.hud = hud;
    this.onBetaStatueClaimed = onBetaStatueClaimed;
    this.root = null;
    this.status = null;
    this.identity = null;
    this.versions = null;
    this.beta = null;
    this.campaigns = null;
    this.refreshing = false;
    this.refreshRequested = false;
    this.gameState?.subscribe?.((event) => {
      if (['coins_changed', 'level_up', 'rep_changed', 'state_loaded', 'game_reset'].includes(event)) {
        this.renderGameStats();
      }
    });
  }

  mount(root) {
    if (!root) return;
    this.root = root;
    this.root.innerHTML = `
      <section class="player-profile" aria-labelledby="player-profile-title">
        <h4 id="player-profile-title">Perfil local do jogador</h4>
        <p class="player-profile-status" role="status" aria-live="polite"></p>
        <div class="player-profile-identity"></div>
        <div class="player-profile-beta"></div>
        <div class="player-profile-versions"></div>
        <div class="player-profile-campaigns"></div>
      </section>
    `;
    this.status = this.root.querySelector('.player-profile-status');
    this.identity = this.root.querySelector('.player-profile-identity');
    this.beta = this.root.querySelector('.player-profile-beta');
    this.versions = this.root.querySelector('.player-profile-versions');
    this.campaigns = this.root.querySelector('.player-profile-campaigns');
    void this.refresh();
  }

  setStatus(message, type = 'info') {
    if (!this.status) return;
    this.status.textContent = message;
    this.status.dataset.type = type;
  }

  async refresh() {
    if (!this.root) return;
    if (this.refreshing) {
      this.refreshRequested = true;
      return;
    }
    this.refreshing = true;
    try {
      const record = await this.store.readRecord();
      this.renderIdentity(record);
      this.renderBetaStatus(record);
      if (record.pendingRestore) {
        this.setStatus(
          'A identidade aguarda a recuperação de um backup. Fecha outras janelas e reinicia o jogo após 30 segundos.',
          'error'
        );
        this.campaigns.replaceChildren();
        return;
      }
      if (!record.profile) {
        this.setStatus('O perfil será criado ao iniciar uma nova sessão de jogo.');
        this.campaigns.replaceChildren();
        return;
      }

      const campaignStates = await this.campaignEngine.refresh();
      this.renderCampaigns(campaignStates);
      const trustedKeyCount = Object.keys(this.campaignEngine.trustedKeys).length;
      if (trustedKeyCount === 0) {
        this.setStatus(
          'Identidade guardada neste dispositivo. Campanhas e recompensas aguardam a configuração de uma chave pública confiável.'
        );
      } else {
        this.setStatus('Identidade e histórico guardados localmente neste dispositivo.', 'success');
      }
    } catch (error) {
      this.setStatus(
        `Não foi possível carregar o perfil local. ${error.message || ''}`.trim(),
        'error'
      );
      console.error('Não foi possível atualizar o perfil local do jogador:', error);
    } finally {
      this.refreshing = false;
      if (this.refreshRequested) {
        this.refreshRequested = false;
        void this.refresh();
      }
    }
  }

  renderIdentity(record) {
    this.identity.replaceChildren();
    this.versions.replaceChildren();
    if (!record.profile) {
      this.identity.textContent = 'Ainda não existe um Player ID neste dispositivo.';
      return;
    }

    const identityCard = document.createElement('div');
    identityCard.className = 'player-profile-card';
    const profileHeading = document.createElement('div');
    profileHeading.className = 'player-profile-heading';
    const avatar = document.createElement('span');
    avatar.className = 'player-profile-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    const displayName = record.profile.displayName || DEFAULT_PLAYER_DISPLAY_NAME;
    avatar.textContent = Array.from(displayName)[0]?.toLocaleUpperCase('pt-PT') || 'J';

    const nameForm = document.createElement('form');
    nameForm.className = 'player-profile-name-form';
    const nameLabel = document.createElement('label');
    nameLabel.className = 'player-profile-label';
    nameLabel.textContent = 'Nome do jogador';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = 'displayName';
    nameInput.autocomplete = 'nickname';
    nameInput.maxLength = 24;
    nameInput.required = true;
    nameInput.value = displayName;
    nameInput.setAttribute('aria-label', 'Nome do jogador');
    nameLabel.appendChild(nameInput);
    const saveNameButton = document.createElement('button');
    saveNameButton.type = 'submit';
    saveNameButton.className = 'btn-secondary player-profile-save-name';
    saveNameButton.textContent = 'Guardar nome';
    nameForm.append(nameLabel, saveNameButton);
    nameForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      saveNameButton.disabled = true;
      try {
        await this.store.updateDisplayName(nameInput.value);
        await this.refresh();
        this.setStatus('Nome guardado neste dispositivo. A conta Light Group continua desativada.', 'success');
      } catch (error) {
        this.setStatus(error.message || 'Não foi possível guardar o nome do jogador.', 'error');
      } finally {
        saveNameButton.disabled = false;
      }
    });
    profileHeading.append(avatar, nameForm);

    const idGroup = document.createElement('div');
    idGroup.className = 'player-profile-id-group';
    const idLabel = document.createElement('span');
    idLabel.className = 'player-profile-label';
    idLabel.textContent = 'ID da conta';
    const idValue = document.createElement('code');
    idValue.className = 'player-profile-id';
    idValue.textContent = formatPlayerId(record.profile.id);
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'btn-secondary player-profile-copy';
    copyButton.textContent = 'Copiar ID';
    copyButton.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error('A cópia para a área de transferência não está disponível.');
        }
        await navigator.clipboard.writeText(idValue.textContent);
        this.setStatus('Player ID copiado.', 'success');
      } catch (error) {
        this.setStatus(error.message || 'Não foi possível copiar o Player ID.', 'error');
      }
    });
    idGroup.append(idLabel, idValue, copyButton);

    const gameStats = document.createElement('dl');
    gameStats.className = 'player-profile-game-stats';
    this.renderGameStats(gameStats);

    const details = document.createElement('p');
    details.className = 'player-profile-details';
    details.textContent = `Criado em ${formatDate(record.profile.createdAt)} · versão inicial ${record.profile.createdVersion} · atual ${record.profile.currentVersion}`;
    identityCard.append(profileHeading, idGroup, gameStats, details);
    this.identity.appendChild(identityCard);

    const versionTitle = document.createElement('h5');
    versionTitle.textContent = 'Histórico de versões';
    this.versions.appendChild(versionTitle);
    const registeredVersions = record.versionHistory
      .filter((entry) => Number.isFinite(entry.registeredAt))
      .sort((left, right) => left.registeredAt - right.registeredAt);
    const pendingVersions = record.versionHistory
      .filter((entry) => !entry.registeredAt && entry.activeMs > 0);
    if (registeredVersions.length === 0) {
      const pending = pendingVersions.map((entry) => (
          `${entry.version}: faltam ${formatPlayTime(Math.max(0, VERSION_REGISTRATION_ACTIVE_MS - entry.activeMs))}`
      ));
      const message = document.createElement('p');
      message.textContent = pending.length
        ? `Ainda não há versões confirmadas. ${pending.join(' · ')} para registar.`
        : 'Uma versão é registada após 15 minutos de jogo ativo nessa versão.';
      this.versions.appendChild(message);
      return;
    }

    const list = document.createElement('ul');
    list.className = 'player-profile-version-list';
    for (const entry of registeredVersions) {
      const item = document.createElement('li');
      item.textContent = `${entry.version} · ${formatPlayTime(entry.activeMs)} · confirmada em ${formatDate(entry.registeredAt)}`;
      list.appendChild(item);
    }
    this.versions.appendChild(list);
    const registrationNote = document.createElement('p');
    registrationNote.textContent = 'Só são registadas versões com pelo menos 15 minutos de jogo ativo.';
    this.versions.appendChild(registrationNote);
    for (const entry of pendingVersions) {
      const pending = document.createElement('p');
      pending.textContent = `${entry.version}: em validação; faltam ${formatPlayTime(
        Math.max(0, VERSION_REGISTRATION_ACTIVE_MS - entry.activeMs)
      )}.`;
      this.versions.appendChild(pending);
    }
  }

  renderBetaStatus(record) {
    if (!this.beta) return;
    this.beta.replaceChildren();
    if (!record.profile) return;

    const section = document.createElement('section');
    section.className = 'player-profile-beta-card';
    const hasBetaTag = isBetaTester(record.profile);
    const heading = document.createElement('h5');
    heading.textContent = hasBetaTag ? 'Conquista BETA' : 'Conquista BETA em progresso';
    section.appendChild(heading);
    if (hasBetaTag) {
      const badge = document.createElement('span');
      badge.className = 'player-profile-beta-tag';
      badge.textContent = 'BETA';
      section.appendChild(badge);
    }

    if (record.pendingRestore) {
      const restoreMessage = document.createElement('p');
      restoreMessage.textContent = 'Aguarda a recuperação do backup terminar antes de resgatar ou colocar recompensas.';
      section.appendChild(restoreMessage);
      this.beta.appendChild(section);
      return;
    }

    if (!hasBetaTag) {
      const progress = record.versionHistory.find(
        (entry) => isBetaProgramVersionEligible(entry.version, BETA_PROGRAM)
      );
      const activeMs = Math.min(progress?.activeMs || 0, VERSION_REGISTRATION_ACTIVE_MS);
      const minutes = Math.floor(activeMs / 60_000);
      const message = document.createElement('p');
      message.textContent = BETA_PROGRAM.enabled
        ? `Joga 15 minutos ativos na versão elegível para receber a tag BETA. Progresso: ${minutes}/15 min.`
        : 'O programa BETA está encerrado para novas atribuições.';
      section.appendChild(message);
      if (BETA_PROGRAM.enabled) {
        const progressBar = document.createElement('progress');
        progressBar.max = VERSION_REGISTRATION_ACTIVE_MS;
        progressBar.value = activeMs;
        progressBar.setAttribute('aria-label', `Progresso BETA: ${minutes} de 15 minutos`);
        section.appendChild(progressBar);
      }
      this.beta.appendChild(section);
      return;
    }

    const preview = document.createElement('canvas');
    preview.className = 'player-profile-beta-preview';
    preview.width = 240;
    preview.height = 185;
    preview.setAttribute('role', 'img');
    preview.setAttribute('aria-label', 'Pré-visualização da estátua BETA Mãos que cuidam');
    const context = preview.getContext('2d');
    if (!context) throw new Error('Não foi possível criar a pré-visualização da estátua BETA.');
    drawBetaStatue(context, 120, 171, { scale: 0.3, time: 0 });

    const description = document.createElement('p');
    description.textContent = 'Estátua comemorativa “Mãos que cuidam”, dedicada aos jogadores que acompanharam o jardim nesta versão. Resgata-a para a colocar e organizar no teu jardim.';
    section.append(preview, description);

    if (record.betaStatueClaimed) {
      const claimed = document.createElement('p');
      claimed.className = 'player-profile-beta-claimed';
      claimed.textContent = 'Estátua resgatada. Já está disponível em Organizar decoração.';
      section.appendChild(claimed);
    } else {
      const claimButton = document.createElement('button');
      claimButton.type = 'button';
      claimButton.className = 'btn-secondary player-profile-beta-claim';
      claimButton.textContent = 'Resgatar estátua';
      claimButton.addEventListener('click', () => this.claimBetaStatue(claimButton));
      section.appendChild(claimButton);
    }
    this.beta.appendChild(section);
  }

  async claimBetaStatue(button) {
    button.disabled = true;
    try {
      if (!await this.store.claimBetaStatue()) {
        throw new Error('A estátua já foi resgatada ou a conta ainda não tem a tag BETA.');
      }
      this.onBetaStatueClaimed();
      this.hud?.showToast?.('Estátua BETA resgatada! Ativa Organizar decoração para a colocar no jardim.', 'trophy');
      await this.refresh();
    } catch (error) {
      this.setStatus(error.message || 'Não foi possível resgatar a estátua BETA.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  renderGameStats(target = null) {
    const stats = target || this.identity?.querySelector('.player-profile-game-stats');
    if (!stats || !this.gameState) return;
    stats.replaceChildren();
    const numberFormat = new Intl.NumberFormat('pt-PT');
    const values = [
      ['Nível', numberFormat.format(Number(this.gameState.level) || 1)],
      ['Moedas', numberFormat.format(Number(this.gameState.coins) || 0)],
      ['Reputação', numberFormat.format(Number(this.gameState.reputation) || 0)]
    ];
    for (const [label, value] of values) {
      const item = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = value;
      item.append(term, description);
      stats.appendChild(item);
    }
  }

  renderCampaigns(campaignStates) {
    this.campaigns.replaceChildren();
    const title = document.createElement('h5');
    title.textContent = 'Campanhas e recompensas';
    this.campaigns.appendChild(title);
    if (campaignStates.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Não existem campanhas assinadas disponíveis.';
      this.campaigns.appendChild(empty);
      return;
    }

    for (const entry of campaignStates) {
      const card = document.createElement('article');
      card.className = 'player-profile-campaign';
      const heading = document.createElement('h6');
      heading.textContent = entry.campaign.name;
      const description = document.createElement('p');
      description.textContent = entry.campaign.description;
      card.append(heading, description);
      for (const reward of entry.rewards) {
        const row = document.createElement('div');
        row.className = 'player-profile-reward';
        const rewardText = document.createElement('span');
        rewardText.textContent = `${reward.amount} ${reward.type.replace(/_/g, ' ')} · ${
          reward.status === 'claimed'
            ? 'reclamada'
            : reward.status === 'locked'
              ? 'bloqueada'
              : reward.status === 'expired'
                ? 'expirada'
              : reward.status === 'processing' ? 'a processar' : 'disponível'
        }`;
        row.appendChild(rewardText);
        if (entry.eligible && reward.claimMode === 'manual' && reward.status === 'available') {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn-secondary';
          button.textContent = 'Reclamar';
          button.addEventListener('click', async () => {
            button.disabled = true;
            try {
              const result = await this.campaignEngine.claimReward(entry.campaign, reward);
              if (!result.success) {
                this.setStatus('A recompensa não foi aplicada. O save pode estar indisponível.', 'error');
                return;
              }
              this.hud?.showToast?.('Recompensa reclamada.', 'check');
              await this.refresh();
            } catch (error) {
              this.setStatus(`Não foi possível reclamar a recompensa. ${error.message || ''}`.trim(), 'error');
              console.error('Falha ao reclamar uma recompensa da campanha:', error);
            } finally {
              button.disabled = false;
            }
          });
          row.appendChild(button);
        }
        card.appendChild(row);
      }
      this.campaigns.appendChild(card);
    }
  }
}
