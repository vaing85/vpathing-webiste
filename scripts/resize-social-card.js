/**
 * Resizes assets/social-card.png to 1200×630 for OG/Twitter.
 * Keeps aspect ratio; letterboxes (adds padding) if the image isn't 1200×630.
 * Run after dropping a new image: npm run resize-social-card
 */
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const file = path.join(root, 'assets', 'social-card.png');
const targetWidth = 1200;
const targetHeight = 630;
const letterboxColor = { r: 250, g: 251, b: 252 }; // #fafbfc

const fs = require('fs');

const inputBuffer = fs.readFileSync(file);

sharp(inputBuffer)
  .metadata()
  .then((meta) => {
    const w = meta.width;
    const h = meta.height;
    if (w === targetWidth && h === targetHeight) {
      console.log('Image is already 1200×630. No change.');
      return;
    }
    return sharp(inputBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'contain',
        position: 'center',
        background: letterboxColor,
      })
      .png()
      .toFile(file)
      .then(() => {
        console.log('Resized social-card.png to 1200×630 (letterboxed if needed).');
      });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
