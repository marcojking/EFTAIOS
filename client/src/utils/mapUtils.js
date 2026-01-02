// Client-side map utilities for EFTAIOS hex grid
// Ported from server/game/mapUtils.js for client-side reachable sector calculation

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVW';

// Parse sector label (e.g., "L06") into column and row
export function parseSectorLabel(label) {
    const col = label.charAt(0);
    const row = parseInt(label.substring(1), 10);
    return {
        col: ALPHA.indexOf(col),
        row: row
    };
}

// Create sector label from column and row
export function createSectorLabel(col, row) {
    return `${ALPHA[col]}${String(row).padStart(2, '0')}`;
}

// Get adjacent sectors for a hex (offset coordinates, odd-q layout)
export function getAdjacentSectors(map, sectorLabel) {
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

// Get all reachable sectors from a position
export function getReachableSectors(map, fromSector, maxDistance, playerRole) {
    if (!map?.grid || !fromSector) return [];

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
                reachable.push(sector);
            }
        }

        if (distance < maxDistance) {
            const adjacent = getAdjacentSectors(map, sector);
            adjacent.forEach(adj => {
                if (!visited.has(adj)) {
                    const adjSector = map.grid.find(h => h.label === adj);
                    if (adjSector &&
                        adjSector.state !== 'empty' &&
                        adjSector.state !== 'human-start' &&
                        adjSector.state !== 'alien-start') {
                        visited.add(adj);
                        queue.push({ sector: adj, distance: distance + 1 });
                    }
                }
            });
        }
    }

    return reachable;
}
