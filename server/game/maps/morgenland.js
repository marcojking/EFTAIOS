// Morgenland Map
// Based on the provided image layout ("Snake" shape)

const MORGENLAND_MAP = {
    type: 'map',
    title: 'MORGENLAND',
    description: 'A winding, snake-like zone with separated clusters.',
    recommendedPlayers: '4-8',
    grid: []
};

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

const layout = [
    // Row 3
    { col: 11, row: 3, state: 'dangerous' }, // L03

    // Row 4
    { col: 10, row: 4, state: 'dangerous' }, // K04
    { col: 11, row: 4, state: 'airlock' },   // L04 - Escape Hatch 3
    { col: 12, row: 4, state: 'dangerous' }, // M04

    // Row 5
    { col: 7, row: 5, state: 'dangerous' },  // H05
    { col: 8, row: 5, state: 'dangerous' },  // I05
    { col: 9, row: 5, state: 'secure' },     // J05
    { col: 10, row: 5, state: 'dangerous' }, // K05
    // L05 removed
    { col: 12, row: 5, state: 'secure' },    // M05
    { col: 13, row: 5, state: 'dangerous' }, // N05

    // Row 6
    { col: 7, row: 6, state: 'secure' },     // H06
    { col: 8, row: 6, state: 'dangerous' },  // I06
    // J06 removed
    { col: 10, row: 6, state: 'secure' },    // K06
    { col: 11, row: 6, state: 'alien-start' }, // L06 - Alien Start
    { col: 12, row: 6, state: 'dangerous' }, // M06
    { col: 13, row: 6, state: 'secure' },    // N06

    // Row 7
    { col: 6, row: 7, state: 'dangerous' },  // G07
    { col: 8, row: 7, state: 'dangerous' },  // I07
    { col: 9, row: 7, state: 'dangerous' },  // J07
    { col: 13, row: 7, state: 'dangerous' }, // N07
    // O07 removed
    { col: 15, row: 7, state: 'dangerous' }, // P07

    // Row 8
    { col: 5, row: 8, state: 'dangerous' },  // F08 - Was Escape 1, now Dangerous
    { col: 6, row: 8, state: 'airlock' },    // G08 - Escape Hatch 2 (Moved here)
    { col: 8, row: 8, state: 'secure' },     // I08
    { col: 9, row: 8, state: 'dangerous' },  // J08
    { col: 10, row: 8, state: 'secure' },    // K08
    { col: 11, row: 8, state: 'human-start' }, // L08 - Human Start (Moved here)
    { col: 13, row: 8, state: 'dangerous' }, // N08
    { col: 14, row: 8, state: 'dangerous' }, // O08 - Now Dangerous
    { col: 15, row: 8, state: 'dangerous' }, // P08 - Was Escape 2, now Dangerous? User didn't explicitly say P08 changes types, but Escape 2 moved to G08. I'll make P08 Dangerous.
    { col: 16, row: 8, state: 'dangerous' }, // Q08

    // Row 9
    { col: 6, row: 9, state: 'secure' },     // G09
    { col: 8, row: 9, state: 'dangerous' },  // I09
    { col: 9, row: 9, state: 'secure' },     // J09
    // L09 removed
    { col: 12, row: 9, state: 'dangerous' }, // M09
    { col: 14, row: 9, state: 'dangerous' }, // O09 - Now Dangerous
    { col: 15, row: 9, state: 'dangerous' }, // P09 - Added
    { col: 16, row: 9, state: 'dangerous' }, // Q09

    // Row 10
    { col: 6, row: 10, state: 'dangerous' }, // G10
    { col: 7, row: 10, state: 'dangerous' }, // H10
    { col: 8, row: 10, state: 'secure' },    // I10
    { col: 9, row: 10, state: 'dangerous' }, // J10
    { col: 10, row: 10, state: 'dangerous' }, // K10
    { col: 11, row: 10, state: 'secure' },   // L10
    { col: 12, row: 10, state: 'secure' },   // M10
    { col: 13, row: 10, state: 'dangerous' }, // N10
    { col: 14, row: 10, state: 'dangerous' }, // O10
    { col: 15, row: 10, state: 'dangerous' }, // P10

    // Row 11
    { col: 8, row: 11, state: 'dangerous' }, // I11
    { col: 11, row: 11, state: 'dangerous' }, // L11
    { col: 14, row: 11, state: 'secure' },   // O11
];

// Build grid
layout.forEach(({ col, row, state }) => {
    MORGENLAND_MAP.grid.push(hex(col, row, state));
});

module.exports = MORGENLAND_MAP;
