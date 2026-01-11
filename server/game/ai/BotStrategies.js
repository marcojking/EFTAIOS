/**
 * BotStrategies.js
 * 
 * Character-specific strategy configurations for AI bots.
 * Based on EFTAIOS Ultimate Edition rules and strategy guide.
 */

// Difficulty tier configurations
const DIFFICULTY_CONFIGS = {
    beginner: {
        aggressionMod: 0.5,        // Lower attack threshold
        deceptionQuality: 0.3,     // More random, less strategic lies
        itemUsage: false,          // Don't use items optimally
        unpredictability: 0.1,     // Low randomness in movement
        patrolEfficiency: 0.5,     // Basic patrol patterns
        attackEarlyGame: false,    // Don't attack in first few turns
        trackingAccuracy: 0.6      // Less accurate opponent tracking
    },
    intermediate: {
        aggressionMod: 0.8,
        deceptionQuality: 0.6,
        itemUsage: true,
        unpredictability: 0.3,
        patrolEfficiency: 0.75,
        attackEarlyGame: false,
        trackingAccuracy: 0.8
    },
    advanced: {
        aggressionMod: 1.0,
        deceptionQuality: 0.9,
        itemUsage: true,
        unpredictability: 0.5,     // High strategic randomness
        patrolEfficiency: 1.0,
        attackEarlyGame: true,     // Will attack early if confident
        trackingAccuracy: 1.0
    }
};

// Human character-specific strategies
const HUMAN_STRATEGIES = {
    Captain: {
        description: "Can ignore first Dangerous Sector card",
        preferDangerousEarly: true,    // More willing to enter dangerous sectors early
        riskTolerance: 1.3,            // 30% higher risk tolerance
        itemPriority: ['DEFENSE', 'CLONE', 'TELEPORT']
    },
    Pilot: {
        description: "Starts with Cat item",
        deceptionFocus: true,          // Prioritize confusing aliens
        catUsageTiming: 'midgame',     // When to use Cat for max confusion
        itemPriority: ['CAT', 'ADRENALINE', 'TELEPORT']
    },
    Psychologist: {
        description: "Starts in Alien sector",
        startPosition: 'alien',        // Unique starting position
        earlyEvasion: true,            // Must evade immediately
        riskTolerance: 0.7,            // Lower risk tolerance (vulnerable start)
        itemPriority: ['TELEPORT', 'SEDATIVES', 'DEFENSE']
    },
    Soldier: {
        description: "Starts with Attack item",
        aggressiveMode: true,          // Can eliminate aliens
        huntAliens: true,              // Actively look for aliens to attack
        attackThreshold: 0.6,          // Attack if 60% confident it's an alien
        itemPriority: ['ATTACK', 'DEFENSE', 'ADRENALINE']
    },
    'Executive Officer': {
        description: "Can stay still once",
        stayStillTiming: 'whenCornered', // When to use stay-still power
        ambushCapable: true,           // Can set up ambush by not moving
        riskTolerance: 1.0,
        itemPriority: ['DEFENSE', 'CLONE', 'SEDATIVES']
    },
    'Co-Pilot': {
        description: "Starts with Teleport item",
        teleportReserve: true,         // Save teleport for emergency
        teleportThreshold: 0.7,        // Use when 70% sure cornered
        itemPriority: ['TELEPORT', 'ADRENALINE', 'DEFENSE']
    },
    Engineer: {
        description: "Draws 2 pod cards, chooses 1",
        escapeConfidence: 1.5,         // 50% more confident in escape attempts
        aggressiveEscape: true,        // Rush to pods more readily
        itemPriority: ['ADRENALINE', 'SEDATIVES', 'DEFENSE']
    },
    Medic: {
        description: "Can force identity reveal",
        infoGathering: true,           // Prioritize learning identities
        revealTiming: 'whenSuspicious', // When to use reveal power
        itemPriority: ['SENSOR', 'SPOTLIGHT', 'DEFENSE']
    }
};

// Alien character-specific strategies
const ALIEN_STRATEGIES = {
    Blink: {
        description: "Can use Teleport items",
        canUseTeleport: true,
        teleportAggression: true,      // Use teleport offensively
        itemPriority: ['TELEPORT'],    // Collect teleports
        huntingStyle: 'ambush'
    },
    Silent: {
        description: "Can use Sedatives items",
        canUseSedatives: true,
        stealthHunting: true,          // Move silently through danger
        prioritizeDangerousSectors: true,
        huntingStyle: 'stealth'
    },
    Surge: {
        description: "Can use Adrenaline items",
        canUseAdrenaline: true,
        burstSpeed: true,              // Use adrenaline for quick strikes
        itemPriority: ['ADRENALINE'],
        huntingStyle: 'blitz'
    },
    Brute: {
        description: "Immune to ALL attacks",
        immuneToAttacks: true,
        fearlessHunting: true,         // Can hunt without fear of Soldier
        baitTactics: true,             // Can bait humans with Attack items
        huntingStyle: 'aggressive'
    },
    Invisible: {
        description: "Immune to Sensor/Spotlight",
        immuneToDetection: true,
        exploitDetectionImmunity: true,
        patrolNearHatches: true,       // Camp escape pods safely
        huntingStyle: 'ambush'
    },
    Lurking: {
        description: "Can attack without moving",
        canAttackWithoutMoving: true,
        ambushPriority: true,          // Set up ambushes
        attackInPlaceThreshold: 0.4,   // Attack in place if 40%+ human probability
        huntingStyle: 'ambush'
    },
    Fast: {
        description: "3 sectors on first turn",
        firstTurnBonus: 3,             // Movement on turn 1
        earlyPressure: true,           // Pressure humans immediately
        coverMultiplePods: true,       // Can patrol between pods
        huntingStyle: 'patrol'
    },
    Psychic: {
        description: "Silence → Must announce noise anyway",
        alwaysAnnounceNoise: true,
        constantDeception: true,       // Every silence is a lie
        deceptionPattern: 'strategic', // Use lies strategically
        huntingStyle: 'deception'
    }
};

// Deception strategies for green cards
const DECEPTION_STRATEGIES = {
    // For humans
    human: {
        beginner: {
            strategy: 'random',        // Pick random far sector
            description: 'Randomly select a sector far from current position'
        },
        intermediate: {
            strategy: 'opposite',      // Announce opposite direction of travel
            description: 'Announce noise in opposite direction of escape route'
        },
        advanced: {
            strategy: 'meta',          // Double-bluff, near-hatch confusion
            description: 'Strategic lies near hatches or to bait attacks'
        }
    },
    // For aliens
    alien: {
        beginner: {
            strategy: 'random',
            description: 'Random sector announcement'
        },
        intermediate: {
            strategy: 'mimic',         // Mimic human movement patterns
            description: 'Announce as if following human escape pattern'
        },
        advanced: {
            strategy: 'bait',          // Announce own position to draw humans
            description: 'Sometimes announce real position to confuse'
        }
    }
};

// Item usage timing recommendations
const ITEM_USAGE_TIMING = {
    ATTACK: {
        human: 'whenConfidentAlienNearby',  // Use when 60%+ sure of alien
        priority: 'high'
    },
    TELEPORT: {
        human: 'whenCorneredOrLowHP',       // Emergency escape
        alien: 'forBlink_ambush',           // Blink: surprise positioning
        priority: 'emergency'
    },
    ADRENALINE: {
        human: 'nearEscapePod',             // Sprint to pod
        alien: 'forSurge_chase',            // Surge: close gap quickly
        priority: 'tactical'
    },
    SEDATIVES: {
        human: 'throughDangerousChokepoint', // Silent dangerous move
        alien: 'forSilent_approach',        // Silent: undetected approach
        priority: 'tactical'
    },
    DEFENSE: {
        human: 'saveForAttack',             // Always keep as insurance
        priority: 'emergency'
    },
    CLONE: {
        human: 'saveAsLastResort',          // Final insurance
        priority: 'emergency'
    },
    SPOTLIGHT: {
        human: 'whenNeedInfo',              // Find aliens in area
        priority: 'info'
    },
    SENSOR: {
        human: 'whenSuspectSpecificPlayer', // Confirm specific player
        priority: 'info'
    },
    CAT: {
        human: 'whenNeedMaxConfusion',      // Create double noise
        priority: 'deception'
    },
    MUTATION: {
        human: 'desperationOnly',           // Only if escape impossible
        priority: 'never'
    }
};

// Map-specific tips (for AI decision making and new player hints)
const MAP_TIPS = {
    galilei: {
        difficulty: 'beginner',
        tips: ['Balanced mix of safe and dangerous sectors', 'Good for learning basic strategies'],
        chokepoints: [],
        favoredSide: 'neutral'
    },
    fermi: {
        difficulty: 'intermediate',
        tips: ['Many dangerous sectors', 'Aliens favored', 'Avoid central O10/I09 areas'],
        chokepoints: ['O10', 'I09'],
        favoredSide: 'alien'
    },
    galvani: {
        difficulty: 'intermediate',
        tips: ['Early moves have lasting consequences', 'Plan ahead'],
        chokepoints: [],
        favoredSide: 'neutral'
    },
    volta: {
        difficulty: 'intermediate',
        tips: ['Symmetrical design', 'High danger density', 'Quick thinking required'],
        chokepoints: [],
        favoredSide: 'neutral'
    },
    marconi: {
        difficulty: 'advanced',
        tips: ['NO silent sectors!', 'Every move risks noise', 'Use double-back movement'],
        chokepoints: [],
        favoredSide: 'alien'
    },
    socrates: {
        difficulty: 'advanced',
        tips: ['Perfect symmetry', 'Mind games essential', 'Expect double-bluffs'],
        chokepoints: [],
        favoredSide: 'neutral'
    },
    morgenland: {
        difficulty: 'advanced',
        tips: ['Narrow corridors', 'Ideal for ambushes', 'Patient play required'],
        chokepoints: [],
        favoredSide: 'alien'
    },
    'levi-montalcini': {
        difficulty: 'expert',
        tips: ['Labyrinth layout', 'Complex maze', 'Advanced play only'],
        chokepoints: [],
        favoredSide: 'neutral'
    }
};

// Export all configurations
module.exports = {
    DIFFICULTY_CONFIGS,
    HUMAN_STRATEGIES,
    ALIEN_STRATEGIES,
    DECEPTION_STRATEGIES,
    ITEM_USAGE_TIMING,
    MAP_TIPS,

    // Helper functions
    getHumanStrategy(characterName) {
        return HUMAN_STRATEGIES[characterName] || {};
    },

    getAlienStrategy(characterName) {
        return ALIEN_STRATEGIES[characterName] || {};
    },

    getDifficultyConfig(difficulty) {
        return DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.intermediate;
    },

    getDeceptionStrategy(role, difficulty) {
        const roleStrategies = DECEPTION_STRATEGIES[role] || DECEPTION_STRATEGIES.human;
        return roleStrategies[difficulty] || roleStrategies.intermediate;
    },

    getItemTiming(itemType) {
        return ITEM_USAGE_TIMING[itemType] || { priority: 'low' };
    },

    getMapTips(mapName) {
        const normalized = mapName?.toLowerCase().replace(/\s+/g, '-');
        return MAP_TIPS[normalized] || { difficulty: 'unknown', tips: [], chokepoints: [], favoredSide: 'neutral' };
    }
};
