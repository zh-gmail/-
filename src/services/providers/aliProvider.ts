import type { ImageGenProviderImpl, StyleExtractionResult } from '../imageGenClient';
import { ContentBlockedError } from '../imageGenClient';
import { VLM_ANALYSIS_PROMPT_CN, STYLE_EXTRACTION_PROMPT_CN } from '../../constants/prompts';
import { HAIR_TYPE_OPTIONS } from '../../constants/hairTypes';
import type { HairstyleGenOptions, AnalysisCategory } from '../../types';

const DASHSCOPE_BASE = '/api/proxy/dashscope/api/v1';

async function callQwenVL(
  imageBase64: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/multimodal-generation/generation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    console.error('通义千问 VL 调用失败:', res.status, errText);
    throw new Error('通义千问 API 调用失败');
  }
  const data = await res.json();
  return data.output?.choices?.[0]?.message?.content?.[0]?.text || '';
}

async function callQwenImageEdit(
  imageBase64: string,
  prompt: string,
  n = 1,
  signal?: AbortSignal,
  referenceImageBase64?: string,
): Promise<string[]> {
  const content: Record<string, string>[] = [
    { image: `data:image/jpeg;base64,${imageBase64}` },
  ];
  if (referenceImageBase64) {
    content.push({ image: `data:image/png;base64,${referenceImageBase64}` });
  }
  content.push({ text: prompt });

  const body = {
    model: 'qwen-image-2.0-pro',
    input: {
      messages: [{ role: 'user', content }],
    },
    parameters: {
      n,
      watermark: false,
      prompt_extend: true,
      size: '1024*1024',
      negative_prompt: '改变性别, 改变脸型, 改变五官, 改变肤色, 改变服装, 改变背景, 变形, 扭曲, 不像本人',
    },
  };

  // Retry 429 once
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/multimodal-generation/generation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      // Content inspection blocked — not a code error, return empty
      if (res.status === 400 && errText.includes('DataInspectionFailed')) {
        console.warn('通义万相内容审核拦截，跳过此生成:', prompt.slice(0, 50));
        return [];
      }
      // Rate limited — retry once with backoff
      if (res.status === 429 && attempt === 0) {
        console.warn('通义万相限流 (429)，5 秒后重试...');
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      console.error('通义万相图像编辑失败:', res.status, errText);
      throw new Error('通义万相图像编辑失败');
    }

    const data = await res.json();
    const choices = data.output?.choices || [];
    const urls = choices.map((c: any) => c.message?.content?.[0]?.image || '').filter(Boolean);
    return urls;
  }
  return []; // Fallthrough when retry exhausted
}

const DEFAULT_OUTFITS = ['简约通勤风', '休闲街头风', '优雅知性风', '甜美清新风', '复古文艺风'];
const DEFAULT_MAKEUPS = ['自然裸妆', '韩系水光妆', '日系清透妆', '气质通勤妆', '复古红唇妆'];

function buildEditPrompts(options?: HairstyleGenOptions): string[] {
  const category: AnalysisCategory = options?.category || 'hairstyle';
  const custom = options?.customPrompt?.trim();
  const recs = options?.recommendations;

  const promptPrefix = (() => {
    switch (category) {
      case 'makeup':
        return '保留此图所有特征完全不变。仅将妆容改为';
      case 'outfit':
        return '保留此图所有特征完全不变。仅将服装改为';
      default:
        return '保留此图所有特征完全不变。仅将发型改为';
    }
  })();

  const promptSuffix = (() => {
    switch (category) {
      case 'makeup':
        return '。不改变发型、服装、五官和背景。';
      case 'outfit':
        return '。不改变发型、妆容、五官和背景。';
      default:
        const color = options?.hairstyleColor || '自然黑';
        return `，发色${color}。新发型自然贴合头型。`;
    }
  })();

  if (recs?.length) {
    const prompts = recs.slice(0, 5).map(r =>
      `${promptPrefix}${r.name}，${r.description}${promptSuffix}`
    );
    if (custom) return prompts.map(p => `${p}\n\n用户额外要求：${custom}`);
    return prompts;
  }

  // 无推荐时使用默认列表
  const defaults = (() => {
    switch (category) {
      case 'makeup': return DEFAULT_MAKEUPS;
      case 'outfit': return DEFAULT_OUTFITS;
      default: return HAIR_TYPE_OPTIONS.map(t => t.label);
    }
  })();
  const prompts = defaults.map(item => `${promptPrefix}${item}${promptSuffix}`);
  if (custom) return prompts.map(p => `${p}\n\n用户额外要求：${custom}`);
  return prompts;
}

async function callWanxTextToImage(
  prompt: string,
  n = 1,
  signal?: AbortSignal,
): Promise<string[]> {
  const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/text2image/image-synthesis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    signal,
    body: JSON.stringify({
      model: 'wanx-v1',
      input: { prompt },
      parameters: { n, size: '1024*1024' },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('通义万相文生图提交失败:', res.status, errText);
    throw new Error('通义万相文生图提交失败');
  }
  const data = await res.json();
  const taskId = data.output?.task_id;
  if (!taskId) throw new Error('通义万相返回无效 task_id');
  return pollAliTask(taskId, 30, signal);
}

async function pollAliTask(taskId: string, maxRetries = 30, signal?: AbortSignal): Promise<string[]> {
  for (let i = 0; i < maxRetries; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await fetch(`/api/proxy/dashscope/api/v1/tasks/${taskId}`, { signal });
      if (!res.ok) { console.warn('阿里任务轮询失败:', res.status); continue; }
      const data = await res.json();
      const status = data.output?.task_status;
      if (status === 'SUCCEEDED') {
        const results = data.output?.results || [];
        return results.map((r: any) =>
          r.b64_image ? `data:image/png;base64,${r.b64_image}` : (r.url || '')
        );
      }
      if (status === 'FAILED') {
        throw new Error(`通义万相任务失败: ${data.output?.message || '未知错误'}`);
      }
    } catch (err) {
      throw err;
    }
  }
  throw new Error('通义万相图像生成超时');
}

export const aliProvider: ImageGenProviderImpl = {
  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  async analyzeFace(imageBase64: string, signal?: AbortSignal): Promise<string> {
    return callQwenVL(imageBase64, VLM_ANALYSIS_PROMPT_CN, signal);
  },

  async generateHairstyles(imageBase64: string, signal?: AbortSignal, options?: HairstyleGenOptions): Promise<string[]> {
    const prompts = buildEditPrompts(options);
    const results: string[] = [];
    let blockedCount = 0;

    for (let i = 0; i < prompts.length; i++) {
      if (signal?.aborted) break;

      try {
        const ref = options?.referenceImageBase64;
        const finalPrompt = ref ? `${prompts[i]}\n\n参考图2中的风格应用到图1上` : prompts[i];
        const urls = await callQwenImageEdit(imageBase64, finalPrompt, 1, signal, ref);
        if (urls.length === 0) {
          blockedCount++;
        } else {
          for (const url of urls) {
            if (url && !results.includes(url)) results.push(url);
          }
        }
      } catch (err) {
        // Single prompt failure (e.g. rate limit) shouldn't abort remaining prompts
        console.warn(`跳过第 ${i + 1}/${prompts.length} 个提示词:`, err);
      }

      if (results.length >= 5) break;
      if (i < prompts.length - 1) await new Promise(r => setTimeout(r, 600));
    }

    // All prompts were blocked by content inspection — surface to user
    if (results.length === 0 && blockedCount > 0) {
      throw new ContentBlockedError();
    }

    return results;
  },

  async extractHairstyle(imageBase64: string, signal?: AbortSignal): Promise<string> {
    const description = await callQwenVL(imageBase64, '请分析这张照片中的发型，提取出发型部分，生成一张透明背景的PNG发型素材图。要求：只保留发型部分，去除人脸和背景，发型轮廓清晰，适合用于照片换发合成。', signal);
    const images = await callWanxTextToImage(`透明背景的发型素材PNG：${description}。只包含发型，无人脸，无背景，轮廓清晰。`, 1, signal);
    if (images.length === 0) throw new Error('发型提取失败');
    return images[0];
  },

  async extractStyle(imageBase64: string, signal?: AbortSignal): Promise<StyleExtractionResult> {
    const raw = await callQwenVL(imageBase64, STYLE_EXTRACTION_PROMPT_CN, signal);
    const result: StyleExtractionResult = { hairstyle: [], makeup: [], outfit: [] };

    const lines = raw.split('\n').filter(l => l.trim());
    let currentSection = '';

    // More robust pattern matching
    const sectionPatterns: [RegExp, string][] = [
      [/【发[型色]】|##\s*发[型色]|发[型色]风格|发[型色][：:]|发[型色]分析|^.发[型色]/i, 'hairstyle'],
      [/【妆[容]】|##\s*妆[容]|妆[容]风格|妆[容][：:]|妆[容]分析|^.妆[容]/i, 'makeup'],
      [/【穿[搭]】|##\s*穿[搭]|穿[搭]风格|穿[搭][：:]|穿[搭]分析|服[装饰][：:]|^.穿[搭]/i, 'outfit'],
    ];

    for (const line of lines) {
      const trimmed = line.replace(/^[-*•\d]+[.、）)]?\s*/, '').trim();
      if (!trimmed) continue;

      // Check for section headers
      let matched = false;
      for (const [pattern, name] of sectionPatterns) {
        if (pattern.test(trimmed)) {
          currentSection = name;
          matched = true;
          // Try to extract style name from same line
          const m = trimmed.match(/[：:]\s*(.+)/);
          if (m) {
            const name = m[1].trim().replace(/^["""]|["""]$/g, '');
            const arr = result[currentSection as keyof StyleExtractionResult] as { name: string; description: string }[];
            if (name && (arr.length === 0 || arr[arr.length - 1].name !== name)) {
              arr.push({ name, description: '' });
            }
          }
          break;
        }
      }
      if (matched) continue;
      if (!currentSection) continue;

      const arr = result[currentSection as keyof StyleExtractionResult] as { name: string; description: string }[];

      // Try matching "风格名 - 描述" or "风格名：描述" format
      if (trimmed.includes('描述') || trimmed.includes('描述')) {
        const m = trimmed.match(/[：:]\s*(.+)/);
        if (m && arr.length > 0) {
          arr[arr.length - 1].description = m[1].trim();
          continue;
        }
      }

      // Try style name patterns (e.g., "简约通勤风", "复古红唇妆")
      const styleMatch = trimmed.match(/^(.{2,12}(?:风|妆|型|卷|发|感))/);
      if (styleMatch && arr.length === 0) {
        arr.push({ name: styleMatch[1].trim(), description: '' });
        continue;
      }

      // Generic: if current section has content, treat as description append
      if (arr.length > 0) {
        const existing = arr[arr.length - 1].description;
        arr[arr.length - 1].description = existing ? existing + ' ' + trimmed : trimmed;
      } else if (arr.length === 0 && trimmed.length > 1 && trimmed.length < 20) {
        // Short line not matched as style — could be a bare style name
        arr.push({ name: trimmed, description: '' });
      }
    }

    // Fallback: If parsing found nothing but raw response has content, try extracting style keywords
    if (result.hairstyle.length === 0 && result.makeup.length === 0 && result.outfit.length === 0) {
      const text = raw.toLowerCase();
      if (text.includes('发') || text.includes('型')) {
        result.hairstyle.push({ name: '未识别具体风格', description: raw.slice(0, 200) });
      }
      if (text.includes('妆')) {
        result.makeup.push({ name: '未识别具体风格', description: raw.slice(0, 200) });
      }
      if (text.includes('穿') || text.includes('服')) {
        result.outfit.push({ name: '未识别具体风格', description: raw.slice(0, 200) });
      }
    }

    return result;
  },
};
