/**
 * EFTAIOS Card Image Extraction Script
 *
 * Extracts card images from the Print and Play PDF files using pdf-poppler.
 * Uses prebuilt poppler binaries for reliable PDF rendering.
 *
 * Usage: node scripts/extract-card-images.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pdfPoppler = require('pdf-poppler');

const BASE_DIR = path.join(__dirname, '..');
const PDF_PATH = path.join(BASE_DIR, '.claude', 'EFTAIOS_GraphicsArt_Cards_PrintAndPlay.pdf');
const BACKS_PDF_PATH = path.join(BASE_DIR, '.claude', '2_Cards_Backs_EFTAIOS.pdf');
const OUTPUT_DIR = path.join(BASE_DIR, 'client', 'public', 'assets', 'cards');
const TEMP_DIR = path.join(__dirname, 'temp-pages');

// Output card dimensions
const OUTPUT_WIDTH = 300;
const OUTPUT_HEIGHT = 420;

// Grid layout for cards per page
const CARDS_PER_ROW = 3;
const CARDS_PER_COL = 4;

/**
 * Card extraction configurations
 */
const EXTRACTIONS = [
  // Character cards from page 10
  {
    pdfPath: PDF_PATH,
    pageNum: 10,
    output: [
      { row: 0, col: 0, filename: 'characters/captain.png' },
      { row: 0, col: 1, filename: 'characters/pilot.png' },
      { row: 0, col: 2, filename: 'characters/engineer.png' },
      { row: 1, col: 0, filename: 'characters/soldier.png' },
      { row: 1, col: 1, filename: 'characters/psychologist.png' },
      { row: 1, col: 2, filename: 'characters/medic.png' },
      { row: 2, col: 0, filename: 'characters/first_alien.png' },
      { row: 2, col: 1, filename: 'characters/second_alien.png' },
      { row: 2, col: 2, filename: 'characters/third_alien.png' },
      { row: 3, col: 0, filename: 'characters/fourth_alien.png' },
      { row: 3, col: 1, filename: 'characters/fifth_alien.png' },
    ]
  },
  // Item cards from page 11
  {
    pdfPath: PDF_PATH,
    pageNum: 11,
    output: [
      { row: 0, col: 0, filename: 'items/adrenaline.png' },
      { row: 0, col: 2, filename: 'items/defense.png' },
      { row: 1, col: 0, filename: 'items/sedatives.png' },
    ]
  },
  // More items from page 12
  {
    pdfPath: PDF_PATH,
    pageNum: 12,
    output: [
      { row: 0, col: 1, filename: 'items/spotlight.png' },
    ]
  },
  // Dangerous sector cards - Noise Your Sector from page 13
  {
    pdfPath: PDF_PATH,
    pageNum: 13,
    output: [
      { row: 2, col: 0, filename: 'dangerous-sector/noise-your-sector.png' },
    ]
  },
  // Dangerous sector cards - Noise Any Sector from page 14
  {
    pdfPath: PDF_PATH,
    pageNum: 14,
    output: [
      { row: 0, col: 0, filename: 'dangerous-sector/noise-any-sector.png' },
    ]
  },
  // Dangerous sector cards - Silence from page 15
  {
    pdfPath: PDF_PATH,
    pageNum: 15,
    output: [
      { row: 0, col: 0, filename: 'dangerous-sector/silence.png' },
    ]
  },
  // Escape hatch cards from page 16
  {
    pdfPath: PDF_PATH,
    pageNum: 16,
    output: [
      { row: 0, col: 0, filename: 'escape-hatch/damaged.png' },
      { row: 1, col: 0, filename: 'escape-hatch/working.png' },
    ]
  },
  // Card backs from backs PDF
  {
    pdfPath: BACKS_PDF_PATH,
    pageNum: 1,
    fullPage: true,
    output: [{ filename: 'characters/back.png' }]
  },
  {
    pdfPath: BACKS_PDF_PATH,
    pageNum: 2,
    fullPage: true,
    output: [{ filename: 'items/back.png' }]
  },
  {
    pdfPath: BACKS_PDF_PATH,
    pageNum: 4,
    fullPage: true,
    output: [{ filename: 'dangerous-sector/back.png' }]
  },
  {
    pdfPath: BACKS_PDF_PATH,
    pageNum: 7,
    fullPage: true,
    output: [{ filename: 'escape-hatch/back.png' }]
  },
];

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function convertPdfPageToImage(pdfPath, pageNum) {
  const outputPrefix = path.join(TEMP_DIR, `page-${pageNum}`);

  const opts = {
    format: 'png',
    out_dir: TEMP_DIR,
    out_prefix: `page-${pageNum}`,
    page: pageNum,
    scale: 2048,  // Width in pixels
  };

  try {
    await pdfPoppler.convert(pdfPath, opts);
    // pdf-poppler adds page number suffix
    const outputFile = `${outputPrefix}-${pageNum}.png`;
    if (fs.existsSync(outputFile)) {
      return outputFile;
    }
    // Try without page suffix
    const altOutputFile = `${outputPrefix}.png`;
    if (fs.existsSync(altOutputFile)) {
      return altOutputFile;
    }
    throw new Error(`Output file not found: ${outputFile}`);
  } catch (error) {
    throw new Error(`Failed to convert page ${pageNum}: ${error.message}`);
  }
}

async function cropCard(imagePath, row, col, outputPath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  const cardWidth = Math.floor(metadata.width / CARDS_PER_ROW);
  const cardHeight = Math.floor(metadata.height / CARDS_PER_COL);

  const left = col * cardWidth;
  const top = row * cardHeight;

  await sharp(imagePath)
    .extract({
      left: left,
      top: top,
      width: cardWidth,
      height: cardHeight
    })
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT)
    .png({ quality: 90 })
    .toFile(outputPath);

  console.log(`  Created: ${path.basename(outputPath)}`);
}

async function cropCenterCard(imagePath, outputPath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  const cardWidth = Math.floor(metadata.width / CARDS_PER_ROW);
  const cardHeight = Math.floor(metadata.height / CARDS_PER_COL);

  const left = Math.floor((metadata.width - cardWidth) / 2);
  const top = Math.floor((metadata.height - cardHeight) / 2);

  await sharp(imagePath)
    .extract({
      left: left,
      top: top,
      width: cardWidth,
      height: cardHeight
    })
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT)
    .png({ quality: 90 })
    .toFile(outputPath);

  console.log(`  Created: ${path.basename(outputPath)}`);
}

async function processExtraction(extraction) {
  console.log(`\nProcessing page ${extraction.pageNum} from ${path.basename(extraction.pdfPath)}...`);

  const tempImage = await convertPdfPageToImage(extraction.pdfPath, extraction.pageNum);

  for (const card of extraction.output) {
    const outputPath = path.join(OUTPUT_DIR, card.filename);
    await ensureDir(path.dirname(outputPath));

    if (extraction.fullPage) {
      await cropCenterCard(tempImage, outputPath);
    } else {
      await cropCard(tempImage, card.row, card.col, outputPath);
    }
  }

  // Clean up temp file
  if (fs.existsSync(tempImage)) {
    fs.unlinkSync(tempImage);
  }
}

async function cleanup() {
  if (fs.existsSync(TEMP_DIR)) {
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(TEMP_DIR, file));
    }
    fs.rmdirSync(TEMP_DIR);
    console.log('\nCleaned up temporary files.');
  }
}

async function main() {
  console.log('EFTAIOS Card Image Extraction');
  console.log('==============================');
  console.log(`Main PDF: ${PDF_PATH}`);
  console.log(`Backs PDF: ${BACKS_PDF_PATH}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  // Check if PDFs exist
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`\nError: Main PDF not found at ${PDF_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(BACKS_PDF_PATH)) {
    console.error(`\nError: Card backs PDF not found at ${BACKS_PDF_PATH}`);
    process.exit(1);
  }

  // Ensure directories exist
  await ensureDir(TEMP_DIR);
  await ensureDir(path.join(OUTPUT_DIR, 'characters'));
  await ensureDir(path.join(OUTPUT_DIR, 'dangerous-sector'));
  await ensureDir(path.join(OUTPUT_DIR, 'items'));
  await ensureDir(path.join(OUTPUT_DIR, 'escape-hatch'));

  // Process each extraction
  for (const extraction of EXTRACTIONS) {
    try {
      await processExtraction(extraction);
    } catch (error) {
      console.error(`Error processing page ${extraction.pageNum}:`, error.message);
    }
  }

  await cleanup();

  console.log('\n==============================');
  console.log('Extraction complete!');
  console.log(`Card images saved to: ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  cleanup();
  process.exit(1);
});
