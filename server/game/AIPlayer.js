const BotTracker = require('./ai/BotTracker');
const BotPlanner = require('./ai/BotPlanner');
const { generatePersonality } = require('./ai/BotPersonality');

/**
 * BotPlayer - Expert AI Player Engine
 *
 * Integrates BotTracker (state estimation) and BotPlanner (strategy)
 * with personality-based decision making and debug logging.
 */
class BotPlayer {
    constructor(playerId, personality = null) {
        this.playerId = playerId;
        this.personality = personality || generatePersonality();

        // Modules initialized on first move (require map/gameState access)
        this.tracker = null;
        this.planner = null;

        // Thinking delay (from personality)
        this.thinkingDelay = this.personality.thinkingSpeed;

        // Debug and history
        this.moveHistory = [];
        this.currentThought = '';
        this.debugInfo = {};
    }

    /**
     * Initialize modules when game starts
     */
    _init(gameState) {
        if (!this.tracker) {
            console.log(`[BotPlayer] Initializing for ${this.playerId}`);
            this.tracker = new BotTracker(
                this.playerId,
                gameState.map,
                gameState.players,
                gameState.settings
            );
            this.planner = new BotPlanner(
                this.playerId,
                gameState.map,
                this.personality
            );
        }
    }

    /**
     * Get the thinking delay for this bot
     */
    getThinkingDelay() {
        return this.thinkingDelay;
    }

    /**
     * Decide the next move
     */
    decideMove(gameState) {
        this._init(gameState);

        const player = gameState.players.find(p => p.id === this.playerId);
        if (!player || !player.alive || player.escaped) {
            return { action: 'none', reason: 'Cannot act' };
        }

        // Update tracker with any new announcements
        this.tracker.updateSettings(gameState.settings);
        this.tracker.processNewAnnouncements(gameState.announcements, gameState.players);

        // Get decision from planner
        const decision = this.planner.decideMove(gameState, this.tracker, player);

        // Store debug info
        this.currentThought = `${decision.action.toUpperCase()}: ${decision.reason}`;
        this.debugInfo = {
            tracker: this.tracker.getDebugInfo(),
            planner: this.planner.getDebugInfo(),
            decision: decision
        };

        // Inject into player object for broadcast
        player.aiReason = this.currentThought;

        // Log decision
        this.moveHistory.push({
            turn: gameState.currentTurn,
            decision,
            timestamp: Date.now()
        });

        return decision;
    }

    /**
     * Decide whether to attack (for Lurking Alien or separate attack phase)
     */
    decideAttack(gameState) {
        this._init(gameState);

        const player = gameState.players.find(p => p.id === this.playerId);
        if (!player || !player.alive) {
            return { action: 'skip' };
        }

        // Check human probability at current position
        const prob = this.tracker.getHumanProbability(player.position);

        if (prob > 0.3) {
            return {
                action: 'attack',
                target: player.position,
                reason: `High human probability (${(prob * 100).toFixed(0)}%)`
            };
        }

        return { action: 'skip' };
    }

    /**
     * Decide deception for Noise in Any Sector
     */
    decideDeception(gameState, isNoiseAnySector) {
        this._init(gameState);

        const player = gameState.players.find(p => p.id === this.playerId);
        if (!player) return player?.position;

        if (!isNoiseAnySector) {
            // Must announce real location
            return player.position;
        }

        // Use planner's deception strategy
        const deceptionSector = this.planner.planDeception(gameState, player);
        this.currentThought = `Deception: Declaring noise in ${deceptionSector}`;

        return deceptionSector;
    }

    /**
     * Choose which item to discard when at max capacity
     */
    chooseItemToDiscard(gameState, items, newItem) {
        this._init(gameState);

        const player = gameState.players.find(p => p.id === this.playerId);
        if (!player) return newItem;

        return this.planner.chooseDiscard(items, newItem, player);
    }

    /**
     * Process end of turn for tracking
     */
    processEndTurn(gameState, playerId, moveSpeed) {
        if (this.tracker) {
            this.tracker.processEndTurn(playerId, moveSpeed);
        }
    }

    /**
     * Advance turn counter
     */
    nextTurn() {
        if (this.tracker) {
            this.tracker.nextTurn();
        }
    }

    /**
     * Get current debug information
     */
    getDebugInfo() {
        return {
            playerId: this.playerId,
            personality: this.personality,
            currentThought: this.currentThought,
            trackerInfo: this.tracker?.getDebugInfo() || {},
            plannerInfo: this.planner?.getDebugInfo() || {},
            moveHistory: this.moveHistory.slice(-5) // Last 5 moves
        };
    }

    /**
     * Get personality info (for lobby display)
     */
    getPersonalityInfo() {
        return {
            aggression: this.personality.aggression,
            riskTolerance: this.personality.riskTolerance,
            huntingStyle: this.personality.huntingStyle,
            deceptionStyle: this.personality.deceptionStyle,
            escapeUrgency: this.personality.escapeUrgency
        };
    }

    // Legacy support
    recordFeedback() { }
    exportLog() { return { history: this.moveHistory }; }
}

module.exports = {
    BotPlayer,
    AIPlayer: BotPlayer
};
