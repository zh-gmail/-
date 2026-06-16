import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { baiduProvider } from '../baiduProvider';
import { aliProvider } from '../aliProvider';
import { falProvider } from '../falProvider';

// ---------- Helpers ----------

const MOCK_FACE_IMAGE = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...mock...';

function mockResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface FetchCall {
  url: string;
  body: unknown;
}

interface ErnieBody {
  messages: Array<{
    role: string;
    content: Array<{ type: string; text?: string; image?: string }>;
  }>;
}

interface SdxlBody {
  prompt: string;
  size?: string;
  n?: number;
  steps?: number;
}

interface AliQwenBody {
  model: string;
  input: {
    messages: Array<{
      role: string;
      content: Array<{ image?: string; text?: string }>;
    }>;
  };
}

interface AliWanxBody {
  model: string;
  input: { prompt: string };
  parameters: { n: number; size: string };
}

interface FalTransferBody {
  face_image: string;
  hairstyle_image: string;
  prompt: string;
}

// ---------- Identity Preservation Tests ----------

describe('Identity Preservation — Provider Prompt 验证', () => {
  let fetchCalls: FetchCall[] = [];

  beforeEach(() => {
    fetchCalls = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 百度 Provider — VLM 分析 + 文生图
  // ==========================================================================
  describe('百度文心一言', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        fetchCalls.push({ url: url.toString(), body });

        if (url.includes('oauth')) {
          return mockResponse({ access_token: 'mock-token-baidu' });
        }
        if (url.includes('wenxinworkshop/chat')) {
          return mockResponse({ result: '椭圆脸型，五官端正，肤色白皙，鼻梁挺直' });
        }
        if (url.includes('sd_xl') || url.includes('text2image')) {
          // 同步模式返回（无 task_id），避免 poll 循环
          return mockResponse({ data: [{ b64_image: 'mock-result-image' }] });
        }
        return mockResponse({});
      }));
    });

    it('VLM 分析 prompt 描述脸型/五官/肤色等身份特征', async () => {
      const results = await baiduProvider.generateHairstyles(MOCK_FACE_IMAGE, 'test-key', 'test-secret');

      expect(results).toHaveLength(1);
      expect(results[0]).toContain('data:image/png;base64');

      // 找到 ERNIE Vision 调用
      const analysisCall = fetchCalls.find(c => c.url.includes('wenxinworkshop/chat'));
      expect(analysisCall).toBeDefined();

      const messages = (analysisCall!.body as ErnieBody).messages;
      const content = messages[0].content;
      const textItem = content.find((c: { type: string; text?: string; image?: string }) => c.type === 'text');
      expect(textItem).toBeDefined();

      const prompt = textItem!.text;
      // 必须描述面部关键特征，作为身份保持的参照
      expect(prompt).toContain('脸型轮廓');
      expect(prompt).toContain('五官分布');
      expect(prompt).toContain('肤色');
      expect(prompt).toContain('发型特征');
      expect(prompt).toContain('后续发型生成的关键参照');
    });

    it('文生图 prompt 包含严格的身份保持约束', async () => {
      await baiduProvider.generateHairstyles(MOCK_FACE_IMAGE, 'test-key', 'test-secret');

      // 找到文生图调用
      const genCall = fetchCalls.find(c => c.url.includes('sd_xl'));
      expect(genCall).toBeDefined();

      const prompt: string = (genCall!.body as SdxlBody).prompt || '';
      // 身份保持核心规则
      expect(prompt).toContain('五官');
      expect(prompt).toContain('脸型');
      expect(prompt).toContain('肤色');
      expect(prompt).toContain('完全不变');
      expect(prompt).toContain('只替换发型');
      // 自然贴合要求
      expect(prompt).toContain('自然贴合');
      expect(prompt).toContain('面部表情');
      expect(prompt).toContain('光照');
    });
  });

  // ==========================================================================
  // 阿里 Provider — Qwen-VL 分析 + 通义万相文生图
  // ==========================================================================
  describe('阿里通义万相', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        fetchCalls.push({ url: url.toString(), body });

        if (url.includes('multimodal-generation')) {
          return mockResponse({
            output: {
              choices: [{ message: { content: [{ text: '圆脸型，五官精致，肤色偏白' }] } }],
            },
          });
        }
        if (url.includes('image-synthesis')) {
          return mockResponse({ output: { task_id: 'mock-task-ali' } });
        }
        if (url.includes('/tasks/')) {
          return mockResponse({
            output: {
              task_status: 'SUCCEEDED',
              results: [{ b64_image: 'mock-ali-result' }],
            },
          });
        }
        return mockResponse({});
      }));
    });

    it('VL 分析 + 文生图均包含身份保持要求', async () => {
      // 注意：ali poll 循环有 ~2s setTimeout 硬延迟
      const results = await aliProvider.generateHairstyles(MOCK_FACE_IMAGE, 'test-key');

      expect(results).toHaveLength(1);
      expect(results[0]).toContain('data:image/png;base64');

      // 1) VL 分析 prompt
      const analysisCall = fetchCalls.find(c => c.url.includes('multimodal-generation'));
      expect(analysisCall).toBeDefined();

      const content = (analysisCall!.body as AliQwenBody).input.messages[0].content;
      const textContent = content.find((c: { image?: string; text?: string }) => c.text)?.text || '';
      expect(textContent).toContain('脸型轮廓');
      expect(textContent).toContain('五官');
      expect(textContent).toContain('肤色');
      expect(textContent).toContain('发型特征');

      // 2) 文生图 prompt（通义万相）
      const genCall = fetchCalls.find(c => c.url.includes('image-synthesis'));
      expect(genCall).toBeDefined();

      const prompt: string = (genCall!.body as AliWanxBody).input?.prompt || '';
      expect(prompt).toContain('五官');
      expect(prompt).toContain('脸型');
      expect(prompt).toContain('肤色');
      expect(prompt).toContain('完全不变');
      expect(prompt).toContain('只替换发型');
      expect(prompt).toContain('自然贴合');
    });
  });

  // ==========================================================================
  // FAL Provider — Hairstyle-Transfer（图到图天生身份保持）
  // ==========================================================================
  describe('FAL AI', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        fetchCalls.push({ url: url.toString(), body });

        if (url.includes('hairstyle-transfer')) {
          return mockResponse({ image: { url: 'https://fal.run/results/mock.jpg' } });
        }
        return mockResponse({});
      }));
    });

    it('Hairstyle-Transfer 架构（图到图）天生保持身份特征', async () => {
      const results = await falProvider.generateHairstyles(MOCK_FACE_IMAGE, 'test-fal-key');

      // 5 个参考发型各生成一个结果
      expect(results).toHaveLength(5);
      results.forEach(r => expect(r).toContain('https://'));

      // 验证每个请求都包含原始人脸图和发型参考图
      const transferCalls = fetchCalls.filter(c => c.url.includes('hairstyle-transfer'));
      expect(transferCalls).toHaveLength(5);

      // 每个请求 body 应包含 face_image（原始人脸）
      transferCalls.forEach(call => {
        const reqBody = call.body as FalTransferBody;
        expect(reqBody.face_image).toBe(MOCK_FACE_IMAGE);
        expect(reqBody.hairstyle_image).toBeDefined();
        expect(typeof reqBody.hairstyle_image).toBe('string');
        expect(reqBody.hairstyle_image).toMatch(/^https?:\/\//);
        expect(reqBody.prompt).toBeDefined();
        expect(typeof reqBody.prompt).toBe('string');
      });
    });

    it('部分发型生成失败时降级返回成功结果', async () => {
      // 重置 fetch mock：让部分请求失败
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      let callCount = 0;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
        callCount++;
        // 第 2、4 个请求模拟失败
        if (callCount === 2 || callCount === 4) {
          throw new Error('FAL API 超时');
        }
        const body = options?.body ? JSON.parse(options.body as string) : {};
        fetchCalls.push({ url: url.toString(), body });

        if (url.includes('hairstyle-transfer')) {
          return mockResponse({ image: { url: 'https://fal.run/results/mock.jpg' } });
        }
        return mockResponse({});
      }));

      const results = await falProvider.generateHairstyles(MOCK_FACE_IMAGE, 'test-fal-key');

      // 5 个中 2 个失败 → 返回 3 个成功结果
      expect(results).toHaveLength(3);
    });
  });

  // ==========================================================================
  // 跨 Provider 一致性验证
  // ==========================================================================
  describe('跨 Provider 一致性', () => {
    it('所有 Provider 的 analysis prompt 都包含 face identity 描述要求', async () => {
      // 验证百度
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        fetchCalls.push({ url: url.toString(), body });

        if (url.includes('oauth')) return mockResponse({ access_token: 't' });
        if (url.includes('wenxinworkshop/chat')) return mockResponse({ result: '分析结果' });
        if (url.includes('sd_xl')) return mockResponse({ data: [{ b64_image: 'x' }] });
        return mockResponse({});
      }));

      await baiduProvider.generateHairstyles(MOCK_FACE_IMAGE, 'k', 's');

      const baiduAnalysis = fetchCalls.find(c => c.url.includes('wenxinworkshop/chat'));
      const baiduPrompt: string = baiduAnalysis
        ? (baiduAnalysis.body as ErnieBody).messages[0].content.find((c) => c.type === 'text')?.text || ''
        : '';
      expect(baiduPrompt).toContain('脸型');

      // 重置并验证阿里
      fetchCalls = [];
      vi.restoreAllMocks();

      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        fetchCalls.push({ url: url.toString(), body });

        if (url.includes('multimodal-generation')) {
          return mockResponse({ output: { choices: [{ message: { content: [{ text: '分析' }] } }] } });
        }
        if (url.includes('image-synthesis')) return mockResponse({ output: { task_id: 't' } });
        if (url.includes('/tasks/')) {
          return mockResponse({ output: { task_status: 'SUCCEEDED', results: [{ b64_image: 'x' }] } });
        }
        return mockResponse({});
      }));

      await aliProvider.generateHairstyles(MOCK_FACE_IMAGE, 'k');

      const aliAnalysis = fetchCalls.find(c => c.url.includes('multimodal-generation'));
      const aliPrompt: string = aliAnalysis
        ? (aliAnalysis.body as AliQwenBody).input.messages[0].content.find((c) => c.text)?.text || ''
        : '';
      expect(aliPrompt).toContain('脸型');
    });
  });
});
