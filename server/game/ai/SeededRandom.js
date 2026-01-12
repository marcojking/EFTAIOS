/**
 * SeededRandom.js
 *
 * Deterministic pseudo-random number generator using Mulberry32 algorithm.
 * Essential for reproducible bot simulations and testing.
 */

class SeededRandom {
    constructor(seed = Date.now()) {
        this.initialSeed = seed;
        this.state = seed;
    }

    /**
     * Generate next random number in [0, 1)
     * Uses Mulberry32 algorithm - fast and statistically good
     */
    random() {
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    /**
     * Generate random integer in [min, max] inclusive
     */
    randInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    /**
     * Generate random float in [min, max)
     */
    randFloat(min, max) {
        return this.random() * (max - min) + min;
    }

    /**
     * Choose random element from array
     */
    choice(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(this.random() * array.length)];
    }

    /**
     * Shuffle array in place (Fisher-Yates)
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Sample n elements from array without replacement
     */
    sample(array, n) {
        const copy = [...array];
        this.shuffle(copy);
        return copy.slice(0, Math.min(n, copy.length));
    }

    /**
     * Weighted random choice
     * @param {Array} items - Array of items to choose from
     * @param {Array} weights - Array of weights (higher = more likely)
     */
    weightedChoice(items, weights) {
        if (!items || items.length === 0) return null;
        if (!weights || weights.length !== items.length) {
            return this.choice(items);
        }

        const total = weights.reduce((a, b) => a + b, 0);
        if (total <= 0) return this.choice(items);

        let r = this.random() * total;
        for (let i = 0; i < items.length; i++) {
            r -= weights[i];
            if (r <= 0) return items[i];
        }
        return items[items.length - 1];
    }

    /**
     * Softmax selection with temperature
     * Higher temperature = more random, lower = more greedy
     * @param {Array} items - Array of items
     * @param {Array} scores - Array of scores (higher = better)
     * @param {number} temperature - Temperature parameter (default 1.0)
     */
    softmaxChoice(items, scores, temperature = 1.0) {
        if (!items || items.length === 0) return null;
        if (!scores || scores.length !== items.length) {
            return this.choice(items);
        }

        // Compute softmax probabilities
        const maxScore = Math.max(...scores);
        const expScores = scores.map(s => Math.exp((s - maxScore) / temperature));
        const sumExp = expScores.reduce((a, b) => a + b, 0);
        const probs = expScores.map(e => e / sumExp);

        return this.weightedChoice(items, probs);
    }

    /**
     * Boolean with given probability
     */
    chance(probability) {
        return this.random() < probability;
    }

    /**
     * Reset to initial seed (for replay)
     */
    reset() {
        this.state = this.initialSeed;
    }

    /**
     * Fork - create a new generator with derived seed
     * Useful for independent random streams
     */
    fork() {
        return new SeededRandom(Math.floor(this.random() * 4294967296));
    }

    /**
     * Get current state for serialization
     */
    getState() {
        return {
            initialSeed: this.initialSeed,
            state: this.state
        };
    }

    /**
     * Restore from serialized state
     */
    static fromState(savedState) {
        const rng = new SeededRandom(savedState.initialSeed);
        rng.state = savedState.state;
        return rng;
    }
}

// Global instance for convenience (can be replaced with seeded version)
let globalRng = new SeededRandom();

/**
 * Set global seed for all bot randomness
 * Call at game start for reproducible games
 */
function setGlobalSeed(seed) {
    globalRng = new SeededRandom(seed);
}

/**
 * Get the global RNG instance
 */
function getGlobalRng() {
    return globalRng;
}

/**
 * Convenience function for global random [0, 1)
 */
function random() {
    return globalRng.random();
}

module.exports = {
    SeededRandom,
    setGlobalSeed,
    getGlobalRng,
    random
};
