import { generateId } from '../utils/id';
import { imageUrlToBase64 } from '../utils/imageUtils';
import type { HairstyleItem } from '../types';

const DASHSCOPE_BASE = '/api/proxy/dashscope/api/v1';

const HAIRSTYLE_PROMPTS = [
  '亚洲女性，清爽简约的短发造型，微碎刘海，自然黑色，发丝轻盈有层次感',
  '亚洲女性，蓬松复古羊毛卷发型，中长发，摩卡棕色，卷度自然蓬松',
  '亚洲女性，优雅法式波波头，齐下巴长度，亚麻金色，发尾微内扣',
  '亚洲女性，气质长直发，深棕色，发丝柔顺有光泽，中分',
  '亚洲女性，韩式大波浪卷发，栗棕色，波浪卷度自然大气',
  '亚洲女性，日系层次感短发，浅棕色，轻盈飘逸',
];

const MAKEUP_PROMPTS = [
  '亚洲女性，清透自然裸妆，底妆轻薄，淡粉色唇彩，自然眉形',
  '亚洲女性，韩系水光肌妆容，水润光泽底妆，珊瑚色腮红和唇彩',
  '亚洲女性，气质通勤妆，大地色眼影，豆沙色口红，雾面底妆',
  '亚洲女性，复古红唇妆，正红色口红，精致眼线，无瑕底妆',
  '亚洲女性，日系清透橘色妆容，橘色系眼影腮红，水润唇釉',
  '亚洲女性，泰式妆容，自然立体修容，橘棕色系眼妆，裸色唇',
];

const OUTFIT_PROMPTS = [
  '亚洲女性，简约通勤穿搭，白色衬衫配合身黑色西装裤，驼色风衣外套',
  '亚洲女性，优雅知性穿搭，米白色针织衫配深蓝色直筒裙，珍珠配饰',
  '亚洲女性，清新甜美穿搭，浅粉色碎花连衣裙，白色小开衫',
  '亚洲女性，法式休闲穿搭，条纹衫配高腰牛仔裤，贝雷帽',
  '亚洲女性，复古文艺穿搭，格子西装外套配阔腿裤，牛津鞋',
  '亚洲女性，韩系简约穿搭，燕麦色大衣配黑色内搭和百褶裙',
];

async function callQwenImageGen(prompt: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/multimodal-generation/generation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: 'qwen-image-2.0-pro',
      input: {
        messages: [{
          role: 'user',
          content: [{ text: prompt }],
        }],
      },
      parameters: {
        n: 1,
        size: '1024*1024',
        watermark: false,
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('种子图生成失败:', res.status, errText);
    throw new Error('AI 图像生成失败');
  }
  const data = await res.json();
  return data.output?.choices?.[0]?.message?.content?.[0]?.image || '';
}

export async function generateSeedItems(
  onProgress?: (msg: string) => void,
  signal?: AbortSignal,
): Promise<HairstyleItem[]> {
  const items: HairstyleItem[] = [];
  const categories = [
    { prompts: HAIRSTYLE_PROMPTS, category: 'hairstyle' as const, prefix: '发型' },
    { prompts: MAKEUP_PROMPTS, category: 'makeup' as const, prefix: '妆容' },
    { prompts: OUTFIT_PROMPTS, category: 'outfit' as const, prefix: '穿搭' },
  ];

  for (const cat of categories) {
    for (let i = 0; i < cat.prompts.length; i++) {
      if (signal?.aborted) break;
      const seedName = `${cat.prefix}${i + 1}`;
      onProgress?.(`正在生成 ${cat.prefix} ${i + 1}/${cat.prompts.length}`);
      try {
        const imageUrl = await callQwenImageGen(cat.prompts[i], signal);
        if (!imageUrl) continue;
        const base64 = await imageUrlToBase64(imageUrl);
        items.push({
          id: generateId(),
          name: seedName,
          category: cat.category,
          type: 'seed',
          colorName: '—',
          colorHex: '#9C8468',
          description: cat.prompts[i],
          previewUrl: `data:image/png;base64,${base64}`,
          createdAt: Date.now(),
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        console.warn(`生成 ${cat.prefix} ${i + 1} 失败:`, err);
      }
    }
  }

  return items;
}

export async function generateSingleSeedItem(
  prompt: string,
  category: 'hairstyle' | 'makeup' | 'outfit',
  signal?: AbortSignal,
): Promise<HairstyleItem | null> {
  try {
    const imageUrl = await callQwenImageGen(prompt, signal);
    if (!imageUrl) return null;
    const base64 = await imageUrlToBase64(imageUrl);
    return {
      id: generateId(),
      name: prompt.slice(0, 20),
      category,
      type: 'seed',
      colorName: '—',
      colorHex: '#9C8468',
      description: prompt,
      previewUrl: `data:image/png;base64,${base64}`,
      createdAt: Date.now(),
    };
  } catch (err) {
    console.error('单种子生成失败:', err);
    return null;
  }
}
