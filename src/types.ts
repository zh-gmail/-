export type TabState = 'live' | 'photo' | 'extract' | 'library' | 'settings';

export type ImageProviderType = 'baidu' | 'ali' | 'fal';

export interface AppSettings {
  imageApiKey: string;
  imageApiSecret: string;
  imageFalKey: string;
  imageProvider: ImageProviderType;
}

export type HairType = 'short' | 'buzz' | 'wool' | 'long' | 'bob';

export interface HairstyleItem {
  id: string;
  name: string;
  type: HairType;
  colorName: string;
  colorHex: string;
  previewUrl: string;
}
