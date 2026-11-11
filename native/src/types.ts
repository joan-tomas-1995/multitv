export type AtresplayerResolver = {
  type: 'atresplayer';
  liveId: string;
};

export type BrightcoveResolver = {
  type: 'brightcove';
  account: string;
  video: string;
  policyKey: string;
  referer: string;
};

export type Resolver = AtresplayerResolver | BrightcoveResolver;

export type Channel = {
  id: string;
  name: string;
  group: string;
  logo: string;
  urls: string[];
  headers?: Record<string, string>;
  resolver?: Resolver;
  externalUrl?: string;
  custom?: boolean;
};

export type Catalog = {
  updatedAt?: string;
  source?: string;
  groups: string[];
  defaults: string[];
  channels: Channel[];
};
