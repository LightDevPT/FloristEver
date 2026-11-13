// ========================================================
// FloristEver v2.0.0 — Renderizador do Subsolo (subsolo-renderer.js)
// Estética cartoon acolhedora: tijolo escuro, lâmpadas roxas, ratos fofos
// ========================================================

import { PALETTE_SUBSOLO, SUBSOLO_VARIETIES, SUBSOLO_PRODUCTS } from './subsolo-config.js';
import { formatNumber } from '../utils.js';
import { assetManager } from '../assets.js';

export class SubsoloRenderer {
  constructor(game, subsoloManager) {
    this.game = game;
    this.manager = subsoloManager;
    this.worldWidth = 1040;
    this.worldHeight = 620;
    this.coinImage = new Image();
    this.coinImage.src = new URL('../../imagens/FloristEver_moeda_jardim.svg', import.meta.url).href;
    this.rats = [
      { x: 260, y: 380, vx: 20, timer: 0 },
      { x: 520, y: 400, vx: -15, timer: 2 }
    ];
    this.droplets = [];
  }

  update(dt) {
    // Animação dos ratinhos simpáticos
    for (const rat of this.rats) {
      rat.timer += dt;
      rat.x += rat.vx * dt;
      if (rat.x > 750 || rat.x < 150) {
        rat.vx = -rat.vx;
      }
    }

    // Pingos de água dos canos
    if (Math.random() < 0.08) {
      this.droplets.push({ x: 300 + Math.random() * 300, y: 110, vy: 120, life: 1.5 });
    }
    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const drop = this.droplets[i];
      drop.y += drop.vy * dt;
      drop.life -= dt;
      if (drop.y > 420 || drop.life <= 0) {
        this.droplets.splice(i, 1);
      }
    }
  }

  render(ctx, visibleBounds) {
    const data = this.manager.data;

    // 1. Fundo do Túnel de Esgoto Acolhedor
    ctx.save();
    // Paredes de tijolo cartoon
    this.drawBrickWall(ctx, visibleBounds);

    // Canos suspensos no teto
    this.drawOverheadPipes(ctx, visibleBounds);

    // Poças de água no chão
    this.drawWaterPuddles(ctx);

    // Pingos de água
    ctx.fillStyle = '#78A8A6';
    for (const drop of this.droplets) {
      ctx.fillRect(drop.x, drop.y, 2, 4);
    }

    // 2. Escada de Entrada (à esquerda)
    this.drawLadder(ctx, 120, 90, 320);

    // 3. Estação de Infraestrutura (Gerador, Reservatório, Dínamo)
    this.drawInfrastructure(ctx, 220, 240, data.recursos);

    // 4. Sala de Cultivo (Canteiros com lâmpadas roxas)
    this.drawGrowRoom(ctx, 420, 260, data.canteiros);

    // 5. Estendais de Secagem
    this.drawDryingRacks(ctx, 640, 260, data.estendais);

    // 6. Oficina de Preparação e Armazém
    this.drawPrepWorkshop(ctx, 840, 260, data.preparacao, data.armazemOculto);

    // 7. Ratinhos fofos no chão
    this.drawCuteRats(ctx);

    // 8. Jogador em 2D no túnel
    if (this.game.player) {
      const malaCount = (data.mala.ramo || 0) + (data.mala.maco || 0) + (data.mala.reserva || 0);
      this.game.player.draw(ctx, malaCount, this.manager.getMalaCapacity());
    }

    ctx.restore();
  }

  getStationAt(x, y) {
    if (x >= 80 && x <= 160 && y >= 70 && y <= 400) return 'ladder';
    if (x >= 200 && x <= 330 && y >= 210 && y <= 340) return 'dynamo';
    if (x >= 390 && x <= 600 && y >= 210 && y <= 350) return 'cultivo';
    if (x >= 620 && x <= 760 && y >= 210 && y <= 350) return 'secagem';
    if (x >= 820 && x <= 925 && y >= 210 && y <= 350) return 'prep';
    if (x >= 926 && x <= 1010 && y >= 210 && y <= 350) return 'logistica';
    return null;
  }

  drawBrickWall(ctx, visibleBounds) {
    const { left, right, top, bottom } = visibleBounds;
    const viewW = right - left;
    ctx.save();
    ctx.fillStyle = PALETTE_SUBSOLO.brick;
    ctx.fillRect(left, top, viewW, 340 - top);

    // Linhas de tijolos
    ctx.strokeStyle = PALETTE_SUBSOLO.brickDark;
    ctx.lineWidth = 1.5;
    for (let y = 90; y <= 330; y += 22) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();

      const offset = (Math.floor(y / 22) % 2) * 25;
      const firstX = Math.floor((left - offset) / 50) * 50 + offset;
      for (let x = firstX; x < right; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 22);
        ctx.stroke();
      }
    }

    // Pavimento de pedra escura
    ctx.fillStyle = '#1D2023';
    ctx.fillRect(left, 340, viewW, Math.max(280, bottom - 340));
    ctx.strokeStyle = '#151719';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, 340);
    ctx.lineTo(right, 340);
    ctx.stroke();

    ctx.restore();
  }

  drawOverheadPipes(ctx, visibleBounds) {
    const { left, right } = visibleBounds;
    ctx.save();
    ctx.fillStyle = PALETTE_SUBSOLO.pipe;
    ctx.fillRect(left, 85, right - left, 14);
    ctx.strokeStyle = '#353E45';
    ctx.lineWidth = 2;
    ctx.strokeRect(left, 85, right - left, 14);

    // Abraçadeiras do cano
    ctx.fillStyle = '#2A2F33';
    const firstClampX = 80 + Math.ceil((left - 80) / 140) * 140;
    for (let x = firstClampX; x < right; x += 140) {
      ctx.fillRect(x, 82, 8, 20);
    }
    ctx.restore();
  }

  drawWaterPuddles(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(94, 140, 138, 0.35)';
    ctx.beginPath();
    ctx.ellipse(320, 395, 45, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(580, 415, 60, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawLadder(ctx, x, y, height) {
    ctx.save();
    ctx.fillStyle = PALETTE_SUBSOLO.iron;
    ctx.fillRect(x - 12, y, 6, height);
    ctx.fillRect(x + 12, y, 6, height);

    ctx.strokeStyle = PALETTE_SUBSOLO.ironLight;
    ctx.lineWidth = 3;
    for (let rungY = y + 15; rungY < y + height; rungY += 22) {
      ctx.beginPath();
      ctx.moveTo(x - 12, rungY);
      ctx.lineTo(x + 15, rungY);
      ctx.stroke();
    }

    // Placa verde da saída
    ctx.fillStyle = '#3FA363';
    ctx.fillRect(x - 28, y - 24, 60, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SUBIR ↑', x + 2, y - 10);
    ctx.restore();
  }

  drawInfrastructure(ctx, x, y, recursos) {
    ctx.save();
    // Gerador
    ctx.fillStyle = '#4A555D';
    ctx.fillRect(x, y, 65, 80);
    ctx.strokeStyle = '#2A2F33';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 65, 80);

    // Grelha de ventilação do gerador
    ctx.fillStyle = '#1D2226';
    for (let gy = y + 15; gy < y + 55; gy += 8) {
      ctx.fillRect(x + 10, gy, 45, 4);
    }

    // Lâmpada de estado
    const hasPower = recursos.energia > 5;
    ctx.fillStyle = hasPower ? '#5DE27F' : '#E85D5D';
    ctx.beginPath();
    ctx.arc(x + 32, y + 68, 5, 0, Math.PI * 2);
    ctx.fill();

    // Rótulo
    ctx.fillStyle = '#E5E8EB';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GERADOR', x + 32, y - 6);

    // Alavanca do dínamo manual ao lado
    ctx.fillStyle = PALETTE_SUBSOLO.amber;
    ctx.fillRect(x + 75, y + 30, 8, 30);
    ctx.beginPath();
    ctx.arc(x + 79, y + 25, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '9px sans-serif';
    ctx.fillText('Dínamo', x + 79, y + 72);

    ctx.restore();
  }

  drawGrowRoom(ctx, startX, y, canteiros) {
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E5E8EB';
    ctx.font = '800 12px "Quicksand", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CULTIVO UV', startX + 75, y - 31);

    // Estrutura de estufa 2D: moldura escura, luz indireta e quatro canteiros.
    ctx.fillStyle = '#20252C';
    ctx.fillRect(startX - 14, y - 14, 178, 116);
    ctx.strokeStyle = '#39434D';
    ctx.lineWidth = 3;
    ctx.strokeRect(startX - 14, y - 14, 178, 116);
    ctx.fillStyle = PALETTE_SUBSOLO.growLight;
    ctx.fillRect(startX - 4, y - 7, 158, 5);
    ctx.fillStyle = PALETTE_SUBSOLO.growGlow;
    ctx.beginPath();
    ctx.moveTo(startX - 4, y - 2);
    ctx.lineTo(startX + 154, y - 2);
    ctx.lineTo(startX + 154, y + 89);
    ctx.lineTo(startX - 4, y + 89);
    ctx.closePath();
    ctx.fill();

    // A planta usa os mesmos estágios de desenho do jardim (semente, broto, botão, madura).
    canteiros.slice(0, 4).forEach((plot, index) => {
      const px = startX + 2 + (index % 2) * 78;
      const py = y + 2 + Math.floor(index / 2) * 43;
      const variety = SUBSOLO_VARIETIES[plot.varietyId] || SUBSOLO_VARIETIES.sombra_verde;
      const progress = plot.status === 'ready' ? 1 : plot.status === 'growing' ? Math.max(0, Math.min(0.99, plot.progress || 0)) : 0;

      ctx.fillStyle = '#302923';
      ctx.strokeStyle = '#634C3A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px, py, 72, 38, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#514031';
      for (let furrow = 0; furrow < 3; furrow++) {
        ctx.fillRect(px + 7, py + 8 + furrow * 10, 58, 2);
      }

      if (plot.status !== 'empty') {
        const flowerVisual = {
          id: `subsolo-${variety.id}`,
          name: variety.name,
          radius: 5,
          petals: 5,
          color: variety.color,
          centerColor: '#E8C56A',
          stemColor: '#6E9B67',
          outlineColor: '#29372C'
        };
        assetManager.drawFlower(ctx, px + 36, py + 28, flowerVisual, progress, this.rats[index % this.rats.length]?.timer || 0);
      } else {
        ctx.fillStyle = '#98816C';
        ctx.beginPath();
        ctx.ellipse(px + 36, py + 27, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (plot.status === 'ready') {
        ctx.fillStyle = '#F3D27A';
        ctx.font = '800 8px "Quicksand", sans-serif';
        ctx.fillText('PRONTO', px + 36, py + 7);
      }
    });

    ctx.restore();
  }

  drawDryingRacks(ctx, x, y, estendais) {
    ctx.save();
    ctx.fillStyle = '#E5E8EB';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SECAGEM', x + 50, y - 25);

    // Estrutura de madeira
    ctx.fillStyle = '#7A5C43';
    ctx.fillRect(x, y, 8, 80);
    ctx.fillRect(x + 95, y, 8, 80);
    ctx.strokeStyle = '#C2B099';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 20);
    ctx.lineTo(x + 95, y + 20);
    ctx.moveTo(x + 8, y + 50);
    ctx.lineTo(x + 95, y + 50);
    ctx.stroke();

    const rack = estendais[0];
    if (rack && (rack.status === 'drying' || rack.status === 'ready')) {
      ctx.fillStyle = rack.status === 'ready' ? '#B8863D' : '#579C66';
      for (let lx = x + 20; lx < x + 90; lx += 14) {
        ctx.beginPath();
        ctx.ellipse(lx, y + 26, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (rack.status === 'ready') {
        ctx.fillStyle = '#FFC857';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('SECO', x + 50, y + 42);
        this.drawSubsoloIcon(ctx, 'check', x + 63, y + 31, 12);
      }
    }

    ctx.restore();
  }

  drawPrepWorkshop(ctx, x, y, preparacao, armazem) {
    ctx.save();
    ctx.fillStyle = '#E5E8EB';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PREPARAÇÃO', x + 40, y - 25);

    // Bancada de trabalho
    ctx.fillStyle = '#5A4638';
    ctx.fillRect(x, y + 10, 80, 70);
    ctx.strokeStyle = '#382B22';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y + 10, 80, 70);

    // Balança / Caixa de corte
    ctx.fillStyle = '#D6DFE8';
    ctx.fillRect(x + 25, y + 5, 30, 8);

    if (preparacao.status === 'preparing') {
      ctx.fillStyle = '#FFC857';
      ctx.font = '9px sans-serif';
      ctx.fillText('A cortar...', x + 40, y + 40);
    } else if (preparacao.status === 'ready') {
      ctx.fillStyle = '#5DE27F';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('RECOLHER', x + 40, y + 40);
    }

    // Caixas do Armazém ao lado
    ctx.fillStyle = '#735843';
    ctx.fillRect(x + 95, y + 25, 45, 55);
    ctx.strokeRect(x + 95, y + 25, 45, 55);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    this.drawSubsoloIcon(ctx, 'box', x + 102, y + 47, 14);
    ctx.fillText(`${armazem.ramo || 0}`, x + 120, y + 55);

    ctx.restore();
  }

  drawCuteRats(ctx) {
    ctx.save();
    for (const rat of this.rats) {
      ctx.fillStyle = PALETTE_SUBSOLO.ratFur;
      ctx.beginPath();
      ctx.ellipse(rat.x, rat.y, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Focinho e orelhinha
      ctx.fillStyle = '#E0A6B2';
      const facing = rat.vx > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.arc(rat.x + facing * 8, rat.y - 1, 2, 0, Math.PI * 2);
      ctx.arc(rat.x - facing * 2, rat.y - 5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Cauda fininha
      ctx.strokeStyle = '#E0A6B2';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rat.x - facing * 7, rat.y);
      ctx.quadraticCurveTo(rat.x - facing * 14, rat.y - 4, rat.x - facing * 18, rat.y + 1);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSubsoloIcon(ctx, type, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 24, size / 24);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (type) {
      case 'coin':
        if (this.coinImage.complete && this.coinImage.naturalWidth > 0) {
          ctx.drawImage(this.coinImage, 2, 2, 20, 20);
        }
        break;
      case 'respect': {
        ctx.fillStyle = '#C084FC';
        ctx.strokeStyle = '#A855F7';
        ctx.beginPath();
        for (let point = 0; point < 10; point++) {
          const angle = -Math.PI / 2 + point * Math.PI / 5;
          const radius = point % 2 === 0 ? 10 : 4.5;
          const px = 12 + Math.cos(angle) * radius;
          const py = 12 + Math.sin(angle) * radius;
          if (point === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'energy':
        ctx.fillStyle = '#EAB308';
        ctx.strokeStyle = '#FDE047';
        ctx.beginPath();
        ctx.moveTo(13, 2);
        ctx.lineTo(5, 13);
        ctx.lineTo(11, 13);
        ctx.lineTo(9, 22);
        ctx.lineTo(19, 9);
        ctx.lineTo(13, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'water':
        ctx.fillStyle = '#06B6D4';
        ctx.strokeStyle = '#67E8F9';
        ctx.beginPath();
        ctx.moveTo(12, 2);
        ctx.bezierCurveTo(9, 7, 5, 12, 5, 16);
        ctx.arc(12, 16, 7, Math.PI, 0);
        ctx.bezierCurveTo(19, 12, 15, 7, 12, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'heat':
        ctx.fillStyle = '#EF4444';
        ctx.strokeStyle = '#FCA5A5';
        ctx.beginPath();
        ctx.moveTo(12, 2);
        ctx.bezierCurveTo(16, 7, 18, 10, 17, 15);
        ctx.bezierCurveTo(16, 21, 7, 22, 6, 16);
        ctx.bezierCurveTo(5, 12, 9, 8, 12, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'leaf':
        ctx.fillStyle = '#34D399';
        ctx.strokeStyle = '#A7F3D0';
        ctx.beginPath();
        ctx.moveTo(4, 20);
        ctx.bezierCurveTo(4, 7, 11, 3, 21, 3);
        ctx.bezierCurveTo(21, 13, 16, 20, 4, 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5, 19);
        ctx.lineTo(16, 8);
        ctx.stroke();
        break;
      case 'bag':
        ctx.strokeStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.roundRect(4, 8, 16, 13, 2);
        ctx.moveTo(9, 8);
        ctx.lineTo(9, 5);
        ctx.quadraticCurveTo(12, 2, 15, 5);
        ctx.lineTo(15, 8);
        ctx.stroke();
        break;
      case 'box':
        ctx.strokeStyle = '#FDE68A';
        ctx.beginPath();
        ctx.rect(4, 5, 16, 15);
        ctx.moveTo(4, 10);
        ctx.lineTo(20, 10);
        ctx.moveTo(12, 5);
        ctx.lineTo(12, 10);
        ctx.stroke();
        break;
      case 'check':
        ctx.strokeStyle = '#5DE27F';
        ctx.beginPath();
        ctx.moveTo(4, 12);
        ctx.lineTo(9, 17);
        ctx.lineTo(20, 6);
        ctx.stroke();
        break;
      default:
        break;
    }

    ctx.restore();
  }

  drawSubsoloHud(ctx, viewW, data) {
    ctx.save();
    // Barra superior
    ctx.fillStyle = PALETTE_SUBSOLO.hudBg;
    ctx.fillRect(0, 0, viewW, 46);
    ctx.strokeStyle = '#353D42';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 46);
    ctx.lineTo(viewW, 46);
    ctx.stroke();

    ctx.fillStyle = '#E5E8EB';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';

    // Moedas e Respeito
    this.drawSubsoloIcon(ctx, 'coin', 14, 13, 16);
    ctx.fillText(formatNumber(this.game.state.coins), 34, 28);
    ctx.fillStyle = '#B56BFF';
    this.drawSubsoloIcon(ctx, 'respect', 128, 13, 16);
    ctx.fillText(`S${data.respeito.nivel} (${data.respeito.xp} XP)`, 148, 28);

    // Energia e Água
    ctx.fillStyle = data.recursos.energia > 20 ? '#5DE27F' : '#E85D5D';
    this.drawSubsoloIcon(ctx, 'energy', 258, 13, 16);
    ctx.fillText(`${Math.round(data.recursos.energia)}%`, 278, 28);
    ctx.fillStyle = '#5E8C8A';
    this.drawSubsoloIcon(ctx, 'water', 333, 13, 16);
    ctx.fillText(`${Math.round(data.recursos.agua)}%`, 353, 28);

    // Calor (se ativo)
    if (!data.conteudoSecreto.modoTranquilo) {
      const calor = Math.round(data.calor.valor);
      ctx.fillStyle = calor > 70 ? '#E85D5D' : calor > 40 ? '#FFC857' : '#99A8B2';
      this.drawSubsoloIcon(ctx, 'heat', 403, 13, 16);
      ctx.fillText(`Calor: ${calor}%`, 423, 28);
    } else {
      ctx.fillStyle = '#5DE27F';
      this.drawSubsoloIcon(ctx, 'leaf', 403, 13, 16);
      ctx.fillText('Modo Tranquilo', 423, 28);
    }

    // Mala de transporte
    const malaCount = (data.mala.ramo || 0) + (data.mala.maco || 0) + (data.mala.reserva || 0);
    ctx.fillStyle = '#E5E8EB';
    this.drawSubsoloIcon(ctx, 'bag', 538, 13, 16);
    ctx.fillText(`Mala: ${malaCount}/${this.manager.getMalaCapacity()}`, 558, 28);

    ctx.restore();
  }
}
