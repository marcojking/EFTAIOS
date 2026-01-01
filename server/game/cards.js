// Card definitions for EFTAIOS Ultimate Edition
// 78 Dangerous Sector Cards total:
// - 28 Noise in Your Sector (red)
// - 27 Noise in Any Sector (green)
// - 23 Silence cards (6 plain + 17 with items)

// ============================================
// ULTIMATE EDITION DECK
// ============================================
// Items are printed directly on Silence cards.
// Noise cards do NOT have item icons.

const DANGEROUS_DECK = {
  // Noise in Your Sector (Red cards) - must announce true location
  NOISE_YOUR_SECTOR: [
    { type: 'NOISE_YOUR_SECTOR', name: 'Noise in Your Sector', item: null, count: 28 }
  ],
  // Noise in Any Sector (Green cards) - can lie about location
  NOISE_ANY_SECTOR: [
    { type: 'NOISE_ANY_SECTOR', name: 'Noise in Any Sector', item: null, count: 27 }
  ],
  // Silence cards (White) - some have items
  SILENCE: [
    { type: 'SILENCE', name: 'Silence', item: null, count: 6 },
    { type: 'SILENCE', name: 'Silence + Sedatives', item: 'SEDATIVES', count: 3 },
    { type: 'SILENCE', name: 'Silence + Adrenaline', item: 'ADRENALINE', count: 3 },
    { type: 'SILENCE', name: 'Silence + Spotlight', item: 'SPOTLIGHT', count: 2 },
    { type: 'SILENCE', name: 'Silence + Cat', item: 'CAT', count: 2 },
    { type: 'SILENCE', name: 'Silence + Attack', item: 'ATTACK', count: 2 },
    { type: 'SILENCE', name: 'Silence + Teleport', item: 'TELEPORT', count: 1 },
    { type: 'SILENCE', name: 'Silence + Sensor', item: 'SENSOR', count: 1 },
    { type: 'SILENCE', name: 'Silence + Mutation', item: 'MUTATION', count: 1 },
    { type: 'SILENCE', name: 'Silence + Defense', item: 'DEFENSE', count: 1 },
    { type: 'SILENCE', name: 'Silence + Clone', item: 'CLONE', count: 1 }
  ]
};

// Item definitions - 10 item types in Ultimate Edition
const ITEMS = {
  ATTACK: {
    type: 'ATTACK',
    name: 'Attack',
    description: 'Attack, using the same rules as the Aliens.',
    usableBy: ['human']
  },
  TELEPORT: {
    type: 'TELEPORT',
    name: 'Teleport',
    description: 'Move directly to the Human Sector.',
    usableBy: ['human', 'blink_alien'] // Blink Alien can use this
  },
  SEDATIVES: {
    type: 'SEDATIVES',
    name: 'Sedatives',
    description: 'Do not draw a Dangerous Sector Card this turn.',
    usableBy: ['human', 'silent_alien'] // Silent Alien can use this
  },
  SPOTLIGHT: {
    type: 'SPOTLIGHT',
    name: 'Spotlight',
    description: 'Name a Sector. Players in that Sector or any of the six adjacent must announce their location.',
    usableBy: ['human']
  },
  DEFENSE: {
    type: 'DEFENSE',
    name: 'Defence',
    description: 'Play when an Alien attacks you: You are not affected by the attack.',
    usableBy: ['human'],
    playWhen: 'attacked'
  },
  ADRENALINE: {
    type: 'ADRENALINE',
    name: 'Adrenaline',
    description: 'Move one extra Sector this turn.',
    usableBy: ['human', 'surge_alien'] // Surge Alien can use this
  },
  CLONE: {
    type: 'CLONE',
    name: 'Clone',
    description: 'Play when an Alien attacks you. You begin the next turn in the Human Sector.',
    usableBy: ['human'],
    playWhen: 'attacked'
  },
  SENSOR: {
    type: 'SENSOR',
    name: 'Sensor',
    description: 'Play on another player. That player must immediately announce their exact location.',
    usableBy: ['human']
  },
  CAT: {
    type: 'CAT',
    name: 'Cat',
    description: 'Declare noise in two different Sectors.',
    usableBy: ['human']
  },
  MUTATION: {
    type: 'MUTATION',
    name: 'Mutation',
    description: 'Use to transform into an Alien.',
    usableBy: ['human']
  }
};

// For backwards compatibility
const DANGEROUS_SECTOR_CARDS = DANGEROUS_DECK;
const ITEM_CARDS = ITEMS;

// Escape Hatch cards - 6 total in Black Edition
const ESCAPE_HATCH_CARDS = {
  GREEN: {
    type: 'GREEN',
    name: 'Working Escape Hatch',
    description: 'You have escaped! This hatch is now blocked.',
    count: 4
  },
  RED: {
    type: 'RED',
    name: 'Damaged Escape Hatch',
    description: 'This escape hatch is damaged and cannot be used.',
    count: 2
  }
};

// Create shuffled deck from card definitions
function createDeck(cardDefs) {
  const deck = [];

  Object.values(cardDefs).forEach(cardType => {
    for (let i = 0; i < cardType.count; i++) {
      deck.push({
        ...cardType,
        id: `${cardType.type}_${i}`
      });
    }
  });

  return shuffle(deck);
}

// Create dangerous sector deck for Ultimate Edition
// 78 cards total: 28 red + 27 green + 23 silence (6 plain + 17 with items)
function createDangerousDeck() {
  const deck = [];
  let cardIndex = 0;

  // Add Noise in Your Sector cards (28 red cards)
  DANGEROUS_DECK.NOISE_YOUR_SECTOR.forEach(cardDef => {
    for (let i = 0; i < cardDef.count; i++) {
      deck.push({
        type: cardDef.type,
        name: cardDef.name,
        item: null,
        itemData: null,
        hasItem: false,
        id: `NOISE_YOUR_${cardIndex++}`
      });
    }
  });

  // Add Noise in Any Sector cards (27 green cards)
  DANGEROUS_DECK.NOISE_ANY_SECTOR.forEach(cardDef => {
    for (let i = 0; i < cardDef.count; i++) {
      deck.push({
        type: cardDef.type,
        name: cardDef.name,
        item: null,
        itemData: null,
        hasItem: false,
        id: `NOISE_ANY_${cardIndex++}`
      });
    }
  });

  // Add Silence cards (23 cards - some with items)
  DANGEROUS_DECK.SILENCE.forEach(cardDef => {
    for (let i = 0; i < cardDef.count; i++) {
      deck.push({
        type: cardDef.type,
        name: cardDef.name,
        item: cardDef.item,
        itemData: cardDef.item ? ITEMS[cardDef.item] : null,
        hasItem: !!cardDef.item,
        id: `SILENCE_${cardIndex++}`
      });
    }
  });

  console.log(`Created deck with ${deck.length} cards`);
  return shuffle(deck);
}

// In Ultimate Edition, items come from Silence cards, not a separate deck
// This function is kept for compatibility but returns empty array
function createItemDeck() {
  // Items are embedded in Silence cards in Ultimate Edition
  return [];
}

function createEscapeHatchDeck() {
  return createDeck(ESCAPE_HATCH_CARDS);
}

function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

module.exports = {
  DANGEROUS_SECTOR_CARDS,
  ITEM_CARDS,
  ESCAPE_HATCH_CARDS,
  createDangerousDeck,
  createItemDeck,
  createEscapeHatchDeck,
  shuffle
};
