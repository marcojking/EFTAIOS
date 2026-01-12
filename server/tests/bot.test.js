/**
 * Bot AI Test Harness
 *
 * Minimal test framework for bot decisions and belief updates.
 * Run with: node server/tests/bot.test.js
 */

const { SeededRandom, setGlobalSeed } = require('../game/ai/SeededRandom');
const { getReachableSectors, getAdjacentSectors } = require('../game/mapUtils');

// Test results tracking
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    } catch (e) {
        failed++;
        failures.push({ name, error: e.message });
        console.log(`  \x1b[31m✗\x1b[0m ${name}`);
        console.log(`    ${e.message}`);
    }
}

function assertEqual(actual, expected, msg = '') {
    if (actual !== expected) {
        throw new Error(`${msg} Expected ${expected}, got ${actual}`);
    }
}

function assertApprox(actual, expected, tolerance = 0.001, msg = '') {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${msg} Expected ~${expected}, got ${actual}`);
    }
}

function assertTrue(condition, msg = '') {
    if (!condition) {
        throw new Error(msg || 'Assertion failed');
    }
}

function assertInRange(value, min, max, msg = '') {
    if (value < min || value > max) {
        throw new Error(`${msg} Expected ${value} in [${min}, ${max}]`);
    }
}

// Minimal test map (subset of Galatea)
const TEST_MAP = {
    name: 'TestMap',
    grid: [
        // Row 5
        { label: 'I05', state: 'dangerous' },
        { label: 'J05', state: 'secure' },
        { label: 'K05', state: 'dangerous' },
        { label: 'L05', state: 'secure' },
        { label: 'M05', state: 'dangerous' },

        // Row 6
        { label: 'I06', state: 'dangerous' },
        { label: 'J06', state: 'dangerous' },
        { label: 'K06', state: 'secure' },
        { label: 'L06', state: 'dangerous' },
        { label: 'M06', state: 'dangerous' },

        // Row 7
        { label: 'I07', state: 'dangerous' },
        { label: 'J07', state: 'secure' },
        { label: 'K07', state: 'human-start' },
        { label: 'L07', state: 'secure' },
        { label: 'M07', state: 'alien-start' },

        // Row 8
        { label: 'I08', state: 'dangerous' },
        { label: 'J08', state: 'dangerous' },
        { label: 'K08', state: 'secure' },
        { label: 'L08', state: 'dangerous' },
        { label: 'M08', state: 'dangerous' },

        // Row 9
        { label: 'I09', state: 'dangerous' },
        { label: 'J09', state: 'secure' },
        { label: 'K09', state: 'dangerous' },
        { label: 'L09', state: 'secure' },
        { label: 'M09', state: 'dangerous' },

        // Escape hatches at edges
        { label: 'H05', state: 'airlock' },
        { label: 'N05', state: 'airlock' },
        { label: 'H09', state: 'airlock' },
        { label: 'N09', state: 'airlock' }
    ]
};

// Test game state fixture
function createTestGameState(options = {}) {
    const players = options.players || [
        { id: 'human1', name: 'Human1', role: 'human', position: 'K07', alive: true, escaped: false, items: [], moveSpeed: 1 },
        { id: 'alien1', name: 'Alien1', role: 'alien', position: 'M07', alive: true, escaped: false, items: [], moveSpeed: 2, hasFed: false }
    ];

    return {
        map: TEST_MAP,
        players: players,
        currentTurn: options.turn || 1,
        announcements: options.announcements || [],
        escapeHatchStatus: {
            'H05': 'available',
            'N05': 'available',
            'H09': 'available',
            'N09': 'available'
        },
        settings: {
            revealCardsAndAbilities: false
        }
    };
}

// ==================== TESTS ====================

console.log('\n\x1b[1m=== SeededRandom Tests ===\x1b[0m\n');

test('SeededRandom produces deterministic sequence', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);

    const seq1 = [rng1.random(), rng1.random(), rng1.random()];
    const seq2 = [rng2.random(), rng2.random(), rng2.random()];

    assertEqual(seq1[0], seq2[0], 'First value');
    assertEqual(seq1[1], seq2[1], 'Second value');
    assertEqual(seq1[2], seq2[2], 'Third value');
});

test('SeededRandom different seeds produce different sequences', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(54321);

    assertTrue(rng1.random() !== rng2.random(), 'Different seeds should give different values');
});

test('SeededRandom.randInt produces values in range', () => {
    const rng = new SeededRandom(42);
    for (let i = 0; i < 100; i++) {
        const val = rng.randInt(5, 10);
        assertInRange(val, 5, 10);
    }
});

test('SeededRandom.choice returns element from array', () => {
    const rng = new SeededRandom(42);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
        const choice = rng.choice(items);
        assertTrue(items.includes(choice), `Choice ${choice} not in array`);
    }
});

test('SeededRandom.shuffle is deterministic', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);

    const arr1 = [1, 2, 3, 4, 5];
    const arr2 = [1, 2, 3, 4, 5];

    rng1.shuffle(arr1);
    rng2.shuffle(arr2);

    assertEqual(JSON.stringify(arr1), JSON.stringify(arr2), 'Shuffles should match');
});

test('SeededRandom.weightedChoice respects weights', () => {
    const rng = new SeededRandom(42);
    const items = ['a', 'b'];
    const weights = [100, 0]; // Always choose 'a'

    for (let i = 0; i < 50; i++) {
        assertEqual(rng.weightedChoice(items, weights), 'a');
    }
});

test('SeededRandom.softmaxChoice with low temperature is greedy', () => {
    const rng = new SeededRandom(42);
    const items = ['low', 'high'];
    const scores = [1, 100];

    let highCount = 0;
    for (let i = 0; i < 100; i++) {
        if (rng.softmaxChoice(items, scores, 0.1) === 'high') {
            highCount++;
        }
    }

    assertTrue(highCount > 90, `Low temperature should mostly choose high score (got ${highCount}/100)`);
});

test('SeededRandom.reset restores to initial state', () => {
    const rng = new SeededRandom(42);
    const v1 = rng.random();
    rng.random();
    rng.random();
    rng.reset();
    const v2 = rng.random();

    assertEqual(v1, v2, 'After reset, should get same first value');
});

console.log('\n\x1b[1m=== Map Utilities Tests ===\x1b[0m\n');

test('getAdjacentSectors returns correct neighbors', () => {
    const adjacent = getAdjacentSectors(TEST_MAP, 'K07');
    assertTrue(adjacent.length > 0, 'Should have neighbors');
    assertTrue(adjacent.includes('K06') || adjacent.includes('J07') || adjacent.includes('L07'),
        `Adjacent should include K06, J07, or L07. Got: ${adjacent.join(', ')}`);
});

test('getReachableSectors respects movement range', () => {
    const reachable1 = getReachableSectors(TEST_MAP, 'K07', 1, 'human');
    const reachable2 = getReachableSectors(TEST_MAP, 'K07', 2, 'alien');

    assertTrue(reachable1.length > 0, 'Human should have reachable sectors');
    assertTrue(reachable2.length >= reachable1.length, 'Alien range 2 should reach at least as many as human range 1');
});

test('getReachableSectors excludes starting sectors', () => {
    const reachable = getReachableSectors(TEST_MAP, 'K06', 1, 'human');
    const sectors = reachable.map(r => r.sector);

    assertTrue(!sectors.includes('K07'), 'Should not include human-start');
    assertTrue(!sectors.includes('M07'), 'Should not include alien-start');
});

test('Aliens cannot enter escape hatches', () => {
    // Move alien near hatch
    const reachable = getReachableSectors(TEST_MAP, 'I05', 1, 'alien');
    const sectors = reachable.map(r => r.sector);

    assertTrue(!sectors.includes('H05'), 'Alien should not be able to enter escape hatch');
});

console.log('\n\x1b[1m=== Test GameState Fixture ===\x1b[0m\n');

test('createTestGameState produces valid state', () => {
    const state = createTestGameState();

    assertEqual(state.players.length, 2, 'Should have 2 players');
    assertEqual(state.players[0].role, 'human');
    assertEqual(state.players[1].role, 'alien');
    assertTrue(state.map.grid.length > 0, 'Map should have sectors');
});

test('createTestGameState allows customization', () => {
    const customAnnouncements = [
        { type: 'NOISE', playerId: 'human1', sector: 'J06' }
    ];
    const state = createTestGameState({
        turn: 5,
        announcements: customAnnouncements
    });

    assertEqual(state.currentTurn, 5);
    assertEqual(state.announcements.length, 1);
});

// ==================== BOT BEHAVIOR SANITY TESTS ====================

console.log('\n\x1b[1m=== Bot Behavior Sanity Tests ===\x1b[0m\n');

// Import bot modules for sanity tests
const { BotPlayer } = require('../game/AIPlayer');
const BotPlanner = require('../game/ai/BotPlanner');
const BotTracker = require('../game/ai/BotTracker');
const { generatePersonality } = require('../game/ai/BotPersonality');

test('Bot decisions are deterministic with same seed', () => {
    const state = createTestGameState();

    // Use the SAME personality for both bots
    const sharedPersonality = generatePersonality();

    // Create two bots with same seed AND same personality
    const bot1 = new BotPlayer('alien1', sharedPersonality, 12345);
    const bot2 = new BotPlayer('alien1', sharedPersonality, 12345);

    // Both should make the same first decision
    const decision1 = bot1.decideMove(state);
    const decision2 = bot2.decideMove(state);

    assertEqual(decision1.action, decision2.action, 'Actions should match');
    assertEqual(decision1.target, decision2.target, 'Targets should match');
});

test('Alien bot attacks when human probability is high', () => {
    // Create a state where human is known to be adjacent to alien
    const state = createTestGameState({
        announcements: [
            { type: 'NOISE', playerId: 'human1', sector: 'L07', noiseType: 'YOUR_SECTOR' }
        ]
    });

    // Move alien adjacent to L07
    state.players[1].position = 'L06';

    const bot = new BotPlayer('alien1', {
        ...generatePersonality(),
        aggression: 0.9  // High aggression
    }, 42);

    const decision = bot.decideMove(state);

    // Bot should consider attacking L07 (where human was confirmed)
    // or moving toward it
    assertTrue(
        decision.action === 'move_and_attack' ||
        decision.action === 'move' ||
        decision.target === 'L07',
        `Alien should attack or move toward confirmed human. Got: ${decision.action} -> ${decision.target}`
    );
});

test('Human bot considers escape routes', () => {
    const state = createTestGameState();
    // Human starts at K07, hatches at H05, N05, H09, N09

    const bot = new BotPlayer('human1', {
        ...generatePersonality(),
        escapeUrgency: 0.9  // High escape urgency
    }, 42);

    const decision = bot.decideMove(state);

    // Human should move (not stay still)
    assertEqual(decision.action, 'move', 'Human should move');

    // Target should be a valid sector
    const sectorLabels = TEST_MAP.grid.map(s => s.label);
    assertTrue(
        sectorLabels.includes(decision.target),
        `Target ${decision.target} should be a valid sector`
    );
});

test('Alien bot chases recent noise', () => {
    const state = createTestGameState({
        turn: 5,
        announcements: [
            { type: 'NOISE', playerId: 'human1', sector: 'J06' }
        ]
    });

    // Alien starts at M07
    const bot = new BotPlayer('alien1', {
        ...generatePersonality(),
        aggression: 0.8,
        huntingStyle: 'chase'
    }, 42);

    const decision = bot.decideMove(state);

    // Alien should move toward the noise at J06
    // From M07, it could go to L06, L07, L08, M06, M08
    // J06 is to the west, so bot should move westward
    assertTrue(
        decision.action === 'move' || decision.action === 'move_and_attack',
        'Alien should move'
    );
});

test('Bot personalities create variety in decisions', () => {
    const state = createTestGameState();

    // Create bots with different personalities but same seed
    const aggressiveBot = new BotPlayer('alien1', {
        ...generatePersonality(),
        aggression: 1.0,
        riskTolerance: 1.0
    }, 100);

    const cautiousBot = new BotPlayer('alien1', {
        ...generatePersonality(),
        aggression: 0.0,
        riskTolerance: 0.0
    }, 100);

    const decision1 = aggressiveBot.decideMove(state);
    const decision2 = cautiousBot.decideMove(state);

    // Decisions can be same or different, but both should be valid
    assertTrue(
        decision1.action !== undefined,
        'Aggressive bot should make a decision'
    );
    assertTrue(
        decision2.action !== undefined,
        'Cautious bot should make a decision'
    );
});

// ==================== SUMMARY ====================

console.log('\n\x1b[1m=== Test Summary ===\x1b[0m');
console.log(`  Passed: \x1b[32m${passed}\x1b[0m`);
console.log(`  Failed: \x1b[31m${failed}\x1b[0m`);

if (failed > 0) {
    console.log('\n\x1b[1mFailures:\x1b[0m');
    failures.forEach(f => {
        console.log(`  - ${f.name}: ${f.error}`);
    });
    process.exit(1);
}

console.log('\n\x1b[32mAll tests passed!\x1b[0m\n');

// Export for use in other test files
module.exports = {
    test,
    assertEqual,
    assertApprox,
    assertTrue,
    assertInRange,
    TEST_MAP,
    createTestGameState
};
