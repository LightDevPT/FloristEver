import assert from 'node:assert/strict';
import test from 'node:test';
import { getGardenPathSegments } from '../js/garden-paths.js';

const geometry = {
  originX: 400,
  originY: 160,
  plotWidth: 190,
  plotHeight: 140,
  gapX: 28,
  gapY: 32,
  leftExtent: 350,
  rightExtent: 2116,
  mainRoadX: 350
};

function createGrid(columns, rows) {
  return Array.from({ length: columns * rows }, (_, index) => ({
    gridX: index % columns,
    gridY: Math.floor(index / columns)
  }));
}

test('every adjacent pair of garden plots is joined by continuous paths', () => {
  const plots = createGrid(8, 6);
  const paths = getGardenPathSegments(plots, geometry);

  assert.equal(paths.vertical.length, 7);
  assert.equal(paths.horizontal.length, 5);
  assert.ok(paths.vertical.every((path) => (
    path.width === 0
    && path.height === 5 * (geometry.plotHeight + geometry.gapY) + geometry.plotHeight + 24
  )));
  assert.ok(paths.horizontal.every((path) => (
    path.x === geometry.leftExtent
    && path.width === geometry.rightExtent - geometry.leftExtent
    && path.height === geometry.gapY
  )));
  assert.ok(paths.horizontal.every((path) => (
    path.x === geometry.mainRoadX
    && path.x + path.width === geometry.rightExtent
  )));
  const firstPlotRowLastLane = paths.vertical[0];
  const firstCrossAisle = paths.horizontal.find((path) => path.y === geometry.originY + geometry.plotHeight);
  assert.equal(firstPlotRowLastLane.x, geometry.originX + geometry.plotWidth + geometry.gapX / 2);
  assert.ok(firstPlotRowLastLane.y < firstCrossAisle.y);
  assert.ok(firstPlotRowLastLane.y + firstPlotRowLastLane.height > firstCrossAisle.y);
});

test('garden paths only bridge actual neighboring plots in incomplete rows', () => {
  const plots = [
    { gridX: 0, gridY: 0 },
    { gridX: 1, gridY: 0 },
    { gridX: 0, gridY: 1 },
    { gridX: 2, gridY: 1 }
  ];
  const paths = getGardenPathSegments(plots, geometry);

  assert.deepEqual(paths.vertical, [{
    x: geometry.originX + geometry.plotWidth + geometry.gapX / 2,
    y: geometry.originY,
    width: 0,
    height: geometry.plotHeight + geometry.gapY / 2
  }]);
  assert.deepEqual(paths.horizontal, [{
    x: geometry.leftExtent,
    y: geometry.originY + geometry.plotHeight,
    width: geometry.rightExtent - geometry.leftExtent,
    height: geometry.gapY
  }]);
});

test('vertical paths stay separate when adjacent plot rows are missing', () => {
  const plots = [
    { gridX: 0, gridY: 0 },
    { gridX: 1, gridY: 0 },
    { gridX: 0, gridY: 2 },
    { gridX: 1, gridY: 2 }
  ];
  const paths = getGardenPathSegments(plots, geometry);

  assert.equal(paths.vertical.length, 2);
  assert.deepEqual(paths.vertical.map(({ y, height }) => ({ y, height })), [
    { y: geometry.originY, height: geometry.plotHeight },
    {
      y: geometry.originY + 2 * (geometry.plotHeight + geometry.gapY),
      height: geometry.plotHeight + 24
    }
  ]);
});
