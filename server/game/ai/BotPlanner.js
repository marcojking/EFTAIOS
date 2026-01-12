const { getReachableSectors, getAdjacentSectors } = require('../mapUtils');
const MapAnalyzer = require('./MapAnalyzer');
const { SeededRandom } = require('./SeededRandom');
const {
    generatePersonality,
    getAttackThreshold,
    isUrgencyMode,
    getRiskModifier,
    shouldDoubleBack,
    getNoiseConfidence,
    getDeceptionStrategy,
    getHuntingStrategy,
    getItemPriority,
    chooseItemToDiscard
} = require('./BotPersonality');

/**
 * BotPlanner - Expert Strategy AI
 *
 * The "Brain" of the bot. Uses state from BotTracker and MapAnalyzer
 * to make optimal moves with personality-based variance.
 *
 * Uses seeded RNG for deterministic yet varied behavior.
 */
class BotPlanner {
    constructor(botId, map, personality = null, seed = null) {
        this.botId = botId;
        this.map = map;

        // Generate or use provided personality
        this.personality = personality || generatePersonality();

        // Seeded RNG for deterministic decisions
        this.rng = new SeededRandom(seed || Date.now());

        // Initialize map analyzer
        this.mapAnalyzer = new MapAnalyzer(map);

        // Track deception state for fake trails
        this.deceptionHistory = [];
        this.lastDeceptionSector = null;

        // Debug logging
        this.debugLog = [];

        console.log(`[BotPlanner] Initialized for ${botId} with personality:`, {
            aggression: this.personality.aggression.toFixed(2),
            riskTolerance: this.personality.riskTolerance.toFixed(2),
            huntingStyle: this.personality.huntingStyle,
            deceptionStyle: this.personality.deceptionStyle
        });
    }

    /**
     * Main entry point for decision making
     */
    decideMove(gameState, tracker, myPlayer) {
        this.debugLog = [];
        this.log(`Deciding move for ${myPlayer.name} (${myPlayer.role})`);

        // Get movement range
        const range = this.getMovementRange(myPlayer, gameState);
        const reachable = getReachableSectors(this.map, myPlayer.position, range, myPlayer.role);

        this.log(`Position: ${myPlayer.position}, Range: ${range}, Reachable: ${reachable.length}`);

        if (reachable.length === 0) {
            return { action: 'none', reason: 'No valid moves', debug: this.debugLog };
        }

        // Role-specific strategy
        if (myPlayer.role === 'human') {
            return this.planHumanMove(gameState, tracker, myPlayer, reachable);
        } else {
            return this.planAlienMove(gameState, tracker, myPlayer, reachable);
        }
    }

    /**
     * Human Strategy - Expert Level (Improved)
     *
     * Key improvements:
     * - Less predictable pathing (not always shortest path)
     * - Stronger preference for silent sectors when threatened
     * - Route variation to confuse tracking
     * - Better escape timing
     */
    planHumanMove(gameState, tracker, myPlayer, reachable) {
        const hatches = this.getAvailableHatches(gameState);
        const items = myPlayer.items || [];
        const turn = gameState.currentTurn || 1;
        const urgency = isUrgencyMode(this.personality, turn);
        const maxTurns = gameState.maxTurns || 39;
        const turnsRemaining = maxTurns - turn;

        this.log(`Human strategy - Turn ${turn}, Urgency: ${urgency}, Items: ${items.length}`);

        // === ITEM USAGE CHECK ===
        const itemDecision = this.decideHumanItemUsage(gameState, tracker, myPlayer, hatches, reachable);
        if (itemDecision) {
            return { ...itemDecision, debug: this.debugLog };
        }

        // === POWER USAGE CHECK ===
        const powerDecision = this.decideHumanPowerUsage(gameState, tracker, myPlayer, hatches, reachable);
        if (powerDecision) {
            return { ...powerDecision, debug: this.debugLog };
        }

        // === IMMEDIATE ESCAPE CHECK ===
        // Only rush to escape if we can make it, or if time is running out
        const escapeMove = reachable.find(r => hatches.includes(r.sector));
        if (escapeMove) {
            const alienNearHatch = tracker.getAlienProbability(escapeMove.sector);
            const adjacentAlienRisk = this.getAdjacentAlienRisk(escapeMove.sector, tracker);

            // Rush to escape if:
            // - Very low alien risk at hatch OR
            // - Urgency mode (late game) OR
            // - We have defense items
            const hasDefense = items.some(i => i.type === 'DEFENSE' || i.type === 'CLONE');
            const shouldEscape = alienNearHatch < 0.3 || urgency || hasDefense || turnsRemaining <= 5;

            if (shouldEscape) {
                this.log(`Immediate escape at ${escapeMove.sector} (risk: ${(alienNearHatch * 100).toFixed(0)}%)`);
                return {
                    action: 'move',
                    target: escapeMove.sector,
                    reason: 'Escape available!',
                    debug: this.debugLog
                };
            } else {
                this.log(`Escape available but risky (${(alienNearHatch * 100).toFixed(0)}%), waiting...`);
            }
        }

        // === CALCULATE BEST MOVE (IMPROVED) ===
        const hasDefense = items.some(i => i.type === 'DEFENSE');
        const hasClone = items.some(i => i.type === 'CLONE');
        const riskMod = getRiskModifier(this.personality, hasDefense, hasClone);

        // Score each move with improved criteria
        const scoredMoves = reachable.map(move => {
            const sector = move.sector;
            let score = 100; // Base score (higher is better)

            // 1. Distance to nearest escape hatch (progress toward goal)
            const distToHatch = this.mapAnalyzer.getDistanceToNearestHatch(sector, hatches);
            const currentDist = this.mapAnalyzer.getDistanceToNearestHatch(myPlayer.position, hatches);
            const progressBonus = (currentDist - distToHatch) * 10; // +10 per step closer
            score += progressBonus;

            // 2. Alien risk at sector (MAJOR factor)
            const alienRisk = tracker.getAlienProbability(sector);
            const adjacentRisk = this.getAdjacentAlienRisk(sector, tracker);
            const totalRisk = alienRisk + adjacentRisk * 0.5;
            score -= totalRisk * 40 / riskMod; // Heavy penalty for risky sectors

            // 3. Sector type - STRONG preference for silent sectors
            const sectorData = this.map.grid.find(h => h.label === sector);
            const isSilent = sectorData?.state === 'secure' || sectorData?.state === 'safe';
            const isDangerous = sectorData?.state === 'dangerous';

            if (isSilent) {
                score += 15; // Strong bonus for silent sectors (no noise to give away position)
            } else if (isDangerous && totalRisk > 0.2) {
                score -= 10; // Penalty for dangerous sectors when aliens are near
            }

            // 4. Route unpredictability (don't always go straight)
            if (!urgency && turn > 3) {
                // Early/mid game: add randomness to confuse tracking
                const unpredictability = (this.rng.random() - 0.5) * 8 * this.personality.riskTolerance;
                score += unpredictability;
            }

            // 5. Avoid retracing steps too much
            if (this.deceptionHistory.slice(-3).includes(sector)) {
                score -= 5; // Slight penalty for revisiting recent sectors
            }

            // 6. Urgency mode: prioritize progress over safety
            if (urgency) {
                score = 50 + progressBonus * 2 - alienRisk * 20;
            }

            return { sector, score, distance: distToHatch, risk: totalRisk };
        });

        // Sort by score (highest first)
        scoredMoves.sort((a, b) => b.score - a.score);

        // Use softmax-style selection for variety (top 3 moves)
        const topMoves = scoredMoves.slice(0, Math.min(3, scoredMoves.length));
        let bestMove;

        if (topMoves.length > 1 && !urgency) {
            // Add some randomness to selection among top moves
            const scores = topMoves.map(m => m.score);
            const minScore = Math.min(...scores);
            const weights = scores.map(s => Math.exp((s - minScore) / 10)); // Temperature = 10
            const totalWeight = weights.reduce((a, b) => a + b, 0);

            let r = this.rng.random() * totalWeight;
            for (let i = 0; i < topMoves.length; i++) {
                r -= weights[i];
                if (r <= 0) {
                    bestMove = topMoves[i].sector;
                    break;
                }
            }
            if (!bestMove) bestMove = topMoves[0].sector;
        } else {
            bestMove = topMoves[0]?.sector;
        }

        // Fallback
        if (!bestMove && reachable.length > 0) {
            bestMove = reachable[0].sector;
        }

        const chosen = scoredMoves.find(m => m.sector === bestMove);
        this.log(`Best move: ${bestMove} (score: ${chosen?.score?.toFixed(1)}, dist: ${chosen?.distance}, risk: ${(chosen?.risk * 100).toFixed(0)}%)`);

        return {
            action: 'move',
            target: bestMove,
            reason: urgency ? 'Urgent escape path' : 'Strategic movement',
            debug: this.debugLog
        };
    }

    /**
     * Alien Strategy - Expert Level (Improved)
     *
     * Key improvements:
     * - Lower attack thresholds (more aggressive)
     * - Chase behavior toward recent noise declarations
     * - Hatch camping/denial strategy
     * - Use human hotspots from particle filter
     */
    planAlienMove(gameState, tracker, myPlayer, reachable) {
        const hatches = this.getAvailableHatches(gameState);
        const turn = gameState.currentTurn || 1;
        const maxTurns = gameState.maxTurns || 39;
        const turnsRemaining = maxTurns - turn;
        const huntingStrategy = getHuntingStrategy(this.personality);
        const isFed = myPlayer.hasFed;

        this.log(`Alien strategy - Turn ${turn}, Style: ${this.personality.huntingStyle}, Fed: ${isFed}`);

        // Get suspected alien positions (to avoid friendly fire)
        const confirmedAliens = tracker.getConfirmedAliens();
        const suspectedAlienSectors = confirmedAliens.map(a => a.mostLikelySector);

        // Get human hotspots from particle filter
        const humanHotspots = tracker.getHumanHotspots ? tracker.getHumanHotspots(5) : [];
        const hotspotSectors = humanHotspots.map(h => h.sector);

        // Get recent noise declarations (for chase behavior)
        const recentNoises = this.getRecentNoiseAnnouncements(gameState, 4);

        // === LURKING ALIEN - ATTACK IN PLACE ===
        if (myPlayer.character?.power?.canAttackWithoutMoving) {
            const humanProb = tracker.getHumanProbability(myPlayer.position);
            // LOWER threshold for lurking attack
            const threshold = Math.max(0.15, getAttackThreshold(this.personality, turn) - 0.1);

            if (humanProb >= threshold) {
                this.log(`Lurking attack opportunity: ${(humanProb * 100).toFixed(0)}% probability`);
                return {
                    action: 'attack_in_place',
                    reason: `Lurking ambush (${(humanProb * 100).toFixed(0)}% human probability)`,
                    debug: this.debugLog
                };
            }
        }

        // === FIND ATTACK TARGET (IMPROVED) ===
        // Much LOWER threshold, especially near hatches and late game
        let baseThreshold = getAttackThreshold(this.personality, turn);

        // Late game: be more aggressive
        if (turnsRemaining <= 10) {
            baseThreshold = Math.max(0.1, baseThreshold - 0.15);
        }

        // First kill bonus: be more aggressive to get fed status
        if (!isFed) {
            baseThreshold = Math.max(0.15, baseThreshold - 0.1);
        }

        let bestAttackTarget = null;
        let highestScore = 0;

        reachable.forEach(move => {
            const sector = move.sector;
            const humanProb = tracker.getHumanProbability(sector);
            const alienProb = tracker.getAlienProbability(sector);

            // Avoid sectors where we just attacked (empty)
            if (tracker.confirmedEmptySectors.has(sector)) return;

            // Calculate attack score (not just probability)
            let attackScore = humanProb;

            // BIG bonus for hatch sectors (humans must go there eventually)
            const isHatch = hatches.includes(sector);
            if (isHatch) {
                attackScore += 0.25;
                this.log(`Hatch ${sector}: base ${(humanProb * 100).toFixed(0)}% + 25% hatch bonus`);
            }

            // Bonus for sectors near recent noise (chase behavior)
            const nearRecentNoise = recentNoises.some(n =>
                this.isAdjacent(sector, n.sector) || sector === n.sector
            );
            if (nearRecentNoise) {
                attackScore += 0.15;
            }

            // Bonus for human hotspots
            if (hotspotSectors.includes(sector)) {
                attackScore += 0.1;
            }

            // Penalty for friendly fire risk
            if (suspectedAlienSectors.includes(sector)) {
                attackScore -= alienProb * 0.5;
            }

            // Track best target
            if (attackScore > highestScore) {
                highestScore = attackScore;
                bestAttackTarget = {
                    sector,
                    score: attackScore,
                    humanProb,
                    isHatch,
                    nearNoise: nearRecentNoise
                };
            }
        });

        // Decide whether to attack
        const effectiveThreshold = baseThreshold;
        if (bestAttackTarget && highestScore >= effectiveThreshold) {
            let reason = `Hunt (${(bestAttackTarget.humanProb * 100).toFixed(0)}%`;
            if (bestAttackTarget.isHatch) reason += ', hatch denial';
            if (bestAttackTarget.nearNoise) reason += ', chasing noise';
            reason += ')';

            this.log(`Attack: ${bestAttackTarget.sector} (score: ${(highestScore * 100).toFixed(0)}%, threshold: ${(effectiveThreshold * 100).toFixed(0)}%)`);
            return {
                action: 'move_and_attack',
                target: bestAttackTarget.sector,
                reason: reason,
                debug: this.debugLog
            };
        }

        // === PATROL/CHASE MOVEMENT ===
        return this.planPatrolMove(gameState, tracker, myPlayer, reachable, hatches, huntingStrategy, suspectedAlienSectors, recentNoises, hotspotSectors);
    }

    /**
     * Get recent noise announcements for chase behavior
     */
    getRecentNoiseAnnouncements(gameState, count = 4) {
        const announcements = gameState.announcements || [];
        return announcements
            .filter(a => a.type === 'NOISE' && a.sector)
            .slice(-count);
    }

    /**
     * Patrol movement for aliens when not attacking (Improved)
     *
     * Key improvements:
     * - Chase behavior toward recent noise
     * - Prioritize human hotspots
     * - Better hatch camping
     */
    planPatrolMove(gameState, tracker, myPlayer, reachable, hatches, huntingStrategy, suspectedAlienSectors, recentNoises = [], hotspotSectors = []) {
        let bestMove = null;
        let maxScore = -Infinity;

        const analysis = this.mapAnalyzer.getAnalysis();
        const humanStart = analysis.humanStart;
        const patrolZones = analysis.patrolZones || [];
        const turn = gameState.currentTurn || 1;

        reachable.forEach(move => {
            const sector = move.sector;
            let score = 0;

            // 1. Human probability at this sector (from particle filter)
            const humanProb = tracker.getHumanProbability(sector);
            score += humanProb * 15;

            // 2. CHASE BEHAVIOR: Move toward recent noise declarations
            const nearRecentNoise = recentNoises.some(n =>
                this.isAdjacent(sector, n.sector) || sector === n.sector
            );
            if (nearRecentNoise) {
                score += 8; // Strong bonus for chasing noise
            }

            // Also bonus for being adjacent to noise sectors
            const adjacentToNoise = recentNoises.some(n => this.isAdjacent(sector, n.sector));
            if (adjacentToNoise && !nearRecentNoise) {
                score += 4;
            }

            // 3. Human hotspot bonus
            if (hotspotSectors.includes(sector)) {
                score += 6;
            }

            // 4. Hunting style bonuses
            if (huntingStrategy.prioritizeHatches) {
                // STRONG bonus for being at or adjacent to hatches
                if (hatches.includes(sector)) {
                    score += 10; // At hatch
                } else if (hatches.some(h => this.isAdjacent(sector, h))) {
                    score += 6; // Adjacent to hatch
                }
            }

            if (huntingStrategy.prioritizeHumanSpawn && turn <= 10) {
                // Early game: camp near human spawn
                const distToHumanStart = this.mapAnalyzer.computeDistance(sector, humanStart);
                if (distToHumanStart <= 3) {
                    score += 4;
                }
            }

            if (huntingStrategy.prioritizeExploration) {
                // Prefer sectors in patrol zones
                if (patrolZones.includes(sector)) {
                    score += 2;
                }
            }

            // 5. Avoid other aliens (prevent friendly fire)
            if (suspectedAlienSectors.includes(sector)) {
                score -= 15;
            }

            // 6. Prefer dangerous sectors (more likely to catch humans making noise)
            const sectorData = this.map.grid.find(h => h.label === sector);
            if (sectorData?.state === 'dangerous') {
                score += 1;
            }

            // 7. Personality variance (adds unpredictability)
            score += (this.rng.random() - 0.5) * 3 * this.personality.patrolPreference;

            if (score > maxScore) {
                maxScore = score;
                bestMove = sector;
            }
        });

        if (!bestMove) bestMove = reachable[0]?.sector;

        // Determine reason based on what influenced the decision
        let reason = 'Hunting patrol';
        if (recentNoises.length > 0 && recentNoises.some(n => this.isAdjacent(bestMove, n.sector) || bestMove === n.sector)) {
            reason = 'Chasing noise';
        } else if (hatches.includes(bestMove) || hatches.some(h => this.isAdjacent(bestMove, h))) {
            reason = 'Hatch patrol';
        } else if (hotspotSectors.includes(bestMove)) {
            reason = 'Tracking hotspot';
        }

        this.log(`Patrol: ${bestMove} (score: ${maxScore.toFixed(1)}, reason: ${reason})`);

        return {
            action: 'move',
            target: bestMove,
            reason: reason,
            debug: this.debugLog
        };
    }

    /**
     * Decide item usage for humans
     */
    decideHumanItemUsage(gameState, tracker, myPlayer, hatches, reachable) {
        const items = myPlayer.items || [];
        if (items.length === 0) return null;

        const turn = gameState.currentTurn || 1;
        const distToHatch = this.mapAnalyzer.getDistanceToNearestHatch(myPlayer.position, hatches);
        const alienThreat = tracker.getAlienProbability(myPlayer.position);
        const adjacentThreat = this.getAdjacentAlienRisk(myPlayer.position, tracker);
        const totalThreat = alienThreat + adjacentThreat * 0.5;

        // ADRENALINE: Use when 2 steps from hatch and can reach it
        const hasAdrenaline = items.find(i => i.type === 'ADRENALINE');
        if (hasAdrenaline && distToHatch <= 2) {
            const extendedReachable = getReachableSectors(this.map, myPlayer.position, 2, 'human');
            if (extendedReachable.some(r => hatches.includes(r.sector))) {
                this.log('Using Adrenaline to escape');
                return {
                    action: 'use_item',
                    item: hasAdrenaline,
                    reason: 'Adrenaline sprint to escape'
                };
            }
        }

        // TELEPORT: Use when cornered or high threat
        const hasTeleport = items.find(i => i.type === 'TELEPORT');
        if (hasTeleport && totalThreat > 0.5 && distToHatch > 4) {
            this.log('Using Teleport to escape danger');
            return {
                action: 'use_item',
                item: hasTeleport,
                reason: 'Emergency teleport'
            };
        }

        // SEDATIVES: Use when must pass through dangerous area
        const hasSedatives = items.find(i => i.type === 'SEDATIVES');
        if (hasSedatives && totalThreat > 0.3) {
            const allDangerous = reachable.every(r => {
                const sectorData = this.map.grid.find(h => h.label === r.sector);
                return sectorData?.state === 'dangerous';
            });
            if (allDangerous) {
                this.log('Using Sedatives for silent passage');
                return {
                    action: 'use_item',
                    item: hasSedatives,
                    reason: 'Silent passage through danger'
                };
            }
        }

        // SPOTLIGHT: Use when multiple suspects in an area
        const hasSpotlight = items.find(i => i.type === 'SPOTLIGHT');
        if (hasSpotlight) {
            // Find sector with highest aggregated probability
            let bestTarget = null;
            let highestProb = 0.3; // Minimum threshold

            this.map.grid.filter(h => h.state !== 'empty').forEach(h => {
                const prob = tracker.getAlienProbability(h.label);
                if (prob > highestProb) {
                    highestProb = prob;
                    bestTarget = h.label;
                }
            });

            if (bestTarget) {
                this.log(`Using Spotlight on ${bestTarget}`);
                return {
                    action: 'use_item',
                    item: hasSpotlight,
                    target: bestTarget,
                    reason: `Spotlight on suspected alien area`
                };
            }
        }

        // SENSOR: Use to verify single suspicion
        const hasSensor = items.find(i => i.type === 'SENSOR');
        if (hasSensor) {
            const confirmedAliens = tracker.getConfirmedAliens();
            if (confirmedAliens.length > 0) {
                const target = confirmedAliens[0];
                this.log(`Using Sensor on ${target.name}`);
                return {
                    action: 'use_item',
                    item: hasSensor,
                    target: target.id,
                    reason: `Sensor on suspected alien`
                };
            }
        }

        return null;
    }

    /**
     * Decide power usage for humans
     */
    decideHumanPowerUsage(gameState, tracker, myPlayer, hatches, reachable) {
        const power = myPlayer.character?.power;
        if (!power) return null;

        const powerUsage = myPlayer.powerUsage || {};

        // CO-PILOT: Free Teleport
        if (power.id === 'free_teleport' && powerUsage.usesRemaining > 0) {
            const distToHatch = this.mapAnalyzer.getDistanceToNearestHatch(myPlayer.position, hatches);
            const threat = tracker.getAlienProbability(myPlayer.position);

            if (threat > 0.4 && distToHatch > 5) {
                this.log('Using Co-Pilot free teleport');
                return {
                    action: 'use_power',
                    power: 'free_teleport',
                    reason: 'Strategic repositioning'
                };
            }
        }

        // SOLDIER: Free Attack (only when certain of alien)
        if (power.id === 'free_attack' && powerUsage.usesRemaining > 0) {
            const confirmedAliens = tracker.getConfirmedAliens();
            const alienInReach = confirmedAliens.find(a =>
                reachable.some(r => r.sector === a.mostLikelySector)
            );

            if (alienInReach && alienInReach.confidence > 0.8) {
                this.log(`Soldier attacking confirmed alien at ${alienInReach.mostLikelySector}`);
                return {
                    action: 'move_and_attack',
                    target: alienInReach.mostLikelySector,
                    usePower: true,
                    reason: 'Soldier attacking confirmed alien'
                };
            }
        }

        // MEDIC: Reveal Identity
        if (power.id === 'reveal_identity' && powerUsage.usesRemaining > 0) {
            // Use on player with highest alien probability who isn't confirmed
            let bestTarget = null;
            let highestProb = 0.6;

            tracker.beliefs.forEach((belief, playerId) => {
                if (belief.roleProb.alien > highestProb && belief.roleProb.alien < 0.9) {
                    highestProb = belief.roleProb.alien;
                    bestTarget = playerId;
                }
            });

            if (bestTarget) {
                this.log(`Medic revealing identity of suspected alien`);
                return {
                    action: 'use_power',
                    power: 'reveal_identity',
                    target: bestTarget,
                    reason: 'Revealing suspected alien'
                };
            }
        }

        // EXECUTIVE OFFICER: Stay Still
        if (power.id === 'stay_still' && powerUsage.usesRemaining > 0) {
            // Use when in a good position and high threat nearby
            const threat = this.getAdjacentAlienRisk(myPlayer.position, tracker);
            const sectorData = this.map.grid.find(h => h.label === myPlayer.position);

            if (threat > 0.4 && sectorData?.state === 'dangerous') {
                this.log('Executive Officer staying still to hide');
                return {
                    action: 'use_power',
                    power: 'stay_still',
                    reason: 'Hiding from nearby aliens'
                };
            }
        }

        return null;
    }

    /**
     * Deception Strategy for Noise in Any Sector
     */
    planDeception(gameState, myPlayer) {
        const allSectors = this.map.grid.filter(h => h.state !== 'empty').map(h => h.label);
        const myPos = myPlayer.position;
        const hatches = this.getAvailableHatches(gameState);

        // Get sectors that are actually reachable (for believability)
        const reachable = getReachableSectors(this.map, myPos, myPlayer.moveSpeed || 1, myPlayer.role);
        const reachableSectors = reachable.map(r => r.sector);

        // Filter to only plausible sectors
        const plausibleSectors = reachableSectors.filter(s => s !== myPos);

        if (plausibleSectors.length === 0) {
            return myPos; // No options, tell truth
        }

        const strategy = getDeceptionStrategy(this.personality, myPlayer.role);

        // === FAKE TRAIL STRATEGY ===
        if (strategy.maintainConsistency && this.lastDeceptionSector) {
            // Continue in a consistent direction
            const nearLast = plausibleSectors.filter(s =>
                this.isAdjacent(s, this.lastDeceptionSector) || s === this.lastDeceptionSector
            );
            if (nearLast.length > 0) {
                const choice = nearLast[Math.floor(this.rng.random() * nearLast.length)];
                this.lastDeceptionSector = choice;
                this.deceptionHistory.push(choice);
                return choice;
            }
        }

        // === MISDIRECT STRATEGY ===
        if (strategy.preferFarSectors) {
            // Choose sector far from actual position
            const scored = plausibleSectors.map(s => ({
                sector: s,
                distance: this.mapAnalyzer.computeDistance(myPos, s)
            }));
            scored.sort((a, b) => b.distance - a.distance);

            // Pick from top 3 farthest
            const topChoices = scored.slice(0, Math.min(3, scored.length));
            const choice = topChoices[Math.floor(this.rng.random() * topChoices.length)].sector;
            this.lastDeceptionSector = choice;
            return choice;
        }

        // === CLUSTER STRATEGY ===
        if (strategy.preferCluster) {
            // Choose sector near recent noise announcements
            const recentNoise = gameState.announcements
                .filter(a => a.type === 'NOISE' && a.sector)
                .slice(-3)
                .map(a => a.sector);

            if (recentNoise.length > 0) {
                const nearNoise = plausibleSectors.filter(s =>
                    recentNoise.some(n => this.isAdjacent(s, n))
                );
                if (nearNoise.length > 0) {
                    return nearNoise[Math.floor(this.rng.random() * nearNoise.length)];
                }
            }
        }

        // === HUMAN HATCH MISDIRECTION ===
        if (myPlayer.role === 'human' && strategy.mayTargetHatches) {
            // Point toward a hatch we're NOT going to
            const nearHatches = plausibleSectors.filter(s =>
                hatches.some(h => this.isAdjacent(s, h))
            );
            if (nearHatches.length > 0 && this.rng.random() < 0.3) {
                return nearHatches[Math.floor(this.rng.random() * nearHatches.length)];
            }
        }

        // === ALIEN HUMAN MIMICRY ===
        if (myPlayer.role === 'alien' && strategy.mayMimicHuman) {
            const analysis = this.mapAnalyzer.getAnalysis();
            // Declare near human start to appear human
            const nearHumanStart = plausibleSectors.filter(s =>
                this.mapAnalyzer.computeDistance(s, analysis.humanStart) <= 3
            );
            if (nearHumanStart.length > 0 && this.rng.random() < 0.4) {
                return nearHumanStart[Math.floor(this.rng.random() * nearHumanStart.length)];
            }
        }

        // === RANDOM FALLBACK ===
        return plausibleSectors[Math.floor(this.rng.random() * plausibleSectors.length)];
    }

    /**
     * Choose which item to discard when at max capacity
     */
    chooseDiscard(items, newItem, myPlayer) {
        const hasDefense = items.some(i => i.type === 'DEFENSE');
        const situational = {
            nearEscape: false, // Would need game state to determine
            beingChased: false,
            hasOtherDefense: hasDefense
        };

        return chooseItemToDiscard(items, newItem, myPlayer.role, situational);
    }

    // === HELPER METHODS ===

    getMovementRange(player, gameState) {
        let range = player.moveSpeed || (player.role === 'human' ? 1 : 2);

        // Fed aliens can move 3
        if (player.hasFed) range = 3;

        // Fast Alien first move bonus
        if (player.character?.power?.firstMoveBonus && !player.hasMoved) {
            range = player.character.power.firstMoveBonus;
        }

        // Active effects
        const effects = gameState.activeEffects?.[player.id] || {};
        if (effects.adrenaline) range += 1;

        return range;
    }

    getAvailableHatches(gameState) {
        return this.map.grid
            .filter(h => h.state === 'airlock' && gameState.escapeHatchStatus[h.label] === 'available')
            .map(h => h.label);
    }

    getAdjacentAlienRisk(sector, tracker) {
        const adjacent = getAdjacentSectors(this.map, sector);
        let risk = 0;
        adjacent.forEach(adj => {
            const adjLabel = adj.label || adj;
            risk += tracker.getAlienProbability(adjLabel) * 0.5;
        });
        return Math.min(risk, 1.0);
    }

    isAdjacent(sector1, sector2) {
        const adjacent = getAdjacentSectors(this.map, sector1);
        return adjacent.some(a => (a.label || a) === sector2);
    }

    log(message) {
        this.debugLog.push(`[BotPlanner] ${message}`);
        console.log(`[BotPlanner] ${message}`);
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            personality: this.personality,
            debugLog: this.debugLog,
            deceptionHistory: this.deceptionHistory
        };
    }
}

module.exports = BotPlanner;
