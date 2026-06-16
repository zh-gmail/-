import type { ImageGenProviderImpl } from '../imageGenClient';

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
): Promise<string> {
  const res = await fetch(`${FAL_BASE}/fal-ai/hairstyle-transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
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

async function callTextToImage(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(`${FAL_BASE}/fal-ai/fast-sdxl`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      image_size: 'square_hd',
      num_images: 1,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`FAL fast-sdxl 调用失败: ${res.status} - ${errText}`);
  }
  const data = await res.json();
  return (data as { images?: { url: string }[] }).images?.[0]?.url || '';
}

export const falProvider: ImageGenProviderImpl = {
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(`${FAL_BASE}/fal-ai/hairstyle-transfer`, {
        method: 'OPTIONS',
        headers: { 'Authorization': `Key ${apiKey}` },
      });
      return res.status !== 401;
    } catch {
      return false;
    }
  },

  async generateHairstyles(imageBase64: string, apiKey: string): Promise<string[]> {
    const results: string[] = [];
    for (const ref of HAIRSTYLE_REFERENCES) {
      try {
        const resultUrl = await callHairstyleTransfer(apiKey, imageBase64, ref.url, ref.name);
        results.push(resultUrl);
      } catch (err) {
        console.error(`FAL 生成 ${ref.name} 失败:`, err);
      }
    }
    if (results.length === 0) throw new Error('FAL 发型全部生成失败，请检查 API Key 和网络连接');
    return results;
  },

  async extractHairstyle(_imageBase64: string, apiKey: string): Promise<string> {
    return callTextToImage(apiKey, '透明背景的发型素材PNG，只包含发型部分，无人脸，无背景，轮廓清晰，适合用于AR叠加渲染。');
  },
};
