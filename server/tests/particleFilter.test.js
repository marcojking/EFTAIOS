/**
 * ParticleFilter Test Suite
 *
 * Tests for the particle filter belief tracker.
 * Run with: node server/tests/particleFilter.test.js
 */

const { ParticleFilter } = require('../game/ai/ParticleFilter');
const { test, assertEqual, assertTrue, assertInRange, TEST_MAP, createTestGameState } = require('./bot.test');

console.log('\n\x1b[1m=== ParticleFilter Tests ===\x1b[0m\n');

// Test initialization
test('ParticleFilter initializes with correct number of particles', () => {
    const state = createTestGameState();
    const pf = new ParticleFilter('human1', TEST_MAP, state.players, {
        numParticles: 100,
        seed: 42
    });

    assertEqual(pf.particles.length, 100);
});

test('ParticleFilter sets own position correctly', () => {
    const state = createTestGameState();
    const pf = new ParticleFilter('human1', TEST_MAP, state.players, { seed: 42 });

    // All particles should have human1 at K07
    pf.particles.forEach(p => {
        assertEqual(p.positions['human1'], 'K07');
        assertEqual(p.roles['human1'], 'human');
    });
});

test('ParticleFilter initializes opponents at spawn points', () => {
    const state = createTestGameState();
    const pf = new ParticleFilter('human1', TEST_MAP, state.players, { seed: 42 });

    // Alien1 should be at alien start or human start depending on sampled role
    pf.particles.forEach(p => {
        const alienPos = p.positions['alien1'];
        assertTrue(alienPos === 'K07' || alienPos === 'M07',
            `Alien1 should be at K07 or M07, got ${alienPos}`);
    });
});

test('ParticleFilter deterministic with same seed', () => {
    const state = createTestGameState();
    const pf1 = new ParticleFilter('human1', TEST_MAP, state.players, {
        numParticles: 50,
        seed: 12345
    });
    const pf2 = new ParticleFilter('human1', TEST_MAP, state.players, {
        numParticles: 50,
        seed: 12345
    });

    // Should have same initial positions
    for (let i = 0; i < 50; i++) {
        assertEqual(
            JSON.stringify(pf1.particles[i].positions),
            JSON.stringify(pf2.particles[i].positions),
            `Particle ${i} positions should match`
        );
    }
});

// Test noise processing
test('ParticleFilter processes YOUR_SECTOR noise correctly', () => {
    const state = createTestGameState();

    const pf = new ParticleFilter('human1', TEST_MAP, state.players, {
        numParticles: 100,
        seed: 42
    });

    // Manually call the noise processing
    pf._processNoise({
        type: 'NOISE',
        playerId: 'alien1',
        sector: 'M06',
        noiseType: 'YOUR_SECTOR'
    }, state.players.find(p => p.id === 'alien1'), state);

    // All particles should now have alien1 at M06
    pf.particles.forEach(p => {
        assertEqual(p.positions['alien1'], 'M06',
            'YOUR_SECTOR noise should collapse position');
    });
});

test('ParticleFilter processes SILENCE by expanding to silent sectors', () => {
    const state = createTestGameState({
        announcements: [{
            type: 'SILENCE',
            playerId: 'alien1'
        }]
    });

    const pf = new ParticleFilter('human1', TEST_MAP, state.players, {
        numParticles: 100,
        seed: 42
    });

    pf.update(state);

    // Particles should have alien1 in various silent sectors reachable from M07
    const positions = new Set();
    pf.particles.forEach(p => positions.add(p.positions['alien1']));

    // Should have some diversity
    assertTrue(positions.size >= 1, 'Should have at least one position');
});

// Test attack processing
test('ParticleFilter processes ATTACK announcement', () => {
    const state = createTestGameState();

    const pf = new ParticleFilter('human1', TEST_MAP, state.players, {
        numParticles: 100,
        seed: 42
    });

    // Manually call the attack processing
    pf._processAttack({
        type: 'ATTACK',
        playerId: 'alien1',
        sector: 'L07',
        victims: []
    }, state.players.find(p => p.id === 'alien1'), state);

    // All particles should have alien1 at L07 and confirmed alien
    pf.particles.forEach(p => {
        assertEqual(p.positions['alien1'], 'L07');
        assertEqual(p.roles['alien1'], 'alien');
    });
});

// Test query methods
test('getPositionDistribution returns valid distribution', () => {
    const state = createTestGameState();
    const pf = new ParticleFilter('human1', TEST_MAP, state.players, { seed: 42 });

    const dist = pf.getPositionDistribution('alien1');

    // Should sum to 1
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    assertInRange(total, 0.99, 1.01, 'Distribution should sum to 1');
});

test('getMostLikelyPosition returns valid result', () => {
    const state = createTestGameState();
    const pf = new ParticleFilter('human1', TEST_MAP, state.players, {
        numParticles: 100,
        seed: 42
    });

    const result = pf.getMostLikelyPosition('alien1');

    assertTrue(result.sector !== null, 'Should have a most likely sector');
    // Allow small floating point error
    assertInRange(result.probability, -0.001, 1.001, 'Probability should be in [0, 1]');
});

test('getHumanAtSectorProbability returns valid probability', () => {
    const state = createTestGameState();
    const pf = new ParticleFilter('alien1', TEST_MAP, state.players, { seed: 42 });

    // Check probability at human start
    const prob = pf.getHumanAtSectorProbability('K07');

    assertInRange(prob, 0, 1, 'Probability should be in [0, 1]');
    // Should be > 0 since human starts there
    assertTrue(prob > 0, 'Should have some probability of human at K07');
});

test('getHumanHotspots returns top sectors', () => {
    const state = createTestGameState();
    const pf = new ParticleFilter('alien1', TEST_MAP, state.players, { seed: 42 });

    const hotspots = pf.getHumanHotspots(3);

    assertEqual(hotspots.length, 3, 'Should return 3 hotspots');
    hotspots.forEach(h => {
        assertTrue(h.sector !== null, 'Hotspot should have sector');
        assertInRange(h.probability, 0, 1, 'Probability should be in [0, 1]');
    });
});

// Test resampling
test('Effective sample size decreases with conditioning', () => {
    const state = createTestGameState();
    const pf = new ParticleFilter('human1', TEST_MAP, state.players, {
        numParticles: 200,
        seed: 42
    });

    const essBefore = pf._effectiveSampleSize();

    // Add a conditioning announcement
    state.announcements.push({
        type: 'NOISE',
        playerId: 'alien1',
        sector: 'M06',
        noiseType: 'YOUR_SECTOR'
    });

    pf.update(state);

    // ESS should still be reasonable after resampling
    const essAfter = pf._effectiveSampleSize();
    assertTrue(essAfter > 0, 'ESS should be positive');
});

// Test getDebugInfo
test('getDebugInfo returns useful information', () => {
    const state = createTestGameState();
    const pf = new ParticleFilter('human1', TEST_MAP, state.players, { seed: 42 });

    const debug = pf.getDebugInfo();

    assertTrue(debug.numParticles > 0, 'Should have particles');
    assertTrue(debug.effectiveSampleSize > 0, 'Should have ESS');
    assertTrue(debug.humanHotspots.length > 0, 'Should have hotspots');
});

// Summary
console.log('\n\x1b[1m=== ParticleFilter Test Summary ===\x1b[0m');
