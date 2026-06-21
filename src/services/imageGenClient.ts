import type { HairstyleGenOptions } from '../types';

export interface StyleExtractionResult {
  hairstyle: { name: string; description: string }[];
  makeup: { name: string; description: string }[];
  outfit: { name: string; description: string }[];
}

export interface ImageGenProviderImpl {
  testConnection(): Promise<boolean>;
  analyzeFace(imageBase64: string, signal?: AbortSignal): Promise<string>;
  generateHairstyles(imageBase64: string, signal?: AbortSignal, options?: HairstyleGenOptions): Promise<string[]>;
  extractHairstyle(imageBase64: string, signal?: AbortSignal): Promise<string>;
  extractStyle(imageBase64: string, signal?: AbortSignal): Promise<StyleExtractionResult>;
}

class ImageGenClient {
  private provider: ImageGenProviderImpl | null = null;

  async ensureProvider(): Promise<void> {
    if (this.provider) return;
    const mod = await import('./providers/aliProvider');
    this.provider = mod.aliProvider;
  }

  async testConnection(): Promise<boolean> {
    await this.ensureProvider();
    return this.provider!.testConnection();
  }

  async analyzeFace(imageBase64: string, signal?: AbortSignal): Promise<string> {
    await this.ensureProvider();
    return this.provider!.analyzeFace(imageBase64, signal);
  }

  async generateHairstyles(imageBase64: string, signal?: AbortSignal, options?: HairstyleGenOptions): Promise<string[]> {
    await this.ensureProvider();
    return this.provider!.generateHairstyles(imageBase64, signal, options);
  }

  async extractHairstyle(imageBase64: string, signal?: AbortSignal): Promise<string> {
    await this.ensureProvider();
    return this.provider!.extractHairstyle(imageBase64, signal);
  }

  async extractStyle(imageBase64: string, signal?: AbortSignal): Promise<StyleExtractionResult> {
    await this.ensureProvider();
    return this.provider!.extractStyle(imageBase64, signal);
  }
}

export class ContentBlockedError extends Error {
  constructor() {
    super('CONTENT_BLOCKED');
    this.name = 'ContentBlockedError';
  }
}

export const imageGenClient = new ImageGenClient();
