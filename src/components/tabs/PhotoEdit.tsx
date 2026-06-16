import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { Upload, Sparkles, AlertCircle, Bookmark } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';
import { imageGenClient } from '../../services/imageGenClient';
import { resizeImage } from '../../utils/imageUtils';
import type { HairType } from '../../types';

const DEMO_DELAY_MS = 2000;

const DEMO_RESULTS = [
  'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1580618672591-eb18e285d852?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1620331307452-fddba3e6a9ee?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=400&q=80',
];

export default function PhotoEdit() {
  const { settings, addToLibrary } = useAppContext();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<HairType>('bob');
  const fileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const HAIR_TYPE_OPTIONS: { value: HairType; label: string }[] = [
    { value: 'short', label: '短发' },
    { value: 'buzz', label: '寸头' },
    { value: 'wool', label: '羊毛卷' },
    { value: 'long', label: '长发' },
    { value: 'bob', label: '波波头' },
  ];

  const noKey = settings.imageProvider === 'fal' ? !settings.imageFalKey : !settings.imageApiKey;
  const noKeyWarning = noKey ? (
    <div className="bg-amber-50 text-amber-800 p-4 rounded-xl flex items-start gap-3 border border-amber-200">
      <AlertCircle className="shrink-0 mt-0.5" size={20} />
      <div className="text-sm">
        <p className="font-medium">使用基础版示意生成</p>
        <p className="opacity-80 mt-1">由于未能在设置中连接图像生成API，当前展示占位示意合成图。</p>
      </div>
    </div>
  ) : null;

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleSaveToLibrary = (url: string, idx: number) => {
    addToLibrary({
      id: `photo-${Date.now()}-${idx}`,
      name: `AI 生成发型 ${idx + 1}`,
      type: selectedType,
      colorName: '自然黑',
      colorHex: '#2c2c2c',
      previewUrl: url,
    });
    setSavedIndices(prev => new Set(prev).add(idx));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      fileRef.current = file;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(file);
      setSelectedImage(objectUrlRef.current);
      setResults([]);
      setSavedIndices(new Set());
      setError(null);
    }
  };

  const generateHairstyles = async () => {
    setIsGenerating(true);
    setError(null);

    const isFal = settings.imageProvider === 'fal';
    const apiKey = isFal ? settings.imageFalKey : settings.imageApiKey;
    const apiSecret = isFal ? undefined : (settings.imageApiSecret || undefined);

    if (!apiKey) {
      setTimeout(() => {
        setResults(DEMO_RESULTS);
        setIsGenerating(false);
      }, DEMO_DELAY_MS);
      return;
    }

    const file = fileRef.current;
    if (!file) {
      setError('请先上传照片');
      setIsGenerating(false);
      return;
    }

    try {
      await imageGenClient.setProvider(settings.imageProvider);
      const base64 = await resizeImage(file);
      const images = await imageGenClient.generateHairstyles(base64, apiKey, apiSecret);
      setResults(images.length > 0 ? images : DEMO_RESULTS);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请检查 API 配置');
      setResults(DEMO_RESULTS);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full bg-neutral-50 flex flex-col p-6 overflow-y-auto pb-32">
      <div className="max-w-3xl mx-auto w-full space-y-8 mt-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">照片极速换发</h1>
          <p className="text-neutral-500">上传正脸照片，AI自动识别人脸与原生发型区域，生成5-8张适配脸型的发型和发色。</p>
        </header>

        {noKeyWarning}

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-start gap-3 border border-red-200">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="font-medium">API 调用失败</p>
              <p className="opacity-80 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-neutral-200">
          {!selectedImage ? (
             <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer group">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-neutral-400 group-hover:text-black transition-colors mb-4">
                 <Upload size={28} strokeWidth={1.5} />
               </div>
               <span className="text-neutral-900 font-medium tracking-wide">上传正脸照片</span>
               <span className="text-neutral-400 text-sm mt-2">支持 JPEG, PNG 格式，最大 10MB</span>
               <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
             </label>
          ) : (
            <div className="space-y-6">
              <div className="relative h-72 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-100">
                <img src={selectedImage} alt="Uploaded" className="w-full h-full object-contain" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 px-4 py-2 bg-black/50 hover:bg-black text-white text-sm rounded-full backdrop-blur-md transition-colors"
                >
                  更换图片
                </button>
              </div>

              {results.length === 0 && (
                <button 
                  onClick={generateHairstyles}
                  disabled={isGenerating}
                  className="w-full py-4 bg-black text-white rounded-xl font-medium tracking-wide hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      正在生成适配发型...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      AI 生成适配发型
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold tracking-tight text-neutral-900">生成结果</h3>
              <div className="flex items-center gap-3">
                <label className="text-sm text-neutral-500 font-medium">发型类型</label>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value as HairType)}
                  className="text-sm border border-neutral-300 rounded-lg px-3 py-1.5 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                >
                  {HAIR_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {results.map((r, idx) => (
                <div key={idx} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
                  <img src={r} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="variation" />
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-between">
                    <span className="text-white text-xs font-mono tracking-widest">发型风格 {idx + 1}</span>
                    <button
                      onClick={() => handleSaveToLibrary(r, idx)}
                      disabled={savedIndices.has(idx)}
                      className={`p-2 rounded-full transition-all ${savedIndices.has(idx) ? 'bg-green-500 text-white' : 'bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm'}`}
                    >
                      <Bookmark size={16} fill={savedIndices.has(idx) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
