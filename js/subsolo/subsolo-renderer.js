// ========================================================
// FloristEver v2.0.0 — Renderizador do Subsolo (subsolo-renderer.js)
// Estética cartoon acolhedora: tijolo escuro, lâmpadas roxas, ratos fofos
// ========================================================

import { PALETTE_SUBSOLO, SUBSOLO_VARIETIES, SUBSOLO_PRODUCTS } from './subsolo-config.js';
import { formatNumber } from '../utils.js';

export class SubsoloRenderer {
  constructor(game, subsoloManager) {
    this.game = game;
    this.manager = subsoloManager;
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

  render(ctx, viewW, viewH) {
    const data = this.manager.data;

    // 1. Fundo do Túnel de Esgoto Acolhedor
    ctx.save();
    ctx.fillStyle = '#222528';
    ctx.fillRect(0, 0, viewW, viewH);

    // Paredes de tijolo cartoon
    this.drawBrickWall(ctx, viewW);

    // Canos suspensos no teto
    this.drawOverheadPipes(ctx, viewW);

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

  drawBrickWall(ctx, viewW) {
    ctx.save();
    ctx.fillStyle = PALETTE_SUBSOLO.brick;
    ctx.fillRect(0, 80, viewW, 260);

    // Linhas de tijolos
    ctx.strokeStyle = PALETTE_SUBSOLO.brickDark;
    ctx.lineWidth = 1.5;
    for (let y = 90; y <= 330; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(viewW, y);
      ctx.stroke();

      const offset = (Math.floor(y / 22) % 2) * 25;
      for (let x = offset; x < viewW; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 22);
        ctx.stroke();
      }
    }

    // Pavimento de pedra escura
    ctx.fillStyle = '#1D2023';
    ctx.fillRect(0, 340, viewW, 280);
    ctx.strokeStyle = '#151719';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 340);
    ctx.lineTo(viewW, 340);
    ctx.stroke();

    ctx.restore();
  }

  drawOverheadPipes(ctx, viewW) {
    ctx.save();
    ctx.fillStyle = PALETTE_SUBSOLO.pipe;
    ctx.fillRect(0, 85, viewW, 14);
    ctx.strokeStyle = '#353E45';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 85, viewW, 14);

    // Abraçadeiras do cano
    ctx.fillStyle = '#2A2F33';
    for (let x = 80; x < viewW; x += 140) {
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
    ctx.fillStyle = '#E5E8EB';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CULTIVO', startX + 75, y - 25);

    // Lâmpada de cultivo suspensa (Luz roxa/UV)
    ctx.fillStyle = PALETTE_SUBSOLO.growLight;
    ctx.fillRect(startX - 10, y - 20, 170, 8);
    ctx.fillStyle = PALETTE_SUBSOLO.growGlow;
    ctx.beginPath();
    ctx.moveTo(startX - 15, y - 12);
    ctx.lineTo(startX + 165, y - 12);
    ctx.lineTo(startX + 180, y + 85);
    ctx.lineTo(startX - 30, y + 85);
    ctx.closePath();
    ctx.fill();

    // Canteiros de terra no chão
    canteiros.slice(0, 4).forEach((plot, index) => {
      const px = startX + (index % 2) * 80;
      const py = y + Math.floor(index / 2) * 45;

      ctx.fillStyle = '#3E342F';
      ctx.fillRect(px, py, 68, 36);
      ctx.strokeStyle = '#2A231F';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px, py, 68, 36);

      // Planta a crescer
      if (plot.status === 'growing' || plot.status === 'ready') {
        const height = Math.max(6, plot.progress * 26);
        ctx.fillStyle = plot.status === 'ready' ? '#68D67F' : '#4FA868';
        ctx.beginPath();
        ctx.arc(px + 34, py + 30 - height, 6 + plot.progress * 5, 0, Math.PI * 2);
        ctx.fill();

        if (plot.status === 'ready') {
          ctx.fillStyle = '#FFC857';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('PRONTO', px + 34, py + 18);
        }
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
        ctx.fillText('SECO ★', x + 50, y + 42);
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
    ctx.fillText(`📦 ${armazem.ramo || 0}`, x + 117, y + 55);

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
    ctx.fillText(`🪙 ${formatNumber(this.game.state.coins)}`, 16, 28);
    ctx.fillStyle = '#B56BFF';
    ctx.fillText(`★ S${data.respeito.nivel} (${data.respeito.xp} XP)`, 130, 28);

    // Energia e Água
    ctx.fillStyle = data.recursos.energia > 20 ? '#5DE27F' : '#E85D5D';
    ctx.fillText(`⚡ ${Math.round(data.recursos.energia)}%`, 260, 28);
    ctx.fillStyle = '#5E8C8A';
    ctx.fillText(`💧 ${Math.round(data.recursos.agua)}%`, 335, 28);

    // Calor (se ativo)
    if (!data.conteudoSecreto.modoTranquilo) {
      const calor = Math.round(data.calor.valor);
      ctx.fillStyle = calor > 70 ? '#E85D5D' : calor > 40 ? '#FFC857' : '#99A8B2';
      ctx.fillText(`🔥 Calor: ${calor}%`, 405, 28);
    } else {
      ctx.fillStyle = '#5DE27F';
      ctx.fillText('🕊️ Modo Tranquilo', 405, 28);
    }

    // Mala de transporte
    const malaCount = (data.mala.ramo || 0) + (data.mala.maco || 0) + (data.mala.reserva || 0);
    ctx.fillStyle = '#E5E8EB';
    ctx.fillText(`💼 Mala: ${malaCount}/${this.manager.getMalaCapacity()}`, 540, 28);

    ctx.restore();
  }
}
