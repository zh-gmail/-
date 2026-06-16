import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { Upload, Scissors, Download, Palette, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';
import { HairstyleItem } from '../../types';
import { imageGenClient } from '../../services/imageGenClient';
import { resizeImage } from '../../utils/imageUtils';

const DEMO_DELAY_MS = 1500;

export default function Extraction() {
  const { settings, addToLibrary, setActiveTab } = useAppContext();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedResult, setExtractedResult] = useState<string | null>(null);
  const [colorName, setColorName] = useState('自定义色');
  const [colorHex, setColorHex] = useState('#323232');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      fileRef.current = file;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(file);
      setSelectedImage(objectUrlRef.current);
      setExtractedResult(null);
      setError(null);
    }
  };

  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);

    if (!settings.imageApiKey) {
      setTimeout(() => {
        setExtractedResult('https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=400&q=80');
        setIsExtracting(false);
      }, DEMO_DELAY_MS);
      return;
    }

    try {
      await imageGenClient.setProvider(settings.imageProvider);
      const base64 = await resizeImage(fileRef.current!);
      const result = await imageGenClient.extractHairstyle(base64, settings.imageApiKey, settings.imageApiSecret || undefined);
      setExtractedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提取失败，请检查 API 配置');
    } finally {
      setIsExtracting(false);
    }
  };

  const saveToLibrary = () => {
    if (!extractedResult) return;
    const newItem: HairstyleItem = {
      id: `ext_${Date.now()}`,
      name: '提取发型',
      type: 'short',
      colorName: colorName,
      colorHex: colorHex,
      previewUrl: extractedResult
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
                        onClick={() => setSelectedImage(null)}
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
                 <div className="pt-6 border-t border-neutral-100 space-y-6 animate-in slide-in-from-bottom-4">
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

                   {/* 预设发色选择 */}
                   <div>
                     <label className="block text-sm font-medium text-neutral-900 mb-2 flex items-center gap-2">
                       <Palette size={16} className="text-neutral-500" />
                       选择发色
                     </label>
                     <div className="flex flex-wrap gap-3">
                       {[
                         { hex: '#1a1a1a', name: '黑色' },
                         { hex: '#5c3a1e', name: '深棕' },
                         { hex: '#8b5e3c', name: '浅棕' },
                         { hex: '#d4a853', name: '金色' },
                         { hex: '#b84a4a', name: '红色' },
                         { hex: '#8c8c8c', name: '灰色' },
                         { hex: '#c4a882', name: '亚麻' },
                         { hex: '#e8d8c8', name: '米白' },
                         { hex: '#4a6fa5', name: '蓝色' },
                         { hex: '#6b3a5a', name: '紫色' },
                       ].map((c) => (
                         <button
                           key={c.hex}
                           type="button"
                           onClick={() => setColorHex(c.hex)}
                           title={c.name}
                           className={`w-8 h-8 rounded-full border-2 transition-all ${colorHex === c.hex ? 'border-black scale-110 shadow-md' : 'border-neutral-300 hover:scale-110'}`}
                           style={{ backgroundColor: c.hex }}
                         />
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
