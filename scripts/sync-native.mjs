import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NATIVE = path.join(ROOT, 'native');
const ASSETS = path.join(NATIVE, 'assets');
const LOGOS = path.join(ASSETS, 'logos');
const SRC = path.join(NATIVE, 'src');

function safeName(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-');
}

async function main() {
  const data = JSON.parse(await fsp.readFile(path.join(ROOT, 'data', 'channels.json'), 'utf8'));

  await fsp.rm(LOGOS, { recursive: true, force: true });
  await fsp.mkdir(LOGOS, { recursive: true });
  await fsp.mkdir(SRC, { recursive: true });

  const entries = [];
  for (const channel of data.channels) {
    const source = path.join(ROOT, 'public', channel.logo.replace(/^\//, ''));
    const fileName = `${safeName(channel.id)}.png`;
    const target = path.join(LOGOS, fileName);
    try {
      await sharp(source)
        .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toFile(target);
      entries.push([channel.id, fileName]);
    } catch (error) {
      console.warn(`  aviso: logo omitido para ${channel.id} (${error.message})`);
    }
  }

  await fsp.writeFile(path.join(ASSETS, 'channels.json'), JSON.stringify(data, null, 2), 'utf8');

  const lines = [
    '/* Generado por scripts/sync-native.mjs. No editar a mano. */',
    'declare const require: (path: string) => number;',
    '',
    'export const logoMap: Record<string, number> = {',
    ...entries.map(([id, fileName]) => `  ${JSON.stringify(id)}: require('../assets/logos/${fileName}'),`),
    '};',
    ''
  ];
  await fsp.writeFile(path.join(SRC, 'logoMap.ts'), lines.join('\n'), 'utf8');

  console.log(`native sincronizado: ${data.channels.length} canales, ${entries.length} logos.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
