import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data', 'channels.json');

const problems = [];
const fail = (message) => problems.push(message);

function readCatalog() {
  let raw;
  try {
    raw = fs.readFileSync(DATA_FILE, 'utf8');
  } catch (error) {
    throw new Error(`No se pudo leer ${path.relative(ROOT, DATA_FILE)}: ${error.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${path.relative(ROOT, DATA_FILE)} no es JSON válido: ${error.message}`);
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const catalog = readCatalog();

if (!Array.isArray(catalog.channels) || !catalog.channels.length) {
  fail('El catálogo no tiene canales');
}
if (!Array.isArray(catalog.groups) || !catalog.groups.length) {
  fail('El catálogo no tiene grupos');
}
if (!Array.isArray(catalog.defaults)) {
  fail('El catálogo no tiene la lista de canales por defecto');
}

const ids = new Set();
const names = new Map();
const groups = new Set(Array.isArray(catalog.groups) ? catalog.groups : []);

for (const channel of Array.isArray(catalog.channels) ? catalog.channels : []) {
  const label = channel?.id || '(sin id)';
  if (typeof channel?.id !== 'string' || !channel.id) fail(`${label}: id no válido`);
  else if (ids.has(channel.id)) fail(`${label}: id duplicado`);
  else ids.add(channel.id);

  if (typeof channel?.name !== 'string' || !channel.name.trim()) fail(`${label}: nombre vacío`);

  const key = String(channel?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (key) {
    if (names.has(key)) fail(`${label}: nombre duplicado con ${names.get(key)}`);
    else names.set(key, label);
  }

  if (typeof channel?.group !== 'string' || !channel.group) {
    fail(`${label}: grupo vacío`);
  } else if (!groups.has(channel.group)) {
    fail(`${label}: el grupo "${channel.group}" no está en groups`);
  }

  if (typeof channel?.logo !== 'string' || !channel.logo.startsWith('/logos/')) {
    fail(`${label}: logo no válido`);
  } else if (!fs.existsSync(path.join(PUBLIC_DIR, channel.logo.replace(/^\//, '')))) {
    fail(`${label}: falta el archivo ${channel.logo}`);
  }

  const urls = Array.isArray(channel?.urls) ? channel.urls : [];
  const badUrls = urls.filter((url) => !isHttpUrl(url));
  if (badUrls.length) fail(`${label}: URL no válida (${badUrls[0]})`);

  if (!urls.length && !channel?.resolver && !channel?.externalUrl) {
    fail(`${label}: no tiene ni señales ni resolución dinámica ni acceso externo`);
  }
  if (channel?.externalUrl && !isHttpUrl(channel.externalUrl)) {
    fail(`${label}: externalUrl no válida`);
  }
  if (channel?.resolver) {
    const type = channel.resolver.type;
    if (type !== 'atresplayer' && type !== 'brightcove') fail(`${label}: resolver desconocido "${type}"`);
    if (type === 'atresplayer' && !/^[a-f0-9]{24}$/i.test(String(channel.resolver.liveId || ''))) {
      fail(`${label}: liveId de Atresplayer no válido`);
    }
    if (type === 'brightcove' && !String(channel.resolver.policyKey || '')) {
      fail(`${label}: falta policyKey de Brightcove`);
    }
  }
}

const channelIds = new Set((catalog.channels || []).map((channel) => channel?.id));
for (const id of Array.isArray(catalog.defaults) ? catalog.defaults : []) {
  if (!channelIds.has(id)) fail(`defaults: ${id} no existe en el catálogo`);
}

const external = (catalog.channels || []).filter((channel) => channel?.externalUrl).length;
const dynamic = (catalog.channels || []).filter((channel) => channel?.resolver).length;

if (problems.length) {
  console.error(`Catálogo no válido (${problems.length} ${problems.length === 1 ? 'problema' : 'problemas'}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `Catálogo válido: ${catalog.channels.length} entradas (${catalog.channels.length - external} en directo, ` +
  `${dynamic} con resolución dinámica, ${external} accesos oficiales), ${catalog.groups.length} grupos.`
);
