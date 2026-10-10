// ========================================================
// FloristEver - Entidade Jogador (player.js)
// Movimento suave, animação e interação automática
// ========================================================
import { assetManager } from '../assets.js';
import { distance, clamp } from '../utils.js';

export class Player {
  constructor(x = 260, y = 240) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.hasTarget = false;

    this.baseSpeed = 160; // píxeis por segundo
    this.facing = 1;      // 1: direita, -1: esquerda
    this.isWalking = false;
    this.walkTime = 0;
    this.radius = 16;     // raio de colisão do jogador

    // Vetor de input contínuo (teclado ou joystick)
    this.inputX = 0;
    this.inputY = 0;
    this.isSeated = false;
  }

  setInput(dx, dy) {
    if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) this.standUp();
    this.inputX = dx;
    this.inputY = dy;
    if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
      this.hasTarget = false; // Interrompe click-to-move se usar joystick/teclas
    }
  }

  setTarget(worldX, worldY) {
    this.standUp();
    this.targetX = worldX;
    this.targetY = worldY;
    this.hasTarget = true;
  }

  sitAt(x, y, facing = 1) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.facing = facing;
    this.hasTarget = false;
    this.inputX = 0;
    this.inputY = 0;
    this.isWalking = false;
    this.isSeated = true;
  }

  standUp() {
    this.isSeated = false;
  }

  update(
    dt,
    speedMultiplier = 1.0,
    mapBounds = { minX: 40, maxX: 1200, minY: 40, maxY: 900 },
    canOccupy = null
  ) {
    if (this.isSeated) {
      this.isWalking = false;
      return;
    }
    if (canOccupy && !canOccupy(this.x, this.y)) {
      let freePosition = null;
      for (let radius = 8; radius <= 192 && !freePosition; radius += 8) {
        for (let direction = 0; direction < 32; direction++) {
          const angle = (direction / 32) * Math.PI * 2;
          const x = clamp(this.x + Math.cos(angle) * radius, mapBounds.minX, mapBounds.maxX);
          const y = clamp(this.y + Math.sin(angle) * radius, mapBounds.minY, mapBounds.maxY);
          if (canOccupy(x, y)) {
            freePosition = { x, y };
            break;
          }
        }
      }
      if (freePosition) {
        this.x = freePosition.x;
        this.y = freePosition.y;
      }
    }
    const currentSpeed = this.baseSpeed * speedMultiplier;
    let moveX = 0;
    let moveY = 0;

    if (this.hasTarget) {
      const dist = distance(this.x, this.y, this.targetX, this.targetY);
      if (dist < 6) {
        this.hasTarget = false;
      } else {
        moveX = (this.targetX - this.x) / dist;
        moveY = (this.targetY - this.y) / dist;
      }
    } else {
      // Movimento por joystick / teclado
      const mag = Math.hypot(this.inputX, this.inputY);
      if (mag > 0.05) {
        moveX = this.inputX / (mag > 1 ? mag : 1);
        moveY = this.inputY / (mag > 1 ? mag : 1);
      }
    }

    if (Math.abs(moveX) > 0.05 || Math.abs(moveY) > 0.05) {
      const startX = this.x;
      const startY = this.y;
      const deltaX = moveX * currentSpeed * dt;
      const deltaY = moveY * currentSpeed * dt;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(deltaX), Math.abs(deltaY)) / 8));
      const stepX = deltaX / steps;
      const stepY = deltaY / steps;
      const moveAxis = (amount, horizontal) => {
        if (amount === 0) return;
        const startX = this.x;
        const startY = this.y;
        const canMoveTo = (fraction) => canOccupy(
          horizontal ? startX + amount * fraction : startX,
          horizontal ? startY : startY + amount * fraction
        );
        if (!canOccupy || canMoveTo(1)) {
          if (horizontal) this.x = startX + amount;
          else this.y = startY + amount;
          return;
        }

        let low = 0;
        let high = 1;
        for (let iteration = 0; iteration < 8; iteration++) {
          const middle = (low + high) / 2;
          if (canMoveTo(middle)) low = middle;
          else high = middle;
        }
        if (horizontal) this.x = startX + amount * low;
        else this.y = startY + amount * low;
      };

      for (let step = 0; step < steps; step++) {
        moveAxis(stepX, true);
        moveAxis(stepY, false);
      }

      if (Math.abs(moveX) > 0.1) {
        this.facing = moveX > 0 ? 1 : -1;
      }

      const moved = Math.hypot(this.x - startX, this.y - startY) > 0.01;
      this.isWalking = moved;
      if (moved) this.walkTime += dt;
      else if (this.hasTarget) this.hasTarget = false;
    } else {
      this.isWalking = false;
    }

    // Limites do mapa
    this.x = clamp(this.x, mapBounds.minX, mapBounds.maxX);
    this.y = clamp(this.y, mapBounds.minY, mapBounds.maxY);
  }

  draw(ctx, basketCount = 0, basketCap = 10) {
    assetManager.drawPlayer(
      ctx,
      this.x,
      this.y,
      this.facing,
      this.isWalking,
      this.walkTime,
      basketCount,
      basketCap,
      this.isSeated
    );
  }
}
