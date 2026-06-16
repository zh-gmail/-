import type { ImageGenProviderImpl } from '../imageGenClient';
import { EXTRACT_PROMPT_CN } from '../imageGenClient';

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1';

async function callQwenVL(
  apiKey: string,
  imageBase64: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/multimodal-generation/generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-vl-max',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { image: `data:image/jpeg;base64,${imageBase64}` },
              { text: prompt },
            ],
          },
        ],
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`通义千问 VL 调用失败: ${res.status} - ${errText}`);
  }
  const data = await res.json();
  return data.output?.choices?.[0]?.message?.content?.[0]?.text || '';
}

async function callWanxTextToImage(
  apiKey: string,
  prompt: string,
  n = 5,
): Promise<string[]> {
  const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/text2image/image-synthesis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'wanx-v1',
      input: { prompt },
      parameters: {
        n,
        size: '1024*1024',
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`通义万相文生图提交失败: ${res.status} - ${errText}`);
  }
  const data = await res.json();
  const taskId = data.output?.task_id;
  if (!taskId) throw new Error('通义万相返回无效 task_id');
  return pollAliTask(apiKey, taskId);
}

async function pollAliTask(apiKey: string, taskId: string, maxRetries = 30): Promise<string[]> {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) continue;
    const data = await res.json();
    const status = data.output?.task_status;
    if (status === 'SUCCEEDED') {
      const results = data.output?.results || [];
      return results.map((r: { url?: string; b64_image?: string }) =>
        r.b64_image ? `data:image/png;base64,${r.b64_image}` : (r.url || '')
      );
    }
    if (status === 'FAILED') {
      throw new Error(`通义万相任务失败: ${data.output?.message || '未知错误'}`);
    }
  }
  throw new Error('通义万相图像生成超时');
}

export const aliProvider: ImageGenProviderImpl = {
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-turbo',
          input: { messages: [{ role: 'user', content: 'hi' }] },
          parameters: { max_tokens: 1 },
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async generateHairstyles(imageBase64: string, apiKey: string): Promise<string[]> {
    const analysis = await callQwenVL(apiKey, imageBase64, '精确描述这张照片中人物的脸型轮廓、五官分布位置、肤色、性别以及当前发型特征。这是后续发型生成的关键参照。');
    const hairstylePrompt = `基于以下人物特征生成5种不同发型的效果图：${analysis}\n\n严格约束(必须遵守)：\n1. 必须保持人物的五官、脸型、肤色完全不变，只替换发型\n2. 生成发型：清爽短发、复古羊毛卷、硬汉寸头、气质法式波波头、优雅长发\n3. 新发型必须自然贴合原始脸型和头型轮廓\n4. 保持原始照片的面部表情、眼神方向、嘴唇形状\n5. 高质量人像摄影风格，光照和背景尽量与原始照片一致`;
    return callWanxTextToImage(apiKey, hairstylePrompt, 5);
  },

  async extractHairstyle(imageBase64: string, apiKey: string): Promise<string> {
    const description = await callQwenVL(apiKey, imageBase64, EXTRACT_PROMPT_CN);
    const images = await callWanxTextToImage(apiKey, `透明背景的发型素材PNG：${description}。只包含发型，无人脸，无背景，轮廓清晰。`, 1);
    if (images.length === 0) throw new Error('发型提取失败');
    return images[0];
  },
};
