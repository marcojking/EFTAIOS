// Map utilities for EFTAIOS hex grid

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVW';

// Parse sector label (e.g., "L06") into column and row
function parseSectorLabel(label) {
  const col = label.charAt(0);
  const row = parseInt(label.substring(1), 10);
  return {
    col: ALPHA.indexOf(col),
    row: row
  };
}

// Create sector label from column and row
function createSectorLabel(col, row) {
  return `${ALPHA[col]}${String(row).padStart(2, '0')}`;
}

// Get adjacent sectors for a hex (offset coordinates, odd-q layout)
function getAdjacentSectors(map, sectorLabel) {
  const { col, row } = parseSectorLabel(sectorLabel);
  const adjacent = [];

  // Hex neighbors depend on whether column is odd or even
  const isOddCol = col % 2 === 1;

  // Directions for odd-q offset coordinates
  const directions = isOddCol
    ? [
      { dc: -1, dr: 0 },  // top-left
      { dc: -1, dr: 1 },  // bottom-left
      { dc: 0, dr: -1 },  // top
      { dc: 0, dr: 1 },   // bottom
      { dc: 1, dr: 0 },   // top-right
      { dc: 1, dr: 1 }    // bottom-right
    ]
    : [
      { dc: -1, dr: -1 }, // top-left
      { dc: -1, dr: 0 },  // bottom-left
      { dc: 0, dr: -1 },  // top
      { dc: 0, dr: 1 },   // bottom
      { dc: 1, dr: -1 },  // top-right
      { dc: 1, dr: 0 }    // bottom-right
    ];

  directions.forEach(({ dc, dr }) => {
    const newCol = col + dc;
    const newRow = row + dr;

    if (newCol >= 0 && newCol < ALPHA.length && newRow > 0) {
      const label = createSectorLabel(newCol, newRow);
      // Check if this sector exists and is not empty
      const sector = map.grid.find(h => h.label === label);
      if (sector && sector.state !== 'empty') {
        adjacent.push(label);
      }
    }
  });

  return adjacent;
}

// Check if a move is valid
function isValidMove(map, fromSector, toSector, maxDistance, playerRole) {
  // Can't stay in place
  if (fromSector === toSector) {
    return { valid: false, error: 'Cannot stay in the same sector' };
  }

  // Check if destination exists
  const destSector = map.grid.find(h => h.label === toSector);
  if (!destSector) {
    return { valid: false, error: 'Invalid destination sector' };
  }

  // Check if destination is passable
  if (destSector.state === 'empty') {
    return { valid: false, error: 'Cannot move into empty space' };
  }

  // Check if destination is blocked starting sector
  if (destSector.state === 'human-start' || destSector.state === 'alien-start') {
    return { valid: false, error: 'Cannot enter starting sectors after game begins' };
  }

  // Check if alien trying to enter escape hatch
  if (destSector.state === 'airlock' && playerRole === 'alien') {
    return { valid: false, error: 'Aliens cannot enter escape hatches' };
  }

  // BFS to find shortest path
  const visited = new Set();
  const queue = [{ sector: fromSector, distance: 0 }];
  visited.add(fromSector);

  while (queue.length > 0) {
    const { sector, distance } = queue.shift();

    if (sector === toSector) {
      if (distance <= maxDistance) {
        return { valid: true, distance };
      } else {
        return { valid: false, error: `Too far. Max distance: ${maxDistance}, required: ${distance}` };
      }
    }

    if (distance < maxDistance) {
      // Check if current sector stops movement (e.g. Airlock for Humans)
      // Humans can move INTO an airlock, but cannot move THROUGH it to another sector
      const currentSectorData = map.grid.find(h => h.label === sector);
      if (currentSectorData && currentSectorData.state === 'airlock' && sector !== fromSector) {
        // Stop expansion from this node
      } else {
        const adjacent = getAdjacentSectors(map, sector);
        adjacent.forEach(adj => {
          if (!visited.has(adj)) {
            const adjSector = map.grid.find(h => h.label === adj);
            // Can pass through any non-empty, non-starting sector
            if (adjSector &&
              adjSector.state !== 'empty' &&
              adjSector.state !== 'human-start' &&
              adjSector.state !== 'alien-start') {

              // Aliens cannot enter escape hatches at all
              if (adjSector.state === 'airlock' && playerRole === 'alien') {
                return;
              }

              visited.add(adj);
              queue.push({ sector: adj, distance: distance + 1 });
            }
          }
        });
      }
    }
  }

  return { valid: false, error: 'No valid path to destination' };
}

// Get all reachable sectors from a position
function getReachableSectors(map, fromSector, maxDistance, playerRole) {
  const reachable = [];
  const visited = new Set();
  const queue = [{ sector: fromSector, distance: 0 }];
  visited.add(fromSector);

  while (queue.length > 0) {
    const { sector, distance } = queue.shift();

    if (sector !== fromSector) {
      const sectorData = map.grid.find(h => h.label === sector);
      // Check if this is a valid destination
      if (sectorData &&
        sectorData.state !== 'empty' &&
        sectorData.state !== 'human-start' &&
        sectorData.state !== 'alien-start' &&
        !(sectorData.state === 'airlock' && playerRole === 'alien')) {
        reachable.push({ sector, distance });
      }
    }

    if (distance < maxDistance) {
      // Check if current sector stops movement (e.g. Airlock for Humans)
      const currentSectorData = map.grid.find(h => h.label === sector);
      if (currentSectorData && currentSectorData.state === 'airlock' && sector !== fromSector) {
        // Stop expansion
      } else {
        const adjacent = getAdjacentSectors(map, sector);
        adjacent.forEach(adj => {
          if (!visited.has(adj)) {
            const adjSector = map.grid.find(h => h.label === adj);
            if (adjSector &&
              adjSector.state !== 'empty' &&
              adjSector.state !== 'human-start' &&
              adjSector.state !== 'alien-start') {

              // Aliens cannot enter escape hatches
              if (adjSector.state === 'airlock' && playerRole === 'alien') {
                return;
              }

              visited.add(adj);
              queue.push({ sector: adj, distance: distance + 1 });
            }
          }
        });
      }
    }
  }

  return reachable;
}

module.exports = {
  parseSectorLabel,
  createSectorLabel,
  getAdjacentSectors,
  isValidMove,
  getReachableSectors,
  ALPHA
};
