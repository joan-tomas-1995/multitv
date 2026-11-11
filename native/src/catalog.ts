import rawCatalog from '../assets/channels.json';
import type { Catalog, Channel } from './types';
import { logoMap } from './logoMap';

export const catalog = rawCatalog as unknown as Catalog;

export const channels: Channel[] = catalog.channels;

export const channelMap = new Map(channels.map((channel) => [channel.id, channel]));

export const defaultLayout = catalog.defaults.filter((id) => channelMap.has(id)).slice(0, 6);

const fallbackLayout = channels.slice(0, 6).map((channel) => channel.id);

export const initialLayout = defaultLayout.length ? defaultLayout : fallbackLayout;

export function logoSource(channel: Channel) {
  if (channel.custom) {
    return channel.logo ? { uri: channel.logo } : undefined;
  }
  return logoMap[channel.id];
}
