import type { ImageGenProviderImpl } from '../imageGenClient';
import { EXTRACT_PROMPT_CN, VLM_ANALYSIS_PROMPT_CN, HAIRSTYLE_GEN_PROMPT_CN } from '../../constants/prompts';
import type { AliImageResponse } from '../../types';

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1';

async function callQwenVL(
  apiKey: string,
  imageBase64: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/multimodal-generation/generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    signal,
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
  signal?: AbortSignal,
): Promise<string[]> {
  const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/text2image/image-synthesis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-DashScope-Async': 'enable',
    },
    signal,
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
  return pollAliTask(apiKey, taskId, 30, signal);
}

async function pollAliTask(apiKey: string, taskId: string, maxRetries = 30, signal?: AbortSignal): Promise<string[]> {
  for (let i = 0; i < maxRetries; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal,
    });
    if (!res.ok) { console.warn('阿里任务轮询失败:', res.status); continue; }
    const data = await res.json();
    const status = data.output?.task_status;
    if (status === 'SUCCEEDED') {
      const results = data.output?.results || [];
      return results.map((r: AliImageResponse) =>
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
    } catch (err) {
      console.warn('阿里 testConnection failed:', err);
      return false;
    }
  },

  async generateHairstyles(imageBase64: string, apiKey: string, _apiSecret?: string, signal?: AbortSignal): Promise<string[]> {
    const analysis = await callQwenVL(apiKey, imageBase64, VLM_ANALYSIS_PROMPT_CN, signal);
    const hairstylePrompt = HAIRSTYLE_GEN_PROMPT_CN(analysis);
    return callWanxTextToImage(apiKey, hairstylePrompt, 5, signal);
  },

  async extractHairstyle(imageBase64: string, apiKey: string, _apiSecret?: string, signal?: AbortSignal): Promise<string> {
    const description = await callQwenVL(apiKey, imageBase64, EXTRACT_PROMPT_CN, signal);
    const images = await callWanxTextToImage(apiKey, `透明背景的发型素材PNG：${description}。只包含发型，无人脸，无背景，轮廓清晰。`, 1, signal);
    if (images.length === 0) throw new Error('发型提取失败');
    return images[0];
  },
};
