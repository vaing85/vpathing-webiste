/**
 * Overlays VP logo (as the "V") + "Pathing Enterprise LLC" + tagline
 * on assets/social-card.png and saves as assets/social-card-1.1.png.
 * Run: npm run social-card-1.1
 */
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const assets = path.join(root, 'assets');
const inputFile = path.join(assets, 'social-card.png');
const outputFile = path.join(assets, 'social-card-1.1.png');

const width = 1200;
const height = 630;

// VP monogram from logo is ~36×24 in logo coords. Scale to ~96px tall (4x).
const vpScale = 4;
const vpWidth = 36 * vpScale;   // ~144
const vpHeight = 24 * vpScale;  // 96
const titleY = 520;             // baseline of title
const vpTop = titleY - 72;      // VP sits above baseline (optical align)
const blockStartX = (width - (vpWidth + 24 + 420)) / 2;  // ~256, center title block
const textX = blockStartX + vpWidth + 24;

// SVG overlay: gradient bar + VP monogram (as "V") + "Pathing Enterprise LLC" + tagline
const overlaySvg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bar11" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="35%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.78)"/>
    </linearGradient>
    <linearGradient id="vp11" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff"/>
      <stop offset="100%" style="stop-color:#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bar11)"/>
  <g transform="translate(${blockStartX}, ${vpTop}) scale(${vpScale})">
    <g fill="url(#vp11)">
      <path d="M8 8h10v6H14v18h-4V14H8V8z"/>
      <path d="M20 8h4l8 12 8-12h4v24h-4V18l-6 9-6-9v14h-4V8z"/>
    </g>
  </g>
  <text x="${textX}" y="${titleY}" font-family="Segoe UI, system-ui, sans-serif" font-size="42" font-weight="700" fill="#ffffff">Pathing Enterprise LLC</text>
  <text x="${width / 2}" y="565" font-family="Segoe UI, system-ui, sans-serif" font-size="22" fill="#e2e8f0" text-anchor="middle">Building practical apps for real-world operations.</text>
</svg>
`;

async function run() {
  const baseImage = sharp(inputFile);
  const overlayBuffer = await sharp(Buffer.from(overlaySvg))
    .resize(width, height)
    .png()
    .toBuffer();

  await baseImage
    .resize(width, height, { fit: 'cover' })
    .composite([{ input: overlayBuffer, top: 0, left: 0 }])
    .png()
    .toFile(outputFile);

  console.log('Saved assets/social-card-1.1.png (VP icon + Pathing Enterprise LLC overlay)');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
