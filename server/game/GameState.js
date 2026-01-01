const { createDangerousDeck, createItemDeck, createEscapeHatchDeck, shuffle } = require('./cards');
const { CHARACTERS, canCharacterUseItem } = require('./characters');
const { getAdjacentSectors, isValidMove } = require('./mapUtils');

class GameState {
  constructor(mapData, playerList) {
    this.map = mapData;
    this.phase = 'LOBBY'; // LOBBY, playing, ended
    this.currentTurn = 0;
    this.maxTurns = 39;
    this.currentPlayerIndex = 0;

    // Initialize decks
    this.dangerousDeck = createDangerousDeck();
    this.dangerousDiscard = [];
    this.itemDeck = createItemDeck();
    this.escapeHatchDeck = createEscapeHatchDeck();

    // Track escape hatch status
    this.escapeHatchStatus = {}; // sectorId -> 'available' | 'used' | 'damaged'

    // Find escape hatches in map and mark as available (guard against null map)
    if (this.map && this.map.grid) {
      this.map.grid.forEach(hex => {
        if (hex.state === 'airlock') {
          this.escapeHatchStatus[hex.label] = 'available';
        }
      });
    }

    // Game announcements log
    this.announcements = [];

    // Initialize players
    this.players = this.assignRoles(playerList);

    // Pending action (for multi-step turns like declaring noise after card draw)
    this.pendingAction = null;

    // Track active effects for the current turn
    this.activeEffects = {}; // playerId -> { adrenaline: bool, sedatives: bool, etc. }
  }

  addPlayer(id, name) {
    const player = {
      id,
      name,
      role: null, // Assigned on start
      character: null, // Assigned on start
      position: null,
      hand: [],
      isEliminated: false,
      hasEscaped: false,
      usedItemThisTurn: false,
      attackPrimed: false
    };
    this.players.push(player);
    return player;
  }

  startGame(mapData) {
    // Need at least 2 players to start
    if (!this.players || this.players.length < 2) {
      return { success: false, message: 'Need at least 2 players to start' };
    }

    if (mapData) {
      this.map = mapData;
      // Re-initialize escape hatches
      if (this.map && this.map.grid) {
        this.escapeHatchStatus = {};
        this.map.grid.forEach(hex => {
          if (hex.state === 'airlock') {
            this.escapeHatchStatus[hex.label] = 'available';
          }
        });
      }
    }

    if (!this.map) {
      return { success: false, message: 'No map selected' };
    }

    // Assign roles to the current players
    this.players = this.assignRoles(this.players);

    // Initialize the game (turn order, first player, etc.)
    this.start();

    return { success: true };
  }

  assignRoles(playerList) {
    // Guard against undefined/empty player list (room created but no players yet)
    if (!playerList || playerList.length === 0) {
      return [];
    }

    const numPlayers = playerList.length;
    const numAliens = Math.ceil(numPlayers / 2);
    const numHumans = numPlayers - numAliens;

    // Get characters
    const humanChars = shuffle([...CHARACTERS.HUMANS]).slice(0, numHumans);
    const alienChars = shuffle([...CHARACTERS.ALIENS]).slice(0, numAliens);

    // Assign roles randomly
    const roles = [
      ...humanChars.map(c => ({ role: 'human', character: c })),
      ...alienChars.map(c => ({ role: 'alien', character: c }))
    ];
    shuffle(roles);

    // Find starting positions
    const humanStart = this.map.grid.find(h => h.state === 'human-start');
    const alienStart = this.map.grid.find(h => h.state === 'alien-start');

    return playerList.map((player, index) => {
      const role = roles[index].role;
      const character = roles[index].character;

      // Determine starting position
      // Psychologist starts in Alien sector despite being human
      let startPosition;
      if (character.power?.startsInAlienSector) {
        startPosition = alienStart?.label;
      } else {
        startPosition = role === 'human' ? humanStart?.label : alienStart?.label;
      }

      // Initialize power usage tracking
      const powerUsage = {};
      if (character.power?.usesRemaining !== undefined) {
        powerUsage.usesRemaining = character.power.usesRemaining;
      }
      if (character.power?.id === 'first_safe') {
        powerUsage.firstSafeAvailable = true;
      }

      return {
        id: player.id,
        name: player.name,
        role: role,
        character: character,
        position: startPosition,
        alive: true,
        escaped: false,
        revealed: false,
        connected: true,
        items: [],
        hasFed: false, // Aliens: have they killed a human?
        moveSpeed: role === 'human' ? 1 : 2,
        powerUsage: powerUsage, // Track character power usage
        hasMoved: false, // Track if player has moved (for Fast Alien)
        ghostTokens: {} // Client-side tracking, stored here for persistence
      };
    });
  }

  start() {
    this.phase = 'playing';
    this.currentTurn = 1;

    // Randomize player order
    this.players = shuffle(this.players);
    this.currentPlayerIndex = 0;

    // Store the first player's ID for tracker ordering
    this.firstPlayerId = this.players[0].id;

    this.addAnnouncement({
      type: 'GAME_START',
      message: `Game started! ${this.players[0].name} goes first.`
    });
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  movePlayer(playerId, targetSector) {
    const player = this.players.find(p => p.id === playerId);

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (this.getCurrentPlayer().id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    if (!player.alive || player.escaped) {
      return { success: false, error: 'Player is not active' };
    }

    // Calculate max distance based on role, items, and character powers
    let maxDistance = player.hasFed ? 3 : player.moveSpeed;

    // Fast Alien: Move 3 on first turn
    if (player.character?.power?.firstMoveBonus && !player.hasMoved) {
      maxDistance = player.character.power.firstMoveBonus;
    }

    // Adrenaline effect: +1 move
    const effects = this.activeEffects[playerId] || {};
    if (effects.adrenaline) {
      maxDistance += 1;
    }

    const validation = isValidMove(this.map, player.position, targetSector, maxDistance, player.role);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Execute move
    const previousPosition = player.position;
    player.position = targetSector;
    player.hasMoved = true; // Mark that player has moved (for Fast Alien)

    // Check sector type
    const sector = this.map.grid.find(h => h.label === targetSector);

    if (!sector) {
      player.position = previousPosition;
      return { success: false, error: 'Invalid sector' };
    }

    // Handle escape hatch for humans
    if (sector.state === 'airlock' && player.role === 'human') {
      return this.handleEscapeHatch(player, targetSector);
    }

    // Handle dangerous sector
    if (sector.state === 'dangerous') {
      // Check for Sedatives effect - skip card draw
      if (effects.sedatives) {
        delete this.activeEffects[playerId];
        this.endTurn();
        return { success: true, skippedCard: true };
      }

      // Captain's "First Safe" power - skip first dangerous card
      if (player.character?.power?.id === 'first_safe' && player.powerUsage?.firstSafeAvailable) {
        player.powerUsage.firstSafeAvailable = false;
        this.addAnnouncement({
          type: 'POWER_USED',
          playerId: player.id,
          playerName: player.name,
          power: 'First Safe',
          message: `${player.name} used First Safe - no card drawn.`
        });
        this.endTurn();
        return { success: true, powerUsed: 'first_safe' };
      }

      let card = this.drawDangerousCard();

      // Psychic Alien: Silence becomes Noise in Any Sector
      if (player.character?.power?.silenceBecomesNoiseAny && card.type === 'SILENCE') {
        card = {
          ...card,
          type: 'NOISE_ANY_SECTOR',
          originalType: 'SILENCE'
        };
      }

      // Handle item on Silence cards (Ultimate Edition)
      let itemCard = null;
      if (card.hasItem && card.itemData) {
        // Create item from the card's item data
        itemCard = {
          ...card.itemData,
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        if (player.items.length < 3) {
          player.items.push(itemCard);
        } else {
          // Must use or discard an item (handled client-side)
          this.pendingAction = {
            type: 'ITEM_OVERFLOW',
            playerId: player.id,
            newItem: itemCard
          };
        }
      }

      // Set pending action for noise declaration
      this.pendingAction = {
        type: 'DECLARE_NOISE',
        playerId: player.id,
        card: card,
        sector: targetSector
      };

      return {
        success: true,
        cardDrawn: card,
        itemDrawn: itemCard,
        requiresDeclaration: true,
        targetSector: targetSector  // Include the sector for client-side noise declaration
      };
    }

    // Secure sector - announce silent move and end turn
    this.addAnnouncement({
      type: 'SILENT_MOVE',
      playerId: player.id,
      playerName: player.name,
      message: `${player.name} moved silently.`
    });
    this.endTurn();
    return { success: true };
  }

  handleEscapeHatch(player, sector) {
    if (this.escapeHatchStatus[sector] !== 'available') {
      return { success: false, error: 'This escape hatch is not available' };
    }

    // Engineer's power: Draw two cards, choose one
    if (player.character?.power?.id === 'escape_choice') {
      const card1 = this.escapeHatchDeck.pop();
      const card2 = this.escapeHatchDeck.pop();

      if (!card1) {
        return { success: false, error: 'No escape hatch cards remaining' };
      }

      // If Engineer has both cards available, set pending action to choose
      if (card2) {
        this.pendingAction = {
          type: 'ESCAPE_CHOICE',
          playerId: player.id,
          sector: sector,
          cards: [card1, card2]
        };

        this.addAnnouncement({
          type: 'POWER_USED',
          playerId: player.id,
          playerName: player.name,
          power: 'Escape Choice',
          message: `${player.name} (Engineer) draws two escape cards and chooses...`
        });

        return {
          success: true,
          requiresChoice: true,
          escapeCards: [card1, card2]
        };
      }

      // Only one card left, use it normally
      return this.resolveEscapeCard(player, sector, card1);
    }

    // Normal escape - draw one card
    const card = this.escapeHatchDeck.pop();

    if (!card) {
      return { success: false, error: 'No escape hatch cards remaining' };
    }

    return this.resolveEscapeCard(player, sector, card);
  }

  // Resolve an escape card (used by both normal and Engineer's choice)
  resolveEscapeCard(player, sector, card) {
    if (card.type === 'GREEN') {
      player.escaped = true;
      player.revealed = true;
      this.escapeHatchStatus[sector] = 'used';

      this.addAnnouncement({
        type: 'ESCAPE',
        playerId: player.id,
        playerName: player.name,
        sector: sector,
        message: `${player.name} has escaped via ${sector}!`
      });

      this.endTurn();
      this.checkGameEnd();

      return {
        success: true,
        escaped: true,
        escapeCard: card
      };
    } else {
      // Red card - damaged
      this.escapeHatchStatus[sector] = 'damaged';

      this.addAnnouncement({
        type: 'ESCAPE_FAILED',
        playerId: player.id,
        playerName: player.name,
        sector: sector,
        message: `${player.name} found escape hatch ${sector} is damaged!`
      });

      // Check if player can still escape
      const availableHatches = Object.values(this.escapeHatchStatus).filter(s => s === 'available');
      if (availableHatches.length === 0 && player.role === 'human' && !player.escaped) {
        player.alive = false;
        this.addAnnouncement({
          type: 'ELIMINATED',
          playerId: player.id,
          message: `${player.name} has no escape route and is eliminated!`
        });
      }

      this.endTurn();
      return {
        success: true,
        escaped: false,
        escapeCard: card
      };
    }
  }

  // Engineer chooses which escape card to use
  chooseEscapeCard(playerId, cardIndex) {
    const player = this.players.find(p => p.id === playerId);

    if (!player || !this.pendingAction || this.pendingAction.type !== 'ESCAPE_CHOICE') {
      return { success: false, error: 'No escape choice pending' };
    }

    if (this.pendingAction.playerId !== playerId) {
      return { success: false, error: 'Not your choice to make' };
    }

    const cards = this.pendingAction.cards;
    const chosenCard = cards[cardIndex];
    const otherCard = cards[1 - cardIndex];

    if (!chosenCard) {
      return { success: false, error: 'Invalid card choice' };
    }

    // Put the other card back in the deck
    if (otherCard) {
      this.escapeHatchDeck.push(otherCard);
    }

    const sector = this.pendingAction.sector;
    this.pendingAction = null;

    return this.resolveEscapeCard(player, sector, chosenCard);
  }

  // Alias for chooseEscapeCard (used by server)
  useEscapeHatch(playerId, cardIndex) {
    return this.chooseEscapeCard(playerId, cardIndex);
  }

  // Prime attack - player will attack the sector they move to
  primeAttack(playerId, primed) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }
    player.attackPrimed = primed;
    return { success: true };
  }

  attack(playerId, sector, usePower = false) {
    const player = this.players.find(p => p.id === playerId);

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (this.getCurrentPlayer().id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    // Humans can only attack with Attack item OR Soldier's free attack power
    if (player.role === 'human') {
      const hasAttackItem = player.items.some(item => item.type === 'ATTACK');
      const hasSoldierPower = player.character?.power?.id === 'free_attack' &&
        player.powerUsage?.usesRemaining > 0;

      if (usePower && hasSoldierPower) {
        // Use Soldier's free attack
        player.powerUsage.usesRemaining--;
        this.addAnnouncement({
          type: 'POWER_USED',
          playerId: player.id,
          playerName: player.name,
          power: 'Free Attack',
          message: `${player.name} (Soldier) uses Free Attack!`
        });
      } else if (hasAttackItem) {
        // Remove the attack item
        const attackItemIndex = player.items.findIndex(item => item.type === 'ATTACK');
        player.items.splice(attackItemIndex, 1);
      } else {
        return { success: false, error: 'Humans need an Attack item to attack' };
      }
    }

    // Must be in the sector to attack
    if (player.position !== sector) {
      return { success: false, error: 'You can only attack in your current sector' };
    }

    // Reveal attacker as alien (if alien)
    if (player.role === 'alien') {
      player.revealed = true;
    }

    // Find victims
    const victims = this.players.filter(p =>
      p.id !== playerId &&
      p.position === sector &&
      p.alive &&
      !p.escaped
    );

    // Process each victim
    const actualVictims = [];
    const survivors = [];

    victims.forEach(victim => {
      // Brute Alien: Immune to all attacks
      if (victim.character?.power?.immuneToAttacks) {
        survivors.push({ victim, reason: 'immune' });
        this.addAnnouncement({
          type: 'POWER_USED',
          playerId: victim.id,
          playerName: victim.name,
          power: 'Immune to Attacks',
          message: `${victim.name} (Brute Alien) is immune to attacks!`
        });
        return;
      }

      // Check for Defense item
      const defenseItem = victim.items.find(item => item.type === 'DEFENSE');
      if (defenseItem) {
        victim.items = victim.items.filter(item => item.id !== defenseItem.id);
        survivors.push({ victim, reason: 'defense' });
        this.addAnnouncement({
          type: 'DEFENSE_USED',
          playerId: victim.id,
          playerName: victim.name,
          message: `${victim.name} used Defense and survived!`
        });
        return;
      }

      // Check for Clone item
      const cloneItem = victim.items.find(item => item.type === 'CLONE');
      if (cloneItem) {
        victim.items = victim.items.filter(item => item.id !== cloneItem.id);
        const humanStart = this.map.grid.find(h => h.state === 'human-start');
        if (humanStart) {
          victim.position = humanStart.label;
        }
        survivors.push({ victim, reason: 'clone' });
        this.addAnnouncement({
          type: 'CLONE_USED',
          playerId: victim.id,
          playerName: victim.name,
          message: `${victim.name} used Clone and respawned at Human Sector!`
        });
        return;
      }

      // Victim dies
      victim.alive = false;
      victim.revealed = true;
      actualVictims.push(victim);

      // Check if alien killed human
      if (player.role === 'alien' && victim.role === 'human') {
        player.hasFed = true;
      }
    });

    this.addAnnouncement({
      type: 'ATTACK',
      playerId: player.id,
      playerName: player.name,
      sector: sector,
      victims: actualVictims.map(v => ({ id: v.id, name: v.name, role: v.role })),
      message: actualVictims.length > 0
        ? `${player.name} attacked in ${sector} and killed ${actualVictims.map(v => v.name).join(', ')}!`
        : `${player.name} attacked in ${sector} but found no one!`
    });

    this.pendingAction = null;
    this.endTurn();
    this.checkGameEnd();

    return {
      success: true,
      victims: actualVictims.map(v => ({ id: v.id, name: v.name, role: v.role })),
      survivors: survivors.map(s => ({ id: s.victim.id, name: s.victim.name, reason: s.reason }))
    };
  }

  // Lurking Alien: Attack without moving
  attackInPlace(playerId) {
    const player = this.players.find(p => p.id === playerId);

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Only Lurking Alien can attack without moving
    if (!player.character?.power?.canAttackWithoutMoving) {
      return { success: false, error: 'Only the Lurking Alien can attack without moving' };
    }

    return this.attack(playerId, player.position);
  }

  // Move to a sector and attack - skips card draw since attack reveals position
  moveAndAttack(playerId, targetSector, usePower = false) {
    const player = this.players.find(p => p.id === playerId);

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (this.getCurrentPlayer().id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    if (!player.alive || player.escaped) {
      return { success: false, error: 'Player is not active' };
    }

    // Check if player can attack
    if (player.role === 'human') {
      const hasAttackItem = player.items.some(item => item.type === 'ATTACK');
      const hasSoldierPower = player.character?.power?.id === 'free_attack' &&
        player.powerUsage?.usesRemaining > 0;

      if (!hasAttackItem && !hasSoldierPower) {
        return { success: false, error: 'Humans need an Attack item or Soldier power to attack' };
      }
    }

    // Calculate max distance
    let maxDistance = player.hasFed ? 3 : player.moveSpeed;

    if (player.character?.power?.firstMoveBonus && !player.hasMoved) {
      maxDistance = player.character.power.firstMoveBonus;
    }

    const effects = this.activeEffects[playerId] || {};
    if (effects.adrenaline) {
      maxDistance += 1;
    }

    const validation = isValidMove(this.map, player.position, targetSector, maxDistance, player.role);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check sector exists
    const sector = this.map.grid.find(h => h.label === targetSector);
    if (!sector) {
      return { success: false, error: 'Invalid sector' };
    }

    // Can't move and attack into escape hatch
    if (sector.state === 'airlock') {
      return { success: false, error: 'Cannot attack in escape hatch sector' };
    }

    // Execute move (no card draw - attack reveals position)
    player.position = targetSector;
    player.hasMoved = true;

    // Clear any active effects
    delete this.activeEffects[playerId];

    // Consume attack resource for humans
    if (player.role === 'human') {
      const hasAttackItem = player.items.some(item => item.type === 'ATTACK');
      const hasSoldierPower = player.character?.power?.id === 'free_attack' &&
        player.powerUsage?.usesRemaining > 0;

      if (usePower && hasSoldierPower) {
        player.powerUsage.usesRemaining--;
        this.addAnnouncement({
          type: 'POWER_USED',
          playerId: player.id,
          playerName: player.name,
          power: 'Free Attack',
          message: `${player.name} (Soldier) uses Free Attack!`
        });
      } else if (hasAttackItem) {
        const attackItemIndex = player.items.findIndex(item => item.type === 'ATTACK');
        player.items.splice(attackItemIndex, 1);
      }
    }

    // Reveal attacker as alien
    if (player.role === 'alien') {
      player.revealed = true;
    }

    // Find victims in the sector
    const victims = this.players.filter(p =>
      p.id !== playerId &&
      p.position === targetSector &&
      p.alive &&
      !p.escaped
    );

    const actualVictims = [];
    const survivors = [];

    victims.forEach(victim => {
      // Brute Alien: Immune to all attacks
      if (victim.character?.power?.immuneToAttacks) {
        survivors.push({ victim, reason: 'immune' });
        this.addAnnouncement({
          type: 'POWER_USED',
          playerId: victim.id,
          playerName: victim.name,
          power: 'Immune to Attacks',
          message: `${victim.name} (Brute Alien) is immune to attacks!`
        });
        return;
      }

      // Check for Defense item
      const defenseItem = victim.items.find(item => item.type === 'DEFENSE');
      if (defenseItem) {
        victim.items = victim.items.filter(item => item.id !== defenseItem.id);
        survivors.push({ victim, reason: 'defense' });
        this.addAnnouncement({
          type: 'DEFENSE_USED',
          playerId: victim.id,
          playerName: victim.name,
          message: `${victim.name} used Defense and survived!`
        });
        return;
      }

      // Check for Clone item
      const cloneItem = victim.items.find(item => item.type === 'CLONE');
      if (cloneItem) {
        victim.items = victim.items.filter(item => item.id !== cloneItem.id);
        const humanStart = this.map.grid.find(h => h.state === 'human-start');
        if (humanStart) {
          victim.position = humanStart.label;
        }
        survivors.push({ victim, reason: 'clone' });
        this.addAnnouncement({
          type: 'CLONE_USED',
          playerId: victim.id,
          playerName: victim.name,
          message: `${victim.name} used Clone and respawned at Human Sector!`
        });
        return;
      }

      // Victim dies
      victim.alive = false;
      victim.revealed = true;
      actualVictims.push(victim);

      // Check if alien killed human
      if (player.role === 'alien' && victim.role === 'human') {
        player.hasFed = true;
      }
    });

    this.addAnnouncement({
      type: 'ATTACK',
      playerId: player.id,
      playerName: player.name,
      sector: targetSector,
      victims: actualVictims.map(v => ({ id: v.id, name: v.name, role: v.role })),
      message: actualVictims.length > 0
        ? `${player.name} attacked in ${targetSector} and killed ${actualVictims.map(v => v.name).join(', ')}!`
        : `${player.name} attacked in ${targetSector} but found no one!`
    });

    this.pendingAction = null;
    this.endTurn();
    this.checkGameEnd();

    return {
      success: true,
      movedTo: targetSector,
      victims: actualVictims.map(v => ({ id: v.id, name: v.name, role: v.role })),
      survivors: survivors.map(s => ({ id: s.victim.id, name: s.victim.name, reason: s.reason }))
    };
  }

  declareNoise(playerId, sector, isSilence, useDoublePower = false, useCat = false) {
    const player = this.players.find(p => p.id === playerId);

    if (!player || !this.pendingAction || this.pendingAction.playerId !== playerId) {
      return { success: false, error: 'Invalid noise declaration' };
    }

    // Pilot's Double Noise power
    if (useCat) {
      const catItemIndex = player.items.findIndex(i => i.type === 'CAT');
      if (catItemIndex === -1) {
        return { success: false, error: 'You do not have a Cat item' };
      }

      // Consume item
      player.items.splice(catItemIndex, 1);

      this.addAnnouncement({
        type: 'ITEM_USED',
        playerId: player.id,
        playerName: player.name,
        itemType: 'CAT',
        message: `${player.name} uses Cat card: declare noise in two sectors.`
      });

      // Set pending action for second noise
      this.pendingAction = {
        type: 'CAT_NOISE', // Uses CAT_NOISE type to handle final announcement differently
        playerId: player.id,
        firstSector: sector
      };

      return { success: true, requiresSecondNoise: true, firstSector: sector };
    }

    if (useDoublePower && player.character?.power?.id === 'double_noise') {
      if (!player.powerUsage?.usesRemaining || player.powerUsage.usesRemaining <= 0) {
        return { success: false, error: 'Double Noise power already used' };
      }

      // Set pending action for second noise
      this.pendingAction = {
        type: 'SECOND_NOISE',
        playerId: player.id,
        firstSector: sector
      };

      player.powerUsage.usesRemaining--;

      this.addAnnouncement({
        type: 'POWER_USED',
        playerId: player.id,
        playerName: player.name,
        power: 'Double Noise',
        message: `${player.name} (Pilot) uses Double Noise!`
      });

      return { success: true, requiresSecondNoise: true, firstSector: sector };
    }

    if (isSilence) {
      this.addAnnouncement({
        type: 'SILENCE',
        playerId: player.id,
        playerName: player.name,
        message: `${player.name}: Silence in all sectors.`
      });
    } else {
      this.addAnnouncement({
        type: 'NOISE',
        playerId: player.id,
        playerName: player.name,
        sector: sector,
        message: `${player.name}: Noise in sector ${sector}.`
      });
    }

    this.pendingAction = null;
    this.endTurn();

    return { success: true };
  }

  // Declare second noise for Pilot's power or Cat item
  declareSecondNoise(playerId, sector) {
    const player = this.players.find(p => p.id === playerId);

    if (!player || !this.pendingAction) {
      return { success: false, error: 'No pending second noise declaration' };
    }

    if (this.pendingAction.type !== 'SECOND_NOISE' && this.pendingAction.type !== 'CAT_NOISE') {
      return { success: false, error: 'No pending second noise declaration' };
    }

    const firstSector = this.pendingAction.firstSector;

    // Announce both noises
    this.addAnnouncement({
      type: 'NOISE',
      playerId: player.id,
      playerName: player.name,
      sector: firstSector,
      message: `${player.name}: Noise in sector ${firstSector}.`
    });

    this.addAnnouncement({
      type: 'NOISE',
      playerId: player.id,
      playerName: player.name,
      sector: sector,
      message: `${player.name}: Noise in sector ${sector}.`
    });

    // For Cat item, also add the CAT announcement
    if (this.pendingAction.type === 'CAT_NOISE') {
      this.addAnnouncement({
        type: 'CAT',
        playerId: player.id,
        playerName: player.name,
        sectors: [firstSector, sector],
        message: `${player.name} used Cat - noise in ${firstSector} and ${sector}!`
      });
    }

    this.pendingAction = null;
    this.endTurn();

    return { success: true };
  }

  useItem(playerId, itemId, target) {
    const player = this.players.find(p => p.id === playerId);

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const itemIndex = player.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return { success: false, error: 'Item not found' };
    }

    const item = player.items[itemIndex];

    // Check if this player can use this item
    const canUse = this.canPlayerUseItem(player, item.type);
    if (!canUse.allowed) {
      return { success: false, error: canUse.reason };
    }

    let effect = {};

    switch (item.type) {
      case 'TELEPORT':
        const humanStart = this.map.grid.find(h => h.state === 'human-start');
        if (humanStart) {
          player.position = humanStart.label;
          effect = { teleportedTo: humanStart.label };
        }
        break;

      case 'ADRENALINE':
        // Set active effect for extra move
        if (!this.activeEffects[playerId]) {
          this.activeEffects[playerId] = {};
        }
        this.activeEffects[playerId].adrenaline = true;
        effect = { extraMove: true };
        break;

      case 'SEDATIVES':
        // Set active effect to skip next card draw
        if (!this.activeEffects[playerId]) {
          this.activeEffects[playerId] = {};
        }
        this.activeEffects[playerId].sedatives = true;
        effect = { skipCard: true };
        break;

      case 'SPOTLIGHT':
        // Reveal players in target and adjacent sectors
        const adjacent = getAdjacentSectors(this.map, target);
        const sectorsToCheck = [target, ...adjacent];
        const revealed = [];

        this.players.forEach(p => {
          if (p.alive && !p.escaped && sectorsToCheck.includes(p.position)) {
            // Invisible Alien is immune to Spotlight
            if (p.character?.power?.immuneToItems?.includes('SPOTLIGHT')) {
              return;
            }
            revealed.push({
              id: p.id,
              name: p.name,
              position: p.position
            });
          }
        });

        effect = { revealed, sectors: sectorsToCheck };

        this.addAnnouncement({
          type: 'SPOTLIGHT',
          playerId: player.id,
          playerName: player.name,
          sector: target,
          revealed: revealed,
          message: revealed.length > 0
            ? `${player.name} used Spotlight on ${target}. Found: ${revealed.map(r => `${r.name} at ${r.position}`).join(', ')}`
            : `${player.name} used Spotlight on ${target}. No one found.`
        });
        break;

      case 'SENSOR':
        // Force a player to reveal their exact location
        const targetPlayer = this.players.find(p => p.id === target);
        if (!targetPlayer) {
          return { success: false, error: 'Target player not found' };
        }

        // Invisible Alien is immune to Sensor
        if (targetPlayer.character?.power?.immuneToItems?.includes('SENSOR')) {
          effect = { immune: true, targetName: targetPlayer.name };
          this.addAnnouncement({
            type: 'SENSOR',
            playerId: player.id,
            playerName: player.name,
            targetId: targetPlayer.id,
            targetName: targetPlayer.name,
            immune: true,
            message: `${player.name} used Sensor on ${targetPlayer.name} but they are immune!`
          });
        } else {
          effect = {
            targetId: targetPlayer.id,
            targetName: targetPlayer.name,
            targetSector: targetPlayer.position
          };
          this.addAnnouncement({
            type: 'SENSOR',
            playerId: player.id,
            playerName: player.name,
            targetId: targetPlayer.id,
            targetName: targetPlayer.name,
            targetSector: targetPlayer.position,
            message: `${player.name} used Sensor on ${targetPlayer.name}. They are in ${targetPlayer.position}!`
          });
        }
        break;

      case 'CAT':
        // Declare noise in two different sectors
        if (!target) {
          return { success: false, error: 'Select the first sector for Cat noise' };
        }

        // Set pending action for second noise
        this.pendingAction = {
          type: 'CAT_NOISE',
          playerId: player.id,
          firstSector: target
        };

        effect = { requiresSecondSector: true, firstSector: target };

        // Remove item now
        player.items.splice(itemIndex, 1);

        return { success: true, effect };

      case 'MUTATION':
        // Transform from human to alien
        if (player.role !== 'human') {
          return { success: false, error: 'Only humans can mutate' };
        }

        player.role = 'alien';
        player.moveSpeed = 2;
        player.revealed = true;

        effect = { mutated: true };

        this.addAnnouncement({
          type: 'MUTATION',
          playerId: player.id,
          playerName: player.name,
          message: `${player.name} has MUTATED into an Alien!`
        });
        break;

      case 'DEFENSE':
        // Defense is used automatically when attacked
        return { success: false, error: 'Defense is used automatically when attacked' };

      case 'CLONE':
        // Clone is used automatically when attacked
        return { success: false, error: 'Clone is used automatically when attacked' };

      case 'ATTACK':
        // Attack item is consumed in the attack method
        effect = { canAttack: true };
        // Don't remove here - it's removed in the attack method
        return { success: true, effect };

      default:
        return { success: false, error: 'Unknown item type' };
    }

    // Remove used item (unless already returned above)
    player.items.splice(itemIndex, 1);

    return { success: true, effect };
  }

  // Check if a player can use a specific item type
  canPlayerUseItem(player, itemType) {
    // Humans can use most items
    if (player.role === 'human') {
      return { allowed: true };
    }

    // Aliens can only use items if their character power allows it
    const power = player.character?.power;
    if (power?.canUseItems?.includes(itemType)) {
      return { allowed: true };
    }

    return { allowed: false, reason: `Aliens cannot use ${itemType} items` };
  }

  // Co-Pilot's free teleport power
  useFreeTeport(playerId) {
    const player = this.players.find(p => p.id === playerId);

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (player.character?.power?.id !== 'free_teleport') {
      return { success: false, error: 'Only the Co-Pilot has Free Teleport' };
    }

    if (!player.powerUsage?.usesRemaining || player.powerUsage.usesRemaining <= 0) {
      return { success: false, error: 'Free Teleport already used' };
    }

    player.powerUsage.usesRemaining--;

    const humanStart = this.map.grid.find(h => h.state === 'human-start');
    if (humanStart) {
      player.position = humanStart.label;
    }

    this.addAnnouncement({
      type: 'POWER_USED',
      playerId: player.id,
      playerName: player.name,
      power: 'Free Teleport',
      message: `${player.name} (Co-Pilot) teleported to Human Sector!`
    });

    return { success: true, teleportedTo: humanStart?.label };
  }

  // Medic's reveal identity power
  useRevealIdentity(playerId, targetPlayerId) {
    const player = this.players.find(p => p.id === playerId);
    const target = this.players.find(p => p.id === targetPlayerId);

    if (!player || !target) {
      return { success: false, error: 'Player not found' };
    }

    if (player.character?.power?.id !== 'reveal_identity') {
      return { success: false, error: 'Only the Medic can reveal identity' };
    }

    if (!player.powerUsage?.usesRemaining || player.powerUsage.usesRemaining <= 0) {
      return { success: false, error: 'Reveal Identity already used' };
    }

    player.powerUsage.usesRemaining--;
    target.revealed = true;

    this.addAnnouncement({
      type: 'POWER_USED',
      playerId: player.id,
      playerName: player.name,
      power: 'Reveal Identity',
      targetId: target.id,
      targetName: target.name,
      targetRole: target.role,
      message: `${player.name} (Medic) revealed ${target.name}'s identity: ${target.role.toUpperCase()}!`
    });

    return {
      success: true,
      revealed: {
        id: target.id,
        name: target.name,
        role: target.role
      }
    };
  }

  // Executive Officer's stay still power
  useStayStill(playerId) {
    const player = this.players.find(p => p.id === playerId);

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (this.getCurrentPlayer().id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    if (player.character?.power?.id !== 'stay_still') {
      return { success: false, error: 'Only the Executive Officer can stay still' };
    }

    if (!player.powerUsage?.usesRemaining || player.powerUsage.usesRemaining <= 0) {
      return { success: false, error: 'Stay Still already used' };
    }

    player.powerUsage.usesRemaining--;

    this.addAnnouncement({
      type: 'POWER_USED',
      playerId: player.id,
      playerName: player.name,
      power: 'Stay Still',
      message: `${player.name} (Executive Officer) stayed still.`
    });

    // End turn without any announcement
    this.endTurn();

    return { success: true };
  }

  drawDangerousCard() {
    if (this.dangerousDeck.length === 0) {
      // Reshuffle discard pile
      this.dangerousDeck = shuffle([...this.dangerousDiscard]);
      this.dangerousDiscard = [];
    }

    const card = this.dangerousDeck.pop();
    this.dangerousDiscard.push(card);
    return card;
  }

  drawItemCard() {
    if (this.itemDeck.length === 0) {
      return null; // No more items
    }
    return this.itemDeck.pop();
  }

  endTurn() {
    // Move to next alive, non-escaped player
    let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
    let loopCount = 0;

    while (loopCount < this.players.length) {
      const nextPlayer = this.players[nextIndex];
      if (nextPlayer.alive && !nextPlayer.escaped) {
        break;
      }
      nextIndex = (nextIndex + 1) % this.players.length;
      loopCount++;
    }

    // Check if we've completed a round
    if (nextIndex <= this.currentPlayerIndex) {
      this.currentTurn++;

      if (this.currentTurn > this.maxTurns) {
        this.endGame('timeout');
        return;
      }
    }

    this.currentPlayerIndex = nextIndex;
    this.pendingAction = null;
  }

  checkGameEnd() {
    const aliveHumans = this.players.filter(p => p.role === 'human' && p.alive && !p.escaped);
    const escapedHumans = this.players.filter(p => p.role === 'human' && p.escaped);
    const aliveAliens = this.players.filter(p => p.role === 'alien' && p.alive);

    // All humans escaped or dead
    if (aliveHumans.length === 0) {
      if (escapedHumans.length > 0) {
        this.endGame('humans_escaped');
      } else {
        this.endGame('aliens_win');
      }
    }
  }

  endGame(reason) {
    this.phase = 'ended';

    let message = '';
    switch (reason) {
      case 'timeout':
        message = 'Time ran out! Aliens win!';
        break;
      case 'aliens_win':
        message = 'All humans have been eliminated! Aliens win!';
        break;
      case 'humans_escaped':
        const escaped = this.players.filter(p => p.escaped);
        message = `Game over! Escaped: ${escaped.map(p => p.name).join(', ')}`;
        break;
    }

    this.addAnnouncement({
      type: 'GAME_END',
      reason: reason,
      message: message
    });
  }

  addAnnouncement(announcement) {
    this.announcements.push({
      ...announcement,
      timestamp: Date.now(),
      turn: this.currentTurn
    });
  }
}

module.exports = GameState;
