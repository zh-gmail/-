import { Upload, Sparkles, Scissors, Brush, Shirt, Bookmark, Loader2, Camera, Check } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { useImageUpload } from '../hooks/useImageUpload';
import { imageGenClient } from '../services/imageGenClient';
import { resizeImage } from '../utils/imageUtils';
import { useAppContext } from '../store/AppContext';
import { generateId } from '../utils/id';
import type { StyleExtractionResult } from '../services/imageGenClient';
import CameraCapture from '../components/CameraCapture';
import type { AssetCategory } from '../types';

export default function ExtractPage() {
  const { selectedImage, fileRef, handleFileSelect, setImageFromDataUrl } = useImageUpload();
  const { addToLibrary, settings } = useAppContext();
  const [categoryFilter, setCategoryFilter] = useState<'hairstyle' | 'makeup' | 'outfit'>('hairstyle');
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<StyleExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

  const category = categoryFilter as AssetCategory;
  const currentItems = extractResult ? extractResult[categoryFilter] : [];

  const CATEGORIES = [
    { id: 'hairstyle' as const, label: '发型', icon: Scissors },
    { id: 'makeup' as const, label: '妆容', icon: Brush },
    { id: 'outfit' as const, label: '穿搭', icon: Shirt },
  ];

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e);
    setExtractResult(null);
    setError(null);
  }, [handleFileSelect]);

  const handleCameraCapture = useCallback((dataUrl: string) => {
    setImageFromDataUrl(dataUrl);
    setShowCamera(false);
    setExtractResult(null);
    setError(null);
  }, [setImageFromDataUrl]);

  const handleExtract = useCallback(async () => {
    if (!selectedImage || !fileRef.current) return;
    setExtracting(true);
    setError(null);
    setSavedItems(new Set());
    try {
      const base64 = await resizeImage(fileRef.current);
      const result = await imageGenClient.extractStyle(base64);
      setExtractResult(result);
      if (result.hairstyle.length === 0 && result.makeup.length === 0 && result.outfit.length === 0) {
        setError('AI 未能识别出风格特征，请尝试更换照片');
      }
      // Auto-save all extracted styles if enabled
      if (settings.autoSaveAssets) {
        const entries: [string, AssetCategory, { name: string; description: string }[]][] = [
          ['hairstyle', 'hairstyle', result.hairstyle],
          ['makeup', 'makeup', result.makeup],
          ['outfit', 'outfit', result.outfit],
        ];
        const saved = new Set<string>();
        for (const [, cat, items] of entries) {
          for (const item of items) {
            const key = `${cat}-${item.name}`;
            if (saved.has(key)) continue;
            saved.add(key);
            addToLibrary({
              id: generateId(),
              name: item.name,
              category: cat,
              type: 'extracted',
              colorName: '—',
              colorHex: '#9C8468',
              description: item.description,
              previewUrl: selectedImage,
              createdAt: Date.now(),
            });
          }
        }
        setSavedItems(saved);
      }
    } catch (err) {
      console.error('Extract failed:', err);
      setError('提取失败，请检查 API 配置和网络连接');
    } finally {
      setExtracting(false);
    }
  }, [selectedImage, fileRef, settings.autoSaveAssets, addToLibrary]);

  const handleSaveToLibrary = useCallback((styleName: string, styleDesc: string) => {
    const key = `${categoryFilter}-${styleName}`;
    if (savedItems.has(key)) return;
    addToLibrary({
      id: generateId(),
      name: styleName,
      category,
      type: 'extracted',
      colorName: '—',
      colorHex: '#9C8468',
      description: styleDesc,
      previewUrl: selectedImage || '',
      createdAt: Date.now(),
    });
    setSavedItems(prev => new Set(prev).add(key));
  }, [categoryFilter, category, addToLibrary, selectedImage, savedItems]);

  return (
    <main className="max-w-7xl mx-auto w-full px-6 md:px-8 py-8 grid grid-cols-12 gap-6 min-h-[calc(100vh-80px)]">
{/* LEFT: Image Area */}
      <section className="col-span-12 lg:col-span-7 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="font-headline-lg text-headline-lg">素材提取</h1>
            <p className="font-body-md text-on-surface-variant mt-2 text-sm">上传人物照片，AI 自动提取发型、妆容和穿搭的风格特征并保存到素材库。</p>
          </div>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" className="absolute w-0 h-0 opacity-0 pointer-events-none" accept="image/*" onChange={handleImageUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-outline text-label-caps font-label-caps hover:bg-surface-container transition-colors"
            >
              <Upload className="w-4 h-4" strokeWidth={1.5} />
              上传照片
            </button>
            <button
              onClick={() => setShowCamera(true)}
              className="flex items-center gap-2 px-4 py-2 border border-outline text-label-caps font-label-caps hover:bg-surface-container transition-colors"
            >
              <Camera className="w-4 h-4" strokeWidth={1.5} />
              拍照
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="relative w-full aspect-[4/5] bg-surface-container-low overflow-hidden border border-outline-variant">
          <div className="absolute inset-0 flex items-center justify-center">
            {showCamera ? (
              <div className="w-full h-full bg-black">
                <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} fullscreen />
              </div>
            ) : selectedImage ? (
              <div className="relative w-full h-full">
                <img className="w-full h-full object-contain" alt="Uploaded" src={selectedImage} />
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-outline-variant text-label-caps font-label-caps text-ink-black hover:bg-white transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                    换一张
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
                    className="px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-outline-variant text-label-caps font-label-caps text-ink-black hover:bg-white transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" strokeWidth={1.5} />
                    拍照
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-on-surface-variant/50">
                <img
                  className="w-full h-full object-cover opacity-40"
                  src="https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=800&q=80"
                  alt="模特示例"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-white/70" strokeWidth={1} />
                  <p className="font-body-md text-white/90">上传人物照片开始风格提取</p>
                </div>
              </div>
            )}
          </div>
          {extracting && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
              <div className="bg-white p-6 flex items-center gap-3 shadow-lg">
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                <span className="font-label-md text-label-md">AI 正在分析风格...</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 bg-error-container border border-error/20 text-on-error-container font-label-md text-label-md">
            {error}
          </div>
        )}
      </section>

      {/* RIGHT: Category + Extraction + Results */}
      <aside className="col-span-12 lg:col-span-5 flex flex-col gap-6">
        {/* Category Selection */}
        <div className="bg-linen-beige/30 p-4 border border-outline-variant">
          <h2 className="font-label-caps text-label-caps text-earth-taupe mb-4">选择提取类别</h2>
          <div className="flex gap-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryFilter(cat.id); setSavedItems(new Set()); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-label-caps text-label-caps transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-ink-black text-white'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  {cat.label}
                  {categoryFilter === cat.id && (
                    <Check className="w-3 h-3" strokeWidth={3} />
                  )}
                </button>
              );
            })}
          </div>
          {/* Start Extract Button */}
          {selectedImage && (
            <button
              onClick={handleExtract}
              disabled={extracting}
              className="w-full mt-4 py-3 bg-ink-black text-white font-label-caps text-label-caps tracking-widest hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {extracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                  分析中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                  {extractResult ? '重新提取' : '开始提取'}
                </>
              )}
            </button>
          )}
        </div>

        {/* Analysis Results */}
        <div className="bg-linen-beige/30 p-4 border border-outline-variant flex-1 flex flex-col">
          <h2 className="font-label-caps text-label-caps text-earth-taupe mb-4">风格分析</h2>
          <div className="h-[2px] w-12 bg-earth-taupe mb-4"></div>

          <div className="flex-grow overflow-y-auto pr-2 flex flex-col gap-4">
            {!extractResult && !extracting && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Sparkles className="w-12 h-12 text-outline-variant mb-4" strokeWidth={1} />
                <p className="font-body-md text-on-surface-variant">上传照片后选择类别并点击"开始提取"</p>
                <p className="text-xs text-on-surface-variant/60 mt-2">AI 将自动分析人物的风格特征</p>
              </div>
            )}

            {extracting && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 className="w-10 h-10 text-earth-taupe animate-spin mb-4" strokeWidth={1.5} />
                <p className="font-body-md text-on-surface-variant">正在调用 AI 分析风格...</p>
              </div>
            )}

            {extractResult && (
              <>
                {/* Hairstyle Analysis */}
                {extractResult.hairstyle.length > 0 && (
                  <div className="flex flex-col gap-2 pb-3 border-b border-outline-variant/30">
                    <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase flex items-center gap-2">
                      <Scissors className="w-4 h-4" strokeWidth={1.5} />
                      发型风格分析
                    </h3>
                    {extractResult.hairstyle.map((item, i) => (
                      <div key={`h-${i}`} className="flex items-start gap-3 p-3 bg-canvas-white border border-outline-variant">
                        <div className="flex-1 min-w-0">
                          <span className="font-label-md text-label-md text-ink-black font-medium block truncate">{item.name}</span>
                          {item.description && (
                            <span className="text-xs text-on-surface-variant block mt-1 leading-relaxed">{item.description}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleSaveToLibrary(item.name, item.description)}
                          disabled={savedItems.has(`hairstyle-${item.name}`)}
                          className={`shrink-0 p-1.5 rounded-full transition-colors ${
                            savedItems.has(`hairstyle-${item.name}`)
                              ? 'text-earth-taupe'
                              : 'text-outline-variant hover:text-earth-taupe'
                          }`}
                        >
                          <Bookmark className="w-4 h-4" strokeWidth={1.5} fill={savedItems.has(`hairstyle-${item.name}`) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Makeup Analysis */}
                {extractResult.makeup.length > 0 && (
                  <div className="flex flex-col gap-2 pb-3 border-b border-outline-variant/30">
                    <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase flex items-center gap-2">
                      <Brush className="w-4 h-4" strokeWidth={1.5} />
                      妆容风格分析
                    </h3>
                    {extractResult.makeup.map((item, i) => (
                      <div key={`m-${i}`} className="flex items-start gap-3 p-3 bg-canvas-white border border-outline-variant">
                        <div className="flex-1 min-w-0">
                          <span className="font-label-md text-label-md text-ink-black font-medium block truncate">{item.name}</span>
                          {item.description && (
                            <span className="text-xs text-on-surface-variant block mt-1 leading-relaxed">{item.description}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleSaveToLibrary(item.name, item.description)}
                          disabled={savedItems.has(`makeup-${item.name}`)}
                          className={`shrink-0 p-1.5 rounded-full transition-colors ${
                            savedItems.has(`makeup-${item.name}`)
                              ? 'text-earth-taupe'
                              : 'text-outline-variant hover:text-earth-taupe'
                          }`}
                        >
                          <Bookmark className="w-4 h-4" strokeWidth={1.5} fill={savedItems.has(`makeup-${item.name}`) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Outfit Analysis */}
                {extractResult.outfit.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase flex items-center gap-2">
                      <Shirt className="w-4 h-4" strokeWidth={1.5} />
                      穿搭风格分析
                    </h3>
                    {extractResult.outfit.map((item, i) => (
                      <div key={`o-${i}`} className="flex items-start gap-3 p-3 bg-canvas-white border border-outline-variant">
                        <div className="flex-1 min-w-0">
                          <span className="font-label-md text-label-md text-ink-black font-medium block truncate">{item.name}</span>
                          {item.description && (
                            <span className="text-xs text-on-surface-variant block mt-1 leading-relaxed">{item.description}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleSaveToLibrary(item.name, item.description)}
                          disabled={savedItems.has(`outfit-${item.name}`)}
                          className={`shrink-0 p-1.5 rounded-full transition-colors ${
                            savedItems.has(`outfit-${item.name}`)
                              ? 'text-earth-taupe'
                              : 'text-outline-variant hover:text-earth-taupe'
                          }`}
                        >
                          <Bookmark className="w-4 h-4" strokeWidth={1.5} fill={savedItems.has(`outfit-${item.name}`) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Save All Button */}
          {extractResult && currentItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-outline-variant">
              <button
                onClick={() => currentItems.forEach(item => handleSaveToLibrary(item.name, item.description))}
                className="w-full bg-ink-black text-white py-3 font-label-caps text-label-caps tracking-[0.15em] hover:bg-earth-taupe transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Bookmark className="w-4 h-4" strokeWidth={1.5} />
                全部保存至素材库 ({currentItems.length})
              </button>
            </div>
          )}
        </div>
      </aside>
    </main>
  );
}
