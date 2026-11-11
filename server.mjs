import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data', 'channels.json');
const HLS_FILE = path.join(ROOT, 'node_modules', 'hls.js', 'dist', 'hls.min.js');
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || '127.0.0.1';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

const catalogState = { mtime: 0, data: { channels: [] }, hosts: new Set() };
const discoveredHosts = new Set();

async function getCatalog() {
  const stat = await fsp.stat(DATA_FILE);
  if (stat.mtimeMs !== catalogState.mtime) {
    const data = JSON.parse(await fsp.readFile(DATA_FILE, 'utf8'));
    const hosts = new Set();
    for (const channel of data.channels) {
      for (const url of channel.urls) {
        try { hosts.add(new URL(url).host); } catch { /* ignore malformed */ }
      }
    }
    catalogState.mtime = stat.mtimeMs;
    catalogState.data = data;
    catalogState.hosts = hosts;
  }
  return catalogState;
}

function send(res, status, body, headers = {}) {
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), { 'content-type': 'application/json; charset=utf-8' });
}

async function serveStatic(res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const full = path.resolve(PUBLIC_DIR, '.' + rel);
  if (!full.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Prohibido');

  try {
    const stat = await fsp.stat(full);
    if (!stat.isFile()) return send(res, 404, 'No encontrado');
    const ext = path.extname(full).toLowerCase();
    const noCache = ext === '.html' || ext === '.js' || ext === '.css' || ext === '.webmanifest' || full.endsWith('sw.js');
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': noCache ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(full).pipe(res);
  } catch {
    if (!res.headersSent) send(res, 404, 'No encontrado');
    else res.destroy();
  }
}

function isPrivateHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.includes(':')) {
    return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80');
  }
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127);
  }
  return false;
}

function sameOriginRequest(req) {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.origin;
  if (origin) {
    try { return new URL(origin).host === req.headers.host; } catch { return false; }
  }
  return true;
}

function proxyUrl(rawUrl, channelId) {
  try {
    const url = new URL(rawUrl);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && discoveredHosts.size < 1000) {
      discoveredHosts.add(url.host);
    }
  } catch { /* ignore */ }
  const encoded = Buffer.from(rawUrl, 'utf8').toString('base64url');
  const suffix = channelId ? `&ch=${encodeURIComponent(channelId)}` : '';
  return `/stream?u=${encoded}${suffix}`;
}

const resolveCache = new Map();
const RESOLVE_TTL = 60 * 60 * 1000;

async function resolveChannel(channel, { refresh = false } = {}) {
  if (!channel?.resolver) throw new Error('El canal no tiene resolución dinámica');

  const cached = resolveCache.get(channel.id);
  if (!refresh && cached && cached.expiresAt > Date.now()) return cached;

  const resolver = channel.resolver;
  let url;
  let title = channel.name;

  if (resolver.type === 'atresplayer') {
    const liveId = String(resolver.liveId || '');
    if (!/^[a-f0-9]{24}$/i.test(liveId)) throw new Error('Identificador de Atresplayer no válido');
    const response = await fetch(`https://api.atresplayer.com/player/v1/live/${liveId}`, {
      headers: {
        'user-agent': UA,
        accept: 'application/json',
        referer: 'https://www.atresplayer.com/',
        origin: 'https://www.atresplayer.com'
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Atresplayer respondió ${response.status}`);
    const data = await response.json();
    const source = (data.sourcesLive || []).find((item) => /mpegurl/i.test(item.type));
    if (!source?.src) throw new Error('Atresplayer no devolvió una señal HLS');
    url = source.src;
    title = data.titulo || title;
  } else if (resolver.type === 'brightcove') {
    const account = String(resolver.account || '');
    const video = String(resolver.video || '');
    const policyKey = String(resolver.policyKey || '');
    const referer = String(resolver.referer || '');
    if (!/^\d{6,}$/.test(account) || !/^\d{6,}$/.test(video) || !policyKey) {
      throw new Error('Configuración de Brightcove no válida');
    }
    let origin;
    try { origin = new URL(referer).origin; } catch { throw new Error('Referer de Brightcove no válido'); }
    const response = await fetch(`https://edge.api.brightcove.com/playback/v1/accounts/${account}/videos/${video}`, {
      headers: {
        'user-agent': UA,
        accept: `application/json;pk=${policyKey}`,
        referer,
        origin
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Brightcove respondió ${response.status}`);
    const data = await response.json();
    const source = (data.sources || []).find((item) => /mpegurl/i.test(item.type));
    if (!source?.src) throw new Error('Brightcove no devolvió una señal HLS');
    url = source.src;
  } else {
    throw new Error('Tipo de resolución no soportado');
  }

  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('La señal resuelta no es válida'); }
  if (!/^https?:$/.test(parsed.protocol) || isPrivateHost(parsed.hostname)) {
    throw new Error('La señal resuelta apunta a un destino no permitido');
  }
  if (discoveredHosts.size < 1000) discoveredHosts.add(parsed.host);

  const result = { url, title, expiresAt: Date.now() + RESOLVE_TTL };
  resolveCache.set(channel.id, result);
  return result;
}

function rewritePlaylist(text, baseUrl, channelId) {  const base = new URL(baseUrl);
  const lines = text.split(/\r?\n/);
  const out = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      out.push(raw);
      continue;
    }
    if (line.startsWith('#')) {
      out.push(line.replace(/URI="([^"]+)"/g, (_match, uri) => {
        try { return `URI="${proxyUrl(new URL(uri, base).href, channelId)}"`; } catch { return `URI="${uri}"`; }
      }));
    } else {
      try { out.push(proxyUrl(new URL(line, base).href, channelId)); } catch { out.push(line); }
    }
  }
  return out.join('\n');
}

async function handleStream(req, res, url) {
  if (!sameOriginRequest(req)) return send(res, 403, 'Origen no permitido');

  const raw = url.searchParams.get('u');
  if (!raw) return send(res, 400, 'Falta el parámetro u');
  let target;
  try { target = new URL(Buffer.from(raw, 'base64url').toString('utf8')); } catch { return send(res, 400, 'URL no válida'); }
  if (!/^https?:$/.test(target.protocol)) return send(res, 400, 'Protocolo no soportado');
  if (isPrivateHost(target.hostname)) return send(res, 403, 'Destino no permitido');

  const channelId = url.searchParams.get('ch') || '';
  const catalog = await getCatalog();
  const isCustom = channelId.startsWith('custom:');
  if (!isCustom && !catalog.hosts.has(target.host) && !discoveredHosts.has(target.host)) {
    return send(res, 403, 'Host no autorizado');
  }

  const headers = {
    'user-agent': UA,
    accept: '*/*',
    'accept-language': 'es-ES,es;q=0.9'
  };
  if (req.headers.range) headers.range = req.headers.range;
  const channel = catalog.data.channels.find((c) => c.id === channelId);
  if (channel?.headers) Object.assign(headers, channel.headers);

  if (isCustom) {
    const extra = url.searchParams.get('h');
    if (extra) {
      try {
        const parsed = JSON.parse(Buffer.from(extra, 'base64url').toString('utf8'));
        for (const key of ['referer', 'origin', 'user-agent']) {
          const value = parsed?.[key];
          if (typeof value === 'string' && value.length < 2048 && !/[\r\n]/.test(value)) headers[key] = value;
        }
      } catch { /* ignore malformed headers */ }
    }
  }

  let upstream;
  try {
    upstream = await fetch(target, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(45000)
    });
  } catch (error) {
    return send(res, 502, `No se pudo conectar con el canal: ${error.message}`);
  }

  if (upstream.status >= 400) {
    try { upstream.body?.cancel().catch(() => { /* ignore */ }); } catch { /* ignore */ }
    return send(res, upstream.status, `El canal respondió ${upstream.status}`);
  }

  const contentType = upstream.headers.get('content-type') || '';
  const looksLikePlaylist = /mpegurl|m3u8/i.test(contentType) || /\.m3u8(\?|$)/i.test(upstream.url) || /\.m3u8(\?|$)/i.test(target.href);

  if (looksLikePlaylist) {
    let text;
    try { text = await upstream.text(); } catch { return send(res, 502, 'No se pudo leer la lista de reproducción'); }
    if (!text.trimStart().startsWith('#EXTM3U')) {
      return send(res, 502, 'El canal no devolvió una lista HLS válida');
    }
    send(res, 200, rewritePlaylist(text, upstream.url, channelId), {
      'content-type': 'application/vnd.apple.mpegurl; charset=utf-8',
      'cache-control': 'no-cache',
      'access-control-allow-origin': '*'
    });
    return;
  }

  res.writeHead(upstream.status, {
    'content-type': contentType || 'application/octet-stream',
    'access-control-allow-origin': '*',
    'cache-control': 'no-cache',
    ...(upstream.headers.get('content-range') ? { 'content-range': upstream.headers.get('content-range') } : {}),
    ...(upstream.headers.get('accept-ranges') ? { 'accept-ranges': upstream.headers.get('accept-ranges') } : {})
  });
  if (!upstream.body) return res.end();
  const nodeStream = Readable.fromWeb(upstream.body);
  nodeStream.on('error', () => {
    try { res.destroy(); } catch { /* ignore */ }
  });
  res.on('close', () => {
    try { nodeStream.destroy(); } catch { /* ignore */ }
  });
  nodeStream.pipe(res);
}

const server = http.createServer(async (req, res) => {
  res.on('error', () => { /* cliente desconectado */ });
  req.on('error', () => { /* petición abortada */ });
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, HEAD, OPTIONS',
      'access-control-allow-headers': '*'
    });
    return res.end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Método no permitido');

  if (url.pathname === '/stream') return handleStream(req, res, url);

  if (url.pathname === '/api/channels') {
    try {
      const catalog = await getCatalog();
      const channels = catalog.data.channels.map((channel) =>
        channel.resolver ? { ...channel, resolver: true } : channel
      );
      return sendJson(res, 200, { ...catalog.data, channels });
    } catch (error) {
      return sendJson(res, 500, { error: `No se pudo cargar el catálogo: ${error.message}` });
    }
  }

  if (url.pathname === '/api/resolve') {
    if (!sameOriginRequest(req)) return sendJson(res, 403, { error: 'Origen no permitido' });
    try {
      const catalog = await getCatalog();
      const id = url.searchParams.get('ch') || '';
      const channel = catalog.data.channels.find((item) => item.id === id);
      if (!channel?.resolver) return sendJson(res, 404, { error: 'Canal no encontrado' });
      const result = await resolveChannel(channel, { refresh: url.searchParams.get('refresh') === '1' });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 502, { error: error.message || 'No se pudo resolver la señal' });
    }
  }

  if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true });

  if (url.pathname === '/vendor/hls.min.js') {
    try {
      const stat = await fsp.stat(HLS_FILE);
      res.writeHead(200, {
        'content-type': 'text/javascript; charset=utf-8',
        'content-length': stat.size,
        'cache-control': 'public, max-age=86400'
      });
      return fs.createReadStream(HLS_FILE).pipe(res);
    } catch {
      return send(res, 500, 'hls.js no está instalado. Ejecuta npm install.');
    }
  }

  return serveStatic(res, url.pathname);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nEl puerto ${PORT} ya está en uso. Prueba con otro: PORT=5174 npm start\n`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Error de red no controlado:', error?.message || error);
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  MultiTV listo');
  console.log(`  → http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  if (HOST === '0.0.0.0') console.log('    (accesible desde otros dispositivos de tu red)');
  console.log('');
});
