import type { ImageGenProviderImpl } from '../imageGenClient';
import { urlToBase64, compositeHairOnWhite, invertMaskImage } from '../../utils/imageProcessing';

const FAL_BASE = 'https://fal.run';

const HAIRSTYLE_REFERENCES: { name: string; url: string }[] = [
  { name: '清爽短发', url: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=400&q=80' },
  { name: '复古羊毛卷', url: 'https://images.unsplash.com/photo-1620331307452-fddba3e6a9ee?auto=format&fit=crop&w=400&q=80' },
  { name: '硬汉寸头', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80' },
  { name: '气质法式波波头', url: 'https://images.unsplash.com/photo-1580618672591-eb18e285d852?auto=format&fit=crop&w=400&q=80' },
  { name: '优雅长发', url: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=400&q=80' },
];

interface FalResponse {
  image?: { url: string };
  detail?: string;
}

async function callHairstyleTransfer(
  apiKey: string,
  faceImage: string,
  hairstyleImageUrl: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${FAL_BASE}/fal-ai/hairstyle-transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      face_image: faceImage,
      hairstyle_image: hairstyleImageUrl,
      prompt,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`FAL hairstyle-transfer 调用失败: ${res.status} - ${errText}`);
  }
  const data: FalResponse = await res.json();
  if (!data.image?.url) throw new Error(`FAL 返回无图片: ${data.detail || 'unknown'}`);
  return data.image.url;
}

async function callFluxFill(
  apiKey: string,
  imageBase64: string,
  prompt: string,
  maskBase64?: string,
  signal?: AbortSignal,
): Promise<string> {
  const body: Record<string, unknown> = {
    image_url: imageBase64,
    prompt,
  };
  if (maskBase64) body.mask_url = maskBase64;
  const res = await fetch(`${FAL_BASE}/fal-ai/flux-pro/v1ar-fill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    signal,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`FAL flux-pro/v1ar-fill 调用失败: ${res.status} - ${errText}`);
  }
  const data: FalResponse = await res.json();
  if (!data.image?.url) throw new Error('FAL flux-pro/v1ar-fill 返回无图片');
  return data.image.url;
}

async function callHairSegmentation(
  apiKey: string,
  imageBase64: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${FAL_BASE}/fal-ai/bria/hair-segmentation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    signal,
    body: JSON.stringify({ image_url: imageBase64 }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`FAL hair-segmentation 失败: ${res.status} - ${errText}`);
  }
  const data: FalResponse = await res.json();
  if (!data.image?.url) throw new Error('FAL hair-segmentation 返回无图片');
  return data.image.url;
}

// FAL rejects base64 without data URI prefix; resizeImage() omits it
const DEFAULT_MIME = 'data:image/jpeg;base64,';

function ensureDataUri(s: string, mime = DEFAULT_MIME): string {
  return s.startsWith('data:') ? s : mime + s;
}

export const falProvider: ImageGenProviderImpl = {
  async testConnection(apiKey: string): Promise<boolean> {
    if (!apiKey.startsWith('fal-') || apiKey.length <= 20) return false;
    try {
      // POST with empty body — FAL gateway validates auth before routing to model
      // 401 = invalid key, 400/422 = valid key (missing required body fields)
      const res = await fetch(`${FAL_BASE}/fal-ai/hairstyle-transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${apiKey}`,
        },
        body: '{}',
      });
      return res.status !== 401;
    } catch (err) {
      console.warn('FAL testConnection network error:', err);
      return false;
    }
  },

  async generateHairstyles(imageBase64: string, apiKey: string, _apiSecret?: string, signal?: AbortSignal): Promise<string[]> {
    const prefixed = ensureDataUri(imageBase64);
    const results = await Promise.all(
      HAIRSTYLE_REFERENCES.map(ref =>
        callHairstyleTransfer(apiKey, prefixed, ref.url, ref.name, signal)
          .catch(err => {
            if (err instanceof DOMException && err.name === 'AbortError') throw err;
            console.error(`FAL 生成 ${ref.name} 失败:`, err);
            return null;
          })
      )
    );
    const validResults = results.filter((r): r is string => r !== null);
    if (validResults.length === 0) throw new Error('FAL 发型全部生成失败，请检查 API Key 和网络连接');
    return validResults;
  },

  async extractHairstyle(imageBase64: string, apiKey: string, _apiSecret?: string, signal?: AbortSignal): Promise<string> {
    const prefixed = ensureDataUri(imageBase64);
    const maskUrl = await callHairSegmentation(apiKey, prefixed, signal);
    const maskBase64 = await urlToBase64(maskUrl);

    const [compositeBase64, fillMask] = await Promise.all([
      compositeHairOnWhite(prefixed, maskBase64),
      invertMaskImage(maskBase64),
    ]);

    try {
      return await callFluxFill(
        apiKey,
        compositeBase64,
        'clean white background, realistic hairstyle, smooth natural edges',
        fillMask,
        signal,
      );
    } catch (err) {
      console.warn('FAL flux edge cleanup failed, returning composite:', err);
      return compositeBase64;
    }
  },
};
