/**
 * Generates social card PNGs (1200×630) from SVG sources.
 * - assets/social-card.png from assets/social-card.svg (default)
 * - assets/social-card-v1.png … social-card-v5.png from assets/social-card-v1.svg … v5.svg
 * Run: npm run generate-social-card
 */
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const assets = path.join(root, 'assets');

const tasks = [
  { in: 'social-card.svg', out: 'social-card.png' },
  { in: 'social-card-v1.svg', out: 'social-card-v1.png' },
  { in: 'social-card-v2.svg', out: 'social-card-v2.png' },
  { in: 'social-card-v3.svg', out: 'social-card-v3.png' },
  { in: 'social-card-v4.svg', out: 'social-card-v4.png' },
  { in: 'social-card-v5.svg', out: 'social-card-v5.png' },
];

function generate(inputFile, outputFile) {
  const input = path.join(assets, inputFile);
  const output = path.join(assets, outputFile);
  return sharp(input)
    .resize(1200, 630)
    .png()
    .toFile(output)
    .then(() => {
      console.log('Created assets/' + outputFile + ' (1200×630)');
    });
}

Promise.all(
  tasks.map(({ in: i, out: o }) => generate(i, o))
).then(() => {
  console.log('Done. ' + tasks.length + ' social card PNGs generated.');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
