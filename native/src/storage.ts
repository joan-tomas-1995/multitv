import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Channel } from './types';

const STORAGE_KEY = 'multitv:native:v1';

export type SavedState = {
  layout: string[];
  columns: number;
  volume: number;
  custom: Channel[];
};

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeCustom(raw: unknown): Channel | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<Channel>;
  if (typeof item.id !== 'string' || !item.id.startsWith('custom:')) return null;
  if (typeof item.name !== 'string' || !item.name.trim()) return null;
  if (!Array.isArray(item.urls)) return null;

  const urls = item.urls.filter(isHttpUrl);
  if (!urls.length) return null;

  return {
    id: item.id,
    name: item.name.slice(0, 60),
    group: typeof item.group === 'string' && item.group.trim() ? item.group.slice(0, 40) : 'Mis canales',
    logo: typeof item.logo === 'string' && isHttpUrl(item.logo) ? item.logo : '',
    urls,
    headers: item.headers && typeof item.headers === 'object' ? item.headers : undefined,
    custom: true
  };
}

export async function loadState(): Promise<Partial<SavedState>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    return {
      layout: Array.isArray(parsed.layout) ? parsed.layout.filter((id): id is string => typeof id === 'string') : undefined,
      columns: [1, 2, 3].includes(Number(parsed.columns)) ? Number(parsed.columns) : undefined,
      volume: Number.isFinite(parsed.volume) ? Math.min(1, Math.max(0, Number(parsed.volume))) : undefined,
      custom: Array.isArray(parsed.custom) ? parsed.custom.map(normalizeCustom).filter((item): item is Channel => Boolean(item)) : undefined
    };
  } catch {
    return {};
  }
}

export async function saveState(state: SavedState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* almacenamiento no disponible */
  }
}
