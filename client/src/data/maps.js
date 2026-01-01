// Map data for EFTAIOS client
// This mirrors the server-side map data

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVW';

function hex(col, row, state) {
  return {
    label: `${ALPHA[col]}${String(row).padStart(2, '0')}`,
    x: col,
    y: row,
    state: state
  };
}

// Galilei Map Layout (Original)
const galileiLayout = [
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
  { col: 6, row: 3, state: 'airlock' },
  { col: 7, row: 3, state: 'dangerous' },
  { col: 8, row: 3, state: 'dangerous' },
  { col: 9, row: 3, state: 'secure' },
  { col: 10, row: 3, state: 'dangerous' },
  { col: 11, row: 3, state: 'dangerous' },
  { col: 12, row: 3, state: 'secure' },
  { col: 13, row: 3, state: 'dangerous' },
  { col: 14, row: 3, state: 'dangerous' },
  { col: 15, row: 3, state: 'secure' },
  { col: 16, row: 3, state: 'airlock' },

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
  { col: 10, row: 6, state: 'human-start' },
  { col: 11, row: 6, state: 'dangerous' },
  { col: 12, row: 6, state: 'alien-start' },
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
  { col: 6, row: 11, state: 'airlock' },
  { col: 7, row: 11, state: 'dangerous' },
  { col: 8, row: 11, state: 'dangerous' },
  { col: 9, row: 11, state: 'dangerous' },
  { col: 10, row: 11, state: 'secure' },
  { col: 11, row: 11, state: 'dangerous' },
  { col: 12, row: 11, state: 'dangerous' },
  { col: 13, row: 11, state: 'secure' },
  { col: 14, row: 11, state: 'dangerous' },
  { col: 15, row: 11, state: 'dangerous' },
  { col: 16, row: 11, state: 'airlock' },

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

// Galatea Map Layout (Based on uploaded image)
// Columns: H(7) through P(15), Rows: 02-13
// 4 escape hatches, Human start, Alien start
const galateaLayout = [
  // Row 02
  { col: 10, row: 2, state: 'dangerous' },  // K02
  { col: 12, row: 2, state: 'dangerous' },  // M02

  // Row 03 - Top corners have escape hatches
  { col: 7, row: 3, state: 'airlock' },    // H03 - Escape hatch ① (Top-Left)
  { col: 10, row: 3, state: 'dangerous' }, // K03
  { col: 11, row: 3, state: 'dangerous' }, // L03
  { col: 12, row: 3, state: 'dangerous' }, // M03
  { col: 15, row: 3, state: 'airlock' },   // P03 - Escape hatch ② (Top-Right)

  // Row 04
  { col: 9, row: 4, state: 'dangerous' },  // J04
  { col: 10, row: 4, state: 'dangerous' }, // K04
  { col: 11, row: 4, state: 'dangerous' }, // L04
  { col: 12, row: 4, state: 'dangerous' }, // M04
  { col: 13, row: 4, state: 'dangerous' }, // N04

  // Row 05 - Human Start
  { col: 8, row: 5, state: 'dangerous' },  // I05
  { col: 9, row: 5, state: 'dangerous' },  // J05
  { col: 10, row: 5, state: 'dangerous' }, // K05
  { col: 11, row: 5, state: 'human-start' }, // L05 - Human Start ◇
  { col: 12, row: 5, state: 'dangerous' }, // M05
  { col: 13, row: 5, state: 'dangerous' }, // N05
  { col: 14, row: 5, state: 'dangerous' }, // O05

  // Row 06
  { col: 8, row: 6, state: 'dangerous' },  // I06
  { col: 9, row: 6, state: 'dangerous' },  // J06
  { col: 10, row: 6, state: 'dangerous' }, // K06
  { col: 11, row: 6, state: 'dangerous' }, // L06
  { col: 12, row: 6, state: 'dangerous' }, // M06
  { col: 13, row: 6, state: 'dangerous' }, // N06
  { col: 14, row: 6, state: 'secure' },    // O06

  // Row 07
  { col: 8, row: 7, state: 'dangerous' },  // I07
  { col: 9, row: 7, state: 'dangerous' },  // J07
  { col: 10, row: 7, state: 'dangerous' }, // K07
  { col: 11, row: 7, state: 'dangerous' }, // L07
  { col: 12, row: 7, state: 'dangerous' }, // M07
  { col: 13, row: 7, state: 'secure' },    // N07
  { col: 14, row: 7, state: 'dangerous' }, // O07

  // Row 08
  { col: 8, row: 8, state: 'dangerous' },  // I08
  { col: 9, row: 8, state: 'dangerous' },  // J08
  { col: 10, row: 8, state: 'dangerous' }, // K08
  { col: 11, row: 8, state: 'dangerous' }, // L08
  { col: 12, row: 8, state: 'dangerous' }, // M08
  { col: 13, row: 8, state: 'dangerous' }, // N08
  { col: 14, row: 8, state: 'secure' },    // O08

  // Row 09 - Has Alien Start
  { col: 8, row: 9, state: 'dangerous' },  // I09
  { col: 9, row: 9, state: 'dangerous' },  // J09
  { col: 10, row: 9, state: 'alien-start' }, // K09 - Alien Start ⊗
  { col: 11, row: 9, state: 'dangerous' }, // L09
  { col: 12, row: 9, state: 'dangerous' }, // M09
  { col: 13, row: 9, state: 'secure' },    // N09
  { col: 14, row: 9, state: 'dangerous' }, // O09

  // Row 10
  { col: 7, row: 10, state: 'dangerous' }, // H10
  { col: 8, row: 10, state: 'dangerous' }, // I10
  { col: 9, row: 10, state: 'dangerous' }, // J10
  { col: 10, row: 10, state: 'dangerous' }, // K10
  { col: 11, row: 10, state: 'dangerous' }, // L10
  { col: 12, row: 10, state: 'dangerous' }, // M10
  { col: 13, row: 10, state: 'dangerous' }, // N10
  { col: 14, row: 10, state: 'secure' },    // O10
  { col: 15, row: 10, state: 'dangerous' }, // P10

  // Row 11
  { col: 7, row: 11, state: 'dangerous' }, // H11
  { col: 8, row: 11, state: 'dangerous' }, // I11
  { col: 9, row: 11, state: 'dangerous' }, // J11
  { col: 10, row: 11, state: 'secure' },   // K11
  { col: 11, row: 11, state: 'dangerous' }, // L11
  { col: 12, row: 11, state: 'dangerous' }, // M11
  { col: 13, row: 11, state: 'dangerous' }, // N11
  { col: 14, row: 11, state: 'secure' },    // O11
  { col: 15, row: 11, state: 'dangerous' }, // P11

  // Row 12 - Bottom corners have escape hatches
  { col: 7, row: 12, state: 'airlock' },   // H12 - Escape hatch ③ (Bottom-Left)
  { col: 8, row: 12, state: 'dangerous' }, // I12
  { col: 9, row: 12, state: 'dangerous' }, // J12
  { col: 10, row: 12, state: 'dangerous' }, // K12
  { col: 11, row: 12, state: 'dangerous' }, // L12
  { col: 12, row: 12, state: 'dangerous' }, // M12
  { col: 13, row: 12, state: 'dangerous' }, // N12
  { col: 14, row: 12, state: 'secure' },    // O12
  { col: 15, row: 12, state: 'dangerous' }, // P12

  // Row 13 - Has escape hatch in bottom-right
  { col: 10, row: 13, state: 'dangerous' }, // K13
  { col: 11, row: 13, state: 'dangerous' }, // L13
  { col: 12, row: 13, state: 'dangerous' }, // M13
  { col: 13, row: 13, state: 'dangerous' }, // N13
  { col: 16, row: 13, state: 'airlock' },   // Q13 - Escape hatch ④ (Bottom-Right)
];

export const GALILEI_MAP = {
  type: 'map',
  title: 'GALILEI',
  description: 'The perfect Zone for new players. Balanced between Humans and Aliens.',
  recommendedPlayers: '4-8',
  grid: galileiLayout.map(({ col, row, state }) => hex(col, row, state))
};

export const GALATEA_MAP = {
  type: 'map',
  title: 'GALATEA',
  description: 'A compact vertical map for quick intense games.',
  recommendedPlayers: '4-6',
  grid: galateaLayout.map(({ col, row, state }) => hex(col, row, state))
};

// Export Galatea as default map
// Fermi Map Layout (Based on specific visual design)
const fermiLayout = [
  // Row 2
  { col: 9, row: 2, state: 'airlock' },    // J02 - Escape 3
  { col: 10, row: 2, state: 'secure' },    // K02
  { col: 12, row: 2, state: 'dangerous' }, // M02
  { col: 13, row: 2, state: 'airlock' },   // N02 - Escape 4

  // Row 3
  { col: 9, row: 3, state: 'dangerous' },  // J03
  { col: 10, row: 3, state: 'secure' },    // K03
  { col: 11, row: 3, state: 'dangerous' }, // L03
  { col: 12, row: 3, state: 'secure' },    // M03
  { col: 13, row: 3, state: 'dangerous' }, // N03

  // Row 4
  { col: 9, row: 4, state: 'secure' },     // J04
  { col: 10, row: 4, state: 'dangerous' }, // K04
  { col: 11, row: 4, state: 'dangerous' }, // L04
  { col: 12, row: 4, state: 'dangerous' }, // M04
  { col: 13, row: 4, state: 'secure' },    // N04

  // Row 5
  { col: 10, row: 5, state: 'airlock' },   // K05 - Escape 1
  { col: 11, row: 5, state: 'secure' },    // L05
  { col: 12, row: 5, state: 'airlock' },   // M05 - Escape 2

  // Row 6
  { col: 8, row: 6, state: 'secure' },     // I06
  { col: 11, row: 6, state: 'secure' },    // L06
  { col: 14, row: 6, state: 'secure' },    // O06

  // Row 7
  { col: 8, row: 7, state: 'dangerous' },  // I07
  { col: 9, row: 7, state: 'secure' },     // J07
  { col: 11, row: 7, state: 'secure' },    // L07
  { col: 13, row: 7, state: 'dangerous' }, // N07
  { col: 14, row: 7, state: 'secure' },    // O07

  // Row 8
  { col: 9, row: 8, state: 'secure' },     // J08
  { col: 10, row: 8, state: 'secure' },    // K08
  { col: 11, row: 8, state: 'secure' },    // L08
  { col: 12, row: 8, state: 'secure' },    // M08
  { col: 13, row: 8, state: 'secure' },    // N08

  // Row 9 - Chokepoints
  { col: 8, row: 9, state: 'dangerous' },  // I09
  { col: 14, row: 9, state: 'secure' },    // O09

  // Row 10
  { col: 7, row: 10, state: 'secure' },    // H10
  { col: 8, row: 10, state: 'secure' },    // I10
  { col: 9, row: 10, state: 'secure' },    // J10
  { col: 11, row: 10, state: 'human-start' }, // L10 - Human Start
  { col: 13, row: 10, state: 'secure' },   // N10
  { col: 14, row: 10, state: 'dangerous' }, // O10
  { col: 15, row: 10, state: 'secure' },   // P10

  // Row 11
  { col: 7, row: 11, state: 'secure' },    // H11
  { col: 9, row: 11, state: 'secure' },    // J11
  { col: 10, row: 11, state: 'secure' },   // K11
  { col: 11, row: 11, state: 'alien-start' }, // L11 - Alien Start
  { col: 12, row: 11, state: 'secure' },   // M11
  { col: 13, row: 11, state: 'secure' },   // N11
  { col: 15, row: 11, state: 'dangerous' }, // P11

  // Row 12
  { col: 8, row: 12, state: 'dangerous' }, // I12
  { col: 9, row: 12, state: 'secure' },    // J12
  { col: 11, row: 12, state: 'secure' },   // L12
  { col: 13, row: 12, state: 'dangerous' }, // N12
  { col: 14, row: 12, state: 'secure' },   // O12

  // Row 13
  { col: 10, row: 13, state: 'dangerous' }, // K13
  { col: 12, row: 13, state: 'secure' },    // M13
];

export const FERMI_MAP = {
  type: 'map',
  title: 'FERMI',
  description: 'A challenging map with tight chokepoints and a central hive.',
  recommendedPlayers: '4-8',
  grid: fermiLayout.map(({ col, row, state }) => hex(col, row, state))
};

// Export all maps
export default { GALILEI_MAP, GALATEA_MAP, FERMI_MAP };
