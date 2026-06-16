import type { ImageGenProviderImpl } from '../imageGenClient';
import { HAIRSTYLE_PROMPT_CN, EXTRACT_PROMPT_CN } from '../imageGenClient';

const TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';
const CHAT_URL = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-4.0-turbo-8k';

async function getAccessToken(apiKey: string, apiSecret: string): Promise<string> {
  const res = await fetch(`${TOKEN_URL}?grant_type=client_credentials&client_id=${apiKey}&client_secret=${apiSecret}`, {
    method: 'POST',
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
): Promise<string> {
  const res = await fetch(`${CHAT_URL}?access_token=${accessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
): Promise<string[]> {
  const res = await fetch(`https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/text2image/sd_xl?access_token=${accessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  // Returns task_id, need to poll for results
  if (data.task_id) {
    return pollBaiduTask(accessToken, data.task_id);
  }
  // If direct result
  if (data.data) return data.data.map((d: { b64_image?: string; url?: string }) => d.b64_image ? `data:image/png;base64,${d.b64_image}` : d.url);
  throw new Error('百度文生图返回无效数据');
}

async function pollBaiduTask(accessToken: string, taskId: string, maxRetries = 30): Promise<string[]> {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/text2image/sd_xl?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });
    if (!res.ok) continue;
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      return data.data.map((d: { b64_image?: string; url?: string }) =>
        d.b64_image ? `data:image/png;base64,${d.b64_image}` : d.url!
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
    } catch {
      return false;
    }
  },

  async generateHairstyles(imageBase64: string, apiKey: string, apiSecret?: string): Promise<string[]> {
    if (!apiSecret) throw new Error('百度 API 需要 Secret Key');
    const token = await getAccessToken(apiKey, apiSecret);
    // Use ERNIE vision to analyze the face, then generate hairstyle images
    const analysis = await callErnieVision(token, imageBase64, '请描述这张照片中人物的脸型、性别、当前发型特征，用于后续发型生成参考。简短描述即可。');
    const hairstylePrompt = `基于以下人物特征生成5种不同发型的效果图：${analysis}\n\n要求：1.清爽短发 2.复古羊毛卷 3.硬汉寸头 4.气质法式波波头 5.优雅长发。每种发型自然贴合脸型，保持面部特征不变。高质量人像摄影风格。`;
    return callErnieTextToImage(token, hairstylePrompt);
  },

  async extractHairstyle(imageBase64: string, apiKey: string, apiSecret?: string): Promise<string> {
    if (!apiSecret) throw new Error('百度 API 需要 Secret Key');
    const token = await getAccessToken(apiKey, apiSecret);
    // Use ERNIE to describe the hairstyle, then generate transparent PNG
    const description = await callErnieVision(token, imageBase64, EXTRACT_PROMPT_CN);
    // Generate a clean hairstyle image
    const images = await callErnieTextToImage(token, `透明背景的发型素材PNG：${description}。只包含发型，无人脸，无背景，轮廓清晰。`);
    if (images.length === 0) throw new Error('发型提取失败');
    return images[0];
  },
};
