# Bot AI Audit Report

## Executive Summary

The current bot implementation uses a **heatmap-based probability distribution** system which is simpler than the proposed particle filter but has significant flaws that cause poor gameplay:

1. **Humans beeline to escape pods** - too predictable
2. **Aliens don't chase or attack aggressively** - attack threshold too high
3. **No distinction between YOUR_SECTOR (truth) and ANY_SECTOR (possible lie)**
4. **No trajectory correlation across turns** - each turn is independent

---

## Current Architecture Analysis

### A) MAP INTERPRETATION LAYER - GOOD

**File:** `MapAnalyzer.js`

| Requirement | Status | Notes |
|-------------|--------|-------|
| Graph-based map representation | DONE | Uses `mapUtils.js` with BFS |
| BFS distances to pods | DONE | `computeDistance()`, `getDistanceToNearestHatch()` |
| Chokepoint detection | DONE | `findChokePoints()` |
| Patrol zones | DONE | `findPatrolZones()` |
| Map-agnostic | DONE | Works with any map configuration |

**Verdict:** MapAnalyzer is well-implemented and map-agnostic.

---

### B) INFORMATION MODEL + PUBLIC LOG - PARTIAL

**File:** `GameState.js`

| Requirement | Status | Notes |
|-------------|--------|-------|
| Structured event log | PARTIAL | `announcements[]` array exists |
| All event types | PARTIAL | Most types present, see below |
| Canonical format | NEEDS WORK | Inconsistent field naming |
| YOUR_SECTOR vs ANY_SECTOR | MISSING | Not distinguished in log |

**Current Announcement Types Found:**
- `GAME_START` - OK
- `NOISE` - MISSING: doesn't record if YOUR_SECTOR or ANY_SECTOR
- `SILENCE` - OK
- `SILENT_MOVE` / `SILENT_SECTOR` - OK
- `ATTACK` - OK (has sector, victims)
- `ATTACK_IMMUNE` - OK
- `DEFENSE_USED` - OK
- `CLONE_USED` - OK
- `ESCAPE` / `ESCAPE_FAILED` - OK
- `MUTATION` - OK
- `ELIMINATED` - OK
- `SPOTLIGHT` - OK (has revealed players)
- `SENSOR` - OK (has target sector)
- `TELEPORT_USED`, `ADRENALINE_USED`, `SEDATIVES_USED` - OK
- `REVEAL_IDENTITY` - OK
- `POWER_FREE_TELEPORT` - OK

**Critical Issue:** When a player draws "Noise in Your Sector" vs "Noise in Any Sector", the announcement doesn't record this. The bot can't distinguish truth from potential lies.

---

### C) BELIEF TRACKER - NEEDS REPLACEMENT

**File:** `BotTracker.js`

| Requirement | Status | Notes |
|-------------|--------|-------|
| Particle filter | NO | Uses single heatmap per player |
| Trajectory correlation | NO | Each announcement updates independently |
| YOUR_SECTOR constraint | NO | Treats all noise equally |
| ANY_SECTOR lie modeling | NO | No truth/lie probability model |
| Resample on low ESS | N/A | Not particle-based |
| Role uncertainty | PARTIAL | Tracks role probability |
| Fed speed boost tracking | NO | Not modeled in particles |

**Current Implementation:**
```javascript
class PlayerBelief {
  heatmap = {}  // sector -> probability
  roleProb = { human: 0.5, alien: 0.5 }

  updateForNoise(sector, ...) {
    // Boosts sector, doesn't distinguish truth/lie
    this.heatmap[sector] = Math.max(this.heatmap[sector], 0.8)
  }
}
```

**Problems:**
1. Noise always treated as 80% likely true - wrong for ANY_SECTOR
2. No trajectory consistency - a player could "teleport" between announcements
3. No per-player movement model (human=1, alien=1-2, fed=1-3)
4. No correlation between role belief and movement speed

---

### D) DECISION POLICY - NEEDS MAJOR IMPROVEMENTS

**File:** `BotPlanner.js`

#### Human Strategy - TOO PREDICTABLE

Current logic (simplified):
```javascript
planHumanMove() {
  // If can reach hatch, go there
  if (canReachHatch) return { target: hatch }

  // Otherwise minimize distance to hatch
  reachable.forEach(move => {
    cost = distanceToHatch * 2 + alienRisk * 10
  })
  return { target: lowestCostSector }
}
```

**Problems:**
1. Always minimizes distance to nearest hatch
2. No route variation or deception
3. No preference for silent sectors
4. Predictable even with "randomness" added

#### Alien Strategy - TOO PASSIVE

Current logic:
```javascript
planAlienMove() {
  const attackThreshold = getAttackThreshold(personality, turn)  // ~0.3-0.5

  reachable.forEach(move => {
    const humanProb = tracker.getHumanProbability(sector)
    if (humanProb > attackThreshold) {
      return { action: 'move_and_attack', target: sector }
    }
  })

  // Otherwise patrol
  return patrolMove()
}
```

**Problems:**
1. Attack threshold too high (0.3-0.5) - should be lower near hatches
2. Patrol is random, not chase-oriented
3. No "move toward recent noise" behavior
4. No hatch camping/denial strategy
5. No concept of cutting off escape routes

---

### E) BOT DIVERSITY - OK

**File:** `BotPersonality.js`

| Requirement | Status | Notes |
|-------------|--------|-------|
| Style profiles | DONE | aggression, riskTolerance, huntingStyle, deceptionStyle |
| Seeded RNG | MISSING | Uses Math.random() |
| Softmax tie-breaking | MISSING | Uses argmin/argmax |
| Per-bot lie rate | PARTIAL | noiseInterpretationConfidence exists |

---

## Implementation Plan

### Stage 1: Seeded RNG + Test Harness

1. Create `SeededRandom.js` utility
2. Create `BotTests.js` test harness
3. Add test for deterministic bot behavior

### Stage 2: Enhanced Event Log

1. Modify `declareNoise()` in GameState to record card type
2. Add `noiseType: 'YOUR_SECTOR' | 'ANY_SECTOR'` to NOISE announcements

### Stage 3: Particle Filter BeliefTracker

1. Create `ParticleFilter.js` with:
   - Particle structure: `{ positions: {playerId -> sector}, roles: {}, fed: {} }`
   - Initialization from game start
   - Propagation step with movement models
   - Conditioning step for announcements
   - Resampling when ESS < threshold

2. Replace `BotTracker.js` heatmap with particle queries

### Stage 4: Improved Policies

1. Human strategy improvements:
   - Add route variation (not always shortest path)
   - Prefer silent sectors when threat is high
   - Better deception in ANY_SECTOR declarations
   - Use items strategically

2. Alien strategy improvements:
   - Lower attack threshold (0.15-0.3)
   - Chase behavior (move toward recent noise)
   - Hatch camping for camp-escape personality
   - Intercept logic based on pod distances

### Stage 5: Integration + Testing

1. Run deterministic test games
2. Verify bots don't peek at hidden state
3. Log belief evolution for debugging

---

## Files to Create

| File | Purpose |
|------|---------|
| `server/game/ai/SeededRandom.js` | Deterministic RNG |
| `server/game/ai/ParticleFilter.js` | Core particle filter |
| `server/tests/bot.test.js` | Test harness |

## Files to Modify

| File | Changes |
|------|---------|
| `GameState.js` | Add `noiseType` to NOISE announcements |
| `BotTracker.js` | Add particle filter integration |
| `BotPlanner.js` | Improve human/alien strategies |
| `AIPlayer.js` | Use seeded RNG |

---

---

## Implementation Complete (Stages 1-3)

### What Was Implemented

1. **SeededRandom.js** - Deterministic RNG for reproducible bot behavior
2. **ParticleFilter.js** - Full particle filter belief tracker with:
   - YOUR_SECTOR vs ANY_SECTOR distinction
   - Trajectory correlation across turns
   - Proper resampling when ESS drops
   - Role and position probability queries

3. **BotTracker.js** - Updated to integrate ParticleFilter
4. **BotPlanner.js** - Major strategy improvements:
   - **Human**: Less predictable paths, prefer silent sectors, softmax selection
   - **Alien**: Lower attack thresholds, chase behavior, hatch camping

5. **Test Harness** - `server/tests/bot.test.js` and `server/tests/particleFilter.test.js`

### Files Created
- `server/game/ai/SeededRandom.js`
- `server/game/ai/ParticleFilter.js`
- `server/game/ai/AUDIT.md`
- `server/tests/bot.test.js`
- `server/tests/particleFilter.test.js`

### Files Modified
- `server/game/ai/BotTracker.js` - Integrated ParticleFilter
- `server/game/ai/BotPlanner.js` - Improved strategies
- `server/game/AIPlayer.js` - Pass gameState to tracker

---

## Questions for User

### Critical Questions

1. **Noise Type Recording**: The game currently doesn't record whether a NOISE announcement came from YOUR_SECTOR (must be truth) or ANY_SECTOR (could be lie). **Should I add a `noiseType` field to NOISE announcements in GameState.js?** This is important for the particle filter to work optimally.

2. **Particle Count**: Currently using 200 particles. Should we increase for accuracy (slower) or decrease for speed? Options:
   - 100 particles: Fast, less accurate
   - 200 particles: Balanced (current)
   - 500 particles: Accurate, slower

3. **Lie Probability**: When someone announces "Noise in Any Sector", what's the prior probability they're lying?
   - Current: 50% (coin flip)
   - Alternative: Vary by personality (30-70%)

### Design Questions

4. **Team Awareness**: Alien bots currently DON'T know who other aliens are (hidden even from teammates). This matches the real game rules. **Confirm this is correct?**

5. **Fed Status Tracking**: The particle filter tracks whether aliens have fed (can move 3). **Is this public information in your implementation?**

6. **Character Powers**: Some characters have special starting positions (Psychologist starts in alien sector). The particle filter accounts for this. **Should I add more character-specific logic?**

### Optional Enhancements

7. **Stage 4**: Should I add softmax tie-breaking with seeded RNG for fully deterministic bot behavior?

8. **Stage 5**: Should I add rollout-based lookahead for endgame situations?

9. **Item Tracking**: Should particles estimate item hands? (Currently not tracked - complex)

10. **Performance Logging**: Should I add timing logs to measure bot decision time?

---

## Running Tests

```bash
# Run all bot tests
node server/tests/bot.test.js

# Run particle filter tests
node server/tests/particleFilter.test.js
```

---

## Implementation Complete (Stage 4)

### Additional Work Completed

1. **Private noiseType Metadata**
   - Added `noiseType` field to NOISE announcements in `GameState.js`
   - Maps card type: `NOISE_YOUR_SECTOR` → `'YOUR_SECTOR'`, `NOISE_ANY_SECTOR` → `'ANY_SECTOR'`
   - Updated `getPlayerView()` in `server/index.js` to sanitize this field
   - Only the player who drew the card sees the true `noiseType`
   - Other players see `noiseType: 'UNKNOWN'`

2. **ParticleFilter UNKNOWN Handling**
   - Updated `_processNoise()` to handle three cases:
     - `YOUR_SECTOR`: Collapse position to announced sector (truth)
     - `ANY_SECTOR`: Apply lie probability model
     - `UNKNOWN`: Marginalize over both possibilities using prior (28/55 ≈ 51% YOUR_SECTOR)

3. **Double Noise Support (Cat/Pilot)**
   - Added `_processDoubleNoise()` method
   - Handles `announcement.sectors` array (two sectors)
   - One is true position, one is deception - bot doesn't know which
   - Assigns 50% probability to each plausible sector

4. **Adaptive Particle Count**
   - Changed default from 200 to 400 particles
   - Added `minParticles: 300`, `maxParticles: 600` config
   - `_resampleIfNeeded()` now adds particles when ESS/N drops below 0.3
   - Logs when particle count adapts

5. **Seeded RNG Throughout**
   - `BotPlayer` generates seed from playerId if not provided
   - Passes seed to `BotTracker` and `BotPlanner`
   - `BotPlanner` uses `this.rng.random()` instead of `Math.random()`
   - Fully deterministic given same seed + personality

6. **Bot Behavior Sanity Tests**
   - Added 5 new tests in `bot.test.js`:
     - Bot decisions are deterministic with same seed
     - Alien bot attacks when human probability is high
     - Human bot considers escape routes
     - Alien bot chases recent noise
     - Bot personalities create variety in decisions

### Files Modified in Stage 4
- `server/game/GameState.js` - Added noiseType to NOISE announcements
- `server/index.js` - Sanitize noiseType in getPlayerView()
- `server/game/ai/ParticleFilter.js` - UNKNOWN handling, double noise, adaptive particles
- `server/game/ai/BotPlanner.js` - Seeded RNG, require SeededRandom
- `server/game/ai/BotTracker.js` - Accept seed parameter
- `server/game/AIPlayer.js` - Generate and pass seed
- `server/tests/bot.test.js` - Added behavior sanity tests

### Test Results
All 19 bot tests pass:
- 8 SeededRandom tests
- 4 Map utilities tests
- 2 GameState fixture tests
- 5 Bot behavior sanity tests

All 13 ParticleFilter tests pass.

---

## Next Steps (Optional)

1. **Stage 5 (Rollout Lookahead)**: Add Monte Carlo rollouts for endgame decisions
2. **Item Tracking**: Estimate opponent item hands in particles
3. **Performance Monitoring**: Add timing logs for bot decision time
4. **Playtesting**: Fine-tune attack thresholds based on gameplay
