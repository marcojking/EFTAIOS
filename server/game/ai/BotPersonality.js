/**
 * BotPersonality.js
 *
 * Generates unique personality traits for each bot at game start.
 * These traits influence decision-making to create varied, unpredictable behavior.
 */

// Deception style options
const DECEPTION_STYLES = ['misdirect', 'fake-trail', 'cluster', 'random'];

// Hunting style options (for aliens)
const HUNTING_STYLES = ['camp-escape', 'spread-explore', 'spawn-watch'];

/**
 * Generate a random personality for a bot
 * @returns {Object} Personality traits
 */
function generatePersonality() {
    return {
        // Core traits (0.3-0.7 range for balanced variation)
        aggression: 0.3 + Math.random() * 0.4,          // Attack confidence threshold modifier
        riskTolerance: 0.3 + Math.random() * 0.4,       // Willingness to take dangerous paths

        // Strategic preferences
        deceptionStyle: DECEPTION_STYLES[Math.floor(Math.random() * DECEPTION_STYLES.length)],
        huntingStyle: HUNTING_STYLES[Math.floor(Math.random() * HUNTING_STYLES.length)],

        // Timing preferences
        escapeUrgency: 20 + Math.floor(Math.random() * 11),  // Turn 20-30 when urgency kicks in
        thinkingSpeed: 2000 + Math.floor(Math.random() * 3001), // 2000-5000ms delay

        // Behavioral modifiers
        noiseInterpretationConfidence: 0.4 + Math.random() * 0.4, // 0.4-0.8 trust in noise declarations
        patrolPreference: Math.random(),  // 0-1: lower = stay near spawn, higher = roam far
        itemConservation: 0.3 + Math.random() * 0.4,  // When to use items vs save them

        // Advanced tactics
        doubleBackFrequency: 0.1 + Math.random() * 0.2,  // 0.1-0.3 how often to double-back
        fakeTrailLength: 2 + Math.floor(Math.random() * 3), // 2-4 turns of fake trail
    };
}

/**
 * Get attack threshold based on personality and game state
 * @param {Object} personality - Bot's personality traits
 * @param {number} currentTurn - Current game turn
 * @param {number} maxTurns - Maximum turns in game
 * @returns {number} Probability threshold for attack decision
 */
function getAttackThreshold(personality, currentTurn, maxTurns = 39) {
    // Base threshold modified by aggression (0.3-0.5)
    const baseThreshold = 0.5 - (personality.aggression * 0.2);

    // Increase aggression as game progresses (turn pressure)
    const turnsRemaining = maxTurns - currentTurn;
    const turnPressure = turnsRemaining < 10 ? (10 - turnsRemaining) * 0.03 : 0;

    // Final threshold (lower = more aggressive)
    return Math.max(0.15, baseThreshold - turnPressure);
}

/**
 * Check if urgency mode should be active
 * @param {Object} personality - Bot's personality traits
 * @param {number} currentTurn - Current game turn
 * @returns {boolean} Whether bot should be in urgency mode
 */
function isUrgencyMode(personality, currentTurn) {
    return currentTurn >= personality.escapeUrgency;
}

/**
 * Get movement risk modifier based on personality and situation
 * @param {Object} personality - Bot's personality traits
 * @param {boolean} hasDefense - Whether bot has Defense item
 * @param {boolean} hasClone - Whether bot has Clone item
 * @returns {number} Risk modifier (higher = take more risks)
 */
function getRiskModifier(personality, hasDefense, hasClone) {
    let modifier = personality.riskTolerance;

    // More willing to take risks with safety items
    if (hasDefense) modifier += 0.15;
    if (hasClone) modifier += 0.15;

    return Math.min(1.0, modifier);
}

/**
 * Decide if bot should double-back (unpredictable movement)
 * @param {Object} personality - Bot's personality traits
 * @returns {boolean} Whether to double-back this turn
 */
function shouldDoubleBack(personality) {
    return Math.random() < personality.doubleBackFrequency;
}

/**
 * Get noise interpretation confidence for a specific situation
 * @param {Object} personality - Bot's personality traits
 * @param {boolean} isReachable - Whether the declared sector is reachable
 * @param {number} clusterBonus - Bonus if noise clusters with other declarations
 * @returns {number} Confidence level (0-1) that noise is truthful
 */
function getNoiseConfidence(personality, isReachable, clusterBonus = 0) {
    if (!isReachable) {
        // Impossible move = definitely a lie
        return 0;
    }

    let confidence = personality.noiseInterpretationConfidence;
    confidence += clusterBonus * 0.1;  // Clustering increases credibility

    return Math.min(0.95, confidence);
}

/**
 * Get deception sector selection strategy
 * @param {Object} personality - Bot's personality traits
 * @param {string} role - 'human' or 'alien'
 * @returns {Object} Strategy configuration for deception
 */
function getDeceptionStrategy(personality, role) {
    const style = personality.deceptionStyle;

    const strategies = {
        'misdirect': {
            // Declare noise opposite of actual direction
            preferFarSectors: true,
            targetHatchProximity: false,
            randomness: 0.1
        },
        'fake-trail': {
            // Create believable path in wrong direction over multiple turns
            preferFarSectors: true,
            maintainConsistency: true,
            trailLength: personality.fakeTrailLength,
            randomness: 0.05
        },
        'cluster': {
            // Declare near other noise to blend in
            preferCluster: true,
            randomness: 0.2
        },
        'random': {
            // Random plausible sector
            randomness: 0.8
        }
    };

    const baseStrategy = strategies[style] || strategies['random'];

    // Role-specific modifications
    if (role === 'human') {
        // Humans might declare near hatches to confuse aliens
        baseStrategy.mayTargetHatches = true;
    } else {
        // Aliens might declare near human spawn to appear human
        baseStrategy.mayMimicHuman = true;
    }

    return baseStrategy;
}

/**
 * Get hunting strategy for alien bots
 * @param {Object} personality - Bot's personality traits
 * @returns {Object} Hunting strategy configuration
 */
function getHuntingStrategy(personality) {
    const style = personality.huntingStyle;

    const strategies = {
        'camp-escape': {
            // Immediately go guard escape hatches
            prioritizeHatches: true,
            patrolRadius: 2,
            aggressionBoost: 0.1
        },
        'spread-explore': {
            // Systematically explore outward from spawn
            prioritizeExploration: true,
            patrolRadius: 4,
            aggressionBoost: 0
        },
        'spawn-watch': {
            // Lurk near human spawn early game
            prioritizeHumanSpawn: true,
            patrolRadius: 3,
            earlyGameFocus: true,
            aggressionBoost: 0.05
        }
    };

    return strategies[style] || strategies['spread-explore'];
}

/**
 * Get item usage priority for discarding
 * (Higher priority = keep the item)
 * @param {string} role - 'human' or 'alien'
 * @param {string} itemType - Item type
 * @param {Object} situationalFactors - Optional situational modifiers
 * @returns {number} Priority value (higher = more valuable)
 */
function getItemPriority(role, itemType, situationalFactors = {}) {
    const { nearEscape, beingChased, hasOtherDefense } = situationalFactors;

    // Base priorities for humans (from user specification)
    const humanPriorities = {
        'DEFENSE': 100,
        'TELEPORT': 90,
        'ADRENALINE': 80,
        'CLONE': 70,
        'SEDATIVES': 60,
        'ATTACK': 50,
        'SENSOR': 40,
        'SPOTLIGHT': 30,
        'CAT': 20,
        'MUTATION': 10  // Never use for bots
    };

    let priority = humanPriorities[itemType] || 0;

    // Situational adjustments
    if (nearEscape) {
        // Near escape: movement items more valuable
        if (itemType === 'ADRENALINE') priority += 20;
        if (itemType === 'DEFENSE') priority += 15;
    }

    if (beingChased) {
        // Being chased: defense/escape items more valuable
        if (itemType === 'TELEPORT') priority += 25;
        if (itemType === 'DEFENSE') priority += 20;
    }

    if (hasOtherDefense && itemType === 'CLONE') {
        // Already have defense, clone less critical
        priority -= 10;
    }

    return priority;
}

/**
 * Choose which item to discard when at max capacity
 * @param {Array} items - Current items
 * @param {Object} newItem - New item to potentially keep
 * @param {string} role - 'human' or 'alien'
 * @param {Object} situationalFactors - Situational modifiers
 * @returns {Object} Item to discard (or newItem if it should be discarded)
 */
function chooseItemToDiscard(items, newItem, role, situationalFactors = {}) {
    const allItems = [...items, newItem];

    // Calculate priority for each item
    const prioritized = allItems.map(item => ({
        item,
        priority: getItemPriority(role, item.type, situationalFactors)
    }));

    // Sort by priority (ascending - lowest priority first)
    prioritized.sort((a, b) => a.priority - b.priority);

    // Return the lowest priority item to discard
    return prioritized[0].item;
}

module.exports = {
    generatePersonality,
    getAttackThreshold,
    isUrgencyMode,
    getRiskModifier,
    shouldDoubleBack,
    getNoiseConfidence,
    getDeceptionStrategy,
    getHuntingStrategy,
    getItemPriority,
    chooseItemToDiscard,
    DECEPTION_STYLES,
    HUNTING_STYLES
};
