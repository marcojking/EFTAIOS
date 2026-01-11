# Bot System Rework - Implementation Plan

## Overview
Complete rework of the bot system to create expert-level AI players that use probability-based deduction, strategic movement, and calculated randomness.

---

## Phase 1: Core Infrastructure

### 1.1 Single Lobby Toggle
- **File:** `server/index.js`, `client/src/components/Lobby.js`
- **Change:** Replace `announceAllItems` and `revealAllAbilities` with single `revealCardsAndAbilities` boolean
- **Default:** OFF
- **Label:** "Reveal Cards & Abilities"

### 1.2 Bot Personality System
- **File:** `server/game/ai/BotPersonality.js` (NEW)
- **Properties generated once per bot at game start:**
```javascript
{
  aggression: 0.3-0.7,        // Attack confidence threshold modifier
  riskTolerance: 0.3-0.7,     // Willingness to take dangerous paths
  deceptionStyle: 'misdirect' | 'fake-trail' | 'cluster' | 'random',
  huntingStyle: 'camp-escape' | 'spread-explore' | 'spawn-watch',  // Aliens only
  escapeUrgency: 20-30,       // Turn number when urgency kicks in
  thinkingSpeed: 2000-5000,   // Milliseconds delay before action
}
```

### 1.3 Remove Difficulty Tiers
- **File:** `server/game/ai/BotPlanner.js`
- **Change:** Remove beginner/intermediate/advanced configs, single expert behavior

---

## Phase 2: Probability Tracking Improvements

### 2.1 Enhanced BotTracker
- **File:** `server/game/ai/BotTracker.js`
- **Improvements:**
  - Track "confirmed alien" when player attacks without Attack card (if toggle ON)
  - Track "confirmed human" when player uses human-only items/abilities
  - Track "confirmed location" when Spotlight/Sensor reveals position
  - Track "impossible locations" based on turn count from last known position
  - Factor in silent vs dangerous sector movement for probability spread
  - Clear sector from heatmap when attacked and no one there (unless Clone/Defense used)
  - Track mutated players as 100% alien at alien spawn

### 2.2 Announcement Processing
- **File:** `server/game/ai/BotTracker.js`
- **Handle new announcement types:**
  - SPOTLIGHT_USED: Update locations for found players
  - SENSOR_USED: Update single player location
  - TELEPORT_USED: Player could be anywhere (reset their heatmap)
  - ESCAPE_FAILED: Player confirmed at that hatch location
  - ESCAPE_SUCCESS: Remove player from tracking, disable hatch
  - MUTATION: Player now at alien spawn, treat as alien
  - CLONE_ACTIVATED: Player now at human spawn

### 2.3 Noise Interpretation
- **Logic:**
  - Calculate if declared sector is reachable from player's possible positions
  - If impossible: 100% lie, ignore for probability
  - If possible: Weight by personality (40-80% confidence it's real)
  - Cluster noise near other announcements increases credibility

---

## Phase 3: Expert Strategy Logic

### 3.1 Map Analysis (Map-Agnostic)
- **File:** `server/game/ai/MapAnalyzer.js` (NEW)
- **Computed at game start:**
  - Escape hatch positions and distances from spawn
  - "Choke points" - high-connectivity sectors aliens should patrol
  - "Safe corridors" - paths with more silent sectors
  - Optimal patrol routes between escape hatches
  - Distance matrix between all sectors (for reachability checks)

### 3.2 Human Bot Strategy
- **File:** `server/game/ai/BotPlanner.js`
- **Movement Logic:**
  - A* pathfinding with danger-weighted edges
  - Never beeline for closest pod (vary routes)
  - Balance speed vs safety based on personality + game state
  - Avoid sectors where aliens likely are (based on probability)
  - Mid-game pivot: explore 5-8 turns, then head for escape
  - Increase urgency at personality.escapeUrgency turn threshold
  - Can move INTO alien sector (aliens can't attack their own sector)
  - Sometimes take non-optimal routes for deception

### 3.3 Alien Bot Strategy
- **File:** `server/game/ai/BotPlanner.js`
- **Movement Logic:**
  - Personality-based hunting style (camp/spread/spawn-watch)
  - Move toward highest-probability human locations
  - Avoid going next to where another suspected alien attacked (prevent friendly fire)
  - Adaptive attack threshold: start conservative, get aggressive as turns run out
  - Don't attack sector another alien just attacked (waste + friendly fire risk)

### 3.4 Attack Decisions
- **Threshold calculation:**
```javascript
baseThreshold = 0.5 - (personality.aggression * 0.2); // 0.3-0.5
turnPressure = Math.max(0, (currentTurn - 15) * 0.02); // Increases after turn 15
finalThreshold = baseThreshold - turnPressure;
// Attack if probability >= finalThreshold
```

---

## Phase 4: Deception System

### 4.1 Human Deception (Noise in Any Sector)
- **Strategies (personality-based):**
  - `misdirect`: Declare noise opposite of actual direction
  - `fake-trail`: Create believable trail in wrong direction over turns
  - `cluster`: Declare near other noise to blend in
  - `random`: Random plausible sector
- **Constraints:**
  - Noise MUST be in a reachable sector (believable)
  - Never reveal Psychologist's alien-spawn start

### 4.2 Alien Deception (Noise in Any Sector)
- **Strategies:**
  - Declare near human spawn (look like a human)
  - Declare away from actual position (misdirect spotlights)
  - Declare near other noise (cluster with humans)
  - Occasionally tell truth (make lies less obvious)

### 4.3 Movement Deception
- **Humans:**
  - Sometimes move non-optimally to confuse tracking
  - Double-back occasionally
  - Take longer routes through silent sectors

### 4.4 Captain First Safe Deception
- **When toggle OFF:** Move to dangerous sector but aliens think it's silent (no noise announcement)
- **Strategic use:** Go opposite direction than aliens expect early game

---

## Phase 5: Item & Power Usage

### 5.1 Item Priority (for discard decisions)
**Humans:** Defense > Teleport > Adrenaline > Clone > Sedatives > Attack > Sensor > Spotlight

### 5.2 Item Usage Triggers

| Item | When to Use |
|------|-------------|
| Spotlight | When multiple suspects cluster near target area |
| Sensor | Confirm single suspicion before moving there |
| Adrenaline | When being chased, or for deception move |
| Sedatives | Reduce movement when wanting to hide |
| Teleport | Emergency escape when cornered, or strategic repositioning |
| Defense | Always active (automatic) |
| Clone | Always active (automatic) |
| Attack | Only when certain of alien, or desperate |
| Cat | Create distraction while escaping elsewhere |

### 5.3 Power Usage

| Power | Bot Behavior |
|-------|--------------|
| Captain First Safe | Use for deception when toggle OFF |
| Pilot Double Noise | Real location + strategic fake |
| Co-Pilot Free Teleport | Same as Teleport item |
| Medic Reveal Identity | Target suspected alien |
| Soldier Free Attack | Same as Attack item |
| Executive Officer Stay Still | Use when beneficial to hide |
| Blink Alien (Teleport) | Use strategically |
| Silent Alien (Sedatives) | Use when hunting |
| Surge Alien (Adrenaline) | Use for chase/intercept |

### 5.4 Risk Calculation with Items
- Bots with Clone/Defense can take more risks
- Factor into path danger calculations

---

## Phase 6: Announcement System

### 6.1 Always Announced (regardless of toggle)
- Spotlight usage and results
- Sensor usage and results
- Medic Reveal Identity and result
- Engineer drawing 2 escape cards
- Failed escape attempts
- Successful escapes
- Deaths and mutations
- Noise declarations

### 6.2 Never Announced (regardless of toggle)
- Psychologist starting in alien spawn
- Psychic Alien's Silence→Noise conversion
- Executive Officer staying still
- Invisible Alien avoiding detection
- Lurking Alien attacking in place
- Which specific alien can use which item (just show item used)

### 6.3 Toggle-Dependent Announcements
When "Reveal Cards & Abilities" is ON:
- All item usage (except those always announced)
- Captain First Safe trigger
- Co-Pilot Free Teleport usage
- Soldier Free Attack usage
- Brute surviving attack
- Fast Alien first 3-sector move
- Blink/Silent/Surge using their allowed items

### 6.4 UI Implementation
- **Location:** Player Tracker table, in-column status updates
- **Format:** Emoji + concise text in player's column
- **Examples:**
  - 🔦 Used (in user's column) + L09 (in revealed players' columns)
  - 🛡️ Survived
  - ⚡ Adrenaline
  - 🌀 Teleported
- **Toast:** Full detail for log, e.g., "🔦 Captain found Pilot, Soldier in L09"
- **Duration:** ~6 seconds (existing behavior)

---

## Phase 7: Debug System

### 7.1 Debug Panel (Host View Only)
- **Location:** New collapsible panel in host/spectator view
- **Contents:**
  - Each bot's current probability heatmap (visual or text)
  - Decision reasoning for last action
  - Personality traits
  - Current strategy state

### 7.2 Debug Logging
- Log to server console AND host debug panel
- Include:
  - Probability calculations
  - Decision tree/reasoning
  - Final action chosen
  - Announcement processing

---

## Phase 8: Game Flow Integration

### 8.1 Bot Turn Execution
1. Wait personality.thinkingSpeed milliseconds (2-5 seconds)
2. Process any new announcements → update probability maps
3. Decide action (move/attack/use item/use power)
4. Execute action
5. Handle card draw if applicable
6. Announce result

### 8.2 Reaction to Game Events
- **Death nearby:** Humans avoid area, aliens consider moving elsewhere
- **Escape success:** Disable hatch, bots reroute
- **Escape failure:** Hatch location revealed, disable hatch
- **Mutation:** Track player at alien spawn as alien

### 8.3 Urgency System
- Kicks in at `personality.escapeUrgency` turn (20-30)
- Humans: Take more risks, prioritize speed over safety
- Aliens: Lower attack threshold, more aggressive

---

## Files to Create
- `server/game/ai/BotPersonality.js` - Personality generation and traits
- `server/game/ai/MapAnalyzer.js` - Map-agnostic strategic analysis
- `client/src/components/BotDebugPanel.js` - Debug visualization for host

## Files to Modify
- `server/game/ai/AIPlayer.js` - Main bot controller
- `server/game/ai/BotTracker.js` - Probability tracking
- `server/game/ai/BotPlanner.js` - Decision making (major rewrite)
- `server/game/GameState.js` - Settings, announcement handling
- `server/index.js` - WebSocket message handling for new toggle
- `client/src/components/Lobby.js` - Single toggle UI
- `client/src/components/PlayerTracker.js` - In-column announcements
- `client/src/components/PlayerTracker.css` - Announcement styling

---

## Implementation Order
1. Phase 1: Core Infrastructure (toggle, personality)
2. Phase 6: Announcement System (needed for bot reactions)
3. Phase 2: Probability Tracking
4. Phase 3: Expert Strategy
5. Phase 4: Deception System
6. Phase 5: Item/Power Usage
7. Phase 7: Debug System
8. Phase 8: Integration & Testing

---

## Testing Checklist
- [ ] Create lobby with all bots, start game
- [ ] Verify bots make moves with 2-5 second delays
- [ ] Verify bots use items appropriately
- [ ] Verify probability tracking updates on announcements
- [ ] Verify deception strategies work (noise in any sector)
- [ ] Verify human bots reach escape hatches
- [ ] Verify alien bots successfully hunt humans
- [ ] Verify debug panel shows decision reasoning
- [ ] Verify toggle affects announcement visibility
- [ ] Test with mixed human/bot games
