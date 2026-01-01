// Character definitions for EFTAIOS Ultimate Edition
// 16 characters total: 8 humans + 8 aliens
// Each character has a unique special power

const CHARACTERS = {
  HUMANS: [
    {
      id: 'captain',
      name: 'The Captain',
      fullName: 'Ennio Maria Dominoni',
      rank: 1,
      color: '#4A90D9',
      power: {
        id: 'first_safe',
        name: 'First Safe',
        description: 'Does not draw a Dangerous Sector Card the first time he moves into a Dangerous Sector.',
        used: false,
        passive: true
      }
    },
    {
      id: 'pilot',
      name: 'The Pilot',
      fullName: 'Julia Niguloti',
      nickname: 'Cabal',
      rank: 2,
      color: '#50C878',
      power: {
        id: 'double_noise',
        name: 'Double Noise',
        description: 'Can announce two noises upon drawing a Dangerous Sector Card once.',
        used: false,
        usesRemaining: 1
      }
    },
    {
      id: 'copilot',
      name: 'The Co-Pilot',
      fullName: 'Sofia Chen',
      rank: 3,
      color: '#20B2AA',
      power: {
        id: 'free_teleport',
        name: 'Free Teleport',
        description: 'Can teleport once in the Game, as if she had used a Teleport card and without needing one.',
        used: false,
        usesRemaining: 1
      }
    },
    {
      id: 'engineer',
      name: 'The Engineer',
      fullName: 'Marcus Webb',
      rank: 4,
      color: '#DAA520',
      power: {
        id: 'escape_choice',
        name: 'Escape Choice',
        description: 'Draws two Escape Pod Cards when he reaches an Escape Pod Sector and chooses which one to use.',
        passive: true
      }
    },
    {
      id: 'medic',
      name: 'The Medic',
      fullName: 'Dr. Yuki Tanaka',
      rank: 5,
      color: '#FF69B4',
      power: {
        id: 'reveal_identity',
        name: 'Reveal Identity',
        description: 'Can force another player to reveal their identity once during the Game.',
        used: false,
        usesRemaining: 1
      }
    },
    {
      id: 'soldier',
      name: 'The Soldier',
      fullName: 'Tuccio Brendon',
      nickname: 'Piri',
      rank: 6,
      color: '#E67E22',
      power: {
        id: 'free_attack',
        name: 'Free Attack',
        description: 'Can Attack once in the Game, as if he had used an Attack card and without needing one.',
        used: false,
        usesRemaining: 1
      }
    },
    {
      id: 'psychologist',
      name: 'The Psychologist',
      fullName: 'Silvano Porpora',
      rank: 7,
      color: '#9B59B6',
      power: {
        id: 'alien_start',
        name: 'Alien Start',
        description: 'Begins the Game in the Alien Sector.',
        passive: true,
        startsInAlienSector: true
      }
    },
    {
      id: 'executive_officer',
      name: 'The Executive Officer',
      fullName: 'Commander Hayes',
      rank: 8,
      color: '#708090',
      power: {
        id: 'stay_still',
        name: 'Stay Still',
        description: 'Can stay still and not move during his turn once during the Game, without announcing it.',
        used: false,
        usesRemaining: 1
      }
    }
  ],
  ALIENS: [
    {
      id: 'blink_alien',
      name: 'The Blink Alien',
      fullName: 'Subject Alpha',
      rank: 1,
      color: '#E74C3C',
      power: {
        id: 'use_teleport',
        name: 'Use Teleport',
        description: 'Can use the Teleport Item Cards.',
        passive: true,
        canUseItems: ['TELEPORT']
      }
    },
    {
      id: 'silent_alien',
      name: 'The Silent Alien',
      fullName: 'Subject Beta',
      rank: 2,
      color: '#C0392B',
      power: {
        id: 'use_sedatives',
        name: 'Use Sedatives',
        description: 'Can use the Sedatives Item Cards.',
        passive: true,
        canUseItems: ['SEDATIVES']
      }
    },
    {
      id: 'surge_alien',
      name: 'The Surge Alien',
      fullName: 'Subject Gamma',
      rank: 3,
      color: '#9B59B6',
      power: {
        id: 'use_adrenaline',
        name: 'Use Adrenaline',
        description: 'Can use the Adrenaline Item Cards.',
        passive: true,
        canUseItems: ['ADRENALINE']
      }
    },
    {
      id: 'brute_alien',
      name: 'The Brute Alien',
      fullName: 'Subject Delta',
      rank: 4,
      color: '#2C3E50',
      power: {
        id: 'immune_attacks',
        name: 'Immune to Attacks',
        description: 'Is immune to all Attacks, Human and Alien.',
        passive: true,
        immuneToAttacks: true
      }
    },
    {
      id: 'fast_alien',
      name: 'The Fast Alien',
      fullName: 'Subject Epsilon',
      rank: 5,
      color: '#F39C12',
      power: {
        id: 'fast_start',
        name: 'Fast Start',
        description: 'Can move up to three sectors on his first movement of the Game.',
        passive: true,
        firstMoveBonus: 3
      }
    },
    {
      id: 'lurking_alien',
      name: 'The Lurking Alien',
      fullName: 'Subject Zeta',
      rank: 6,
      color: '#1ABC9C',
      power: {
        id: 'attack_in_place',
        name: 'Attack in Place',
        description: 'Can choose to directly attack in his Sector, instead of moving.',
        passive: true,
        canAttackWithoutMoving: true
      }
    },
    {
      id: 'invisible_alien',
      name: 'The Invisible Alien',
      fullName: 'Subject Eta',
      rank: 7,
      color: '#34495E',
      power: {
        id: 'immune_detection',
        name: 'Immune to Detection',
        description: 'Is immune to the Sensor Item and the Spotlight Item.',
        passive: true,
        immuneToItems: ['SENSOR', 'SPOTLIGHT']
      }
    },
    {
      id: 'psychic_alien',
      name: 'The Psychic Alien',
      fullName: 'Subject Theta',
      rank: 8,
      color: '#8E44AD',
      power: {
        id: 'silence_to_noise',
        name: 'Silence to Noise',
        description: 'Always behaves as if he had drawn a Noise in Any Sector card when drawing a Silence Card.',
        passive: true,
        silenceBecomesNoiseAny: true
      }
    }
  ]
};

// Get all characters as a flat array
function getAllCharacters() {
  return [...CHARACTERS.HUMANS, ...CHARACTERS.ALIENS];
}

// Get character by ID
function getCharacterById(id) {
  return getAllCharacters().find(c => c.id === id);
}

// Check if character can use a specific item
function canCharacterUseItem(character, itemType) {
  // Humans can use most items (except when transformed)
  if (CHARACTERS.HUMANS.find(c => c.id === character.id)) {
    return true;
  }

  // Aliens can only use items if their power allows it
  const alien = CHARACTERS.ALIENS.find(c => c.id === character.id);
  if (alien && alien.power.canUseItems) {
    return alien.power.canUseItems.includes(itemType);
  }

  return false;
}

module.exports = {
  CHARACTERS,
  getAllCharacters,
  getCharacterById,
  canCharacterUseItem
};
