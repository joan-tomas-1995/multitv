export function initials(name: string): string {
  const words = String(name).replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return 'TV';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function hueFor(name: string): number {
  let value = 0;
  for (const char of String(name)) value = (value * 31 + char.charCodeAt(0)) % 360;
  return value;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export type M3uEntry = {
  name: string;
  url: string;
  logo?: string;
  group?: string;
  referer?: string;
};

export function parseM3u(text: string): M3uEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: M3uEntry[] = [];
  let current: Omit<M3uEntry, 'url'> | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const logo = (line.match(/tvg-logo="([^"]*)"/i) || [null, ''])[1] || undefined;
      const group = (line.match(/group-title="([^"]*)"/i) || [null, ''])[1] || undefined;
      const name = line.split(',').slice(1).join(',').trim() || 'Canal';
      current = { name, logo, group };
    } else if (line.startsWith('#EXTVLCOPT:http-referrer=')) {
      if (current) current.referer = line.split('=').slice(1).join('=');
    } else if (!line.startsWith('#')) {
      if (current && isHttpUrl(line)) entries.push({ ...current, url: line });
      current = null;
    }
  }

  return entries;
}

export function newCustomId(): string {
  return `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
