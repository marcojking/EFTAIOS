/**
 * AI Player Engine for EFTAIOS Teaching Mode
 * Uses heuristic scoring from tutorialHints to make decisions
 * Includes feedback logging for strategy improvement
 */

const { generateMoveHints, generateTurnTips, SCORES } = require('./tutorialHints');
const { getAdjacentSectors, getReachableSectors } = require('./mapUtils');

/**
 * AI Decision Engine
 * Makes move decisions based on role, map, and game state
 */
class AIPlayer {
    constructor(playerId, difficulty = 'standard') {
        this.playerId = playerId;
        this.difficulty = difficulty; // 'beginner' | 'standard' | 'advanced'
        this.moveHistory = [];
        this.feedbackLog = [];
    }

    /**
     * Decide the next move for the AI player
     * @param {Object} gameState - Current game state
     * @returns {Object} Decision object with action and target
     */
    decideMove(gameState) {
        const player = gameState.players.find(p => p.id === this.playerId);
        if (!player || !player.alive || player.escaped) {
            return { action: 'none', reason: 'Cannot act' };
        }

        const isHuman = player.role === 'human';
        const turnNumber = gameState.currentTurn;

        // Get scored moves using the tutorial heuristics
        const moveHints = generateMoveHints(gameState, this.playerId);

        if (moveHints.length === 0) {
            return { action: 'skip', reason: 'No valid moves' };
        }

        // Select move based on difficulty
        let selectedMove;
        switch (this.difficulty) {
            case 'beginner':
                // Sometimes picks suboptimal moves (learning simulation)
                selectedMove = this._pickWithRandomness(moveHints, 0.3);
                break;
            case 'advanced':
                // Always picks the best move
                selectedMove = moveHints[0];
                break;
            default: // 'standard'
                // Usually picks top 2-3 moves
                selectedMove = this._pickWithRandomness(moveHints, 0.1);
        }

        // Log the decision
        const decision = {
            action: 'move',
            target: selectedMove.sector,
            score: selectedMove.score,
            reasons: selectedMove.reasons,
            alternatives: moveHints.slice(0, 3).map(h => ({
                sector: h.sector,
                score: h.score
            })),
            turnNumber,
            timestamp: Date.now()
        };

        this.moveHistory.push(decision);
        return decision;
    }

    /**
     * Decide whether to attack (aliens only or humans with Attack card)
     */
    decideAttack(gameState) {
        const player = gameState.players.find(p => p.id === this.playerId);
        if (!player) return { action: 'skip' };

        const isAlien = player.role === 'alien';
        const hasAttackCard = player.items?.some(i => i.type === 'ATTACK');

        if (!isAlien && !hasAttackCard) {
            return { action: 'skip', reason: 'Cannot attack' };
        }

        // Simple heuristic: attack if there's noise in current sector recently
        const recentNoise = gameState.announcements?.slice(-5).find(a =>
            a.type === 'NOISE' && a.sector === player.position
        );

        if (recentNoise && isAlien) {
            return {
                action: 'attack',
                target: player.position,
                reason: 'Recent noise in my sector - likely target'
            };
        }

        // Beginner AI is more aggressive (makes mistakes)
        if (this.difficulty === 'beginner' && isAlien && Math.random() < 0.2) {
            return {
                action: 'attack',
                target: player.position,
                reason: 'Beginner: random attack'
            };
        }

        return { action: 'skip', reason: 'No attack opportunity' };
    }

    /**
     * Decide which sector to announce noise in (when given choice)
     */
    decideNoiseAnnouncement(gameState, isNoiseAnySector) {
        const player = gameState.players.find(p => p.id === this.playerId);
        if (!player) return player.position;

        if (!isNoiseAnySector) {
            return player.position; // Must announce current position
        }

        // Deception: announce somewhere away from actual position
        const map = gameState.map;
        const allSectors = map.grid.map(h => h.label);
        const currentPos = player.position;

        // Find sectors far from current position
        const deceptionCandidates = allSectors.filter(sector => {
            // Check it's not near our actual position
            const adjacent = getAdjacentSectors(map, currentPos);
            return !adjacent.includes(sector) && sector !== currentPos;
        });

        // Pick a random far sector
        const randomIndex = Math.floor(Math.random() * deceptionCandidates.length);
        return deceptionCandidates[randomIndex] || currentPos;
    }

    /**
     * Record user feedback on a move
     */
    recordFeedback(turnNumber, rating, comment = '') {
        const move = this.moveHistory.find(m => m.turnNumber === turnNumber);
        if (move) {
            this.feedbackLog.push({
                turnNumber,
                move: move.target,
                score: move.score,
                reasons: move.reasons,
                rating, // 'good' | 'bad' | 'neutral'
                comment,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Export the full game log with feedback for analysis
     */
    exportLog() {
        return {
            playerId: this.playerId,
            difficulty: this.difficulty,
            moveHistory: this.moveHistory,
            feedbackLog: this.feedbackLog,
            summary: {
                totalMoves: this.moveHistory.length,
                goodMoves: this.feedbackLog.filter(f => f.rating === 'good').length,
                badMoves: this.feedbackLog.filter(f => f.rating === 'bad').length,
                averageScore: this.moveHistory.reduce((sum, m) => sum + m.score, 0) / this.moveHistory.length
            }
        };
    }

    /**
     * Pick a move with some randomness based on difficulty
     */
    _pickWithRandomness(hints, randomFactor) {
        if (Math.random() < randomFactor && hints.length > 1) {
            // Pick from top 3 instead of just top 1
            const topN = hints.slice(0, Math.min(3, hints.length));
            return topN[Math.floor(Math.random() * topN.length)];
        }
        return hints[0];
    }
}

/**
 * Create an AI-controlled game for teaching mode
 */
function createTeachingGame(mapData, humanPlayerId, aiRole = 'alien', difficulty = 'standard') {
    const GameState = require('./GameState');

    // Create AI player IDs
    const aiPlayers = [];
    const playerCount = aiRole === 'alien' ? 4 : 3; // More aliens if AI plays alien

    for (let i = 0; i < playerCount; i++) {
        aiPlayers.push({
            id: `ai_${i}`,
            name: `AI Player ${i + 1}`,
            isAI: true,
            difficulty
        });
    }

    // Add human player
    const allPlayers = [
        { id: humanPlayerId, name: 'You', isAI: false },
        ...aiPlayers
    ];

    return {
        players: allPlayers,
        aiInstances: aiPlayers.map(p => new AIPlayer(p.id, difficulty)),
        humanPlayerId,
        mapData
    };
}

module.exports = {
    AIPlayer,
    createTeachingGame
};
