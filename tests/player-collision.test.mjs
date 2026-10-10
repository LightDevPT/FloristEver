import assert from 'node:assert/strict';
import test from 'node:test';
import { Player } from '../js/entities/player.js';

function rectCollision(x, y, rect, radius) {
  const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
  return (x - closestX) ** 2 + (y - closestY) ** 2 >= radius ** 2;
}

test('player stops at solid obstacles and slides along their edges', () => {
  const player = new Player(0, 0);
  const obstacle = { x: 20, y: -40, width: 30, height: 80 };
  const canOccupy = (x, y) => rectCollision(x, y, obstacle, player.radius);

  player.setInput(1, 0);
  player.update(0.5, 1, { minX: -100, maxX: 100, minY: -100, maxY: 100 }, canOccupy);

  assert.ok(player.x <= obstacle.x - player.radius + 0.1);
  assert.ok(player.x > 0);

  const stoppedX = player.x;
  player.setInput(1, 1);
  player.update(0.1, 1, { minX: -100, maxX: 100, minY: -100, maxY: 100 }, canOccupy);

  assert.ok(player.x <= obstacle.x - player.radius + 0.1);
  assert.ok(player.y > 0);
  assert.ok(player.x >= stoppedX - 0.1);
});

test('click-to-move cancels when an obstacle blocks all movement', () => {
  const player = new Player(0, 0);
  const obstacle = { x: 20, y: -40, width: 30, height: 80 };
  const canOccupy = (x, y) => rectCollision(x, y, obstacle, player.radius);
  const mapBounds = { minX: -100, maxX: 100, minY: -100, maxY: 100 };

  player.setTarget(100, 0);
  player.update(1, 1, mapBounds, canOccupy);
  player.update(1, 1, mapBounds, canOccupy);

  assert.ok(player.x <= obstacle.x - player.radius + 0.1);
  assert.equal(player.hasTarget, false);
});

test('player can recover and move after an interaction places it inside an obstacle', () => {
  const player = new Player(25, 0);
  const obstacle = { x: 0, y: -20, width: 50, height: 40 };
  const canOccupy = (x, y) => rectCollision(x, y, obstacle, player.radius);

  player.setInput(1, 0);
  player.update(0.1, 1, { minX: -100, maxX: 100, minY: -100, maxY: 100 }, canOccupy);

  assert.ok(canOccupy(player.x, player.y));
  assert.ok(player.x > obstacle.x + obstacle.width);
});
