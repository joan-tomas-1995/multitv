import { fetch as expoFetch } from 'expo/fetch';
import type { Channel } from './types';

const CACHE_TTL = 60 * 60 * 1000;
const cache = new Map<string, { url: string; expiresAt: number }>();

type Json = Record<string, any>;

async function requestJson(url: string, headers: Record<string, string>): Promise<Json> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await expoFetch(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as Json;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La petición ha tardado demasiado');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveStream(channel: Channel, attempt = 0): Promise<string> {
  if (!channel.resolver) {
    if (!channel.urls.length) throw new Error('Este canal no tiene ninguna señal disponible.');
    return channel.urls[attempt % channel.urls.length];
  }

  const cached = cache.get(channel.id);
  if (attempt === 0 && cached && cached.expiresAt > Date.now()) return cached.url;

  let url: string | undefined;

  if (channel.resolver.type === 'atresplayer') {
    const data = await requestJson(
      `https://api.atresplayer.com/player/v1/live/${encodeURIComponent(channel.resolver.liveId)}`,
      {
        accept: 'application/json',
        referer: 'https://www.atresplayer.com/',
        origin: 'https://www.atresplayer.com'
      }
    );
    const source = (data.sourcesLive || []).find((item: any) => /mpegurl/i.test(String(item.type)));
    url = source?.src;
  } else {
    const { account, video, policyKey, referer } = channel.resolver;
    let origin = 'https://www.telemadrid.es';
    try { origin = new URL(referer).origin; } catch { /* referer por defecto */ }
    const data = await requestJson(
      `https://edge.api.brightcove.com/playback/v1/accounts/${encodeURIComponent(account)}/videos/${encodeURIComponent(video)}`,
      {
        accept: `application/json;pk=${policyKey}`,
        referer,
        origin
      }
    );
    const source = (data.sources || []).find((item: any) => /mpegurl/i.test(String(item.type)));
    url = source?.src;
  }

  if (!url) throw new Error('La cadena no ha devuelto una señal HLS.');

  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('La señal recibida no es válida.');
  }

  cache.set(channel.id, { url, expiresAt: Date.now() + CACHE_TTL });
  return url;
}

export function streamHeaders(channel: Channel): Record<string, string> | undefined {
  const headers: Record<string, string> = { ...(channel.headers || {}) };
  return Object.keys(headers).length ? headers : undefined;
}
