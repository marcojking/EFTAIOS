/**
 * MapAnalyzer.js
 *
 * Analyzes any game map to extract strategic information for bots.
 * Map-agnostic - works with any map configuration.
 */

const { getAdjacentSectors, getReachableSectors } = require('../mapUtils');

class MapAnalyzer {
    constructor(map) {
        this.map = map;
        this.analysis = null;

        // Run analysis on construction
        this.analyze();
    }

    /**
     * Analyze the map and compute strategic data
     */
    analyze() {
        const grid = this.map.grid || [];

        // Extract key locations
        const humanStart = grid.find(h => h.state === 'human-start');
        const alienStart = grid.find(h => h.state === 'alien-start');
        const escapeHatches = grid.filter(h => h.state === 'airlock').map(h => h.label);
        const dangerousSectors = grid.filter(h => h.state === 'dangerous').map(h => h.label);
        const silentSectors = grid.filter(h => h.state === 'secure' || h.state === 'safe').map(h => h.label);
        const allSectors = grid.filter(h => h.state !== 'empty').map(h => h.label);

        // Compute distance matrix from human start to all escape hatches
        const escapeDistances = {};
        escapeHatches.forEach(hatch => {
            escapeDistances[hatch] = this.computeDistance(humanStart?.label, hatch);
        });

        // Find the closest escape hatch from human start
        let closestHatch = null;
        let closestDistance = Infinity;
        Object.entries(escapeDistances).forEach(([hatch, dist]) => {
            if (dist < closestDistance) {
                closestDistance = dist;
                closestHatch = hatch;
            }
        });

        // Compute sector connectivity (how many adjacent sectors)
        const connectivity = {};
        allSectors.forEach(sector => {
            const adjacent = getAdjacentSectors(this.map, sector);
            connectivity[sector] = adjacent.length;
        });

        // Find choke points (sectors with high traffic/connectivity in key paths)
        const chokePoints = this.findChokePoints(humanStart?.label, escapeHatches, allSectors);

        // Compute safe corridors (paths with more silent sectors)
        const safeCorridors = this.findSafeCorridors(humanStart?.label, escapeHatches, silentSectors);

        // Compute patrol routes for aliens (sectors between human spawn and escape hatches)
        const patrolZones = this.findPatrolZones(humanStart?.label, alienStart?.label, escapeHatches);

        // Store analysis results
        this.analysis = {
            humanStart: humanStart?.label,
            alienStart: alienStart?.label,
            escapeHatches,
            dangerousSectors,
            silentSectors,
            allSectors,
            escapeDistances,
            closestHatch,
            closestDistance,
            connectivity,
            chokePoints,
            safeCorridors,
            patrolZones
        };

        console.log(`[MapAnalyzer] Analysis complete:`, {
            hatches: escapeHatches.length,
            chokePoints: chokePoints.length,
            patrolZones: patrolZones.length
        });

        return this.analysis;
    }

    /**
     * Find choke points - high-connectivity sectors on paths to escape hatches
     */
    findChokePoints(humanStart, escapeHatches, allSectors) {
        const chokePoints = [];

        // Score each sector based on how often it appears on shortest paths to hatches
        const pathScores = {};
        allSectors.forEach(s => pathScores[s] = 0);

        escapeHatches.forEach(hatch => {
            const path = this.findPath(humanStart, hatch);
            if (path) {
                path.forEach(sector => {
                    pathScores[sector] = (pathScores[sector] || 0) + 1;
                });
            }
        });

        // Sectors that appear on multiple paths are choke points
        Object.entries(pathScores).forEach(([sector, score]) => {
            if (score >= 2) {  // Appears on paths to at least 2 hatches
                chokePoints.push({
                    sector,
                    score,
                    adjacent: getAdjacentSectors(this.map, sector).length
                });
            }
        });

        // Sort by score (higher = more important choke point)
        chokePoints.sort((a, b) => b.score - a.score);

        return chokePoints.map(cp => cp.sector);
    }

    /**
     * Find safe corridors - paths that favor silent sectors
     */
    findSafeCorridors(humanStart, escapeHatches, silentSectors) {
        const corridors = [];

        escapeHatches.forEach(hatch => {
            // Find path preferring silent sectors
            const path = this.findPathWeighted(humanStart, hatch, silentSectors);
            if (path && path.length > 0) {
                const silentCount = path.filter(s => silentSectors.includes(s)).length;
                corridors.push({
                    hatch,
                    path,
                    silentRatio: silentCount / path.length,
                    length: path.length
                });
            }
        });

        return corridors;
    }

    /**
     * Find patrol zones for aliens - areas between human spawn and escape hatches
     */
    findPatrolZones(humanStart, alienStart, escapeHatches) {
        const zones = new Set();

        // Add sectors near escape hatches
        escapeHatches.forEach(hatch => {
            zones.add(hatch);
            const adjacent = getAdjacentSectors(this.map, hatch);
            adjacent.forEach(a => zones.add(a.label || a));
        });

        // Add midpoint sectors between human start and each hatch
        escapeHatches.forEach(hatch => {
            const path = this.findPath(humanStart, hatch);
            if (path && path.length > 2) {
                // Add middle portion of path
                const midStart = Math.floor(path.length / 3);
                const midEnd = Math.floor(path.length * 2 / 3);
                for (let i = midStart; i <= midEnd; i++) {
                    zones.add(path[i]);
                }
            }
        });

        return Array.from(zones);
    }

    /**
     * Compute distance between two sectors using BFS
     */
    computeDistance(from, to) {
        if (!from || !to) return Infinity;
        if (from === to) return 0;

        const visited = new Set();
        const queue = [{ sector: from, distance: 0 }];
        visited.add(from);

        while (queue.length > 0) {
            const { sector, distance } = queue.shift();

            if (sector === to) {
                return distance;
            }

            const adjacent = getAdjacentSectors(this.map, sector);
            for (const adj of adjacent) {
                const adjLabel = adj.label || adj;
                if (!visited.has(adjLabel)) {
                    visited.add(adjLabel);
                    queue.push({ sector: adjLabel, distance: distance + 1 });
                }
            }
        }

        return Infinity;  // No path found
    }

    /**
     * Find shortest path between two sectors using BFS
     */
    findPath(from, to) {
        if (!from || !to) return null;
        if (from === to) return [from];

        const visited = new Set();
        const queue = [{ sector: from, path: [from] }];
        visited.add(from);

        while (queue.length > 0) {
            const { sector, path } = queue.shift();

            if (sector === to) {
                return path;
            }

            const adjacent = getAdjacentSectors(this.map, sector);
            for (const adj of adjacent) {
                const adjLabel = adj.label || adj;
                if (!visited.has(adjLabel)) {
                    visited.add(adjLabel);
                    queue.push({ sector: adjLabel, path: [...path, adjLabel] });
                }
            }
        }

        return null;  // No path found
    }

    /**
     * Find path preferring certain sectors (weighted pathfinding)
     */
    findPathWeighted(from, to, preferredSectors) {
        if (!from || !to) return null;
        if (from === to) return [from];

        // Simple weighted BFS - prefer silent sectors by adding them first
        const visited = new Set();
        const queue = [{ sector: from, path: [from], silentCount: 0 }];
        visited.add(from);

        let bestPath = null;
        let bestScore = -Infinity;

        while (queue.length > 0) {
            const { sector, path, silentCount } = queue.shift();

            if (sector === to) {
                // Score: prefer more silent sectors and shorter paths
                const score = silentCount * 10 - path.length;
                if (score > bestScore) {
                    bestScore = score;
                    bestPath = path;
                }
                continue;
            }

            const adjacent = getAdjacentSectors(this.map, sector);

            // Sort adjacent sectors - silent sectors first
            const sortedAdjacent = adjacent.sort((a, b) => {
                const aLabel = a.label || a;
                const bLabel = b.label || b;
                const aPreferred = preferredSectors.includes(aLabel) ? 0 : 1;
                const bPreferred = preferredSectors.includes(bLabel) ? 0 : 1;
                return aPreferred - bPreferred;
            });

            for (const adj of sortedAdjacent) {
                const adjLabel = adj.label || adj;
                if (!visited.has(adjLabel)) {
                    visited.add(adjLabel);
                    const newSilentCount = silentCount + (preferredSectors.includes(adjLabel) ? 1 : 0);
                    queue.push({
                        sector: adjLabel,
                        path: [...path, adjLabel],
                        silentCount: newSilentCount
                    });
                }
            }
        }

        return bestPath;
    }

    /**
     * Get distance from a sector to the nearest escape hatch
     */
    getDistanceToNearestHatch(sector, availableHatches = null) {
        const hatches = availableHatches || this.analysis.escapeHatches;
        let minDist = Infinity;

        for (const hatch of hatches) {
            const dist = this.computeDistance(sector, hatch);
            if (dist < minDist) {
                minDist = dist;
            }
        }

        return minDist;
    }

    /**
     * Get sectors within a certain distance of a position
     */
    getSectorsInRadius(center, radius) {
        const sectors = [];
        const visited = new Set();
        const queue = [{ sector: center, distance: 0 }];
        visited.add(center);

        while (queue.length > 0) {
            const { sector, distance } = queue.shift();

            if (distance <= radius) {
                sectors.push({ sector, distance });

                if (distance < radius) {
                    const adjacent = getAdjacentSectors(this.map, sector);
                    for (const adj of adjacent) {
                        const adjLabel = adj.label || adj;
                        if (!visited.has(adjLabel)) {
                            visited.add(adjLabel);
                            queue.push({ sector: adjLabel, distance: distance + 1 });
                        }
                    }
                }
            }
        }

        return sectors;
    }

    /**
     * Check if a sector is reachable from another within a given number of moves
     */
    isReachableWithin(from, to, maxMoves) {
        const dist = this.computeDistance(from, to);
        return dist <= maxMoves;
    }

    /**
     * Get sector danger level (proximity to known alien positions or high-traffic areas)
     */
    getSectorDanger(sector, alienProbabilities = {}) {
        let danger = 0;

        // Base danger from alien probabilities
        Object.entries(alienProbabilities).forEach(([alienSector, prob]) => {
            const dist = this.computeDistance(sector, alienSector);
            if (dist === 0) {
                danger += prob * 1.0;  // Same sector
            } else if (dist === 1) {
                danger += prob * 0.5;  // Adjacent
            } else if (dist === 2) {
                danger += prob * 0.2;  // Two away
            }
        });

        return Math.min(danger, 1.0);
    }

    /**
     * Get analysis results
     */
    getAnalysis() {
        return this.analysis;
    }
}

module.exports = MapAnalyzer;
