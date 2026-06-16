import type { ImageProviderType } from '../types';

export interface ImageGenProviderImpl {
  testConnection(apiKey: string, apiSecret?: string): Promise<boolean>;
  generateHairstyles(imageBase64: string, apiKey: string, apiSecret?: string, signal?: AbortSignal): Promise<string[]>;
  extractHairstyle(imageBase64: string, apiKey: string, apiSecret?: string, signal?: AbortSignal): Promise<string>;
}

class ImageGenClient {
  private provider: ImageGenProviderImpl | null = null;
  private providerName: ImageProviderType | null = null;

  async setProvider(name: ImageProviderType): Promise<void> {
    if (this.providerName === name) return;
    if (name === 'baidu') {
      const mod = await import('./providers/baiduProvider');
      this.provider = mod.baiduProvider;
    } else if (name === 'fal') {
      const mod = await import('./providers/falProvider');
      this.provider = mod.falProvider;
    } else {
      const mod = await import('./providers/aliProvider');
      this.provider = mod.aliProvider;
    }
    this.providerName = name;
  }

  async testConnection(apiKey: string, apiSecret?: string): Promise<boolean> {
    if (!this.provider) throw new Error('Provider not set');
    return this.provider.testConnection(apiKey, apiSecret);
  }

  async generateHairstyles(imageBase64: string, apiKey: string, apiSecret?: string, signal?: AbortSignal): Promise<string[]> {
    if (!this.provider) throw new Error('Provider not set');
    return this.provider.generateHairstyles(imageBase64, apiKey, apiSecret, signal);
  }

  async extractHairstyle(imageBase64: string, apiKey: string, apiSecret?: string, signal?: AbortSignal): Promise<string> {
    if (!this.provider) throw new Error('Provider not set');
    return this.provider.extractHairstyle(imageBase64, apiKey, apiSecret, signal);
  }

  getProviderName(): ImageProviderType | null {
    return this.providerName;
  }
}

export const imageGenClient = new ImageGenClient();
