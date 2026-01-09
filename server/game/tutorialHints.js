/**
 * Tutorial Hints Engine for EFTAIOS
 * Rule-based heuristic system for generating move suggestions and tips for new players
 */

const { getAdjacentSectors, getReachableSectors } = require('./mapUtils');

// ============================================================================
// MOVE SCORING CONSTANTS
// ============================================================================
const SCORES = {
    // Sector type scores
    SECURE_SECTOR: 30,           // Silent move - no risk
    DANGEROUS_SECTOR: -10,       // Risk of noise/revealing position
    ESCAPE_HATCH_NEARBY: 50,     // Good to be near escape
    ESCAPE_HATCH_DIRECT: 100,    // Can escape this turn!

    // Strategic factors
    AWAY_FROM_NOISE: 20,         // Moving away from recent noise
    TOWARD_NOISE: -15,           // Moving toward noise (risky for humans)
    CENTRAL_POSITION: 10,        // Good map coverage
    EDGE_POSITION: -5,           // Corner = fewer escape routes

    // Alien-specific
    TOWARD_HUMAN_LIKELY: 40,     // Following likely human paths
    BLOCKING_ESCAPE: 35,         // Positioning to block escapes
    ATTACK_RANGE: 60,            // Can attack this turn

    // Turn-based modifiers
    EARLY_GAME_SAFE: 15,         // Staying hidden early
    LATE_GAME_AGGRESSIVE: 25,    // Pushing for escape late
};

// ============================================================================
// TIP TEMPLATES (Comprehensive set)
// ============================================================================
const TIPS = {
    // ===== TURN 1 INTRODUCTIONS =====
    HUMAN_TURN1_INTRO: {
        title: '🎮 Your First Move as Human',
        message: 'Goal: Reach an Escape Hatch (🚀) and escape! Aliens are hunting you - move carefully.',
        priority: 100
    },
    HUMAN_TURN1_SECTOR_CHOICE: {
        title: '🔇 Sector Types',
        message: 'White = SAFE (silent). Red = DANGEROUS (draw card, may reveal location).',
        priority: 90
    },
    ALIEN_TURN1_INTRO: {
        title: '👽 Your First Move as Alien',
        message: 'Hunt humans! Move 2 sectors/turn. Listen for noise to track them.',
        priority: 100
    },
    ALIEN_TURN1_SPREAD: {
        title: '🕸️ Cover Ground',
        message: 'Early game: spread out toward escape routes and map center.',
        priority: 85
    },

    // ===== SECTOR/MOVEMENT TIPS =====
    SECURE_SECTOR_BENEFIT: {
        title: '✅ Silent Move',
        message: 'White sectors = no card draw, no noise. Perfect for stealth.',
        priority: 70
    },
    DANGEROUS_SECTOR_WARNING: {
        title: '⚠️ Dangerous Sector',
        message: 'Red sectors require card draw. You may get an item or reveal location.',
        priority: 75
    },
    NEAR_ESCAPE_HATCH: {
        title: '🚀 Near Escape!',
        message: 'Close to escape hatch! Green card = escape, Red = damaged hatch.',
        priority: 80
    },
    NOISE_DECEPTION: {
        title: '🎭 Deception Tip',
        message: '"Noise in Any Sector" lets you LIE about location. Mislead aliens!',
        priority: 65
    },
    ESCAPE_HATCH_RUSH: {
        title: '🏃 Final Push',
        message: 'Low turns remaining! Take risks to reach escape hatches.',
        priority: 85
    },
    DAMAGED_ESCAPE: {
        title: '❌ Damaged Hatch',
        message: 'That hatch is damaged. Find another escape route!',
        priority: 80
    },

    // ===== HUMAN CHARACTER POWERS =====
    CAPTAIN_FIRST_SAFE: {
        title: '🎖️ Captain',
        message: 'First dangerous sector is SILENT - use to explore safely!',
        priority: 85
    },
    SOLDIER_FREE_ATTACK: {
        title: '⚔️ Soldier',
        message: 'One free attack without card! Use if you spot an alien.',
        priority: 80
    },
    PILOT_DOUBLE_NOISE: {
        title: '✈️ Pilot',
        message: 'Declare noise in TWO sectors once! Great for confusion.',
        priority: 75
    },
    ENGINEER_ESCAPE: {
        title: '🔧 Engineer',
        message: 'Choose escape card result! Guaranteed escape if available.',
        priority: 85
    },
    MEDIC_REVEAL: {
        title: '💉 Medic',
        message: 'Reveal another player\'s identity once. Strategic intel!',
        priority: 70
    },
    COPILOT_EXTRA_MOVE: {
        title: '🛫 Co-Pilot',
        message: 'Move 2 sectors once! Use for emergency escape rush.',
        priority: 75
    },
    PSYCHOLOGIST_START: {
        title: '🧠 Psychologist',
        message: 'You start in Alien Sector! Use surprise positioning wisely.',
        priority: 90
    },
    EXEC_OFFICER_TELEPORT: {
        title: '👔 Executive Officer',
        message: 'Free Teleport to Human Sector once! Emergency escape option.',
        priority: 80
    },

    // ===== ALIEN CHARACTER POWERS =====
    FAST_ALIEN_FIRST_MOVE: {
        title: '⚡ Fast Alien',
        message: 'First move = 3 sectors! Close distance on humans fast.',
        priority: 90
    },
    LURKING_ALIEN_ATTACK: {
        title: '🦎 Lurking Alien',
        message: 'Attack WITHOUT moving! Ambush humans entering your sector.',
        priority: 85
    },
    BRUTE_ALIEN_IMMUNE: {
        title: '💪 Brute Alien',
        message: 'Immune to attacks! Walk through danger fearlessly.',
        priority: 80
    },
    PSYCHIC_ALIEN_DECEPTION: {
        title: '🔮 Psychic Alien',
        message: 'Your Silence cards become Noise Anywhere - always deceive!',
        priority: 75
    },
    BLINK_ALIEN_TELEPORT: {
        title: '✨ Blink Alien',
        message: 'You can use Teleport items! Rare for aliens.',
        priority: 70
    },
    STEALTHY_ALIEN_ITEMS: {
        title: '🥷 Stealthy Alien',
        message: 'You can use human Defense and Clone cards!',
        priority: 70
    },
    FED_ALIEN_SPEED: {
        title: '🔥 Fed Alien!',
        message: 'Move 3 sectors now! Hunt down remaining humans.',
        priority: 85
    },

    // ===== ITEM TIPS =====
    ITEM_ATTACK: {
        title: '🗡️ Attack Card',
        message: 'Humans: kill aliens in your sector. Use defensively!',
        priority: 65
    },
    ITEM_ADRENALINE: {
        title: '💉 Adrenaline',
        message: 'Use BEFORE moving for +1 range. Reach escape faster!',
        priority: 60
    },
    ITEM_SEDATIVES: {
        title: '💊 Sedatives',
        message: 'Skip card draw in dangerous sector. Silent infiltration!',
        priority: 65
    },
    ITEM_SPOTLIGHT: {
        title: '🔦 Spotlight',
        message: 'Reveal all players in sector + adjacent. Scout ahead!',
        priority: 60
    },
    ITEM_SENSOR: {
        title: '📡 Sensor',
        message: 'Learn exact location of one player. Track targets!',
        priority: 60
    },
    ITEM_TELEPORT: {
        title: '🌀 Teleport',
        message: 'Instantly move to Human Start sector. Emergency escape!',
        priority: 70
    },
    ITEM_DEFENSE: {
        title: '🛡️ Defense',
        message: 'Survive one attack! Auto-triggers when hit.',
        priority: 75
    },
    ITEM_CLONE: {
        title: '🧬 Clone',
        message: 'Respawn at Human Start if killed. Second life!',
        priority: 70
    },
    ITEM_CAT: {
        title: '🐱 Cat',
        message: 'Declare noise in 2 sectors. Double confusion!',
        priority: 55
    },
    ITEM_MUTATION: {
        title: '☢️ Mutation',
        message: 'Become an Alien! Joint win if aliens dominate.',
        priority: 50
    },

    // ===== SITUATIONAL TIPS =====
    ALIEN_HEARD_NOISE: {
        title: '👂 Noise Detected',
        message: 'Noise nearby! Move toward it - but could be deception.',
        priority: 70
    },
    HUMAN_AVOID_NOISE_AREA: {
        title: '🏃 Avoid Noise',
        message: 'Noise in that area = possible alien. Reroute!',
        priority: 70
    },
    MULTIPLE_ESCAPES_USED: {
        title: '🚪 Limited Exits',
        message: 'Some hatches used/damaged. Plan alternate routes!',
        priority: 65
    },
    LAST_HUMAN_STANDING: {
        title: '😰 Last Human!',
        message: 'You\'re the last hope! Focus entirely on escape.',
        priority: 90
    },
    MANY_HUMANS_ESCAPED: {
        title: '🎯 Hunt Focus',
        message: 'Humans escaping! Block remaining hatches aggressively.',
        priority: 80
    },
    MID_GAME_STRATEGY: {
        title: '⏱️ Mid-Game',
        message: 'Balance stealth with progress toward escape zones.',
        priority: 55
    },
    LATE_GAME_PRESSURE: {
        title: '⚡ Time Pressure',
        message: 'Few turns left! Take calculated risks for escape.',
        priority: 75
    }
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate move hints for a tutorial-mode player
 * @param {Object} gameState - The current game state
 * @param {string} playerId - The player requesting hints
 * @returns {Array<{sector: string, score: number, reasons: string[], recommended: boolean, risky: boolean}>}
 */
function generateMoveHints(gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || !player.alive || player.escaped) {
        return [];
    }

    const map = gameState.map;
    const isHuman = player.role === 'human';
    const turnNumber = gameState.currentTurn;
    const playerCount = gameState.players.filter(p => p.alive && !p.escaped).length;

    // Get reachable sectors
    let maxDistance = player.hasFed ? 3 : player.moveSpeed;

    // Fast Alien first move bonus
    if (player.character?.power?.firstMoveBonus && !player.hasMoved) {
        maxDistance = player.character.power.firstMoveBonus;
    }

    // Adrenaline effect
    const effects = gameState.activeEffects?.[playerId] || {};
    if (effects.adrenaline) {
        maxDistance += 1;
    }

    const reachableSectors = getReachableSectors(map, player.position, maxDistance, player.role);

    // Score each reachable sector
    const hints = reachableSectors.map(({ sector, distance }) => {
        const sectorData = map.grid.find(h => h.label === sector);
        const score = scoreSector(sector, sectorData, player, gameState, distance, turnNumber, isHuman);

        return {
            sector,
            distance,
            score: score.total,
            reasons: score.reasons,
            recommended: false,
            risky: false
        };
    });

    // Sort by score
    hints.sort((a, b) => b.score - a.score);

    // Mark recommendations
    if (hints.length > 0) {
        // Top 2-3 are recommended
        const threshold = Math.max(hints[0].score - 30, 0);
        hints.forEach(hint => {
            hint.recommended = hint.score >= threshold && hint.score > 0;
            hint.risky = hint.score < -20;
        });
    }

    return hints;
}

/**
 * Score a sector for move recommendation
 */
function scoreSector(sector, sectorData, player, gameState, distance, turnNumber, isHuman) {
    let total = 0;
    const reasons = [];

    if (!sectorData) return { total: -1000, reasons: ['Invalid sector'] };

    const map = gameState.map;
    const characterId = player.character?.id;

    // === MAP-SPECIFIC TUTORIALMETA SCORING ===
    if (map.tutorialMeta && turnNumber === 1) {
        const meta = map.tutorialMeta;

        // Check character-specific overrides first
        if (characterId && meta.characterOverrides?.[characterId]) {
            const charMeta = meta.characterOverrides[characterId];
            if (charMeta.recommendedSectors?.includes(sector)) {
                total += 50; // Strong character-specific recommendation
                reasons.push(charMeta.turn1Notes || 'Character-optimal move');
            }
        }

        // Apply role-based Turn 1 recommendations
        if (isHuman && meta.humanTurn1) {
            if (meta.humanTurn1.recommendedSectors?.includes(sector)) {
                total += 35;
                reasons.push(meta.humanTurn1.notes || 'Map-recommended move');
            }
            if (meta.humanTurn1.avoidSectors?.includes(sector)) {
                total -= 40;
                reasons.push('Avoid: predictable or dangerous for this map');
            }
        } else if (!isHuman && meta.alienTurn1) {
            if (meta.alienTurn1.recommendedSectors?.includes(sector)) {
                total += 35;
                reasons.push(meta.alienTurn1.notes || 'Strategic hunting position');
            }
        }
    }

    // === SECTOR TYPE SCORING ===
    if (sectorData.state === 'secure') {
        total += SCORES.SECURE_SECTOR;
        reasons.push('Silent move (no noise risk)');
    } else if (sectorData.state === 'dangerous') {
        total += SCORES.DANGEROUS_SECTOR;
        reasons.push('Must draw a card');

        // Captain's first safe negates this
        if (player.character?.power?.id === 'first_safe' && player.powerUsage?.firstSafeAvailable) {
            total += 40; // Negates the penalty
            reasons.push('Captain: first dangerous sector is safe!');
        }

        // Sedatives active
        if (gameState.activeEffects?.[player.id]?.sedatives) {
            total += 40;
            reasons.push('Sedatives: skip card draw');
        }
    } else if (sectorData.state === 'airlock') {
        if (isHuman) {
            total += SCORES.ESCAPE_HATCH_DIRECT;
            reasons.push('🚀 ESCAPE HATCH - Can escape!');
        }
    }

    // === HUMAN-SPECIFIC SCORING ===
    if (isHuman) {
        // Proximity to escape hatches
        const escapeHatches = gameState.map.grid.filter(h =>
            h.state === 'airlock' &&
            gameState.escapeHatchStatus?.[h.label] === 'available'
        );

        const nearestEscape = findNearestEscape(sector, escapeHatches, gameState.map);
        if (nearestEscape && nearestEscape.distance <= 3) {
            total += Math.round(SCORES.ESCAPE_HATCH_NEARBY / nearestEscape.distance);
            reasons.push(`Near escape hatch (${nearestEscape.distance} moves away)`);
        }

        // Avoid recent noise locations (possible alien activity)
        const recentNoises = getRecentNoises(gameState);
        const nearNoise = recentNoises.find(n => isNear(sector, n.sector, gameState.map, 2));
        if (nearNoise) {
            total += SCORES.TOWARD_NOISE;
            reasons.push('Near recent noise - possible alien!');
        }

        // Turn-based strategy
        if (turnNumber <= 3) {
            // Early game: favor safe sectors
            if (sectorData.state === 'secure') {
                total += SCORES.EARLY_GAME_SAFE;
                reasons.push('Early game: stay hidden');
            }
        } else if (turnNumber >= 30) {
            // Late game: push for escape
            total += SCORES.LATE_GAME_AGGRESSIVE;
            reasons.push('Late game: push for escape!');
        }
    }

    // === ALIEN-SPECIFIC SCORING ===
    if (!isHuman) {
        // Follow noise
        const recentNoises = getRecentNoises(gameState);
        const nearNoise = recentNoises.find(n => isNear(sector, n.sector, gameState.map, 2));
        if (nearNoise) {
            total += SCORES.TOWARD_HUMAN_LIKELY;
            reasons.push('Near recent noise - hunt!');
        }

        // Block escape routes
        const escapeHatches = gameState.map.grid.filter(h =>
            h.state === 'airlock' &&
            gameState.escapeHatchStatus?.[h.label] === 'available'
        );
        const nearEscape = escapeHatches.find(h => isNear(sector, h.label, gameState.map, 2));
        if (nearEscape) {
            total += SCORES.BLOCKING_ESCAPE;
            reasons.push('Blocks escape route');
        }

        // Fed alien: aggressive hunting
        if (player.hasFed) {
            total += 15;
            reasons.push('Fed: use your speed to hunt!');
        }
    }

    return { total, reasons };
}

/**
 * Generate contextual tips for the current turn
 * @param {Object} gameState - The current game state
 * @param {string} playerId - The player requesting tips
 * @returns {Array<{title: string, message: string, priority: number}>}
 */
function generateTurnTips(gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return [];

    const tips = [];
    const isHuman = player.role === 'human';
    const turnNumber = gameState.currentTurn;
    const isFirstTurn = turnNumber === 1;

    // === TURN 1 TIPS ===
    if (isFirstTurn) {
        if (isHuman) {
            tips.push(TIPS.HUMAN_TURN1_INTRO);
            tips.push(TIPS.HUMAN_TURN1_SECTOR_CHOICE);
        } else {
            tips.push(TIPS.ALIEN_TURN1_INTRO);
            tips.push(TIPS.ALIEN_TURN1_SPREAD);
        }
    }

    // === CHARACTER POWER TIPS (HUMANS) ===
    const powerId = player.character?.power?.id;

    if (isHuman && !isMutated(player)) {
        if (powerId === 'first_safe' && player.powerUsage?.firstSafeAvailable) {
            tips.push(TIPS.CAPTAIN_FIRST_SAFE);
        }
        if (powerId === 'free_attack' && player.powerUsage?.usesRemaining > 0) {
            tips.push(TIPS.SOLDIER_FREE_ATTACK);
        }
        if (powerId === 'double_noise' && player.powerUsage?.usesRemaining > 0) {
            tips.push(TIPS.PILOT_DOUBLE_NOISE);
        }
        if (powerId === 'choose_escape' && player.powerUsage?.usesRemaining > 0) {
            tips.push(TIPS.ENGINEER_ESCAPE);
        }
        if (powerId === 'reveal_identity' && player.powerUsage?.usesRemaining > 0) {
            tips.push(TIPS.MEDIC_REVEAL);
        }
        if (powerId === 'extra_move' && player.powerUsage?.usesRemaining > 0) {
            tips.push(TIPS.COPILOT_EXTRA_MOVE);
        }
        if (powerId === 'starts_in_alien_sector' && isFirstTurn) {
            tips.push(TIPS.PSYCHOLOGIST_START);
        }
        if (powerId === 'free_teleport' && player.powerUsage?.usesRemaining > 0) {
            tips.push(TIPS.EXEC_OFFICER_TELEPORT);
        }
    }

    // === CHARACTER POWER TIPS (ALIENS) ===
    if (!isHuman || isMutated(player)) {
        if (powerId === 'fast_start' && !player.hasMoved) {
            tips.push(TIPS.FAST_ALIEN_FIRST_MOVE);
        }
        if (powerId === 'attack_in_place') {
            tips.push(TIPS.LURKING_ALIEN_ATTACK);
        }
        if (powerId === 'immune_to_attacks') {
            tips.push(TIPS.BRUTE_ALIEN_IMMUNE);
        }
        if (powerId === 'silence_becomes_noise') {
            tips.push(TIPS.PSYCHIC_ALIEN_DECEPTION);
        }
        if (powerId === 'can_use_teleport') {
            tips.push(TIPS.BLINK_ALIEN_TELEPORT);
        }
        if (powerId === 'can_use_defense_clone') {
            tips.push(TIPS.STEALTHY_ALIEN_ITEMS);
        }
        if (player.hasFed) {
            tips.push(TIPS.FED_ALIEN_SPEED);
        }
    }

    // === ITEM TIPS ===
    if (player.items && player.items.length > 0) {
        const itemTypes = player.items.map(i => i.type);

        if (itemTypes.includes('ATTACK') && isHuman) tips.push(TIPS.ITEM_ATTACK);
        if (itemTypes.includes('ADRENALINE')) tips.push(TIPS.ITEM_ADRENALINE);
        if (itemTypes.includes('SEDATIVES')) tips.push(TIPS.ITEM_SEDATIVES);
        if (itemTypes.includes('SPOTLIGHT')) tips.push(TIPS.ITEM_SPOTLIGHT);
        if (itemTypes.includes('SENSOR')) tips.push(TIPS.ITEM_SENSOR);
        if (itemTypes.includes('TELEPORT')) tips.push(TIPS.ITEM_TELEPORT);
        if (itemTypes.includes('DEFENSE')) tips.push(TIPS.ITEM_DEFENSE);
        if (itemTypes.includes('CLONE')) tips.push(TIPS.ITEM_CLONE);
        if (itemTypes.includes('CAT')) tips.push(TIPS.ITEM_CAT);
        if (itemTypes.includes('MUTATION')) tips.push(TIPS.ITEM_MUTATION);
    }

    // === SITUATIONAL TIPS ===
    if (isHuman) {
        // Near escape hatch
        const escapeHatches = gameState.map.grid.filter(h =>
            h.state === 'airlock' &&
            gameState.escapeHatchStatus?.[h.label] === 'available'
        );
        const nearEscape = escapeHatches.find(h =>
            isNear(player.position, h.label, gameState.map, 2)
        );
        if (nearEscape) {
            tips.push(TIPS.NEAR_ESCAPE_HATCH);
        }

        // Late game pressure
        if (turnNumber >= 30) {
            tips.push(TIPS.LATE_GAME_PRESSURE);
        } else if (turnNumber >= 15 && turnNumber < 30) {
            tips.push(TIPS.MID_GAME_STRATEGY);
        }

        // Last human standing
        const aliveHumans = gameState.players.filter(p =>
            p.role === 'human' && p.alive && !p.escaped && !isMutated(p)
        );
        if (aliveHumans.length === 1 && aliveHumans[0].id === playerId) {
            tips.push(TIPS.LAST_HUMAN_STANDING);
        }
    } else {
        // Alien tips
        const escapedCount = gameState.players.filter(p => p.escaped).length;
        if (escapedCount >= 2) {
            tips.push(TIPS.MANY_HUMANS_ESCAPED);
        }
    }

    // Sort by priority and return top tips
    tips.sort((a, b) => b.priority - a.priority);
    return tips.slice(0, 3); // Return top 3 tips
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a player has mutated from human to alien
 */
function isMutated(player) {
    // Import CHARACTERS would create circular dep, so check by character list
    const humanIds = ['captain', 'pilot', 'copilot', 'engineer', 'medic', 'soldier', 'psychologist', 'executive_officer'];
    return player.role === 'alien' && humanIds.includes(player.character?.id);
}

/**
 * Get recent noise announcements
 */
function getRecentNoises(gameState) {
    const noises = [];
    const announcements = gameState.announcements || [];

    // Look at last 5 announcements for noise
    const recent = announcements.slice(-10);
    recent.forEach(a => {
        if (a.type === 'NOISE' && a.sector) {
            noises.push({ sector: a.sector, playerId: a.playerId });
        }
    });

    return noises;
}

/**
 * Check if two sectors are within a certain distance
 */
function isNear(sector1, sector2, map, maxDistance = 2) {
    if (!sector1 || !sector2) return false;
    if (sector1 === sector2) return true;

    // Simple BFS for distance check
    const visited = new Set([sector1]);
    let frontier = [sector1];

    for (let d = 1; d <= maxDistance; d++) {
        const nextFrontier = [];
        for (const s of frontier) {
            const adjacent = getAdjacentSectors(map, s);
            for (const adj of adjacent) {
                if (adj === sector2) return true;
                if (!visited.has(adj)) {
                    visited.add(adj);
                    nextFrontier.push(adj);
                }
            }
        }
        frontier = nextFrontier;
    }

    return false;
}

/**
 * Find nearest escape hatch from a sector
 */
function findNearestEscape(sector, escapeHatches, map) {
    let nearest = null;

    for (const hatch of escapeHatches) {
        for (let d = 1; d <= 10; d++) {
            if (isNear(sector, hatch.label, map, d)) {
                if (!nearest || d < nearest.distance) {
                    nearest = { sector: hatch.label, distance: d };
                }
                break;
            }
        }
    }

    return nearest;
}

module.exports = {
    generateMoveHints,
    generateTurnTips,
    TIPS,
    SCORES
};
