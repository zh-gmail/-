export type ImageProvider = 'baidu' | 'ali';

export interface ImageGenResult {
  url: string;
}

export interface ImageGenProviderImpl {
  /** Test API connection, returns true if valid */
  testConnection(apiKey: string, apiSecret?: string): Promise<boolean>;
  /** Generate 5-8 hairstyle variations from a face photo */
  generateHairstyles(imageBase64: string, apiKey: string, apiSecret?: string): Promise<string[]>;
  /** Extract hairstyle from reference photo, returns transparent PNG base64 */
  extractHairstyle(imageBase64: string, apiKey: string, apiSecret?: string): Promise<string>;
}

const HAIRSTYLE_PROMPT_CN = '请为这张照片中的人物生成5种不同发型效果，包括：1.清爽短发 2.复古羊毛卷 3.硬汉寸头 4.气质法式波波头 5.优雅长发。每种发型要自然贴合人物脸型，保持面部特征不变，只改变发型和发色。返回高清人像照片效果。';

const EXTRACT_PROMPT_CN = '请分析这张照片中的发型，提取出发型部分，生成一张透明背景的PNG发型素材图。要求：只保留发型部分，去除人脸和背景，发型轮廓清晰，适合用于AR叠加。';

class ImageGenClient {
  private provider: ImageGenProviderImpl | null = null;
  private providerName: ImageProvider | null = null;

  async setProvider(name: ImageProvider): Promise<void> {
    if (name === 'baidu') {
      const mod = await import('./providers/baiduProvider');
      this.provider = mod.baiduProvider;
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

  getProviderName(): ImageProvider | null {
    return this.providerName;
  }
}

export const imageGenClient = new ImageGenClient();

export { HAIRSTYLE_PROMPT_CN, EXTRACT_PROMPT_CN };
