export type TabState = 'home' | 'photo' | 'makeup' | 'outfit' | 'extract' | 'library' | 'settings';

export type AssetCategory = 'hairstyle' | 'makeup' | 'outfit';

export type ImageProviderType = 'ali';

export interface AppSettings {
  imageApiKey: string;
  imageProvider: ImageProviderType;
  autoSaveAssets: boolean;
}

export type HairType = 'short' | 'buzz' | 'wool' | 'long' | 'bob';

export type AnalysisCategory = AssetCategory;

export interface StyleRecommendation {
  name: string;
  description: string;
}

export interface HairstyleRecommendation extends StyleRecommendation {
  hairType: HairType;
}

export interface HairstyleGenOptions {
  customPrompt?: string;
  existingAnalysis?: string;
  hairstyleColor?: string;
  hairstyleColorHex?: string;
  category?: AnalysisCategory;
  recommendations?: StyleRecommendation[];
  referenceImageBase64?: string;
}

export interface HairstyleItem {
  id: string;
  name: string;
  category: AssetCategory;
  type: string;
  colorName: string;
  colorHex: string;
  description: string;
  previewUrl: string;
  createdAt: number;
}
