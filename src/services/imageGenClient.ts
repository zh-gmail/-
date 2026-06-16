import type { ImageProviderType } from '../types';

export interface ImageGenProviderImpl {
  /** Test API connection, returns true if valid */
  testConnection(apiKey: string, apiSecret?: string): Promise<boolean>;
  /** Generate 5-8 hairstyle variations from a face photo */
  generateHairstyles(imageBase64: string, apiKey: string, apiSecret?: string): Promise<string[]>;
  /** Extract hairstyle from reference photo, returns transparent PNG base64 */
  extractHairstyle(imageBase64: string, apiKey: string, apiSecret?: string): Promise<string>;
}

const EXTRACT_PROMPT_CN = '请分析这张照片中的发型，提取出发型部分，生成一张透明背景的PNG发型素材图。要求：只保留发型部分，去除人脸和背景，发型轮廓清晰，适合用于AR叠加。';

class ImageGenClient {
  private provider: ImageGenProviderImpl | null = null;
  private providerName: ImageProviderType | null = null;

  async setProvider(name: ImageProviderType): Promise<void> {
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

  async generateHairstyles(imageBase64: string, apiKey: string, apiSecret?: string): Promise<string[]> {
    if (!this.provider) throw new Error('Provider not set');
    return this.provider.generateHairstyles(imageBase64, apiKey, apiSecret);
  }

  async extractHairstyle(imageBase64: string, apiKey: string, apiSecret?: string): Promise<string> {
    if (!this.provider) throw new Error('Provider not set');
    return this.provider.extractHairstyle(imageBase64, apiKey, apiSecret);
  }

  getProviderName(): ImageProviderType | null {
    return this.providerName;
  }
}

export const imageGenClient = new ImageGenClient();

export { EXTRACT_PROMPT_CN };
