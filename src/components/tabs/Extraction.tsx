import { useState, useRef, useEffect, useCallback, memo, type ChangeEvent } from 'react';
import { Upload, Scissors, Download, Palette, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';
import { useImageUpload } from '../../hooks/useImageUpload';
import type { HairstyleItem, HairType } from '../../types';
import { HAIR_TYPE_OPTIONS } from '../../constants/hairTypes';
import { imageGenClient } from '../../services/imageGenClient';
import { resizeImage } from '../../utils/imageUtils';
import { HAIR_COLOR_PRESETS } from '../../constants/hairColors';

const DEMO_DELAY_MS = 1500;

function Extraction() {
  const { settings, addToLibrary, setActiveTab } = useAppContext();
  const { selectedImage, fileRef, handleFileSelect, clearImage } = useImageUpload();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedResult, setExtractedResult] = useState<string | null>(null);
  const [colorName, setColorName] = useState('自然黑');
  const [colorHex, setColorHex] = useState('#1a1a1a');
  const [selectedType, setSelectedType] = useState<HairType>('short');
  const [error, setError] = useState<string | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      clearTimeout(demoTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const handleClearImage = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearTimeout(demoTimerRef.current);
    setExtractedResult(null);
    setError(null);
    setIsExtracting(false);
    clearImage();
  }, [clearImage]);

  const noKey = settings.imageProvider === 'fal' ? !settings.imageFalKey : !settings.imageApiKey;
  const noKeyWarning = noKey ? (
    <div className="bg-amber-50 text-amber-800 p-4 rounded-xl flex items-start gap-3 border border-amber-200">
      <AlertCircle className="shrink-0 mt-0.5" size={20} />
      <div className="text-sm">
        <p className="font-medium">使用基础版示意提取</p>
        <p className="opacity-80 mt-1">由于未能在设置中连接图像生成API，当前展示占位示意结果。</p>
      </div>
    </div>
  ) : null;

  const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    if (rawFile.size > 10 * 1024 * 1024) {
      setError('图片大小超过限制，请选择 10MB 以内的图片');
      e.target.value = '';
      return;
    }
    handleFileSelect(e);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    requestIdRef.current++;
    clearTimeout(demoTimerRef.current);
    setExtractedResult(null);
    setError(null);
    setIsExtracting(false);
  }, [handleFileSelect]);

  const handleExtract = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const requestId = ++requestIdRef.current;
    setIsExtracting(true);
    setError(null);

    const isFal = settings.imageProvider === 'fal';
    const apiKey = isFal ? settings.imageFalKey : settings.imageApiKey;
    const apiSecret = isFal ? undefined : (settings.imageApiSecret || undefined);

    if (!apiKey) {
      clearTimeout(demoTimerRef.current);
      demoTimerRef.current = setTimeout(() => {
        if (requestId !== requestIdRef.current) return;
        setExtractedResult('https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=400&q=80');
        setIsExtracting(false);
      }, DEMO_DELAY_MS);
      return;
    }

    if (!fileRef.current) {
      setError('请先上传包含发型的照片');
      setIsExtracting(false);
      return;
    }

    try {
      await imageGenClient.setProvider(settings.imageProvider);
      const base64 = await resizeImage(fileRef.current);
      const result = await imageGenClient.extractHairstyle(base64, apiKey, apiSecret, signal);
      if (requestId !== requestIdRef.current) return;
      setExtractedResult(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (requestId !== requestIdRef.current) return;
      console.error(err);
      setError('调用失败，请检查 API 配置和网络连接');
    } finally {
      if (requestId === requestIdRef.current) {
        setIsExtracting(false);
      }
    }
  }, [settings]);

  const saveToLibrary = () => {
    if (!extractedResult) return;
    const newItem: HairstyleItem = {
      id: `ext_${crypto.randomUUID()}`,
      name: '提取发型',
      type: selectedType,
      colorName: colorName,
      colorHex: colorHex,
      previewUrl: extractedResult,
      createdAt: Date.now(),
    };
    addToLibrary(newItem);
    setActiveTab('library');
  };

  return (
    <div className="h-full bg-neutral-50 flex flex-col p-6 overflow-y-auto pb-32">
      <div className="max-w-3xl mx-auto w-full space-y-8 mt-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">提取素材发型</h1>
          <p className="text-neutral-500">上传带有参考发型的照片，系统将提取其中的发型、发带颜色，并将成果保存到您的本地素材库，可随时用于 AR 实景试戴。</p>
        </header>

        {noKeyWarning}

        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-start gap-3 border border-red-200">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <p className="text-sm opacity-80">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-neutral-200">
           {!selectedImage ? (
             <label className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-neutral-300 rounded-2xl bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer group">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-neutral-400 group-hover:text-black transition-colors mb-4">
                 <Upload size={28} strokeWidth={1.5} />
               </div>
               <span className="text-neutral-900 font-medium tracking-wide">上传包含发型的参考图</span>
               <span className="text-neutral-400 text-sm mt-2">推荐人像面部或发型清晰的照片</span>
               <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
             </label>
           ) : (
             <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                   <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-widest">原图</h3>
                   <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-100 relative group">
                     <img src={selectedImage} alt="Source" loading="lazy" className="w-full h-full object-cover" />
                     <button
                        onClick={handleClearImage}
                        className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm font-medium"
                      >
                        更换照片
                      </button>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-widest">提取结果演示</h3>
                   {extractedResult ? (
                     <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-white border border-neutral-200 p-4 relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-10 rounded-2xl"></div>
                        <img src={extractedResult} alt="Extracted" className="w-full h-full object-contain relative z-10 drop-shadow-2xl" style={{ filter: 'brightness(1.1) contrast(1.1)' }} />
                     </div>
                   ) : (
                     <div className="aspect-[3/4] rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center">
                         <button 
                           onClick={handleExtract}
                           disabled={isExtracting}
                           className="px-6 py-3 bg-black text-white rounded-full font-medium tracking-wide hover:bg-neutral-800 transition-all flex items-center gap-2 disabled:opacity-50"
                         >
                           {isExtracting ? (
                             <>
                               <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                               提取中...
                             </>
                           ) : (
                             <>
                               <Scissors size={18} />
                               提取发型
                             </>
                           )}
                         </button>
                     </div>
                   )}
                 </div>
               </div>

               {extractedResult && (
                 <div className="pt-6 border-t border-neutral-100 space-y-6">
                   <div>
                     <label className="block text-sm font-medium text-neutral-900 mb-2 flex items-center gap-2">
                       <Palette size={16} className="text-neutral-500" />
                       发色色系
                     </label>
                     <input 
                       type="text" 
                       value={colorName}
                       onChange={(e) => setColorName(e.target.value)}
                       className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                       placeholder="如：深红色，银色..."
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-neutral-900 mb-2 flex items-center gap-2">
                       <Palette size={16} className="text-neutral-500" />
                       选择发色
                     </label>
                     <div className="flex flex-wrap gap-3">
                       {HAIR_COLOR_PRESETS.map((c) => (
                         <button
                           key={c.hex}
                           type="button"
                           onClick={() => { setColorHex(c.hex); setColorName(c.name); }}
                           title={c.name}
                           className={`w-8 h-8 rounded-full border-2 transition-all ${colorHex === c.hex ? 'border-black scale-110 shadow-md' : 'border-neutral-300 hover:scale-110'}`}
                           style={{ backgroundColor: c.hex }}
                         />
                       ))}
                     </div>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-neutral-900 mb-2">
                       发型类型
                     </label>
                     <div className="flex flex-wrap gap-2">
                       {HAIR_TYPE_OPTIONS.map(opt => (
                         <button
                           key={opt.value}
                           type="button"
                           onClick={() => setSelectedType(opt.value)}
                           className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                             selectedType === opt.value
                               ? 'bg-black text-white shadow-md'
                               : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                           }`}
                         >
                           {opt.label}
                         </button>
                       ))}
                     </div>
                   </div>

                   <button
                     onClick={saveToLibrary}
                     className="w-full py-4 bg-black text-white rounded-xl font-medium tracking-wide hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                   >
                     <Download size={20} />
                     保存素材并转至库
                   </button>
                 </div>
               )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

export default memo(Extraction);
