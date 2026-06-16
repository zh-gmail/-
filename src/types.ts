export type TabState = 'live' | 'photo' | 'extract' | 'library' | 'settings';

export type ImageProviderType = 'baidu' | 'ali' | 'fal';

export interface AppSettings {
  imageApiKey: string;
  imageApiSecret: string;
  imageFalKey: string;
  imageProvider: ImageProviderType;
}

export type HairType = 'short' | 'buzz' | 'wool' | 'long' | 'bob';

export interface BaiduImageResponse {
  b64_image?: string;
  url?: string;
}

export interface AliImageResponse {
  url?: string;
  b64_image?: string;
}

export interface HairstyleAsset {
  id: string;
  name: string;
  effectUrl: string;
  thumbnailUrl: string;
  scale?: [number, number, number];
  position?: [number, number, number];
}

export interface HairstyleItem {
  id: string;
  name: string;
  type: HairType;
  colorName: string;
  colorHex: string;
  previewUrl: string;
  createdAt: number;
}
