import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { KeyRound, ShieldCheck, Cpu, Sparkles, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';
import { imageGenClient } from '../../services/imageGenClient';
import type { ImageProviderType } from '../../types';

const PROVIDER_OPTIONS: [ImageProviderType, string][] = [
  ['baidu', '百度文心一言'],
  ['ali', '阿里通义万相'],
  ['fal', 'FAL AI'],
];

function Settings() {
  const { settings, updateSettings, clearLibrary } = useAppContext();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(idleTimerRef.current);
  }, []);

  // Reset connection test status when switching provider
  useEffect(() => {
    setTestStatus('idle');
  }, [settings.imageProvider]);

  const isFal = settings.imageProvider === 'fal';
  const baiduNeedsSecret = settings.imageProvider === 'baidu';

  const handleTestConnection = useCallback(async () => {
    const key = isFal ? settings.imageFalKey : settings.imageApiKey;
    if (!key) return;
    clearTimeout(idleTimerRef.current);
    setTestStatus('testing');
    try {
      if (imageGenClient.getProviderName() !== settings.imageProvider) {
        await imageGenClient.setProvider(settings.imageProvider);
      }
      const ok = isFal
        ? await imageGenClient.testConnection(key)
        : await imageGenClient.testConnection(key, settings.imageApiSecret || undefined);
      setTestStatus(ok ? 'success' : 'fail');
    } catch (err) {
      console.error('API connection test failed:', err);
      setTestStatus('fail');
    }
    idleTimerRef.current = setTimeout(() => setTestStatus('idle'), 4000);
  }, [settings]);

  return (
    <div className="h-full bg-neutral-50 flex flex-col p-6 overflow-y-auto pb-32">
      <div className="max-w-2xl mx-auto w-full space-y-10 mt-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">配置中心 (授权)</h1>
          <p className="text-neutral-500">设置用于运行发型网格匹配、人脸关键点定位等第三方商用功能的认证凭证。</p>
        </header>

        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
            <Cpu className="text-neutral-400" size={24} />
            <h2 className="text-xl font-medium text-neutral-900 tracking-tight">商用级引擎接口</h2>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-neutral-200 space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-900">AR 面部追踪引擎</label>
              <p className="text-neutral-500 text-sm leading-relaxed mb-4">
                使用 MindAR（开源，MediaPipe 面部追踪）加载 3D 发型 GLB 模型，无需授权 Key。
              </p>
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-50 p-3 rounded-lg border border-green-100">
                <ShieldCheck size={18} />
                MindAR 引擎已就绪，无授权限制
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
            <h2 className="text-xl font-medium text-neutral-900 tracking-tight">数据管理</h2>
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-neutral-200 space-y-4">
            <p className="text-sm text-neutral-600">清空 IndexedDB 中所有已保存的发型素材。此操作不可撤销，清空后下次刷新页面将重新加载默认素材。</p>
            <button
              onClick={() => {
                if (window.confirm('确定要清空全部素材库吗？此操作不可撤销。')) {
                  clearLibrary();
                }
              }}
              className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-all"
            >
              清空本地素材库
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
            <Sparkles className="text-neutral-400" size={24} />
            <h2 className="text-xl font-medium text-neutral-900 tracking-tight">AI 绘画 / 局部重绘服务</h2>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-neutral-200 space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-900">图像生成服务商</label>
              <div className="flex gap-3">
                {PROVIDER_OPTIONS.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => updateSettings({ imageProvider: key })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                      settings.imageProvider === key
                        ? 'bg-black text-white border-black'
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-900">
                {isFal ? 'FAL API Key' : settings.imageProvider === 'baidu' ? '百度 API Key (Client ID)' : '通义万相 API Key'}
              </label>
              <p className="text-neutral-500 text-sm leading-relaxed mb-4">
                {isFal
                  ? "FAL AI 的 hairstyle-transfer 模型，上传正脸照片后自动匹配 5 种发型参考图生成换发效果。"
                  : '"照片精修" 板块中用来提交发型生成的需求并返回5-8个预览版本的必备鉴权码。没有的话按预设输出结果缓存。'}
              </p>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={isFal ? settings.imageFalKey : settings.imageApiKey}
                  onChange={(e) => updateSettings(isFal ? { imageFalKey: e.target.value } : { imageApiKey: e.target.value })}
                  placeholder={isFal ? 'FAL Key (fal-...)' : settings.imageProvider === 'baidu' ? '百度 Client ID' : 'sk-****'}
                  className="pl-12 pr-12 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent w-full transition-all font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  tabIndex={-1}
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {baiduNeedsSecret && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-900">百度 Secret Key (Client Secret)</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    type={showApiSecret ? 'text' : 'password'}
                    value={settings.imageApiSecret}
                    onChange={(e) => updateSettings({ imageApiSecret: e.target.value })}
                    placeholder="百度 Client Secret"
                    className="pl-12 pr-12 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent w-full transition-all font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiSecret(!showApiSecret)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showApiSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleTestConnection}
                disabled={(!isFal && !settings.imageApiKey) || (isFal && !settings.imageFalKey) || testStatus === 'testing'}
                className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {testStatus === 'testing' && <Loader2 size={16} className="animate-spin" />}
                测试连接
              </button>
              {testStatus === 'success' && (
                <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                  <CheckCircle2 size={16} /> 连接成功
                </span>
              )}
              {testStatus === 'fail' && (
                <span className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
                  <XCircle size={16} /> 连接失败，请检查 Key
                </span>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default memo(Settings);
