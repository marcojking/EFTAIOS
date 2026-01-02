// Levi-Montalcini Map - The Labyrinth Zone
// Grid based on "Escape from the Aliens in Outer Space" map
// 4-8 Players

const LEVI_MONTALCINI_MAP = {
    type: 'map',
    title: 'LEVI-MONTALCINI',
    description: 'The Labyrinth Zone. A complex web of silent and dangerous sectors.',
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

const layout = [
    // --- Col B (1) ---
    { col: 1, row: 1, state: 'dangerous' },  // B01
    { col: 1, row: 2, state: 'dangerous' },  // B02
    { col: 1, row: 5, state: 'secure' },     // B05
    { col: 1, row: 6, state: 'secure' },     // B06
    { col: 1, row: 7, state: 'secure' },     // B07
    { col: 1, row: 8, state: 'secure' },     // B08
    { col: 1, row: 11, state: 'secure' },    // B11
    { col: 1, row: 12, state: 'dangerous' }, // B12

    // --- Col C (2) ---
    { col: 2, row: 1, state: 'dangerous' },  // C01
    { col: 2, row: 2, state: 'airlock' },    // C02 - Escape 1
    { col: 2, row: 3, state: 'dangerous' },  // C03
    { col: 2, row: 4, state: 'dangerous' },  // C04
    { col: 2, row: 5, state: 'dangerous' },  // C05
    { col: 2, row: 6, state: 'dangerous' },  // C06
    { col: 2, row: 8, state: 'dangerous' },  // C08
    { col: 2, row: 9, state: 'dangerous' },  // C09
    { col: 2, row: 10, state: 'dangerous' }, // C10
    { col: 2, row: 11, state: 'secure' },    // C11
    { col: 2, row: 12, state: 'airlock' },   // C12 - Escape 2
    { col: 2, row: 13, state: 'dangerous' }, // C13

    // --- Col D (3) ---
    { col: 3, row: 1, state: 'dangerous' },  // D01
    { col: 3, row: 2, state: 'dangerous' },  // D02
    { col: 3, row: 3, state: 'dangerous' },  // D03
    { col: 3, row: 4, state: 'secure' },     // D04
    { col: 3, row: 5, state: 'secure' },     // D05
    { col: 3, row: 6, state: 'dangerous' },  // D06
    { col: 3, row: 7, state: 'dangerous' },  // D07
    { col: 3, row: 8, state: 'secure' },     // D08
    { col: 3, row: 9, state: 'dangerous' },  // D09
    { col: 3, row: 10, state: 'dangerous' }, // D10
    { col: 3, row: 11, state: 'dangerous' }, // D11
    { col: 3, row: 12, state: 'secure' },    // D12

    // --- Col E (4) ---
    { col: 4, row: 3, state: 'dangerous' },  // E03
    { col: 4, row: 5, state: 'dangerous' },  // E05
    { col: 4, row: 7, state: 'secure' },     // E07
    { col: 4, row: 9, state: 'dangerous' },  // E09
    { col: 4, row: 10, state: 'dangerous' }, // E10
    { col: 4, row: 11, state: 'dangerous' }, // E11

    // --- Col F (5) ---
    { col: 5, row: 3, state: 'dangerous' },  // F03
    { col: 5, row: 4, state: 'dangerous' },  // F04
    { col: 5, row: 5, state: 'dangerous' },  // F05
    { col: 5, row: 6, state: 'dangerous' },  // F06
    { col: 5, row: 7, state: 'dangerous' },  // F07
    { col: 5, row: 8, state: 'dangerous' },  // F08
    { col: 5, row: 9, state: 'dangerous' },  // F09
    { col: 5, row: 11, state: 'dangerous' }, // F11
    { col: 5, row: 13, state: 'dangerous' }, // F13

    // --- Col G (6) ---
    { col: 6, row: 3, state: 'secure' },     // G03
    { col: 6, row: 4, state: 'dangerous' },  // G04
    { col: 6, row: 6, state: 'dangerous' },  // G06
    { col: 6, row: 8, state: 'dangerous' },  // G08
    { col: 6, row: 10, state: 'dangerous' }, // G10
    { col: 6, row: 11, state: 'secure' },    // G11

    // --- Col H (7) ---
    { col: 7, row: 3, state: 'dangerous' },  // H03
    { col: 7, row: 4, state: 'dangerous' },  // H04
    { col: 7, row: 6, state: 'secure' },     // H06
    { col: 7, row: 7, state: 'secure' },     // H07
    { col: 7, row: 9, state: 'dangerous' },  // H09
    { col: 7, row: 10, state: 'dangerous' }, // H10
    { col: 7, row: 11, state: 'dangerous' }, // H11

    // --- Col I (8) ---
    { col: 8, row: 2, state: 'secure' },     // I02
    { col: 8, row: 3, state: 'secure' },     // I03
    { col: 8, row: 4, state: 'dangerous' },  // I04
    { col: 8, row: 5, state: 'secure' },     // I05
    { col: 8, row: 6, state: 'dangerous' },  // I06
    { col: 8, row: 7, state: 'dangerous' },  // I07
    { col: 8, row: 8, state: 'dangerous' },  // I08
    { col: 8, row: 9, state: 'secure' },     // I09
    { col: 8, row: 11, state: 'dangerous' }, // I11
    { col: 8, row: 12, state: 'secure' },    // I12

    // --- Col J (9) ---
    { col: 9, row: 2, state: 'dangerous' },  // J02
    { col: 9, row: 3, state: 'dangerous' },  // J03
    { col: 9, row: 5, state: 'dangerous' },  // J05
    { col: 9, row: 6, state: 'dangerous' },  // J06
    { col: 9, row: 8, state: 'dangerous' },  // J08
    { col: 9, row: 9, state: 'dangerous' },  // J09
    { col: 9, row: 11, state: 'secure' },    // J11
    { col: 9, row: 12, state: 'dangerous' }, // J12

    // --- Col K (10) ---
    { col: 10, row: 2, state: 'dangerous' }, // K02
    { col: 10, row: 3, state: 'secure' },    // K03
    { col: 10, row: 4, state: 'dangerous' }, // K04
    { col: 10, row: 5, state: 'dangerous' }, // K05
    { col: 10, row: 6, state: 'secure' },    // K06
    { col: 10, row: 7, state: 'human-start' }, // K07
    { col: 10, row: 8, state: 'secure' },    // K08
    { col: 10, row: 9, state: 'dangerous' }, // K09
    { col: 10, row: 10, state: 'secure' },   // K10
    { col: 10, row: 11, state: 'dangerous' }, // K11
    { col: 10, row: 12, state: 'dangerous' }, // K12

    // --- Col L (11) ---
    { col: 11, row: 1, state: 'secure' },    // L01
    { col: 11, row: 2, state: 'dangerous' }, // L02
    { col: 11, row: 3, state: 'dangerous' }, // L03
    { col: 11, row: 4, state: 'secure' },    // L04
    { col: 11, row: 9, state: 'dangerous' }, // L09
    { col: 11, row: 10, state: 'dangerous' }, // L10
    { col: 11, row: 11, state: 'dangerous' }, // L11
    { col: 11, row: 12, state: 'dangerous' }, // L12
    { col: 11, row: 13, state: 'dangerous' }, // L13

    // --- Col M (12) ---
    { col: 12, row: 1, state: 'dangerous' }, // M01
    { col: 12, row: 3, state: 'dangerous' }, // M03
    { col: 12, row: 4, state: 'dangerous' }, // M04
    { col: 12, row: 5, state: 'dangerous' }, // M05
    { col: 12, row: 6, state: 'secure' },    // M06
    { col: 12, row: 7, state: 'alien-start' }, // M07
    { col: 12, row: 8, state: 'secure' },    // M08
    { col: 12, row: 9, state: 'dangerous' }, // M09
    { col: 12, row: 10, state: 'dangerous' }, // M10
    { col: 12, row: 11, state: 'dangerous' }, // M11
    { col: 12, row: 12, state: 'secure' },   // M12
    { col: 12, row: 13, state: 'secure' },   // M13

    // --- Col N (13) ---
    { col: 13, row: 1, state: 'secure' },    // N01
    { col: 13, row: 4, state: 'dangerous' }, // N04
    { col: 13, row: 5, state: 'dangerous' }, // N05
    { col: 13, row: 6, state: 'dangerous' }, // N06
    { col: 13, row: 7, state: 'secure' },    // N07
    { col: 13, row: 8, state: 'secure' },    // N08
    { col: 13, row: 9, state: 'dangerous' }, // N09
    { col: 13, row: 10, state: 'dangerous' }, // N10
    { col: 13, row: 11, state: 'secure' },   // N11
    { col: 13, row: 12, state: 'secure' },   // N12

    // --- Col O (14) ---
    { col: 14, row: 2, state: 'dangerous' }, // O02
    { col: 14, row: 3, state: 'secure' },    // O03
    { col: 14, row: 4, state: 'dangerous' }, // O04
    { col: 14, row: 5, state: 'secure' },    // O05
    { col: 14, row: 6, state: 'dangerous' }, // O06
    { col: 14, row: 7, state: 'dangerous' }, // O07
    { col: 14, row: 8, state: 'dangerous' }, // O08
    { col: 14, row: 9, state: 'dangerous' }, // O09
    { col: 14, row: 10, state: 'dangerous' }, // O10
    { col: 14, row: 12, state: 'dangerous' }, // O12

    // --- Col P (15) ---
    { col: 15, row: 3, state: 'secure' },    // P03
    { col: 15, row: 5, state: 'secure' },    // P05
    { col: 15, row: 6, state: 'secure' },    // P06
    { col: 15, row: 7, state: 'secure' },    // P07
    { col: 15, row: 9, state: 'secure' },    // P09
    { col: 15, row: 12, state: 'dangerous' }, // P12

    // --- Col Q (16) ---
    { col: 16, row: 4, state: 'dangerous' }, // Q04
    { col: 16, row: 6, state: 'dangerous' }, // Q06
    { col: 16, row: 8, state: 'dangerous' }, // Q08
    { col: 16, row: 10, state: 'dangerous' }, // Q10
    { col: 16, row: 11, state: 'dangerous' }, // Q11
    { col: 16, row: 12, state: 'dangerous' }, // Q12

    // --- Col R (17) ---
    { col: 17, row: 3, state: 'dangerous' }, // R03
    { col: 17, row: 4, state: 'secure' },    // R04
    { col: 17, row: 5, state: 'secure' },    // R05
    { col: 17, row: 6, state: 'secure' },    // R06
    { col: 17, row: 8, state: 'secure' },    // R08
    { col: 17, row: 9, state: 'secure' },    // R09
    { col: 17, row: 10, state: 'secure' },   // R10
    { col: 17, row: 11, state: 'dangerous' }, // R11

    // --- Col S (18) ---
    { col: 18, row: 3, state: 'dangerous' }, // S03
    { col: 18, row: 4, state: 'dangerous' }, // S04
    { col: 18, row: 5, state: 'dangerous' }, // S05
    { col: 18, row: 7, state: 'dangerous' }, // S07
    { col: 18, row: 8, state: 'dangerous' }, // S08
    { col: 18, row: 10, state: 'dangerous' }, // S10
    { col: 18, row: 11, state: 'dangerous' }, // S11

    // --- Col T (19) ---
    { col: 19, row: 2, state: 'dangerous' }, // T02
    { col: 19, row: 3, state: 'airlock' },   // T03 (Escape 3)
    { col: 19, row: 4, state: 'secure' },    // T04
    { col: 19, row: 6, state: 'secure' },    // T06
    { col: 19, row: 7, state: 'secure' },    // T07
    { col: 19, row: 9, state: 'secure' },    // T09
    { col: 19, row: 10, state: 'airlock' },  // T10 (Escape 4)
    { col: 19, row: 11, state: 'dangerous' }, // T11

    // --- Col U (20) ---
    { col: 20, row: 3, state: 'secure' },    // U03
    { col: 20, row: 4, state: 'secure' },    // U04
    { col: 20, row: 5, state: 'secure' },    // U05
    { col: 20, row: 6, state: 'dangerous' }, // U06
    { col: 20, row: 7, state: 'secure' },    // U07
    { col: 20, row: 8, state: 'dangerous' }, // U08
    { col: 20, row: 9, state: 'secure' },    // U09
    { col: 20, row: 10, state: 'secure' },   // U10
    { col: 20, row: 11, state: 'secure' },   // U11

    // --- Col V (21) ---
    { col: 21, row: 6, state: 'secure' },    // V06
    { col: 21, row: 7, state: 'secure' },    // V07
];

// Build grid
layout.forEach(({ col, row, state }) => {
    LEVI_MONTALCINI_MAP.grid.push(hex(col, row, state));
});

module.exports = LEVI_MONTALCINI_MAP;
