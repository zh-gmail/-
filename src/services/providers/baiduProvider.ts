import type { ImageGenProviderImpl } from '../imageGenClient';
import { EXTRACT_PROMPT_CN, VLM_ANALYSIS_PROMPT_CN, HAIRSTYLE_GEN_PROMPT_CN } from '../../constants/prompts';
import type { BaiduImageResponse } from '../../types';

const TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';
const BAIDU_CHAT_MODEL = 'ernie-4.0-turbo-8k';
const CHAT_URL = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${BAIDU_CHAT_MODEL}`;

async function getAccessToken(apiKey: string, apiSecret: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${TOKEN_URL}?grant_type=client_credentials&client_id=${encodeURIComponent(apiKey)}&client_secret=${encodeURIComponent(apiSecret)}`, {
    method: 'POST',
    signal,
  });
  if (!res.ok) throw new Error(`百度 OAuth 失败: ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error('百度 OAuth 返回无效 token');
  return data.access_token;
}

async function callErnieVision(
  accessToken: string,
  imageBase64: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${CHAT_URL}?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: imageBase64 },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`百度 ERNIE API 调用失败: ${res.status} - ${errText}`);
  }
  const data = await res.json();
  return data.result || '';
}

async function callErnieTextToImage(
  accessToken: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const res = await fetch(`https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/text2image/sd_xl?access_token=${encodeURIComponent(accessToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      prompt,
      size: '1024x1024',
      n: 5,
      steps: 20,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`百度文生图 API 失败: ${res.status} - ${errText}`);
  }
  const data = await res.json();
  if (data.task_id) {
    return pollBaiduTask(accessToken, data.task_id, 30, signal);
  }
  if (data.data) return data.data.map((d: BaiduImageResponse) => d.b64_image ? `data:image/png;base64,${d.b64_image}` : (d.url || ''));
  throw new Error('百度文生图返回无效数据');
}

async function pollBaiduTask(accessToken: string, taskId: string, maxRetries = 30, signal?: AbortSignal): Promise<string[]> {
  for (let i = 0; i < maxRetries; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/text2image/sd_xl?access_token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ taskId }),
    });
    if (!res.ok) { console.warn('百度任务轮询失败:', res.status); continue; }
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      return data.data.map((d: BaiduImageResponse) =>
        d.b64_image ? `data:image/png;base64,${d.b64_image}` : (d.url || '')
      );
    }
    if (data.task_status === 'FAILED') {
      throw new Error('百度图像生成任务失败');
    }
  }
  throw new Error('百度图像生成超时');
}

export const baiduProvider: ImageGenProviderImpl = {
  async testConnection(apiKey: string, apiSecret?: string): Promise<boolean> {
    if (!apiSecret) return false;
    try {
      await getAccessToken(apiKey, apiSecret);
      return true;
    } catch (err) {
      console.warn('百度 testConnection failed:', err);
      return false;
    }
  },

  async generateHairstyles(imageBase64: string, apiKey: string, apiSecret?: string, signal?: AbortSignal): Promise<string[]> {
    if (!apiSecret) throw new Error('百度 API 需要 Secret Key');
    const token = await getAccessToken(apiKey, apiSecret, signal);
    const analysis = await callErnieVision(token, imageBase64, VLM_ANALYSIS_PROMPT_CN, signal);
    const hairstylePrompt = HAIRSTYLE_GEN_PROMPT_CN(analysis);
    return callErnieTextToImage(token, hairstylePrompt, signal);
  },

  async extractHairstyle(imageBase64: string, apiKey: string, apiSecret?: string, signal?: AbortSignal): Promise<string> {
    if (!apiSecret) throw new Error('百度 API 需要 Secret Key');
    const token = await getAccessToken(apiKey, apiSecret, signal);
    const description = await callErnieVision(token, imageBase64, EXTRACT_PROMPT_CN, signal);
    const images = await callErnieTextToImage(token, `透明背景的发型素材PNG：${description}。只包含发型，无人脸，无背景，轮廓清晰。`, signal);
    if (images.length === 0) throw new Error('发型提取失败');
    return images[0];
  },
};
