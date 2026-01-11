const { getReachableSectors, getAdjacentSectors } = require('../mapUtils');
const MapAnalyzer = require('./MapAnalyzer');
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
 */
class BotPlanner {
    constructor(botId, map, personality = null) {
        this.botId = botId;
        this.map = map;

        // Generate or use provided personality
        this.personality = personality || generatePersonality();

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
     * Human Strategy - Expert Level
     */
    planHumanMove(gameState, tracker, myPlayer, reachable) {
        const hatches = this.getAvailableHatches(gameState);
        const items = myPlayer.items || [];
        const turn = gameState.currentTurn || 1;
        const urgency = isUrgencyMode(this.personality, turn);

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
        const escapeMove = reachable.find(r => hatches.includes(r.sector));
        if (escapeMove) {
            this.log(`Immediate escape available at ${escapeMove.sector}`);
            return {
                action: 'move',
                target: escapeMove.sector,
                reason: 'Escape available!',
                debug: this.debugLog
            };
        }

        // === CALCULATE BEST MOVE ===
        const hasDefense = items.some(i => i.type === 'DEFENSE');
        const hasClone = items.some(i => i.type === 'CLONE');
        const riskMod = getRiskModifier(this.personality, hasDefense, hasClone);

        let bestMove = null;
        let minCost = Infinity;

        reachable.forEach(move => {
            const sector = move.sector;
            let cost = 0;

            // Distance to nearest escape hatch
            const distToHatch = this.mapAnalyzer.getDistanceToNearestHatch(sector, hatches);
            cost += distToHatch * 2;

            // Risk from suspected aliens
            const alienRisk = tracker.getAlienProbability(sector);
            const adjacentRisk = this.getAdjacentAlienRisk(sector, tracker);
            cost += (alienRisk * 10 + adjacentRisk * 5) / riskMod;

            // Sector type preference
            const sectorData = this.map.grid.find(h => h.label === sector);
            const isSilent = sectorData?.state === 'secure' || sectorData?.state === 'safe';

            if (isSilent) {
                cost -= 1; // Prefer silent sectors
            }

            // Urgency mode: prioritize speed over safety
            if (urgency) {
                cost = distToHatch * 3 + alienRisk * 3;
            }

            // Movement unpredictability
            if (shouldDoubleBack(this.personality) && this.deceptionHistory.length > 0) {
                // Occasionally move in unexpected direction
                cost += (Math.random() - 0.5) * 2;
            }

            // Add personality variance
            cost += (Math.random() - 0.5) * this.personality.riskTolerance;

            if (cost < minCost) {
                minCost = cost;
                bestMove = sector;
            }
        });

        // Fallback
        if (!bestMove && reachable.length > 0) {
            bestMove = reachable[0].sector;
        }

        this.log(`Best move: ${bestMove} (cost: ${minCost.toFixed(2)})`);

        return {
            action: 'move',
            target: bestMove,
            reason: urgency ? 'Urgent escape path' : 'Strategic movement',
            debug: this.debugLog
        };
    }

    /**
     * Alien Strategy - Expert Level
     */
    planAlienMove(gameState, tracker, myPlayer, reachable) {
        const hatches = this.getAvailableHatches(gameState);
        const turn = gameState.currentTurn || 1;
        const huntingStrategy = getHuntingStrategy(this.personality);

        this.log(`Alien strategy - Turn ${turn}, Style: ${this.personality.huntingStyle}`);

        // Get suspected alien positions (to avoid friendly fire)
        const confirmedAliens = tracker.getConfirmedAliens();
        const suspectedAlienSectors = confirmedAliens.map(a => a.mostLikelySector);

        // === LURKING ALIEN - ATTACK IN PLACE ===
        if (myPlayer.character?.power?.canAttackWithoutMoving) {
            const humanProb = tracker.getHumanProbability(myPlayer.position);
            const threshold = getAttackThreshold(this.personality, turn);

            if (humanProb >= threshold) {
                this.log(`Lurking attack opportunity: ${(humanProb * 100).toFixed(0)}% probability`);
                return {
                    action: 'attack_in_place',
                    reason: `Lurking ambush (${(humanProb * 100).toFixed(0)}% human probability)`,
                    debug: this.debugLog
                };
            }
        }

        // === FIND ATTACK TARGET ===
        const attackThreshold = getAttackThreshold(this.personality, turn);
        let bestAttackTarget = null;
        let highestProb = 0;

        reachable.forEach(move => {
            const sector = move.sector;
            const humanProb = tracker.getHumanProbability(sector);

            // Avoid sectors where we just attacked (empty) or where aliens might be
            if (tracker.confirmedEmptySectors.has(sector)) return;
            if (suspectedAlienSectors.includes(sector)) return;

            // Bonus for hatch sectors (area denial)
            const isHatch = hatches.includes(sector);
            const effectiveProb = isHatch ? humanProb + 0.2 : humanProb;

            if (effectiveProb > highestProb) {
                highestProb = effectiveProb;
                bestAttackTarget = { sector, prob: effectiveProb, isHatch };
            }
        });

        // Decide whether to attack
        if (bestAttackTarget && highestProb >= attackThreshold) {
            this.log(`Attack target: ${bestAttackTarget.sector} (${(highestProb * 100).toFixed(0)}%)`);
            return {
                action: 'move_and_attack',
                target: bestAttackTarget.sector,
                reason: bestAttackTarget.isHatch
                    ? `Hatch denial (${(highestProb * 100).toFixed(0)}%)`
                    : `Hunt target (${(highestProb * 100).toFixed(0)}%)`,
                debug: this.debugLog
            };
        }

        // === PATROL MOVEMENT ===
        return this.planPatrolMove(gameState, tracker, myPlayer, reachable, hatches, huntingStrategy, suspectedAlienSectors);
    }

    /**
     * Patrol movement for aliens when not attacking
     */
    planPatrolMove(gameState, tracker, myPlayer, reachable, hatches, huntingStrategy, suspectedAlienSectors) {
        let bestMove = null;
        let maxScore = -Infinity;

        const analysis = this.mapAnalyzer.getAnalysis();
        const humanStart = analysis.humanStart;
        const patrolZones = analysis.patrolZones || [];

        reachable.forEach(move => {
            const sector = move.sector;
            let score = 0;

            // Human probability at this sector
            const humanProb = tracker.getHumanProbability(sector);
            score += humanProb * 10;

            // Hunting style bonuses
            if (huntingStrategy.prioritizeHatches) {
                if (hatches.some(h => this.isAdjacent(sector, h) || h === sector)) {
                    score += 5;
                }
            }

            if (huntingStrategy.prioritizeHumanSpawn) {
                const distToHumanStart = this.mapAnalyzer.computeDistance(sector, humanStart);
                if (distToHumanStart <= 3) {
                    score += 3;
                }
            }

            if (huntingStrategy.prioritizeExploration) {
                // Prefer sectors in patrol zones
                if (patrolZones.includes(sector)) {
                    score += 2;
                }
            }

            // Avoid other aliens (prevent friendly fire)
            if (suspectedAlienSectors.includes(sector)) {
                score -= 10;
            }

            // Personality variance
            score += (Math.random() - 0.5) * 2 * this.personality.patrolPreference;

            if (score > maxScore) {
                maxScore = score;
                bestMove = sector;
            }
        });

        if (!bestMove) bestMove = reachable[0]?.sector;

        this.log(`Patrol move: ${bestMove} (score: ${maxScore.toFixed(2)})`);

        return {
            action: 'move',
            target: bestMove,
            reason: 'Hunting patrol',
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
                const choice = nearLast[Math.floor(Math.random() * nearLast.length)];
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
            const choice = topChoices[Math.floor(Math.random() * topChoices.length)].sector;
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
                    return nearNoise[Math.floor(Math.random() * nearNoise.length)];
                }
            }
        }

        // === HUMAN HATCH MISDIRECTION ===
        if (myPlayer.role === 'human' && strategy.mayTargetHatches) {
            // Point toward a hatch we're NOT going to
            const nearHatches = plausibleSectors.filter(s =>
                hatches.some(h => this.isAdjacent(s, h))
            );
            if (nearHatches.length > 0 && Math.random() < 0.3) {
                return nearHatches[Math.floor(Math.random() * nearHatches.length)];
            }
        }

        // === ALIEN HUMAN MIMICRY ===
        if (myPlayer.role === 'alien' && strategy.mayMimicHuman) {
            const analysis = this.mapAnalyzer.getAnalysis();
            // Declare near human start to appear human
            const nearHumanStart = plausibleSectors.filter(s =>
                this.mapAnalyzer.computeDistance(s, analysis.humanStart) <= 3
            );
            if (nearHumanStart.length > 0 && Math.random() < 0.4) {
                return nearHumanStart[Math.floor(Math.random() * nearHumanStart.length)];
            }
        }

        // === RANDOM FALLBACK ===
        return plausibleSectors[Math.floor(Math.random() * plausibleSectors.length)];
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
