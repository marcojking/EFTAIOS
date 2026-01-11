/**
 * Character Art Configuration
 *
 * Maps character IDs to their available artwork from the Print and Play PDF.
 * Characters without official artwork will use styled placeholders.
 */

// Characters that have official artwork from the PDF
// Maps game character IDs to the extracted image filenames
export const CHARACTER_ART_MAP = {
  // Humans with official art
  captain: 'captain.png',
  pilot: 'pilot.png',
  engineer: 'engineer.png',
  soldier: 'soldier.png',
  psychologist: 'psychologist.png',
  medic: 'medic.png',

  // Humans without official art (use placeholders)
  copilot: null,
  executive_officer: null,

  // Aliens - map to the generic alien artwork from PDF
  // The PDF has "first_alien" through "fifth_alien" which we map to Ultimate Edition aliens
  blink_alien: 'first_alien.png',
  silent_alien: 'second_alien.png',
  surge_alien: 'third_alien.png',
  brute_alien: 'fourth_alien.png',
  fast_alien: 'fifth_alien.png',

  // These aliens use placeholders (no matching PDF art)
  lurking_alien: null,
  invisible_alien: null,
  psychic_alien: null,
};

// Check if a character has official artwork
export function hasOfficialArt(characterId) {
  return CHARACTER_ART_MAP[characterId] != null;
}

// Get the image path for a character
export function getCharacterImagePath(characterId) {
  const filename = CHARACTER_ART_MAP[characterId];
  if (filename) {
    return `/assets/cards/characters/${filename}`;
  }
  return null;
}

// Get the card back image path
export function getCharacterBackPath() {
  return '/assets/cards/characters/back.png';
}

// Dangerous sector card paths
export const DANGEROUS_SECTOR_CARDS = {
  NOISE_YOUR_SECTOR: '/assets/cards/dangerous-sector/noise-your-sector.png',
  NOISE_ANY_SECTOR: '/assets/cards/dangerous-sector/noise-any-sector.png',
  SILENCE: '/assets/cards/dangerous-sector/silence.png',
  BACK: '/assets/cards/dangerous-sector/back.png',
};

// Item card paths
export const ITEM_CARDS = {
  ADRENALINE: '/assets/cards/items/adrenaline.png',
  DEFENSE: '/assets/cards/items/defense.png',
  SEDATIVES: '/assets/cards/items/sedatives.png',
  SPOTLIGHT: '/assets/cards/items/spotlight.png',
  // Items without specific artwork use placeholder
  ATTACK: null,
  TELEPORT: null,
  CAT: null,
  SENSOR: null,
  MUTATION: null,
  CLONE: null,
  BACK: '/assets/cards/items/back.png',
};

// Get item image path
export function getItemImagePath(itemType) {
  const path = ITEM_CARDS[itemType?.toUpperCase()];
  return path || null;
}

// Escape hatch card paths
export const ESCAPE_HATCH_CARDS = {
  GREEN: '/assets/cards/escape-hatch/working.png',
  RED: '/assets/cards/escape-hatch/damaged.png',
  BACK: '/assets/cards/escape-hatch/back.png',
};

// Get escape hatch image path
export function getEscapeHatchImagePath(type) {
  return ESCAPE_HATCH_CARDS[type?.toUpperCase()] || null;
}

export default {
  CHARACTER_ART_MAP,
  hasOfficialArt,
  getCharacterImagePath,
  getCharacterBackPath,
  DANGEROUS_SECTOR_CARDS,
  ITEM_CARDS,
  getItemImagePath,
  ESCAPE_HATCH_CARDS,
  getEscapeHatchImagePath,
};
