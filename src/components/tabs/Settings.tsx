import React, { useState, useRef, useEffect } from 'react';
import { KeyRound, ShieldCheck, Cpu, Sparkles, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';
import { imageGenClient } from '../../services/imageGenClient';
import type { ImageProviderType } from '../../types';

export default function Settings() {
  const { settings, updateSettings } = useAppContext();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => clearTimeout(idleTimerRef.current);
  }, []);

  const handleTestConnection = async () => {
    if (!settings.imageApiKey) return;
    setTestStatus('testing');
    try {
      await imageGenClient.setProvider(settings.imageProvider);
      const ok = await imageGenClient.testConnection(settings.imageApiKey, settings.imageApiSecret || undefined);
      setTestStatus(ok ? 'success' : 'fail');
    } catch {
      setTestStatus('fail');
    }
    idleTimerRef.current = setTimeout(() => setTestStatus('idle'), 4000);
  };

  const baiduNeedsSecret = settings.imageProvider === 'baidu';

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
            <Sparkles className="text-neutral-400" size={24} />
            <h2 className="text-xl font-medium text-neutral-900 tracking-tight">AI 绘画 / 局部重绘服务</h2>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-neutral-200 space-y-6">
            {/* Provider selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-900">图像生成服务商</label>
              <div className="flex gap-3">
                {([['baidu', '百度文心一言'], ['ali', '阿里通义万相']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => updateSettings({ imageProvider: key as ImageProviderType })}
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

            {/* API Key */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-900">
                {settings.imageProvider === 'baidu' ? '百度 API Key (Client ID)' : '通义万相 API Key'}
              </label>
              <p className="text-neutral-500 text-sm leading-relaxed mb-4">
                "照片精修" 板块中用来提交发型生成的需求并返回5-8个预览版本的必备鉴权码。没有的话按预设输出结果缓存。
              </p>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="password"
                  value={settings.imageApiKey}
                  onChange={(e) => updateSettings({ imageApiKey: e.target.value })}
                  placeholder={settings.imageProvider === 'baidu' ? '百度 Client ID' : 'sk-****'}
                  className="pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent w-full transition-all font-mono text-sm"
                />
              </div>
            </div>

            {/* Baidu API Secret */}
            {baiduNeedsSecret && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-900">百度 Secret Key (Client Secret)</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    type="password"
                    value={settings.imageApiSecret}
                    onChange={(e) => updateSettings({ imageApiSecret: e.target.value })}
                    placeholder="百度 Client Secret"
                    className="pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent w-full transition-all font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {/* Test connection */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestConnection}
                disabled={!settings.imageApiKey || testStatus === 'testing'}
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
