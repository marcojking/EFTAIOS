/**
 * ParticleFilter.js
 *
 * Particle filter for tracking hidden game state in EFTAIOS.
 * Maintains N particles representing plausible hidden worlds.
 * Each particle tracks positions, roles, and fed status of all players.
 */

const { getReachableSectors, getAdjacentSectors } = require('../mapUtils');
const { SeededRandom } = require('./SeededRandom');

// Default configuration
const DEFAULT_CONFIG = {
    numParticles: 400,           // Initial particle count (middle of 300-600 range)
    minParticles: 300,           // Minimum particles to maintain
    maxParticles: 600,           // Maximum particles allowed
    resampleThreshold: 0.5,      // Resample when ESS < threshold * N
    adaptiveThreshold: 0.3,      // Add particles when ESS/N < this threshold
    lieProb: 0.5,                // Prior probability of lying in ANY_SECTOR
    movementNoise: 0.1,          // Probability of suboptimal movement
    minWeight: 1e-10             // Minimum particle weight
};

/**
 * Single particle representing one possible hidden world state
 */
class Particle {
    constructor() {
        this.positions = {};     // playerId -> sectorLabel
        this.roles = {};         // playerId -> 'human' | 'alien' | null (unknown)
        this.alive = {};         // playerId -> boolean
        this.escaped = {};       // playerId -> boolean
        this.fed = {};           // playerId -> boolean (alien has killed)
        this.weight = 1.0;       // Particle weight for resampling
    }

    clone() {
        const p = new Particle();
        p.positions = { ...this.positions };
        p.roles = { ...this.roles };
        p.alive = { ...this.alive };
        p.escaped = { ...this.escaped };
        p.fed = { ...this.fed };
        p.weight = this.weight;
        return p;
    }
}

/**
 * ParticleFilter - Maintains belief state over hidden game state
 */
class ParticleFilter {
    constructor(myPlayerId, map, players, config = {}) {
        this.myPlayerId = myPlayerId;
        this.map = map;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.rng = new SeededRandom(config.seed || Date.now());

        // Initialize particles
        this.particles = [];
        this.lastProcessedTurn = 0;
        this.lastProcessedAnnouncementIndex = 0;

        // Cache map analysis
        this.humanStart = map.grid.find(h => h.state === 'human-start')?.label;
        this.alienStart = map.grid.find(h => h.state === 'alien-start')?.label;
        this.allSectors = map.grid.filter(h => h.state !== 'empty').map(h => h.label);

        // Initialize particles based on game start
        this._initialize(players);

        console.log(`[ParticleFilter] Initialized with ${this.particles.length} particles for ${myPlayerId}`);
    }

    /**
     * Initialize particles at game start
     */
    _initialize(players) {
        const myPlayer = players.find(p => p.id === this.myPlayerId);
        const opponents = players.filter(p => p.id !== this.myPlayerId);

        // Count expected roles
        const numPlayers = players.length;
        const numHumans = Math.ceil(numPlayers / 2);
        const numAliens = numPlayers - numHumans;

        // My role is known
        const myRole = myPlayer?.role;
        const remainingHumans = myRole === 'human' ? numHumans - 1 : numHumans;
        const remainingAliens = myRole === 'alien' ? numAliens - 1 : numAliens;

        for (let i = 0; i < this.config.numParticles; i++) {
            const particle = new Particle();

            // Set my known state
            if (myPlayer) {
                particle.positions[this.myPlayerId] = myPlayer.position;
                particle.roles[this.myPlayerId] = myRole;
                particle.alive[this.myPlayerId] = myPlayer.alive !== false;
                particle.escaped[this.myPlayerId] = myPlayer.escaped === true;
                particle.fed[this.myPlayerId] = myPlayer.hasFed === true;
            }

            // Sample opponent roles (consistent with counts)
            const roleAssignments = this._sampleRoles(opponents.length, remainingHumans, remainingAliens);
            this.rng.shuffle(roleAssignments);

            opponents.forEach((opp, idx) => {
                const role = roleAssignments[idx];
                particle.roles[opp.id] = role;

                // Set starting position based on role
                // Handle Psychologist special case
                const isPsychologist = opp.character?.power?.startsInAlienSector;
                if (isPsychologist && role === 'human') {
                    particle.positions[opp.id] = this.alienStart;
                } else {
                    particle.positions[opp.id] = role === 'human' ? this.humanStart : this.alienStart;
                }

                particle.alive[opp.id] = true;
                particle.escaped[opp.id] = false;
                particle.fed[opp.id] = false;
            });

            particle.weight = 1.0 / this.config.numParticles;
            this.particles.push(particle);
        }
    }

    /**
     * Sample role assignments consistent with counts
     */
    _sampleRoles(n, numHumans, numAliens) {
        const roles = [];
        for (let i = 0; i < numHumans; i++) roles.push('human');
        for (let i = 0; i < numAliens; i++) roles.push('alien');
        // Fill any remainder with random
        while (roles.length < n) {
            roles.push(this.rng.chance(0.5) ? 'human' : 'alien');
        }
        return roles.slice(0, n);
    }

    /**
     * Update beliefs based on new announcements
     */
    update(gameState) {
        const announcements = gameState.announcements || [];
        const newAnnouncements = announcements.slice(this.lastProcessedAnnouncementIndex);

        // Update my own known state first
        const myPlayer = gameState.players.find(p => p.id === this.myPlayerId);
        if (myPlayer) {
            this.particles.forEach(p => {
                p.positions[this.myPlayerId] = myPlayer.position;
                p.alive[this.myPlayerId] = myPlayer.alive !== false;
                p.escaped[this.myPlayerId] = myPlayer.escaped === true;
                p.fed[this.myPlayerId] = myPlayer.hasFed === true;
            });
        }

        // Track players who get fresh position info from announcements
        // We should NOT propagate their positions after getting confirmed info
        this._freshInfoPlayers = new Set();

        // Propagate movement FIRST (before processing new announcements)
        // This represents our prediction of where opponents moved since last turn
        if (gameState.currentTurn > this.lastProcessedTurn) {
            this._propagateMovement(gameState);
            this.lastProcessedTurn = gameState.currentTurn;
        }

        // Process each new announcement AFTER propagation
        // This conditions our beliefs on new observations
        for (const announcement of newAnnouncements) {
            this._processAnnouncement(announcement, gameState);
        }

        this.lastProcessedAnnouncementIndex = announcements.length;

        // Resample if effective sample size is low
        this._resampleIfNeeded();
    }

    /**
     * Process a single announcement to condition particles
     */
    _processAnnouncement(announcement, gameState) {
        const playerId = announcement.playerId;
        if (!playerId || playerId === this.myPlayerId) return;

        const player = gameState.players.find(p => p.id === playerId);
        if (!player) return;

        switch (announcement.type) {
            case 'NOISE':
            case 'NOISE_IN_SECTOR':
                this._processNoise(announcement, player, gameState);
                break;

            case 'SILENCE':
            case 'SILENT_MOVE':
            case 'SILENT_SECTOR':
                this._processSilence(announcement, player, gameState);
                break;

            case 'ATTACK':
                this._processAttack(announcement, player, gameState);
                break;

            case 'ESCAPE':
            case 'ESCAPE_FAILED':
                this._processEscape(announcement, player, gameState);
                break;

            case 'MUTATION':
                this._processMutation(announcement, player, gameState);
                break;

            case 'ELIMINATED':
                this._processElimination(announcement, player, gameState);
                break;

            case 'SPOTLIGHT':
                this._processSpotlight(announcement, gameState);
                break;

            case 'SENSOR':
                this._processSensor(announcement, gameState);
                break;

            case 'CLONE_USED':
            case 'TELEPORT_USED':
                this._processTeleport(announcement, player, gameState);
                break;

            case 'DEFENSE_USED':
                this._processDefense(announcement, player, gameState);
                break;

            case 'REVEAL_IDENTITY':
                this._processRevealIdentity(announcement, gameState);
                break;
        }
    }

    /**
     * Process NOISE announcement
     * Key distinction:
     * - YOUR_SECTOR: Must be truth (player drew red card, is at announced sector)
     * - ANY_SECTOR: Could be truth or lie (player drew green card)
     * - UNKNOWN: We don't know what card they drew (other players' announcements)
     *            Use prior probability: 28 YOUR_SECTOR / 55 NOISE cards ≈ 51%
     * Also handles double noise (Cat item or Pilot power) when sectors is an array
     */
    _processNoise(announcement, player, gameState) {
        // Handle double noise (Cat item or Pilot's power)
        // When sectors is an array, ONE sector is the true position, the other is deception
        if (announcement.sectors && Array.isArray(announcement.sectors)) {
            this._processDoubleNoise(announcement, player, gameState);
            return;
        }

        const sector = announcement.sector;
        const noiseType = announcement.noiseType;

        // Prior probability of YOUR_SECTOR card: 28/(28+27) = 28/55 ≈ 0.509
        const priorYourSector = 28 / 55;

        this.particles.forEach(particle => {
            if (noiseType === 'YOUR_SECTOR') {
                // Must be truth - player is at this sector
                // Collapse position to announced sector
                particle.positions[player.id] = sector;
                // High confidence this is correct
                particle.weight *= 1.0;
            } else if (noiseType === 'ANY_SECTOR') {
                // Known ANY_SECTOR - could be truth or lie
                this._weightForAnySector(particle, player, sector);
            } else {
                // UNKNOWN - we don't know the card type
                // Marginalize over both possibilities using prior
                const currentPos = particle.positions[player.id];

                if (currentPos === sector) {
                    // They announced their actual position
                    // P(announce here | at here) = P(YOUR_SECTOR) + P(ANY_SECTOR) * P(truth | ANY)
                    // = priorYourSector + (1 - priorYourSector) * (1 - lieProb)
                    const pAnnounceHere = priorYourSector + (1 - priorYourSector) * (1 - this.config.lieProb);
                    particle.weight *= pAnnounceHere;
                } else {
                    // They announced a different sector
                    // This can only happen if ANY_SECTOR card AND lying
                    // P(announce elsewhere | at here) = P(ANY_SECTOR) * P(lie | ANY)
                    const pAnnounceLie = (1 - priorYourSector) * this.config.lieProb;

                    // Also need to check if announced sector is reachable
                    const role = particle.roles[player.id];
                    const moveSpeed = this._getMoveSpeed(role, particle.fed[player.id]);
                    const reachable = getReachableSectors(this.map, currentPos, moveSpeed, role);
                    const reachableSectors = reachable.map(r => r.sector);

                    if (reachableSectors.includes(sector)) {
                        // Could have moved there - moderate weight
                        particle.weight *= 0.5;
                    } else if (currentPos && sector !== currentPos) {
                        // Lying to a non-reachable sector
                        particle.weight *= pAnnounceLie * 0.5;
                    } else {
                        // Suspicious - low weight but not zero
                        particle.weight *= 0.1;
                    }
                }
            }
        });

        this._normalizeWeights();
    }

    /**
     * Helper: Weight particle for known ANY_SECTOR card
     */
    _weightForAnySector(particle, player, sector) {
        const currentPos = particle.positions[player.id];
        const role = particle.roles[player.id];
        const moveSpeed = this._getMoveSpeed(role, particle.fed[player.id]);

        // Check if announced sector is reachable
        const reachable = getReachableSectors(this.map, currentPos, moveSpeed, role);
        const reachableSectors = reachable.map(r => r.sector);

        if (currentPos === sector) {
            // Telling truth about current position
            particle.weight *= (1 - this.config.lieProb);
        } else if (reachableSectors.includes(sector)) {
            // Could have moved there, or lying
            particle.weight *= 0.5;
        } else {
            // Sector not reachable - suspicious
            particle.weight *= 0.1;
        }
    }

    /**
     * Process double noise (Cat item or Pilot's power)
     * One sector is the TRUE position (where the player actually is)
     * The other sector is a deception (chosen by the player)
     * We don't know which is which - 50% chance for each
     */
    _processDoubleNoise(announcement, player, gameState) {
        const sectors = announcement.sectors;
        if (!sectors || sectors.length !== 2) return;

        const [sector1, sector2] = sectors;

        this.particles.forEach(particle => {
            const currentPos = particle.positions[player.id];
            const role = particle.roles[player.id];
            const moveSpeed = this._getMoveSpeed(role, particle.fed[player.id]);

            // Get reachable sectors from current position
            const reachable = getReachableSectors(this.map, currentPos, moveSpeed, role);
            const reachableSectors = reachable.map(r => r.sector);

            // One of the two sectors is the true position
            const sector1IsTrue = currentPos === sector1 || reachableSectors.includes(sector1);
            const sector2IsTrue = currentPos === sector2 || reachableSectors.includes(sector2);

            if (sector1IsTrue && sector2IsTrue) {
                // Both sectors are plausible - 50% chance each is true
                // Assign to one of them randomly for this particle
                if (this.rng.random() < 0.5) {
                    particle.positions[player.id] = sector1;
                } else {
                    particle.positions[player.id] = sector2;
                }
                particle.weight *= 0.8; // High confidence one is true
            } else if (sector1IsTrue) {
                // Only sector1 is reachable - it must be true
                particle.positions[player.id] = sector1;
                particle.weight *= 0.9;
            } else if (sector2IsTrue) {
                // Only sector2 is reachable - it must be true
                particle.positions[player.id] = sector2;
                particle.weight *= 0.9;
            } else {
                // Neither sector is reachable from our believed position
                // Our position tracking is likely wrong - low weight
                particle.weight *= 0.1;
            }
        });

        this._normalizeWeights();
    }

    /**
     * Process SILENCE announcement
     * Player moved to a secure sector (or used sedatives)
     */
    _processSilence(announcement, player, gameState) {
        // Player is in a secure sector - propagate possible positions
        this.particles.forEach(particle => {
            const currentPos = particle.positions[player.id];
            const role = particle.roles[player.id];
            const moveSpeed = this._getMoveSpeed(role, particle.fed[player.id]);

            // Get reachable silent sectors
            const reachable = getReachableSectors(this.map, currentPos, moveSpeed, role);
            const silentSectors = reachable.filter(r => {
                const sectorData = this.map.grid.find(h => h.label === r.sector);
                return sectorData?.state === 'secure' || sectorData?.state === 'safe';
            });

            if (silentSectors.length > 0) {
                // Randomly assign to one of the silent sectors
                const newPos = this.rng.choice(silentSectors).sector;
                particle.positions[player.id] = newPos;
            }
            // If no silent sectors reachable, could be sedatives - keep position
        });
    }

    /**
     * Process ATTACK announcement
     * Reveals attacker position and confirms alien role
     */
    _processAttack(announcement, player, gameState) {
        const sector = announcement.sector;
        const victims = announcement.victims || [];

        this.particles.forEach(particle => {
            // Attacker is at this sector
            particle.positions[player.id] = sector;

            // Attacker is confirmed alien (unless human with Attack item)
            if (!announcement.usedItem) {
                particle.roles[player.id] = 'alien';
            }

            // If attack killed humans, attacker is now fed
            const killedHuman = victims.some(v => {
                const victimPlayer = gameState.players.find(p => p.id === v);
                return victimPlayer?.role === 'human';
            });
            if (killedHuman) {
                particle.fed[player.id] = true;
            }

            // Update victim states
            victims.forEach(victimId => {
                if (victimId !== this.myPlayerId) {
                    particle.positions[victimId] = sector;
                    // Victim might be mutated or eliminated
                }
            });

            // If attack hit nothing, that sector is confirmed empty of opponents
            // (useful for deduction)
        });
    }

    /**
     * Process ESCAPE announcement
     */
    _processEscape(announcement, player, gameState) {
        const sector = announcement.sector;

        this.particles.forEach(particle => {
            particle.positions[player.id] = sector;
            particle.roles[player.id] = 'human'; // Only humans can escape
            particle.escaped[player.id] = announcement.type === 'ESCAPE';
        });
    }

    /**
     * Process MUTATION announcement
     */
    _processMutation(announcement, player, gameState) {
        this.particles.forEach(particle => {
            particle.roles[player.id] = 'alien'; // Now an alien
            particle.positions[player.id] = this.alienStart; // Respawns at alien start
            particle.fed[player.id] = false;
        });
    }

    /**
     * Process ELIMINATED announcement
     */
    _processElimination(announcement, player, gameState) {
        this.particles.forEach(particle => {
            particle.alive[player.id] = false;
        });
    }

    /**
     * Process SPOTLIGHT announcement
     */
    _processSpotlight(announcement, gameState) {
        const revealed = announcement.revealed || [];

        revealed.forEach(({ id, sector }) => {
            if (id !== this.myPlayerId) {
                this.particles.forEach(particle => {
                    particle.positions[id] = sector;
                });
            }
        });
    }

    /**
     * Process SENSOR announcement
     */
    _processSensor(announcement, gameState) {
        const targetId = announcement.targetId;
        const targetSector = announcement.targetSector;

        if (targetId && targetSector && targetId !== this.myPlayerId) {
            this.particles.forEach(particle => {
                particle.positions[targetId] = targetSector;
            });
        }
    }

    /**
     * Process TELEPORT (Clone or Teleport item)
     */
    _processTeleport(announcement, player, gameState) {
        this.particles.forEach(particle => {
            particle.positions[player.id] = this.humanStart;
            particle.roles[player.id] = 'human'; // Confirms human
        });
    }

    /**
     * Process DEFENSE usage
     */
    _processDefense(announcement, player, gameState) {
        const sector = announcement.sector;

        this.particles.forEach(particle => {
            if (sector) {
                particle.positions[player.id] = sector;
            }
            particle.roles[player.id] = 'human'; // Confirms human
        });
    }

    /**
     * Process REVEAL_IDENTITY (Medic power)
     */
    _processRevealIdentity(announcement, gameState) {
        const targetId = announcement.targetId;
        const targetRole = announcement.targetRole;

        if (targetId && targetRole && targetId !== this.myPlayerId) {
            this.particles.forEach(particle => {
                particle.roles[targetId] = targetRole;
            });
        }
    }

    /**
     * Propagate movement between turns
     * Called when turn advances to simulate opponent movement
     */
    _propagateMovement(gameState) {
        const players = gameState.players || [];

        this.particles.forEach(particle => {
            players.forEach(player => {
                if (player.id === this.myPlayerId) return;
                if (!particle.alive[player.id] || particle.escaped[player.id]) return;

                const currentPos = particle.positions[player.id];
                const role = particle.roles[player.id];
                const moveSpeed = this._getMoveSpeed(role, particle.fed[player.id]);

                // Get reachable sectors
                const reachable = getReachableSectors(this.map, currentPos, moveSpeed, role);

                if (reachable.length > 0) {
                    // Weight moves based on role-specific heuristics
                    const weights = reachable.map(r => this._getMoveWeight(r.sector, role, gameState));
                    const newPos = this.rng.weightedChoice(reachable.map(r => r.sector), weights);
                    particle.positions[player.id] = newPos;
                }
            });
        });
    }

    /**
     * Get movement weight for propagation (role-specific priors)
     */
    _getMoveWeight(sector, role, gameState) {
        const sectorData = this.map.grid.find(h => h.label === sector);
        let weight = 1.0;

        if (role === 'human') {
            // Humans prefer moves toward escape hatches
            const escapeHatches = this.map.grid.filter(h =>
                h.state === 'airlock' &&
                gameState.escapeHatchStatus?.[h.label] === 'available'
            );

            // Give bonus for being closer to hatches
            if (escapeHatches.length > 0) {
                // This is a simple heuristic - could use actual distances
                if (sectorData?.state === 'airlock') {
                    weight *= 2.0; // Strong preference for hatches
                } else if (sectorData?.state === 'secure') {
                    weight *= 1.3; // Slight preference for silent sectors
                }
            }
        } else {
            // Aliens prefer moves toward likely human positions (patrol)
            // This is intentionally vague to avoid perfect prediction
            weight *= 1.0 + this.config.movementNoise * this.rng.random();
        }

        return Math.max(weight, 0.01);
    }

    /**
     * Get movement speed for a role
     */
    _getMoveSpeed(role, isFed) {
        if (role === 'human') return 1;
        if (role === 'alien' && isFed) return 3;
        if (role === 'alien') return 2;
        return 1;
    }

    /**
     * Normalize particle weights to sum to 1
     */
    _normalizeWeights() {
        const total = this.particles.reduce((sum, p) => sum + p.weight, 0);
        if (total > 0) {
            this.particles.forEach(p => p.weight /= total);
        } else {
            // All weights zero - reset to uniform
            const uniform = 1.0 / this.particles.length;
            this.particles.forEach(p => p.weight = uniform);
        }
    }

    /**
     * Resample particles if effective sample size is too low
     * Also adaptively increases particle count when belief becomes concentrated
     */
    _resampleIfNeeded() {
        const n = this.particles.length;
        const ess = this._effectiveSampleSize();
        const essRatio = ess / n;

        // Check if we need to add particles (belief is too concentrated)
        if (essRatio < this.config.adaptiveThreshold && n < this.config.maxParticles) {
            // Add more particles by duplicating high-weight particles
            const particlesToAdd = Math.min(
                Math.floor(n * 0.25), // Add up to 25% more
                this.config.maxParticles - n
            );

            if (particlesToAdd > 0) {
                // Sort by weight descending
                const sorted = [...this.particles].sort((a, b) => b.weight - a.weight);

                // Duplicate top particles with slight perturbation
                for (let i = 0; i < particlesToAdd; i++) {
                    const source = sorted[i % sorted.length];
                    const newParticle = source.clone();
                    // Apply small perturbation to positions (jitter)
                    // This helps explore nearby states
                    this.particles.push(newParticle);
                }

                // Renormalize weights
                this._normalizeWeights();
                console.log(`[ParticleFilter] Adapted particle count: ${n} -> ${this.particles.length} (ESS ratio: ${essRatio.toFixed(3)})`);
            }
        }

        // Standard resample check
        const threshold = this.config.resampleThreshold * this.particles.length;
        if (ess < threshold) {
            this._resample();
        }
    }

    /**
     * Compute effective sample size
     */
    _effectiveSampleSize() {
        const sumSquared = this.particles.reduce((sum, p) => sum + p.weight * p.weight, 0);
        return sumSquared > 0 ? 1.0 / sumSquared : 0;
    }

    /**
     * Resample particles using systematic resampling
     */
    _resample() {
        const n = this.particles.length;
        const newParticles = [];

        // Compute cumulative weights
        const cumWeights = [];
        let cum = 0;
        this.particles.forEach(p => {
            cum += p.weight;
            cumWeights.push(cum);
        });

        // Systematic resampling
        const step = 1.0 / n;
        let u = this.rng.random() * step;

        let i = 0;
        for (let j = 0; j < n; j++) {
            while (i < n - 1 && cumWeights[i] < u) {
                i++;
            }
            const newParticle = this.particles[i].clone();
            newParticle.weight = 1.0 / n;
            newParticles.push(newParticle);
            u += step;
        }

        this.particles = newParticles;
    }

    // ==================== QUERY METHODS ====================

    /**
     * Get probability distribution over positions for a player
     */
    getPositionDistribution(playerId) {
        const dist = {};

        this.particles.forEach(particle => {
            const pos = particle.positions[playerId];
            if (pos) {
                dist[pos] = (dist[pos] || 0) + particle.weight;
            }
        });

        return dist;
    }

    /**
     * Get probability that a player is at a specific sector
     */
    getPositionProbability(playerId, sector) {
        let prob = 0;
        this.particles.forEach(particle => {
            if (particle.positions[playerId] === sector) {
                prob += particle.weight;
            }
        });
        return prob;
    }

    /**
     * Get most likely position for a player
     */
    getMostLikelyPosition(playerId) {
        const dist = this.getPositionDistribution(playerId);
        let maxProb = 0;
        let bestSector = null;

        Object.entries(dist).forEach(([sector, prob]) => {
            if (prob > maxProb) {
                maxProb = prob;
                bestSector = sector;
            }
        });

        return { sector: bestSector, probability: maxProb };
    }

    /**
     * Get probability that a player is human
     */
    getHumanProbability(playerId) {
        let prob = 0;
        this.particles.forEach(particle => {
            if (particle.roles[playerId] === 'human' && particle.alive[playerId]) {
                prob += particle.weight;
            }
        });
        return prob;
    }

    /**
     * Get probability that a player is alien
     */
    getAlienProbability(playerId) {
        let prob = 0;
        this.particles.forEach(particle => {
            if (particle.roles[playerId] === 'alien' && particle.alive[playerId]) {
                prob += particle.weight;
            }
        });
        return prob;
    }

    /**
     * Get aggregated probability of ANY human at a sector
     */
    getHumanAtSectorProbability(sector) {
        let prob = 0;
        this.particles.forEach(particle => {
            for (const [playerId, pos] of Object.entries(particle.positions)) {
                if (playerId !== this.myPlayerId &&
                    pos === sector &&
                    particle.roles[playerId] === 'human' &&
                    particle.alive[playerId] &&
                    !particle.escaped[playerId]) {
                    prob += particle.weight;
                    break; // Count each particle once
                }
            }
        });
        return Math.min(prob, 1.0);
    }

    /**
     * Get aggregated probability of ANY alien at a sector
     */
    getAlienAtSectorProbability(sector) {
        let prob = 0;
        this.particles.forEach(particle => {
            for (const [playerId, pos] of Object.entries(particle.positions)) {
                if (playerId !== this.myPlayerId &&
                    pos === sector &&
                    particle.roles[playerId] === 'alien' &&
                    particle.alive[playerId]) {
                    prob += particle.weight;
                    break;
                }
            }
        });
        return Math.min(prob, 1.0);
    }

    /**
     * Get top N hotspots for humans
     */
    getHumanHotspots(n = 5) {
        const sectorProbs = {};

        this.allSectors.forEach(sector => {
            sectorProbs[sector] = this.getHumanAtSectorProbability(sector);
        });

        return Object.entries(sectorProbs)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([sector, prob]) => ({ sector, probability: prob }));
    }

    /**
     * Get uncertainty (entropy) of position beliefs for a player
     */
    getPositionEntropy(playerId) {
        const dist = this.getPositionDistribution(playerId);
        let entropy = 0;

        Object.values(dist).forEach(prob => {
            if (prob > 0) {
                entropy -= prob * Math.log2(prob);
            }
        });

        return entropy;
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        const playerInfo = {};

        // Get unique player IDs from particles
        const playerIds = new Set();
        this.particles.forEach(p => {
            Object.keys(p.positions).forEach(id => playerIds.add(id));
        });

        playerIds.forEach(playerId => {
            if (playerId === this.myPlayerId) return;

            const mostLikely = this.getMostLikelyPosition(playerId);
            playerInfo[playerId] = {
                mostLikelyPosition: mostLikely.sector,
                positionConfidence: mostLikely.probability,
                humanProb: this.getHumanProbability(playerId),
                alienProb: this.getAlienProbability(playerId),
                entropy: this.getPositionEntropy(playerId)
            };
        });

        return {
            numParticles: this.particles.length,
            effectiveSampleSize: this._effectiveSampleSize(),
            players: playerInfo,
            humanHotspots: this.getHumanHotspots(3)
        };
    }
}

module.exports = { ParticleFilter, Particle };
