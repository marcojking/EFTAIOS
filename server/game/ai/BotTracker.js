const { getAdjacentSectors, getReachableSectors } = require('../mapUtils');
const { ParticleFilter } = require('./ParticleFilter');

/**
 * BotTracker - Enhanced Probabilistic Tracking System
 *
 * Now uses a ParticleFilter for more accurate belief tracking.
 * Maintains:
 * - Particle-based location probability distributions
 * - Role confirmation (human/alien)
 * - Trajectory correlation across turns
 * - Proper YOUR_SECTOR vs ANY_SECTOR distinction
 */
class BotTracker {
    constructor(myPlayerId, map, players, gameSettings = {}, seed = null) {
        this.myPlayerId = myPlayerId;
        this.map = map;
        this.beliefs = new Map(); // playerId -> PlayerBelief (legacy, for compatibility)
        this.turnCounter = 0;
        this.settings = gameSettings;

        // Track processed announcement indices to avoid reprocessing
        this.lastProcessedAnnouncementIndex = 0;

        // Track sectors that were attacked and found empty
        this.confirmedEmptySectors = new Map(); // sector -> turn when confirmed empty

        // Particle filter for advanced tracking (uses seeded RNG for determinism)
        this.particleFilter = new ParticleFilter(myPlayerId, map, players, {
            numParticles: 400,  // Adaptive 300-600 range
            lieProb: 0.5,       // Prior probability of lying in ANY_SECTOR
            seed: seed || Date.now()
        });

        // Initialize legacy belief for all other players (for backwards compatibility)
        players.forEach(p => {
            if (p.id !== myPlayerId) {
                this.beliefs.set(p.id, new PlayerBelief(p.id, p.name, map, players));
            }
        });

        console.log(`[BotTracker] Initialized for ${myPlayerId} tracking ${this.beliefs.size} opponents.`);
    }

    /**
     * Update settings (called when game settings change)
     */
    updateSettings(settings) {
        this.settings = settings;
    }

    /**
     * Process all new announcements since last check
     */
    processNewAnnouncements(announcements, players, gameState = null) {
        const newAnnouncements = announcements.slice(this.lastProcessedAnnouncementIndex);

        // Update particle filter with full game state if available
        if (gameState) {
            this.particleFilter.update(gameState);
        }

        newAnnouncements.forEach(a => {
            if (a.playerId && a.playerId !== this.myPlayerId) {
                const player = players.find(p => p.id === a.playerId);
                if (player) {
                    this.processAnnouncement(a, player, players);
                }
            }

            // Also process announcements that reveal info about OTHER players
            if (a.type === 'SPOTLIGHT' && a.revealed) {
                a.revealed.forEach(r => {
                    if (r.id !== this.myPlayerId) {
                        const belief = this.beliefs.get(r.id);
                        if (belief) {
                            belief.collapseTo(r.position);
                        }
                    }
                });
            }

            if (a.type === 'SENSOR' && a.targetId && a.targetId !== this.myPlayerId) {
                const belief = this.beliefs.get(a.targetId);
                if (belief && a.targetSector) {
                    belief.collapseTo(a.targetSector);
                }
            }

            // Track empty sectors from failed attacks
            if (a.type === 'ATTACK' && (!a.victims || a.victims.length === 0)) {
                this.confirmedEmptySectors.set(a.sector, this.turnCounter);
            }
        });

        this.lastProcessedAnnouncementIndex = announcements.length;
    }

    /**
     * Update beliefs based on a public game announcement
     */
    processAnnouncement(announcement, currentPlayer, allPlayers) {
        if (!currentPlayer || currentPlayer.id === this.myPlayerId) return;

        const belief = this.beliefs.get(currentPlayer.id);
        if (!belief) return;

        const type = announcement.type;

        switch (type) {
            case 'NOISE':
            case 'NOISE_IN_SECTOR':
                // Noise declaration - could be true or lie (Noise Any Sector card)
                if (announcement.sector) {
                    belief.updateForNoise(announcement.sector, this.map, this.turnCounter);
                }
                // Handle double noise (Pilot power or Cat item)
                if (announcement.sectors && Array.isArray(announcement.sectors)) {
                    // Both sectors are announced - one is real, one is fake
                    // Give both moderate probability
                    announcement.sectors.forEach(sector => {
                        belief.updateForNoise(sector, this.map, this.turnCounter, 0.5);
                    });
                }
                break;

            case 'SILENCE':
            case 'SILENT_MOVE':
            case 'SILENT_SECTOR':
                // Player moved silently - expand probability cloud
                belief.updateForSilence(currentPlayer.moveSpeed || 1);
                break;

            case 'ATTACK':
                // Attack reveals exact location and confirms alien role
                belief.collapseTo(announcement.sector);
                // Check if they used Attack card (human with item) or are alien
                const revealEnabled = this.settings.revealCardsAndAbilities;
                if (revealEnabled) {
                    // If reveal is on and no ATTACK item announcement preceded this,
                    // they're likely an alien (aliens attack without items)
                    // This is handled by checking for attack item usage in other announcements
                    belief.increaseAlienConfidence(0.3);
                }
                break;

            case 'ESCAPE':
                belief.isEscaped = true;
                belief.setRole('human');
                belief.collapseTo(announcement.sector);
                break;

            case 'ESCAPE_FAILED':
                // Player confirmed at this hatch location, confirmed human
                belief.collapseTo(announcement.sector);
                belief.setRole('human');
                break;

            case 'MUTATION':
                // Player mutated - now alien at alien spawn
                belief.setRole('alien');
                belief.isMutated = true;
                const alienStart = this.map.grid.find(h => h.state === 'alien-start');
                if (alienStart) {
                    belief.collapseTo(alienStart.label);
                }
                break;

            case 'ELIMINATED':
                belief.isEliminated = true;
                break;

            case 'CLONE_USED':
                // Player teleported to Human Sector, confirmed human
                belief.setRole('human');
                const humanStart = this.map.grid.find(h => h.state === 'human-start');
                if (humanStart) {
                    belief.collapseTo(humanStart.label);
                }
                break;

            case 'DEFENSE_USED':
                // Survived attack at a location, confirms human (usually)
                if (announcement.sector) {
                    belief.collapseTo(announcement.sector);
                }
                belief.setRole('human');
                break;

            case 'ATTACK_IMMUNE':
                // Brute alien power - confirms alien
                if (announcement.sector) {
                    belief.collapseTo(announcement.sector);
                }
                belief.setRole('alien');
                break;

            case 'TELEPORT_USED':
                // Player teleported to human start
                belief.setRole('human');
                const hStart = this.map.grid.find(h => h.state === 'human-start');
                if (hStart) {
                    belief.collapseTo(hStart.label);
                }
                break;

            case 'ADRENALINE_USED':
            case 'SEDATIVES_USED':
                // Item usage confirms human (unless alien with special power)
                belief.increaseHumanConfidence(0.3);
                break;

            case 'SPOTLIGHT':
                // User of spotlight is likely human
                belief.increaseHumanConfidence(0.2);
                break;

            case 'SENSOR':
                // User of sensor is likely human
                belief.increaseHumanConfidence(0.2);
                break;

            case 'REVEAL_IDENTITY':
                // Medic power - user is human, target role is revealed
                belief.setRole('human');
                if (announcement.targetId && announcement.targetRole) {
                    const targetBelief = this.beliefs.get(announcement.targetId);
                    if (targetBelief) {
                        targetBelief.setRole(announcement.targetRole);
                    }
                }
                break;

            case 'POWER_FREE_TELEPORT':
                // Co-Pilot power - confirms human
                belief.setRole('human');
                if (announcement.sector) {
                    belief.collapseTo(announcement.sector);
                }
                break;
        }
    }

    /**
     * Called when a player ends their turn - diffuse probability
     */
    processEndTurn(playerId, moveSpeed = 1) {
        if (playerId === this.myPlayerId) return;

        const belief = this.beliefs.get(playerId);
        if (belief && !belief.isEscaped && !belief.isEliminated) {
            belief.diffuse(moveSpeed, this.map);
        }
    }

    /**
     * Increment turn counter
     */
    nextTurn() {
        this.turnCounter++;

        // Clear old empty sector confirmations (only valid for 1-2 turns)
        this.confirmedEmptySectors.forEach((turn, sector) => {
            if (this.turnCounter - turn > 2) {
                this.confirmedEmptySectors.delete(sector);
            }
        });
    }

    /**
     * Check if a noise declaration is plausible given known positions
     */
    isNoisePlausible(playerId, declaredSector, maxMoves) {
        const belief = this.beliefs.get(playerId);
        if (!belief) return true;

        // Check if the declared sector is reachable from any probable position
        let isReachable = false;
        Object.entries(belief.heatmap).forEach(([sector, prob]) => {
            if (prob > 0.01) {
                const reachable = getReachableSectors(this.map, sector, maxMoves, 'human');
                if (reachable.some(r => r.sector === declaredSector)) {
                    isReachable = true;
                }
            }
        });

        return isReachable;
    }

    /**
     * Get aggregated human probability for a sector
     * Now uses particle filter for more accurate tracking
     */
    getHumanProbability(sector) {
        // Use particle filter as primary source
        return this.particleFilter.getHumanAtSectorProbability(sector);
    }

    /**
     * Get aggregated alien probability for a sector
     * Now uses particle filter for more accurate tracking
     */
    getAlienProbability(sector) {
        // Use particle filter as primary source
        return this.particleFilter.getAlienAtSectorProbability(sector);
    }

    /**
     * Get human hotspots (top sectors by human probability)
     */
    getHumanHotspots(n = 5) {
        return this.particleFilter.getHumanHotspots(n);
    }

    /**
     * Get position probability for a specific player at a sector
     */
    getPlayerPositionProbability(playerId, sector) {
        return this.particleFilter.getPositionProbability(playerId, sector);
    }

    /**
     * Get most likely position for a player
     */
    getMostLikelyPosition(playerId) {
        return this.particleFilter.getMostLikelyPosition(playerId);
    }

    /**
     * Get confirmed humans (high confidence)
     */
    getConfirmedHumans() {
        const humans = [];
        this.beliefs.forEach((belief, playerId) => {
            if (belief.roleProb.human >= 0.9 && !belief.isEscaped && !belief.isEliminated) {
                humans.push({
                    id: playerId,
                    name: belief.playerName,
                    mostLikelySector: belief.getMostLikelySector(),
                    confidence: belief.getHighestProbability()
                });
            }
        });
        return humans;
    }

    /**
     * Get confirmed aliens (high confidence)
     */
    getConfirmedAliens() {
        const aliens = [];
        this.beliefs.forEach((belief, playerId) => {
            if (belief.roleProb.alien >= 0.9 && !belief.isEliminated) {
                aliens.push({
                    id: playerId,
                    name: belief.playerName,
                    mostLikelySector: belief.getMostLikelySector(),
                    confidence: belief.getHighestProbability()
                });
            }
        });
        return aliens;
    }

    /**
     * Get debug info for all beliefs
     */
    getDebugInfo() {
        const info = {};
        this.beliefs.forEach((belief, playerId) => {
            info[playerId] = {
                name: belief.playerName,
                roleProb: belief.roleProb,
                mostLikelySector: belief.getMostLikelySector(),
                highestProb: belief.getHighestProbability(),
                isEscaped: belief.isEscaped,
                isEliminated: belief.isEliminated,
                isMutated: belief.isMutated
            };
        });
        return info;
    }
}

/**
 * PlayerBelief - Tracks one specific opponent's state
 */
class PlayerBelief {
    constructor(playerId, playerName, map, players) {
        this.playerId = playerId;
        this.playerName = playerName;
        this.map = map;
        this.heatmap = {}; // sectorLabel -> probability (0.0 to 1.0)
        this.roleProb = { human: 0.5, alien: 0.5 };
        this.isEscaped = false;
        this.isEliminated = false;
        this.isMutated = false;
        this.lastKnownTurn = 0;
        this.lastKnownSector = null;

        // Initialize with spawn probabilities
        this.initializeSpawnProbability(map, players);
    }

    /**
     * Initialize probability based on spawn locations
     */
    initializeSpawnProbability(map, players) {
        const humanStart = map.grid.find(h => h.state === 'human-start');
        const alienStart = map.grid.find(h => h.state === 'alien-start');
        const validSectors = map.grid.filter(h => h.state !== 'empty').map(h => h.label);

        // Count humans vs aliens to estimate role probability
        const numPlayers = players.length;
        const numHumans = Math.ceil(numPlayers / 2);
        const numAliens = numPlayers - numHumans;

        this.roleProb = {
            human: numHumans / numPlayers,
            alien: numAliens / numPlayers
        };

        // Initialize heatmap with spawn location probability
        validSectors.forEach(label => {
            this.heatmap[label] = 0;
        });

        // Higher probability at spawn points based on role probability
        if (humanStart) {
            this.heatmap[humanStart.label] = this.roleProb.human;
        }
        if (alienStart) {
            this.heatmap[alienStart.label] = this.roleProb.alien;
        }

        this.normalize();
    }

    /**
     * Update heatmap for noise declaration
     */
    updateForNoise(sector, map, currentTurn, confidence = 0.8) {
        // Check if sector is valid
        if (!this.heatmap.hasOwnProperty(sector)) return;

        // Boost the target sector
        Object.keys(this.heatmap).forEach(s => {
            if (s === sector) {
                this.heatmap[s] = Math.max(this.heatmap[s], confidence);
            } else {
                this.heatmap[s] *= (1 - confidence * 0.5);
            }
        });

        this.lastKnownTurn = currentTurn;
        this.lastKnownSector = sector;
        this.normalize();
    }

    /**
     * Update for silence - expand probability cloud
     */
    updateForSilence(moveDistance) {
        this.diffuse(moveDistance, this.map);
    }

    /**
     * Collapse probability to a single sector (100% certainty)
     */
    collapseTo(sector) {
        Object.keys(this.heatmap).forEach(s => this.heatmap[s] = 0);
        if (this.heatmap.hasOwnProperty(sector)) {
            this.heatmap[sector] = 1.0;
        }
        this.lastKnownSector = sector;
    }

    /**
     * Set role with certainty
     */
    setRole(role) {
        if (role === 'human') {
            this.roleProb = { human: 1.0, alien: 0.0 };
        } else {
            this.roleProb = { human: 0.0, alien: 1.0 };
        }
    }

    /**
     * Increase confidence that player is human
     */
    increaseHumanConfidence(amount) {
        this.roleProb.human = Math.min(1.0, this.roleProb.human + amount);
        this.roleProb.alien = 1.0 - this.roleProb.human;
    }

    /**
     * Increase confidence that player is alien
     */
    increaseAlienConfidence(amount) {
        this.roleProb.alien = Math.min(1.0, this.roleProb.alien + amount);
        this.roleProb.human = 1.0 - this.roleProb.alien;
    }

    /**
     * Spread probability to adjacent sectors (Movement simulation)
     */
    diffuse(range, map) {
        const newHeatmap = {};

        Object.keys(this.heatmap).forEach(currentSector => {
            const prob = this.heatmap[currentSector];
            if (prob <= 0.001) return;

            // Find reachable sectors
            const reachable = getReachableSectors(map, currentSector, range, 'human');

            if (reachable.length === 0) {
                // Can't move from here, keep probability
                newHeatmap[currentSector] = (newHeatmap[currentSector] || 0) + prob;
                return;
            }

            // Distribute probability to reachable sectors
            const splitProb = prob / reachable.length;

            reachable.forEach(node => {
                newHeatmap[node.sector] = (newHeatmap[node.sector] || 0) + splitProb;
            });
        });

        this.heatmap = newHeatmap;
        this.normalize();
    }

    /**
     * Normalize heatmap to sum to 1.0
     */
    normalize() {
        let total = 0;
        Object.values(this.heatmap).forEach(p => total += p);
        if (total === 0) return;
        Object.keys(this.heatmap).forEach(k => this.heatmap[k] /= total);
    }

    /**
     * Get the sector with highest probability
     */
    getMostLikelySector() {
        let max = 0;
        let sector = null;
        Object.entries(this.heatmap).forEach(([s, p]) => {
            if (p > max) {
                max = p;
                sector = s;
            }
        });
        return sector;
    }

    /**
     * Get the highest probability value
     */
    getHighestProbability() {
        return Math.max(...Object.values(this.heatmap), 0);
    }

    /**
     * Get top N most likely sectors
     */
    getTopSectors(n = 5) {
        const sorted = Object.entries(this.heatmap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n);
        return sorted.map(([sector, prob]) => ({ sector, prob }));
    }
}

module.exports = BotTracker;
