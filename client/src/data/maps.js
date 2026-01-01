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
  { col: 1, row: 1, state: 'airlock' },   // B01 - Escape Pod 1
  { col: 6, row: 1, state: 'dangerous' }, // G01
  { col: 8, row: 1, state: 'dangerous' }, // I01
  { col: 10, row: 1, state: 'dangerous' }, // K01
  { col: 13, row: 1, state: 'dangerous' }, // N01
  { col: 16, row: 1, state: 'dangerous' }, // Q01
  { col: 20, row: 1, state: 'dangerous' }, // U01
  { col: 21, row: 1, state: 'dangerous' },  // V01

  // Row 2
  { col: 0, row: 2, state: 'dangerous' },  // A02
  { col: 1, row: 2, state: 'dangerous' },  // B02
  { col: 2, row: 2, state: 'dangerous' },  // C02
  { col: 4, row: 2, state: 'dangerous' },  // E02
  { col: 6, row: 2, state: 'dangerous' },  // G02
  { col: 8, row: 2, state: 'dangerous' },  // I02
  { col: 10, row: 2, state: 'dangerous' }, // K02
  { col: 12, row: 2, state: 'dangerous' }, // M02
  { col: 13, row: 2, state: 'dangerous' }, // N02
  { col: 15, row: 2, state: 'dangerous' }, // P02
  { col: 17, row: 2, state: 'dangerous' }, // R02
  { col: 18, row: 2, state: 'dangerous' }, // S02
  { col: 20, row: 2, state: 'airlock' },   // U02 - Escape Pod 2
  { col: 21, row: 2, state: 'dangerous' }, // V02
  { col: 22, row: 2, state: 'dangerous' }, // W02

  // Row 3
  { col: 0, row: 3, state: 'dangerous' },  // A03
  { col: 1, row: 3, state: 'dangerous' },  // B03
  { col: 2, row: 3, state: 'dangerous' },  // C03
  { col: 3, row: 3, state: 'dangerous' },  // D03
  { col: 4, row: 3, state: 'dangerous' },  // E03
  { col: 6, row: 3, state: 'dangerous' },  // G03
  { col: 8, row: 3, state: 'dangerous' },  // I03
  { col: 9, row: 3, state: 'dangerous' },  // J03
  { col: 10, row: 3, state: 'dangerous' }, // K03
  { col: 11, row: 3, state: 'dangerous' }, // L03
  { col: 13, row: 3, state: 'dangerous' }, // N03
  { col: 15, row: 3, state: 'dangerous' }, // P03
  { col: 17, row: 3, state: 'dangerous' }, // R03
  { col: 18, row: 3, state: 'dangerous' }, // S03
  { col: 19, row: 3, state: 'dangerous' }, // T03
  { col: 20, row: 3, state: 'dangerous' }, // U03
  { col: 21, row: 3, state: 'dangerous' }, // V03
  { col: 22, row: 3, state: 'dangerous' }, // W03

  // Row 4
  { col: 0, row: 4, state: 'dangerous' },  // A04
  { col: 1, row: 4, state: 'dangerous' },  // B04
  { col: 2, row: 4, state: 'dangerous' },  // C04
  { col: 3, row: 4, state: 'dangerous' },  // D04
  { col: 4, row: 4, state: 'dangerous' },  // E04
  { col: 5, row: 4, state: 'dangerous' },  // F04
  { col: 6, row: 4, state: 'dangerous' },  // G04
  { col: 8, row: 4, state: 'dangerous' },  // I04
  { col: 9, row: 4, state: 'dangerous' },  // J04
  { col: 10, row: 4, state: 'dangerous' }, // K04
  { col: 11, row: 4, state: 'dangerous' }, // L04
  { col: 12, row: 4, state: 'dangerous' }, // M04
  { col: 13, row: 4, state: 'dangerous' }, // N04
  { col: 14, row: 4, state: 'dangerous' }, // O04
  { col: 15, row: 4, state: 'dangerous' }, // P04
  { col: 16, row: 4, state: 'dangerous' }, // Q04
  { col: 17, row: 4, state: 'dangerous' }, // R04
  { col: 18, row: 4, state: 'dangerous' }, // S04
  { col: 20, row: 4, state: 'dangerous' }, // U04
  { col: 21, row: 4, state: 'dangerous' }, // V04
  { col: 22, row: 4, state: 'dangerous' }, // W04

  // Row 5
  { col: 0, row: 5, state: 'dangerous' },  // A05
  { col: 1, row: 5, state: 'dangerous' },  // B05
  { col: 2, row: 5, state: 'dangerous' },  // C05
  { col: 4, row: 5, state: 'dangerous' },  // E05
  { col: 5, row: 5, state: 'dangerous' },  // F05
  { col: 6, row: 5, state: 'dangerous' },  // G05
  { col: 8, row: 5, state: 'dangerous' },  // I05
  { col: 9, row: 5, state: 'dangerous' },  // J05
  { col: 10, row: 5, state: 'dangerous' }, // K05
  { col: 11, row: 5, state: 'dangerous' }, // L05
  { col: 12, row: 5, state: 'dangerous' }, // M05
  { col: 13, row: 5, state: 'dangerous' }, // N05
  { col: 14, row: 5, state: 'dangerous' }, // O05
  { col: 15, row: 5, state: 'dangerous' }, // P05
  { col: 17, row: 5, state: 'dangerous' }, // R05
  { col: 18, row: 5, state: 'dangerous' }, // S05
  { col: 19, row: 5, state: 'dangerous' }, // T05
  { col: 20, row: 5, state: 'dangerous' }, // U05
  { col: 21, row: 5, state: 'dangerous' }, // V05
  { col: 22, row: 5, state: 'dangerous' }, // W05

  // Row 6
  { col: 0, row: 6, state: 'dangerous' },  // A06
  { col: 1, row: 6, state: 'dangerous' },  // B06
  { col: 2, row: 6, state: 'dangerous' },  // C06
  { col: 4, row: 6, state: 'dangerous' },  // E06
  { col: 5, row: 6, state: 'dangerous' },  // F06
  { col: 6, row: 6, state: 'dangerous' },  // G06
  { col: 9, row: 6, state: 'dangerous' },  // J06
  { col: 10, row: 6, state: 'dangerous' }, // K06
  { col: 12, row: 6, state: 'alien-start' }, // M06 - Alien Spawn
  { col: 13, row: 6, state: 'dangerous' }, // N06
  { col: 14, row: 6, state: 'dangerous' }, // O06
  { col: 15, row: 6, state: 'dangerous' }, // P06
  { col: 17, row: 6, state: 'dangerous' }, // R06
  { col: 18, row: 6, state: 'dangerous' }, // S06
  { col: 19, row: 6, state: 'dangerous' }, // T06
  { col: 20, row: 6, state: 'dangerous' }, // U06
  { col: 21, row: 6, state: 'dangerous' }, // V06
  { col: 22, row: 6, state: 'dangerous' }, // W06

  // Row 7
  { col: 2, row: 7, state: 'dangerous' },  // C07
  { col: 4, row: 7, state: 'dangerous' },  // E07
  { col: 5, row: 7, state: 'dangerous' },  // F07
  { col: 6, row: 7, state: 'dangerous' },  // G07
  { col: 8, row: 7, state: 'dangerous' },  // I07
  { col: 9, row: 7, state: 'dangerous' },  // J07
  { col: 13, row: 7, state: 'dangerous' }, // N07
  { col: 14, row: 7, state: 'dangerous' }, // O07
  { col: 15, row: 7, state: 'dangerous' }, // P07
  { col: 16, row: 7, state: 'dangerous' }, // Q07
  { col: 17, row: 7, state: 'dangerous' }, // R07
  { col: 18, row: 7, state: 'dangerous' }, // S07
  { col: 19, row: 7, state: 'dangerous' }, // T07
  { col: 20, row: 7, state: 'dangerous' }, // U07

  // Row 8
  { col: 1, row: 8, state: 'dangerous' },  // B08
  { col: 2, row: 8, state: 'dangerous' },  // C08
  { col: 3, row: 8, state: 'dangerous' },  // D08
  { col: 4, row: 8, state: 'dangerous' },  // E08
  { col: 5, row: 8, state: 'dangerous' },  // F08
  { col: 6, row: 8, state: 'dangerous' },  // G08
  { col: 8, row: 8, state: 'dangerous' },  // I08
  { col: 9, row: 8, state: 'dangerous' },  // J08
  { col: 10, row: 8, state: 'dangerous' }, // K08
  { col: 12, row: 8, state: 'human-start' }, // M08 - Human Spawn
  { col: 13, row: 8, state: 'dangerous' }, // N08
  { col: 14, row: 8, state: 'dangerous' }, // O08
  { col: 15, row: 8, state: 'dangerous' }, // P08
  { col: 16, row: 8, state: 'dangerous' }, // Q08
  { col: 17, row: 8, state: 'dangerous' }, // R08
  { col: 18, row: 8, state: 'dangerous' }, // S08
  { col: 19, row: 8, state: 'dangerous' }, // T08
  { col: 20, row: 8, state: 'dangerous' }, // U08
  { col: 21, row: 8, state: 'dangerous' }, // V08

  // Row 9
  { col: 0, row: 9, state: 'dangerous' },  // A09
  { col: 1, row: 9, state: 'dangerous' },  // B09
  { col: 2, row: 9, state: 'dangerous' },  // C09
  { col: 3, row: 9, state: 'dangerous' },  // D09
  { col: 4, row: 9, state: 'dangerous' },  // E09
  { col: 5, row: 9, state: 'dangerous' },  // F09
  { col: 6, row: 9, state: 'dangerous' },  // G09
  { col: 8, row: 9, state: 'dangerous' },  // I09
  { col: 9, row: 9, state: 'dangerous' },  // J09
  { col: 11, row: 9, state: 'dangerous' }, // L09
  { col: 12, row: 9, state: 'dangerous' }, // M09
  { col: 13, row: 9, state: 'dangerous' }, // N09
  { col: 14, row: 9, state: 'dangerous' }, // O09
  { col: 15, row: 9, state: 'dangerous' }, // P09
  { col: 16, row: 9, state: 'dangerous' }, // Q09
  { col: 17, row: 9, state: 'dangerous' }, // R09
  { col: 18, row: 9, state: 'dangerous' }, // S09
  { col: 19, row: 9, state: 'dangerous' }, // T09
  { col: 20, row: 9, state: 'dangerous' }, // U09
  { col: 21, row: 9, state: 'dangerous' }, // V09
  { col: 22, row: 9, state: 'dangerous' }, // W09

  // Row 10
  { col: 0, row: 10, state: 'dangerous' }, // A10
  { col: 1, row: 10, state: 'dangerous' }, // B10
  { col: 2, row: 10, state: 'dangerous' }, // C10
  { col: 3, row: 10, state: 'dangerous' }, // D10
  { col: 4, row: 10, state: 'dangerous' }, // E10
  { col: 5, row: 10, state: 'dangerous' }, // F10
  { col: 6, row: 10, state: 'dangerous' }, // G10
  { col: 8, row: 10, state: 'dangerous' }, // I10
  { col: 9, row: 10, state: 'dangerous' }, // J10
  { col: 10, row: 10, state: 'dangerous' }, // K10
  { col: 11, row: 10, state: 'dangerous' }, // L10
  { col: 12, row: 10, state: 'dangerous' }, // M10
  { col: 13, row: 10, state: 'dangerous' }, // N10
  { col: 14, row: 10, state: 'dangerous' }, // O10
  { col: 15, row: 10, state: 'dangerous' }, // P10
  { col: 16, row: 10, state: 'dangerous' }, // Q10
  { col: 18, row: 10, state: 'dangerous' }, // S10
  { col: 19, row: 10, state: 'dangerous' }, // T10
  { col: 20, row: 10, state: 'dangerous' }, // U10
  { col: 21, row: 10, state: 'dangerous' }, // V10
  { col: 22, row: 10, state: 'dangerous' }, // W10

  // Row 11
  { col: 0, row: 11, state: 'dangerous' }, // A11
  { col: 1, row: 11, state: 'dangerous' }, // B11
  { col: 2, row: 11, state: 'dangerous' }, // C11
  { col: 3, row: 11, state: 'dangerous' }, // D11
  { col: 4, row: 11, state: 'dangerous' }, // E11
  { col: 5, row: 11, state: 'dangerous' }, // F11
  { col: 6, row: 11, state: 'dangerous' }, // G11
  { col: 8, row: 11, state: 'dangerous' }, // I11
  { col: 9, row: 11, state: 'dangerous' }, // J11
  { col: 10, row: 11, state: 'dangerous' }, // K11
  { col: 11, row: 11, state: 'dangerous' }, // L11
  { col: 12, row: 11, state: 'dangerous' }, // M11
  { col: 13, row: 11, state: 'dangerous' }, // N11
  { col: 14, row: 11, state: 'dangerous' }, // O11
  { col: 15, row: 11, state: 'dangerous' }, // P11
  { col: 16, row: 11, state: 'dangerous' }, // Q11
  { col: 19, row: 11, state: 'dangerous' }, // T11
  { col: 20, row: 11, state: 'dangerous' }, // U11
  { col: 21, row: 11, state: 'dangerous' }, // V11
  { col: 22, row: 11, state: 'dangerous' }, // W11

  // Row 12
  { col: 0, row: 12, state: 'dangerous' }, // A12
  { col: 1, row: 12, state: 'dangerous' }, // B12
  { col: 2, row: 12, state: 'dangerous' }, // C12
  { col: 3, row: 12, state: 'dangerous' }, // D12
  { col: 4, row: 12, state: 'dangerous' }, // E12
  { col: 5, row: 12, state: 'dangerous' }, // F12
  { col: 6, row: 12, state: 'dangerous' }, // G12
  { col: 8, row: 12, state: 'dangerous' }, // I12
  { col: 10, row: 12, state: 'dangerous' }, // K12
  { col: 11, row: 12, state: 'dangerous' }, // L12
  { col: 12, row: 12, state: 'dangerous' }, // M12
  { col: 13, row: 12, state: 'dangerous' }, // N12
  { col: 14, row: 12, state: 'dangerous' }, // O12
  { col: 15, row: 12, state: 'dangerous' }, // P12
  { col: 16, row: 12, state: 'dangerous' }, // Q12
  { col: 17, row: 12, state: 'dangerous' }, // R12
  { col: 18, row: 12, state: 'dangerous' }, // S12
  { col: 19, row: 12, state: 'dangerous' }, // T12
  { col: 20, row: 12, state: 'dangerous' }, // U12
  { col: 21, row: 12, state: 'dangerous' }, // V12
  { col: 22, row: 12, state: 'dangerous' }, // W12

  // Row 13
  { col: 0, row: 13, state: 'dangerous' }, // A13
  { col: 1, row: 13, state: 'dangerous' }, // B13
  { col: 2, row: 13, state: 'dangerous' }, // C13
  { col: 3, row: 13, state: 'airlock' },   // D13 - Escape Pod 3
  { col: 4, row: 13, state: 'dangerous' }, // E13
  { col: 5, row: 13, state: 'dangerous' }, // F13
  { col: 6, row: 13, state: 'dangerous' }, // G13
  { col: 7, row: 13, state: 'dangerous' }, // H13
  { col: 8, row: 13, state: 'dangerous' }, // I13
  { col: 9, row: 13, state: 'dangerous' }, // J13
  { col: 10, row: 13, state: 'dangerous' }, // K13
  { col: 11, row: 13, state: 'dangerous' }, // L13
  { col: 12, row: 13, state: 'dangerous' }, // M13
  { col: 13, row: 13, state: 'dangerous' }, // N13
  { col: 14, row: 13, state: 'dangerous' }, // O13
  { col: 15, row: 13, state: 'dangerous' }, // P13
  { col: 16, row: 13, state: 'dangerous' }, // Q13
  { col: 17, row: 13, state: 'dangerous' }, // R13
  { col: 18, row: 13, state: 'airlock' },  // S13 - Escape Pod 4
  { col: 19, row: 13, state: 'dangerous' }, // T13
  { col: 20, row: 13, state: 'dangerous' }, // U13
  { col: 21, row: 13, state: 'dangerous' }, // V13
  { col: 22, row: 13, state: 'dangerous' }, // W13

  // Row 14
  { col: 0, row: 14, state: 'dangerous' }, // A14
  { col: 1, row: 14, state: 'dangerous' }, // B14
  { col: 2, row: 14, state: 'dangerous' }, // C14
  { col: 3, row: 14, state: 'dangerous' }, // D14
  { col: 6, row: 14, state: 'dangerous' }, // G14
  { col: 8, row: 14, state: 'dangerous' }, // I14
  { col: 9, row: 14, state: 'dangerous' }, // J14
  { col: 10, row: 14, state: 'dangerous' }, // K14
  { col: 11, row: 14, state: 'dangerous' }, // L14
  { col: 12, row: 14, state: 'dangerous' }, // M14
  { col: 13, row: 14, state: 'dangerous' }, // N14
  { col: 14, row: 14, state: 'dangerous' }, // O14
  { col: 15, row: 14, state: 'dangerous' }, // P14
  { col: 19, row: 14, state: 'dangerous' }, // T14
  { col: 20, row: 14, state: 'dangerous' }, // U14
  { col: 21, row: 14, state: 'dangerous' }, // V14
  { col: 22, row: 14, state: 'dangerous' }, // W14
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
  // Row 1 - Escape Pods 3 & 4
  { col: 9, row: 1, state: 'airlock' },    // J01 - Escape 3
  { col: 13, row: 1, state: 'airlock' },   // N01 - Escape 4

  // Row 2
  { col: 10, row: 2, state: 'secure' },    // K02
  { col: 12, row: 2, state: 'dangerous' }, // M02

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
  { col: 9, row: 5, state: 'airlock' },    // J05 - Escape 1
  { col: 11, row: 5, state: 'secure' },    // L05
  { col: 13, row: 5, state: 'airlock' },   // N05 - Escape 2

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
  { col: 11, row: 9, state: 'alien-start' }, // L09 - Alien Start
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
  { col: 11, row: 11, state: 'secure' },   // L11 - Was Alien Start
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


// Morgenland Map Layout
// Morgenland Map Layout
const morgenlandLayout = [
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
  { col: 15, row: 8, state: 'dangerous' }, // P08 - Was Escape 2, now Dangerous
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

export const MORGENLAND_MAP = {
  type: 'map',
  title: 'MORGENLAND',
  description: 'A winding, snake-like zone with separated clusters.',
  recommendedPlayers: '4-8',
  grid: morgenlandLayout.map(({ col, row, state }) => hex(col, row, state))
};

// Export all maps
export default { GALILEI_MAP, GALATEA_MAP, FERMI_MAP, MORGENLAND_MAP };
