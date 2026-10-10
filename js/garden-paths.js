export function getGardenPathSegments(plots, {
  originX,
  originY,
  plotWidth,
  plotHeight,
  gapX,
  gapY,
  leftExtent,
  rightExtent
}) {
  const plotsByGrid = new Map(plots.map((plot) => [`${plot.gridX},${plot.gridY}`, plot]));
  const stepX = plotWidth + gapX;
  const stepY = plotHeight + gapY;
  const maxGridY = Math.max(0, ...plots.map((plot) => plot.gridY));
  const bottomRoadY = originY + maxGridY * stepY + plotHeight + 24;
  const vertical = [];
  const horizontal = [];
  const horizontalRows = new Set();
  const adjacentRowsByColumn = new Map();

  for (const plot of plots) {
    if (plotsByGrid.has(`${plot.gridX + 1},${plot.gridY}`)) {
      const adjacentRows = adjacentRowsByColumn.get(plot.gridX) || [];
      adjacentRows.push(plot.gridY);
      adjacentRowsByColumn.set(plot.gridX, adjacentRows);
    }
    if (plotsByGrid.has(`${plot.gridX},${plot.gridY + 1}`)) {
      horizontalRows.add(plot.gridY);
    }
  }

  for (const [column, rows] of adjacentRowsByColumn) {
    const sortedRows = [...new Set(rows)].sort((a, b) => a - b);
    let rangeStart = sortedRows[0];
    let rangeEnd = rangeStart;
    const addVerticalPath = () => {
      const y = originY + rangeStart * stepY;
      const horizontalPathY = horizontalRows.has(rangeEnd)
        ? originY + rangeEnd * stepY + plotHeight + gapY / 2
        : null;
      const bottom = horizontalPathY ?? (rangeEnd === maxGridY
        ? bottomRoadY
        : originY + rangeEnd * stepY + plotHeight);
      vertical.push({
        x: originX + column * stepX + plotWidth + gapX / 2,
        y,
        width: 0,
        height: bottom - y
      });
    };

    for (const row of sortedRows.slice(1)) {
      if (row === rangeEnd + 1) {
        rangeEnd = row;
        continue;
      }
      addVerticalPath();
      rangeStart = row;
      rangeEnd = row;
    }
    addVerticalPath();
  }

  for (const row of horizontalRows) {
    horizontal.push({
      x: leftExtent,
      y: originY + row * stepY + plotHeight,
      width: rightExtent - leftExtent,
      height: gapY
    });
  }

  return { vertical, horizontal };
}
