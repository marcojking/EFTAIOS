/**
 * GameTips.js
 * 
 * Context-sensitive tips and instructions for new players.
 * Provides helpful guidance based on current game state.
 */

// Starting tips by role
const STARTING_TIPS = {
    human: {
        title: "You are a HUMAN",
        objective: "Escape the ship via an Escape Pod before the aliens find you!",
        tips: [
            "Move by clicking adjacent hexes",
            "Gray sectors are DANGEROUS - you'll draw a card",
            "Blue sectors are SAFE - no noise required",
            "Use items strategically to survive"
        ],
        icon: "👤"
    },
    alien: {
        title: "You are an ALIEN",
        objective: "Hunt down and eliminate all humans before they escape!",
        tips: [
            "You can move 1-2 sectors per turn",
            "After killing a human, you move up to 3 sectors",
            "Attack by moving to a sector and declaring it",
            "Be careful: killing another alien is permanent!"
        ],
        icon: "👽"
    }
};

// Context-sensitive tips based on game state
const SITUATION_TIPS = {
    // Movement-related
    nearDangerousSector: {
        human: "⚠️ Entering a dangerous sector will require drawing a card. You might reveal your location!",
        alien: "Moving through dangerous sectors can help hide your alien movement pattern."
    },
    nearEscapePod: {
        human: "🚀 You're close to an escape pod! Plan your final approach carefully.",
        alien: "An escape pod is nearby. Humans will try to reach it - patrol this area!"
    },

    // Card-related
    drewNoiseCard: {
        human: "📢 You must announce noise. If it says 'ANY SECTOR', you can LIE about your location!",
        alien: "You drew a noise card. This helps maintain your cover as 'just another player'."
    },
    drewSilenceCard: {
        human: "🤫 Silence! You don't reveal your location. Stay quiet and keep moving.",
        alien: "Silence card - you remain hidden. Use this to get closer to suspects."
    },
    drewItemCard: {
        human: "🎁 You got an item! Check your inventory to see what it does.",
        alien: "Items can only be used by humans (with some exceptions). Collecting them hides this from others."
    },

    // Combat-related
    underAttack: {
        human: "⚔️ You're under attack! If you have DEFENSE or CLONE, you can use them now.",
        alien: "The attack resolves. Anyone in that sector is eliminated."
    },
    alienNearby: {
        human: "⚠️ Recent noise suggests an alien might be nearby. Consider using Sedatives or Teleport!",
        alien: null
    },

    // Item-specific tips
    hasUnusedTeleport: {
        human: "📦 You have a Teleport! Use it if cornered to escape back to the Human Sector.",
        alien: null
    },
    hasUnusedAdrenaline: {
        human: "📦 You have Adrenaline! Use it near an escape pod to sprint and escape.",
        alien: null
    },
    hasUnusedDefense: {
        human: "📦 You have Defense! It will automatically block one attack. Keep it as insurance.",
        alien: null
    }
};

// Post-game tips based on outcome
const POST_GAME_TIPS = {
    humanEscaped: {
        winner: "Congratulations! You escaped the ship. Your survival skills paid off!",
        tips: [
            "Good use of item cards at the right time",
            "Misdirection helped confuse the aliens"
        ]
    },
    humanKilled: {
        loser: "You were caught! Here's what might have gone wrong:",
        tips: [
            "Moving in predictable patterns made you easy to track",
            "Using items earlier might have saved you",
            "Next time, try doubling back to confuse pursuers"
        ]
    },
    alienWon: {
        winner: "The aliens have won! All humans eliminated.",
        tips: [
            "Good coordination between aliens",
            "Effective tracking of noise announcements"
        ]
    },
    alienLost: {
        loser: "A human escaped! The hunt wasn't successful.",
        tips: [
            "Guard the escape pods more closely",
            "Track noise patterns to predict human paths"
        ]
    }
};

/**
 * GameTips class for generating contextual tips
 */
class GameTips {
    constructor() {
        this.shownTips = new Set(); // Track which tips have been shown to avoid spam
        this.tipCooldown = {};       // Per-tip cooldowns
    }

    /**
     * Get starting tips for a player based on their role
     */
    getStartingTips(role) {
        return STARTING_TIPS[role] || STARTING_TIPS.human;
    }

    /**
     * Generate tips based on current game state
     * @param {Object} gameState - Current game state
     * @param {Object} player - The player to generate tips for
     * @returns {Array} List of tip objects
     */
    getTipsForState(gameState, player) {
        const tips = [];
        const role = player.role;
        const position = player.position;
        const items = player.items || [];
        const turn = gameState.currentTurn || 1;

        // === TURN 1-2: Always show starting tips ===
        if (turn <= 2) {
            tips.push({
                type: 'starting',
                priority: 'high',
                ...this.getStartingTips(role)
            });
        }

        // === ITEM REMINDERS ===
        if (role === 'human') {
            if (items.find(i => i.type === 'TELEPORT')) {
                tips.push(this.createTip('hasUnusedTeleport', role, 'medium'));
            }
            if (items.find(i => i.type === 'ADRENALINE')) {
                tips.push(this.createTip('hasUnusedAdrenaline', role, 'medium'));
            }
            if (items.find(i => i.type === 'DEFENSE')) {
                tips.push(this.createTip('hasUnusedDefense', role, 'low'));
            }
        }

        // === ESCAPE POD PROXIMITY ===
        const nearPod = this.isNearEscapePod(gameState, position);
        if (nearPod) {
            tips.push(this.createTip('nearEscapePod', role, 'high'));
        }

        // === THREAT ASSESSMENT (for humans) ===
        if (role === 'human') {
            const recentAlienNoise = this.detectNearbyThreat(gameState, position);
            if (recentAlienNoise) {
                tips.push(this.createTip('alienNearby', role, 'high'));
            }
        }

        return tips.filter(t => t !== null);
    }

    /**
     * Get tip for a card draw event
     */
    getTipForCardDraw(cardType, role) {
        let tipKey = null;

        switch (cardType) {
            case 'NOISE_YOUR_SECTOR':
            case 'NOISE_ANY_SECTOR':
                tipKey = 'drewNoiseCard';
                break;
            case 'SILENCE':
                tipKey = 'drewSilenceCard';
                break;
            case 'ITEM':
                tipKey = 'drewItemCard';
                break;
        }

        return tipKey ? this.createTip(tipKey, role, 'high') : null;
    }

    /**
     * Get post-game tips
     */
    getPostGameTips(outcome, wasWinner, role) {
        let tipKey = null;

        if (role === 'human') {
            tipKey = wasWinner ? 'humanEscaped' : 'humanKilled';
        } else {
            tipKey = wasWinner ? 'alienWon' : 'alienLost';
        }

        return POST_GAME_TIPS[tipKey] || null;
    }

    // === Helper Methods ===

    createTip(tipKey, role, priority) {
        const tipData = SITUATION_TIPS[tipKey];
        if (!tipData) return null;

        const message = typeof tipData === 'string' ? tipData : tipData[role];
        if (!message) return null;

        return {
            type: tipKey,
            message,
            priority,
            role
        };
    }

    isNearEscapePod(gameState, position) {
        // Check if any adjacent sector is an escape pod
        const map = gameState.map;
        if (!map) return false;

        const pods = map.grid.filter(h => h.state === 'airlock');
        for (const pod of pods) {
            if (gameState.escapeHatchStatus?.[pod.label] === 'available') {
                // Simple distance check (would need proper adjacency calc)
                return true;
            }
        }
        return false;
    }

    detectNearbyThreat(gameState, position) {
        // Check recent announcements for noise near player position
        const recentTurns = 3;
        const currentTurn = gameState.currentTurn || 1;

        const recentNoises = gameState.announcements.filter(a =>
            a.type === 'ATTACK' &&
            a.turn >= currentTurn - recentTurns
        );

        return recentNoises.length > 0;
    }

    /**
     * Format tips for display
     */
    formatTipsForDisplay(tips) {
        if (!tips || tips.length === 0) return null;

        // Sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        tips.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

        // Take top 2 tips to avoid overwhelming
        return tips.slice(0, 2);
    }
}

module.exports = {
    GameTips,
    STARTING_TIPS,
    SITUATION_TIPS,
    POST_GAME_TIPS
};
