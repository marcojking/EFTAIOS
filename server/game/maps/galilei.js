// Galilei Map - Default beginner map for EFTAIOS
// Grid: 23 columns (A-W) x 14 rows (01-14)
// Based on official map layout

const GALILEI_MAP = {
  type: 'map',
  title: 'GALILEI',
  description: 'The perfect Zone for new players. Balanced between Humans and Aliens.',
  recommendedPlayers: '4-8',
  grid: []
};

// Define the map layout
// State types: 'empty', 'dangerous', 'secure', 'alien-start', 'human-start', 'airlock'

// Helper to create hex data
function hex(col, row, state) {
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVW';
  return {
    label: `${ALPHA[col]}${String(row).padStart(2, '0')}`,
    x: col,
    y: row,
    state: state
  };
}

// Galilei map layout (approximated from official map)
// This creates a spaceship-shaped layout

const layout = [
  // Row 1
  { col: 9, row: 1, state: 'dangerous' },
  { col: 10, row: 1, state: 'secure' },
  { col: 11, row: 1, state: 'dangerous' },
  { col: 12, row: 1, state: 'secure' },
  { col: 13, row: 1, state: 'dangerous' },

  // Row 2
  { col: 8, row: 2, state: 'secure' },
  { col: 9, row: 2, state: 'dangerous' },
  { col: 10, row: 2, state: 'dangerous' },
  { col: 11, row: 2, state: 'secure' },
  { col: 12, row: 2, state: 'dangerous' },
  { col: 13, row: 2, state: 'dangerous' },
  { col: 14, row: 2, state: 'secure' },

  // Row 3
  { col: 6, row: 3, state: 'airlock' }, // Escape Hatch 1
  { col: 7, row: 3, state: 'dangerous' },
  { col: 8, row: 3, state: 'dangerous' },
  { col: 9, row: 3, state: 'secure' },
  { col: 10, row: 3, state: 'dangerous' },
  { col: 11, row: 3, state: 'dangerous' },
  { col: 12, row: 3, state: 'secure' },
  { col: 13, row: 3, state: 'dangerous' },
  { col: 14, row: 3, state: 'dangerous' },
  { col: 15, row: 3, state: 'secure' },
  { col: 16, row: 3, state: 'airlock' }, // Escape Hatch 2

  // Row 4
  { col: 5, row: 4, state: 'secure' },
  { col: 6, row: 4, state: 'dangerous' },
  { col: 7, row: 4, state: 'secure' },
  { col: 8, row: 4, state: 'dangerous' },
  { col: 9, row: 4, state: 'dangerous' },
  { col: 10, row: 4, state: 'secure' },
  { col: 11, row: 4, state: 'dangerous' },
  { col: 12, row: 4, state: 'dangerous' },
  { col: 13, row: 4, state: 'secure' },
  { col: 14, row: 4, state: 'dangerous' },
  { col: 15, row: 4, state: 'dangerous' },
  { col: 16, row: 4, state: 'secure' },
  { col: 17, row: 4, state: 'dangerous' },

  // Row 5
  { col: 4, row: 5, state: 'dangerous' },
  { col: 5, row: 5, state: 'dangerous' },
  { col: 6, row: 5, state: 'secure' },
  { col: 7, row: 5, state: 'dangerous' },
  { col: 8, row: 5, state: 'secure' },
  { col: 9, row: 5, state: 'dangerous' },
  { col: 10, row: 5, state: 'dangerous' },
  { col: 11, row: 5, state: 'secure' },
  { col: 12, row: 5, state: 'dangerous' },
  { col: 13, row: 5, state: 'dangerous' },
  { col: 14, row: 5, state: 'secure' },
  { col: 15, row: 5, state: 'dangerous' },
  { col: 16, row: 5, state: 'dangerous' },
  { col: 17, row: 5, state: 'secure' },
  { col: 18, row: 5, state: 'dangerous' },

  // Row 6
  { col: 3, row: 6, state: 'secure' },
  { col: 4, row: 6, state: 'dangerous' },
  { col: 5, row: 6, state: 'secure' },
  { col: 6, row: 6, state: 'dangerous' },
  { col: 7, row: 6, state: 'dangerous' },
  { col: 8, row: 6, state: 'dangerous' },
  { col: 9, row: 6, state: 'secure' },
  { col: 10, row: 6, state: 'human-start' }, // Human starting sector
  { col: 11, row: 6, state: 'dangerous' },
  { col: 12, row: 6, state: 'alien-start' }, // Alien starting sector
  { col: 13, row: 6, state: 'secure' },
  { col: 14, row: 6, state: 'dangerous' },
  { col: 15, row: 6, state: 'dangerous' },
  { col: 16, row: 6, state: 'dangerous' },
  { col: 17, row: 6, state: 'secure' },
  { col: 18, row: 6, state: 'dangerous' },
  { col: 19, row: 6, state: 'secure' },

  // Row 7
  { col: 3, row: 7, state: 'dangerous' },
  { col: 4, row: 7, state: 'secure' },
  { col: 5, row: 7, state: 'dangerous' },
  { col: 6, row: 7, state: 'secure' },
  { col: 7, row: 7, state: 'dangerous' },
  { col: 8, row: 7, state: 'secure' },
  { col: 9, row: 7, state: 'dangerous' },
  { col: 10, row: 7, state: 'dangerous' },
  { col: 11, row: 7, state: 'secure' },
  { col: 12, row: 7, state: 'dangerous' },
  { col: 13, row: 7, state: 'dangerous' },
  { col: 14, row: 7, state: 'secure' },
  { col: 15, row: 7, state: 'dangerous' },
  { col: 16, row: 7, state: 'secure' },
  { col: 17, row: 7, state: 'dangerous' },
  { col: 18, row: 7, state: 'secure' },
  { col: 19, row: 7, state: 'dangerous' },

  // Row 8
  { col: 3, row: 8, state: 'secure' },
  { col: 4, row: 8, state: 'dangerous' },
  { col: 5, row: 8, state: 'dangerous' },
  { col: 6, row: 8, state: 'dangerous' },
  { col: 7, row: 8, state: 'secure' },
  { col: 8, row: 8, state: 'dangerous' },
  { col: 9, row: 8, state: 'dangerous' },
  { col: 10, row: 8, state: 'secure' },
  { col: 11, row: 8, state: 'dangerous' },
  { col: 12, row: 8, state: 'secure' },
  { col: 13, row: 8, state: 'dangerous' },
  { col: 14, row: 8, state: 'dangerous' },
  { col: 15, row: 8, state: 'secure' },
  { col: 16, row: 8, state: 'dangerous' },
  { col: 17, row: 8, state: 'dangerous' },
  { col: 18, row: 8, state: 'dangerous' },
  { col: 19, row: 8, state: 'secure' },

  // Row 9
  { col: 4, row: 9, state: 'secure' },
  { col: 5, row: 9, state: 'dangerous' },
  { col: 6, row: 9, state: 'secure' },
  { col: 7, row: 9, state: 'dangerous' },
  { col: 8, row: 9, state: 'secure' },
  { col: 9, row: 9, state: 'dangerous' },
  { col: 10, row: 9, state: 'dangerous' },
  { col: 11, row: 9, state: 'secure' },
  { col: 12, row: 9, state: 'dangerous' },
  { col: 13, row: 9, state: 'dangerous' },
  { col: 14, row: 9, state: 'secure' },
  { col: 15, row: 9, state: 'dangerous' },
  { col: 16, row: 9, state: 'secure' },
  { col: 17, row: 9, state: 'dangerous' },
  { col: 18, row: 9, state: 'secure' },

  // Row 10
  { col: 5, row: 10, state: 'dangerous' },
  { col: 6, row: 10, state: 'dangerous' },
  { col: 7, row: 10, state: 'secure' },
  { col: 8, row: 10, state: 'dangerous' },
  { col: 9, row: 10, state: 'secure' },
  { col: 10, row: 10, state: 'dangerous' },
  { col: 11, row: 10, state: 'dangerous' },
  { col: 12, row: 10, state: 'secure' },
  { col: 13, row: 10, state: 'dangerous' },
  { col: 14, row: 10, state: 'dangerous' },
  { col: 15, row: 10, state: 'secure' },
  { col: 16, row: 10, state: 'dangerous' },
  { col: 17, row: 10, state: 'dangerous' },

  // Row 11
  { col: 6, row: 11, state: 'airlock' }, // Escape Hatch 3
  { col: 7, row: 11, state: 'dangerous' },
  { col: 8, row: 11, state: 'dangerous' },
  { col: 9, row: 11, state: 'dangerous' },
  { col: 10, row: 11, state: 'secure' },
  { col: 11, row: 11, state: 'dangerous' },
  { col: 12, row: 11, state: 'dangerous' },
  { col: 13, row: 11, state: 'secure' },
  { col: 14, row: 11, state: 'dangerous' },
  { col: 15, row: 11, state: 'dangerous' },
  { col: 16, row: 11, state: 'airlock' }, // Escape Hatch 4

  // Row 12
  { col: 8, row: 12, state: 'secure' },
  { col: 9, row: 12, state: 'dangerous' },
  { col: 10, row: 12, state: 'dangerous' },
  { col: 11, row: 12, state: 'secure' },
  { col: 12, row: 12, state: 'dangerous' },
  { col: 13, row: 12, state: 'dangerous' },
  { col: 14, row: 12, state: 'secure' },

  // Row 13
  { col: 9, row: 13, state: 'secure' },
  { col: 10, row: 13, state: 'dangerous' },
  { col: 11, row: 13, state: 'dangerous' },
  { col: 12, row: 13, state: 'secure' },
  { col: 13, row: 13, state: 'dangerous' },

  // Row 14
  { col: 10, row: 14, state: 'dangerous' },
  { col: 11, row: 14, state: 'secure' },
  { col: 12, row: 14, state: 'dangerous' }
];

// Build grid
layout.forEach(({ col, row, state }) => {
  GALILEI_MAP.grid.push(hex(col, row, state));
});

module.exports = GALILEI_MAP;
