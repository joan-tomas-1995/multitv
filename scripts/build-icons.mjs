import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'icons');
const NATIVE_OUT = path.join(ROOT, 'native', 'assets');

function iconSvg(scale = 1) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff3b5c"/>
      <stop offset="1" stop-color="#a90f2c"/>
    </linearGradient>
    <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#202b3d"/>
      <stop offset="1" stop-color="#070a10"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="78" y="116" width="224" height="158" rx="26" fill="url(#screen)" stroke="#ffffff" stroke-width="18"/>
    <rect x="210" y="214" width="224" height="158" rx="26" fill="url(#screen)" stroke="#ffffff" stroke-width="18"/>
    <line x1="148" y1="314" x2="180" y2="360" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/>
    <line x1="338" y1="412" x2="370" y2="458" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/>
    <circle cx="156" cy="190" r="9" fill="#ff3355"/>
  </g>
</svg>`;
}

async function main() {
  await fsp.mkdir(OUT, { recursive: true });
  await fsp.mkdir(NATIVE_OUT, { recursive: true });
  const regular = Buffer.from(iconSvg(1));
  const maskable = Buffer.from(iconSvg(0.8));

  const targets = [
    [path.join(OUT, 'icon-192.png'), regular, 192, false],
    [path.join(OUT, 'icon-512.png'), regular, 512, false],
    [path.join(OUT, 'icon-maskable-512.png'), maskable, 512, false],
    [path.join(OUT, 'apple-touch-icon.png'), regular, 180, true],
    [path.join(NATIVE_OUT, 'icon.png'), regular, 1024, true],
    [path.join(NATIVE_OUT, 'adaptive-icon.png'), maskable, 1024, false],
    [path.join(NATIVE_OUT, 'splash-icon.png'), regular, 512, false]
  ];

  for (const [target, source, size, flatten] of targets) {
    const image = sharp(source).resize(size, size);
    if (flatten) image.flatten({ background: '#e02344' });
    await image.png({ compressionLevel: 9 }).toFile(target);
    console.log(`icono: ${path.relative(ROOT, target)} (${size}×${size})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
