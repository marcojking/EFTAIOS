/**
 * Bot Game Simulation Test
 *
 * Runs a full game with bots and logs their decisions for debugging.
 * Run with: node server/tests/botGameSimulation.test.js
 */

const GameState = require('../game/GameState');
const { BotPlayer } = require('../game/AIPlayer');
const { generatePersonality } = require('../game/ai/BotPersonality');

// Load a map
const maps = require('../../client/src/data/maps.js');
const GALATEA_MAP = maps.GALATEA_MAP;

if (!GALATEA_MAP) {
    console.error('Could not load map. Available exports:', Object.keys(maps));
    process.exit(1);
}

console.log('\n========================================');
console.log('   BOT GAME SIMULATION TEST');
console.log('========================================\n');

// Create game state
const gameState = new GameState();

// Add players (3 humans, 2 aliens for a 5-player game)
const players = [
    { id: 'human1', name: 'HumanBot1' },
    { id: 'human2', name: 'HumanBot2' },
    { id: 'human3', name: 'HumanBot3' },
    { id: 'alien1', name: 'AlienBot1' },
    { id: 'alien2', name: 'AlienBot2' },
];

players.forEach(p => {
    gameState.addPlayer(p.id, p.name);
});

// Start the game
gameState.startGame(GALATEA_MAP);

console.log('Game started with', gameState.players.length, 'players');
console.log('Map:', GALATEA_MAP.name);
console.log('Max turns:', gameState.maxTurns);
console.log('\nPlayer assignments:');
gameState.players.forEach(p => {
    console.log(`  ${p.name}: ${p.role} at ${p.position} (${p.character?.name || 'no character'})`);
});

// Create bot instances
const bots = new Map();
gameState.players.forEach(p => {
    const bot = new BotPlayer(p.id, generatePersonality());
    bots.set(p.id, bot);
});

console.log('\n========================================');
console.log('   RUNNING GAME SIMULATION');
console.log('========================================\n');

// Track statistics
const stats = {
    attacks: 0,
    kills: 0,
    escapes: 0,
    noiseDeclarations: 0,
    silenceDeclarations: 0,
    itemsUsed: 0,
    turnsPlayed: 0,
    issues: []
};

// Simulate game turns
const MAX_TURNS_TO_SIMULATE = 20;

for (let simTurn = 0; simTurn < MAX_TURNS_TO_SIMULATE && gameState.phase === 'playing'; simTurn++) {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (!currentPlayer || !currentPlayer.alive || currentPlayer.escaped) {
        // Skip dead/escaped players
        gameState.endTurn();
        continue;
    }

    const bot = bots.get(currentPlayer.id);
    if (!bot) {
        console.error(`No bot found for ${currentPlayer.id}`);
        break;
    }

    console.log(`\n--- Turn ${gameState.currentTurn}, Player: ${currentPlayer.name} (${currentPlayer.role}) ---`);
    console.log(`    Position: ${currentPlayer.position}, Items: ${currentPlayer.items?.length || 0}`);

    // Show recent noise announcements BEFORE decision
    if (currentPlayer.role === 'alien') {
        const noises = gameState.announcements.filter(a => a.type === 'NOISE').slice(-5);
        console.log(`    Recent noise: ${noises.map(n => `${n.sector}(${n.noiseType || '?'})`).join(', ') || 'none'}`);
    }

    // Get bot decision
    const decision = bot.decideMove(gameState);
    console.log(`    Decision: ${decision.action} -> ${decision.target || 'N/A'}`);
    console.log(`    Reason: ${decision.reason}`);

    // For aliens, show what they believe about human positions AFTER decision
    if (currentPlayer.role === 'alien' && bot.tracker) {
        const hotspots = bot.tracker.getHumanHotspots(5);
        console.log(`    Hotspots: ${hotspots.map(h => `${h.sector}:${(h.probability * 100).toFixed(0)}%`).join(', ')}`);

        // Check if target is in hotspots
        if (decision.target) {
            const targetProb = bot.tracker.getHumanProbability(decision.target);
            console.log(`    Target ${decision.target} human prob: ${(targetProb * 100).toFixed(0)}%`);
        }
    }

    // Execute the decision
    let result;
    if (decision.action === 'move_and_attack' && decision.target) {
        stats.attacks++;
        result = gameState.moveAndAttack(currentPlayer.id, decision.target);
        console.log(`    ATTACK at ${decision.target}:`, result.success ? 'SUCCESS' : result.error);
        if (result.victims && result.victims.length > 0) {
            stats.kills += result.victims.length;
            console.log(`    KILLED: ${result.victims.map(v => v.name).join(', ')}`);
        }
    } else if (decision.action === 'move' && decision.target) {
        result = gameState.movePlayer(currentPlayer.id, decision.target);
        if (!result.success) {
            console.log(`    MOVE FAILED: ${result.error}`);
            stats.issues.push(`Turn ${gameState.currentTurn}: ${currentPlayer.name} move to ${decision.target} failed: ${result.error}`);
        }
    } else if (decision.action === 'attack_in_place') {
        stats.attacks++;
        result = gameState.attackInPlace(currentPlayer.id);
        console.log(`    ATTACK IN PLACE:`, result.success ? 'SUCCESS' : result.error);
    } else if (decision.action === 'use_item' && decision.item) {
        stats.itemsUsed++;
        console.log(`    USING ITEM: ${decision.item.type}`);
        const itemResult = gameState.useItem(currentPlayer.id, decision.item.id, decision.target);
        if (!itemResult.success) {
            console.log(`    Item use FAILED: ${itemResult.error}`);
        } else {
            // After using Sedatives, still need to move
            if (decision.item.type === 'SEDATIVES') {
                const moveDecision = bot.decideMove(gameState);
                if (moveDecision.action === 'move' && moveDecision.target) {
                    console.log(`    Silent move to: ${moveDecision.target}`);
                    result = gameState.movePlayer(currentPlayer.id, moveDecision.target);
                } else {
                    console.log(`    No move after Sedatives (${moveDecision.action})`);
                }
            }
            // Spotlight/Sensor complete the turn
        }
    } else {
        console.log(`    NO ACTION (${decision.action})`);
        stats.issues.push(`Turn ${gameState.currentTurn}: ${currentPlayer.name} had no valid action`);
        gameState.endTurn();
        continue;
    }

    // Handle pending actions (noise declaration)
    if (gameState.pendingAction && gameState.pendingAction.playerId === currentPlayer.id) {
        const pending = gameState.pendingAction;
        console.log(`    Pending: ${pending.type}`);

        if (pending.type === 'DECLARE_NOISE') {
            const card = pending.card;
            console.log(`    Card drawn: ${card.type}`);
            if (card.type === 'SILENCE') {
                stats.silenceDeclarations++;
                gameState.declareNoise(currentPlayer.id, null, true);
                console.log(`    Declared: SILENCE`);
            } else if (card.type === 'NOISE_YOUR_SECTOR') {
                stats.noiseDeclarations++;
                gameState.declareNoise(currentPlayer.id, currentPlayer.position, false);
                console.log(`    Declared: Noise at ${currentPlayer.position} (YOUR_SECTOR - TRUTH)`);
            } else if (card.type === 'NOISE_ANY_SECTOR') {
                stats.noiseDeclarations++;
                const deceptionSector = bot.decideDeception(gameState, true);
                gameState.declareNoise(currentPlayer.id, deceptionSector, false);
                console.log(`    Declared: Noise at ${deceptionSector} (ANY_SECTOR, real pos: ${currentPlayer.position})`);
            } else {
                console.log(`    Unknown card type: ${card.type}`);
            }
        } else if (pending.type === 'ITEM_OVERFLOW') {
            // Discard the new item for simplicity
            gameState.pendingAction = null;
            gameState.endTurn();
        }
    }

    stats.turnsPlayed++;

    // Check for escapes
    const escapedThisTurn = gameState.players.filter(p =>
        p.escaped && !stats[`escaped_${p.id}`]
    );
    escapedThisTurn.forEach(p => {
        stats.escapes++;
        stats[`escaped_${p.id}`] = true;
        console.log(`    *** ${p.name} ESCAPED! ***`);
    });
}

console.log('\n========================================');
console.log('   SIMULATION RESULTS');
console.log('========================================\n');

console.log('Turns played:', stats.turnsPlayed);
console.log('Attacks:', stats.attacks);
console.log('Kills:', stats.kills);
console.log('Escapes:', stats.escapes);
console.log('Noise declarations:', stats.noiseDeclarations);
console.log('Silence declarations:', stats.silenceDeclarations);

console.log('\nFinal player states:');
gameState.players.forEach(p => {
    const status = p.escaped ? 'ESCAPED' : (p.alive ? 'alive' : 'DEAD');
    console.log(`  ${p.name} (${p.role}): ${status} at ${p.position}`);
});

if (stats.issues.length > 0) {
    console.log('\n*** ISSUES DETECTED ***');
    stats.issues.forEach(issue => console.log(`  - ${issue}`));
}

// Analyze bot behavior
console.log('\n========================================');
console.log('   BOT BEHAVIOR ANALYSIS');
console.log('========================================\n');

const alienBots = gameState.players.filter(p => p.role === 'alien');
const humanBots = gameState.players.filter(p => p.role === 'human');

console.log('Alien aggression:');
if (stats.attacks === 0) {
    console.log('  WARNING: No attacks made! Aliens may be too passive.');
} else {
    console.log(`  ${stats.attacks} attacks, ${stats.kills} kills`);
    if (stats.kills === 0 && stats.attacks > 3) {
        console.log('  WARNING: Many attacks but no kills - may be attacking wrong sectors');
    }
}

console.log('\nHuman escape behavior:');
if (stats.escapes === 0) {
    const humanPositions = humanBots.map(p => p.position);
    console.log(`  No escapes yet. Human positions: ${humanPositions.join(', ')}`);
} else {
    console.log(`  ${stats.escapes} humans escaped`);
}

console.log('\nGame ended:', gameState.phase === 'ended' ? 'YES' : 'NO (simulation limit reached)');
