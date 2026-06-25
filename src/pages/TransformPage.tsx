import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronsLeftRight, Sparkles, Upload, Camera, Download, Bookmark, Check, Wand2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { useImageUpload } from '../hooks/useImageUpload';
import { imageGenClient, ContentBlockedError } from '../services/imageGenClient';
import { resizeImage } from '../utils/imageUtils';
import { generateId } from '../utils/id';
import { parseFaceAnalysis } from '../utils/faceAnalysis';
import { HAIR_COLOR_PRESETS } from '../constants/hairColors';
import ScanOverlay from '../components/ScanOverlay';
import CameraCapture from '../components/CameraCapture';
import type { AssetCategory, HairstyleRecommendation, StyleRecommendation, HairstyleItem } from '../types';

interface ResultItem {
  id: string;
  url: string;
  category: AssetCategory;
}

function withIds(urls: string[], category: AssetCategory): ResultItem[] {
  return urls.map(url => ({ id: generateId(), url, category }));
}

const DEMO_RESULTS = [
  'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1580618672591-eb18e285d852?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1620331307452-fddba3e6a9ee?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=400&q=80',
];

const DEFAULT_PORTRAIT =
  'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=800&q=80';

export default function TransformPage() {
  const { library, addToLibrary, settings } = useAppContext();
  const { selectedImage, fileRef, handleFileSelect, setImageFromDataUrl, error: uploadError } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedColorName, setSelectedColorName] = useState('自然黑');
  const [selectedColorHex, setSelectedColorHex] = useState('#1a1a1a');
  const [customPrompt] = useState('');
  const [faceAnalysis, setFaceAnalysis] = useState<string | null>(null);
  const [hairstyleRecs, setHairstyleRecs] = useState<HairstyleRecommendation[]>([]);
  const [makeupRecs, setMakeupRecs] = useState<StyleRecommendation[]>([]);
  const [outfitRecs, setOutfitRecs] = useState<StyleRecommendation[]>([]);
  const [faceAnalyzing, setFaceAnalyzing] = useState(false);
  const [scanStage, setScanStage] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'hairstyle' | 'makeup' | 'outfit'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'makeup') return 'makeup';
    if (tab === 'outfit') return 'outfit';
    return 'hairstyle';
  });
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const displayError = error || uploadError;
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [selectedRecIdx, setSelectedRecIdx] = useState(0);

  const [selectedResultIdx, setSelectedResultIdx] = useState(0);
  const [isAutoRecommending, setIsAutoRecommending] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | 'unisex' | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<{ name: string; description: string } | null>(null);

  const currentResults = useMemo(() => results.filter(r => r.category === activeTab), [results, activeTab]);
  const bestResult = currentResults[selectedResultIdx] || currentResults[0];

  const libraryItems = useMemo(() => {
    return library.filter(item => {
      if (item.category !== activeTab) return false;
      // Show items even if gender is undefined (old data without gender field)
      if (genderFilter && item.gender !== undefined && item.gender !== genderFilter) return false;
      return true;
    });
  }, [library, activeTab, genderFilter]);

  const noKey = !settings.imageApiKey;

  const categoryLabel = activeTab === 'hairstyle' ? '发型' : activeTab === 'makeup' ? '妆容' : '穿搭';
  const tabs = [
    { id: 'hairstyle' as const, label: '发型' },
    { id: 'makeup' as const, label: '妆容' },
    { id: 'outfit' as const, label: '服饰' },
  ];

  useEffect(() => {
    const handleMouseUp = () => setIsResizing(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect();
      let pos = ((e.clientX - rect.left) / rect.width) * 100;
      pos = Math.max(0, Math.min(100, pos));
      setSliderPosition(pos);
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isResizing]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCamera(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const getActiveRecs = useCallback((): StyleRecommendation[] => {
    switch (activeTab) {
      case 'makeup': return makeupRecs;
      case 'outfit': return outfitRecs;
      default: return hairstyleRecs;
    }
  }, [activeTab, hairstyleRecs, makeupRecs, outfitRecs]);

  const doGenerate = useCallback(async (
    signal: AbortSignal,
    requestId: number,
    params: { existingAnalysis?: string; recs?: StyleRecommendation[]; customPromptText?: string; referenceImageBase64?: string },
  ) => {
    const file = fileRef.current;
    if (!file) { setError('请先上传照片'); setIsGenerating(false); return; }
    try {
      const base64 = await resizeImage(file);
      const images = await imageGenClient.generateHairstyles(base64, signal, {
        customPrompt: params.customPromptText || customPrompt || undefined,
        existingAnalysis: params.existingAnalysis || faceAnalysis || undefined,
        hairstyleColor: selectedColorName,
        hairstyleColorHex: selectedColorHex,
        category: activeTab,
        recommendations: params.recs?.length ? params.recs : undefined,
        referenceImageBase64: params.referenceImageBase64 || undefined,
      });
      if (requestId !== requestIdRef.current) return;
      const newResults = withIds(images.length > 0 ? images : DEMO_RESULTS, activeTab);
      setResults(prev => [...prev.filter(r => r.category !== activeTab), ...newResults]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (requestId !== requestIdRef.current) return;
      console.error(err);
      if (err instanceof ContentBlockedError) {
        setError('上传的照片触发了 AI 内容审核');
      } else {
        setError('调用失败，请检查 API 配置和网络连接');
      }
    } finally {
      if (requestId === requestIdRef.current) setIsGenerating(false);
    }
  }, [fileRef, selectedColorName, selectedColorHex, activeTab, customPrompt, faceAnalysis]);

  const handleTabChange = useCallback((tab: typeof activeTab) => {
    setActiveTab(tab);
    setSelectedRecIdx(0);
    setSelectedResultIdx(0);
    setSelectedLibraryItem(null);
  }, []);

  const handleLibrarySelect = useCallback(async (item: HairstyleItem) => {
    const idx = libraryItems.findIndex(i => i.id === item.id);
    setSelectedRecIdx(idx >= 0 ? idx : 0);
    setSelectedLibraryItem({ name: item.name, description: item.description || '' });
    if (!selectedImage || !fileRef.current) return;
    try {
      if (item.previewUrl.startsWith('data:')) {
        setReferenceImage(item.previewUrl);
      } else {
        const resp = await fetch(item.previewUrl);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        setReferenceImage(dataUrl);
      }
    } catch (err) {
      console.warn('Failed to load library preview as reference:', err);
    }
  }, [selectedImage, fileRef, libraryItems]);

  // Reset state when image changes
  useEffect(() => {
    if (!selectedImage) {
      setFaceAnalysis(null); setHairstyleRecs([]); setMakeupRecs([]); setOutfitRecs([]);
      setScanStage(0); setError(null); setResults([]); setSelectedResultIdx(0);
      setSelectedLibraryItem(null);
    }
  }, [selectedImage]);

  // Reset selected result index when tab changes
  useEffect(() => {
    setSelectedResultIdx(0);
  }, [activeTab]);

  const handleRegenerate = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    const reqId = ++requestIdRef.current;
    setIsGenerating(true);
    const recs = getActiveRecs();
    // Library selection takes priority over AI auto-recommendations
    let effectiveRecs: StyleRecommendation[] | undefined;
    if (selectedLibraryItem) {
      effectiveRecs = [{ name: selectedLibraryItem.name, description: selectedLibraryItem.description }];
    } else if (recs.length > 0) {
      effectiveRecs = recs;
    }
    doGenerate(signal, reqId, {
      existingAnalysis: faceAnalysis || undefined,
      recs: effectiveRecs,
      referenceImageBase64: referenceImage ? referenceImage.split(',')[1] : undefined,
    });
  }, [faceAnalysis, doGenerate, getActiveRecs, referenceImage, selectedLibraryItem]);

  const handleAutoRecommend = useCallback(async () => {
    if (!selectedImage || !fileRef.current) return;
    setIsAutoRecommending(true);
    setIsGenerating(true);
    setFaceAnalyzing(true);
    setScanStage(0);
    setResults([]);
    setSelectedResultIdx(0);
    const reqId = ++requestIdRef.current;
    const stageTimer = setInterval(() => { setScanStage(prev => Math.min(prev + 1, 3)); }, 1500);
    try {
      const base64 = await resizeImage(fileRef.current);
      const analysis = await imageGenClient.analyzeFace(base64);
      if (reqId !== requestIdRef.current) return;
      const parsed = parseFaceAnalysis(analysis);
      setFaceAnalysis(parsed.analysisText);
      setHairstyleRecs(parsed.hairstyleRecs);
      setMakeupRecs(parsed.makeupRecs);
      setOutfitRecs(parsed.outfitRecs);
      const recs = activeTab === 'hairstyle' ? parsed.hairstyleRecs : activeTab === 'makeup' ? parsed.makeupRecs : parsed.outfitRecs;
      if (recs.length > 0) {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        await doGenerate(abortRef.current.signal, reqId, { existingAnalysis: parsed.analysisText, recs });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (reqId !== requestIdRef.current) return;
      setError('AI 自动推荐失败，请检查 API 配置和网络连接');
    } finally {
      clearInterval(stageTimer);
      if (reqId === requestIdRef.current) { setFaceAnalyzing(false); setIsAutoRecommending(false); }
    }
  }, [selectedImage, fileRef, activeTab, doGenerate]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    requestIdRef.current++;
    setResults([]);
    setError(null);
  }, [handleFileSelect]);

  const handleCameraCapture = useCallback((dataUrl: string) => {
    setImageFromDataUrl(dataUrl);
    setShowCamera(false);
    // Auto-trigger generation after camera capture
    setTimeout(() => {
      handleRegenerate();
    }, 100);
  }, [setImageFromDataUrl, handleRegenerate]);

  const handleReferenceUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleDownload = useCallback(async () => {
    if (!bestResult) return;
    try {
      const resp = await fetch(bestResult.url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${categoryLabel}效果_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error('下载失败:', err);
    }
  }, [bestResult, categoryLabel]);

  const handleSaveToLibrary = useCallback(() => {
    if (!bestResult) return;
    const activeRecs = getActiveRecs();
    const selectedRec = activeRecs[selectedRecIdx];
    const saveName = selectedRec?.name || `${categoryLabel}变换`;
    const saveDesc = selectedRec
      ? `AI生成的${categoryLabel}效果 — ${selectedRec.name}`
      : `AI生成的${categoryLabel}效果`;
    addToLibrary({
      id: generateId(),
      name: saveName,
      category: activeTab,
      type: 'generated',
      colorName: selectedColorName,
      colorHex: selectedColorHex,
      description: saveDesc,
      previewUrl: bestResult.url,
      createdAt: Date.now(),
      gender: 'unisex',
    });
  }, [bestResult, addToLibrary, categoryLabel, activeTab, selectedColorName, selectedColorHex, getActiveRecs, selectedRecIdx]);

  return (
    <div className="max-w-[1280px] mx-auto w-full min-h-[calc(100vh-80px)] flex flex-col md:flex-row">
      {/* LEFT: Preview Area (65%) */}
      <section className="w-full md:w-[65%] p-6 md:p-8 flex flex-col gap-5">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps text-earth-taupe">PREVIEW</span>
            <h1 className="font-headline-lg text-headline-lg text-ink-black">镜像变换</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownload} disabled={!bestResult} className="px-4 py-2 border border-outline text-label-caps font-label-caps hover:bg-surface-container-low transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
              <Download className="w-4 h-4" strokeWidth={1.5} />
              下载结果
            </button>
            <button
              onClick={handleSaveToLibrary}
              className="px-4 py-2 bg-ink-black text-white text-label-caps font-label-caps hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <Bookmark className="w-4 h-4" strokeWidth={1.5} />
              保存至画廊
            </button>
          </div>
        </div>

        {noKey && (
          <div className="px-4 py-3 bg-linen-beige/50 border border-earth-taupe/30 font-label-md text-label-md text-on-surface-variant">
            使用基础版示意生成 — 未连接图像生成 API
          </div>
        )}

        {displayError && (
          <div className="px-4 py-3 bg-error-container border border-error/20 text-on-error-container font-label-md text-label-md">
            {displayError}
          </div>
        )}

        {/* Camera View — shows in left panel instead of full-screen modal */}
        {showCamera ? (
          <div className="relative aspect-[4/5] bg-black w-full overflow-hidden">
            <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} fullscreen />
          </div>
        ) : faceAnalyzing ? (
          <ScanOverlay imageUrl={selectedImage ?? ''} currentStage={scanStage} landmarks={null} />
        ) : selectedImage ? (
          <div className="relative">
            {/* Re-upload overlay button - top right */}
            <div className="absolute top-3 right-3 z-30 flex gap-2">
              <div className="relative">
                <div className="px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-outline-variant text-label-caps font-label-caps text-ink-black hover:bg-white transition-colors flex items-center gap-1.5 pointer-events-none">
                  <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                  换一张
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  onClick={(e) => { e.currentTarget.value = ''; }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
                className="px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-outline-variant text-label-caps font-label-caps text-ink-black hover:bg-white transition-colors flex items-center gap-1.5"
                title="拍照"
              >
                <Camera className="w-3.5 h-3.5" strokeWidth={1.5} />
                拍照
              </button>
              {bestResult && (
                <button
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="px-3 py-1.5 bg-ink-black/80 backdrop-blur-sm text-white border border-ink-black/60 text-label-caps font-label-caps hover:bg-ink-black transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="重新生成"
                >
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {isGenerating ? '生成中...' : '重新生成'}
                </button>
              )}
            </div>
            <div
              ref={sliderContainerRef}
              onMouseDown={() => setIsResizing(true)}
              className="relative aspect-[4/5] bg-linen-beige w-full overflow-hidden group select-none"
            >
            {/* Before Image (Base) */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${selectedImage})` }}
            ></div>
            {/* After Image (Clipped) */}
            {bestResult ? (
              <div
                className="absolute top-0 left-0 w-full h-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${bestResult.url})`,
                  clipPath: `inset(0 0 0 ${sliderPosition}%)`,
                }}
              ></div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-container-low/80">
                <button
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="px-5 py-3 bg-ink-black text-white font-label-caps text-label-caps hover:opacity-80 transition-opacity flex items-center gap-2"
                >
                  {isGenerating ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                  )}
                  {isGenerating ? '生成中...' : '生成效果'}
                </button>
              </div>
            )}

            {bestResult && (
              <>
                {/* Slider Controls */}
                <div
                  className="absolute top-0 bottom-0 w-[1px] bg-earth-taupe cursor-ew-resize z-10"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-earth-taupe flex items-center justify-center shadow-[0px_4px_20px_rgba(156,132,104,0.15)] pointer-events-none">
                    <ChevronsLeftRight className="text-earth-taupe w-5 h-5" strokeWidth={1} />
                  </div>
                </div>
                {/* Labels */}
                <div className="absolute bottom-6 left-6 z-20 px-3 py-1 bg-white/80 backdrop-blur-sm border border-outline-variant font-label-caps text-label-caps">
                  BEFORE
                </div>
                <div className="absolute bottom-6 right-6 z-20 px-3 py-1 bg-white/80 backdrop-blur-sm border border-outline-variant font-label-caps text-label-caps">
                  AFTER
                </div>
              </>
            )}
          </div>
            {/* Hidden file input for re-upload — move outside ternary */}
          </div>
          ) : (
            /* Default: beautiful portrait + blurred background expansion */
            <div className="relative aspect-[4/5] bg-linen-beige w-full overflow-hidden">
              {/* Blurred background — creates the "outpainting" expansion effect */}
              <div
                className="absolute -inset-[30%] bg-cover bg-center scale-110"
                style={{
                  backgroundImage: `url(${DEFAULT_PORTRAIT})`,
                  filter: 'blur(50px)',
                  opacity: 0.7,
                }}
              />
              {/* Clear portrait centered */}
              <div className="absolute inset-0 flex items-center justify-center p-6 md:p-10">
                <div className="relative w-full h-full overflow-hidden shadow-2xl">
                  <img
                    className="w-full h-full object-cover"
                    src={DEFAULT_PORTRAIT}
                    alt="默认形象照"
                  />
                </div>
              </div>
              {/* Gradient overlay + upload controls — always visible */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
                flex flex-col items-center justify-end pb-12 gap-4">
                <p className="text-white/80 font-body-md text-body-md tracking-wide">
                  点击下方上传您的照片
                </p>
                <div className="flex gap-3">
                  <div className="relative">
                    <div className="px-6 py-3 bg-white text-ink-black font-label-caps text-label-caps hover:opacity-90 transition-all active:scale-95 flex items-center gap-2 pointer-events-none">
                      <Upload className="w-4 h-4" strokeWidth={1.5} />
                      选择文件
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      onClick={(e) => { e.currentTarget.value = ''; }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
                    className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white border border-white/40 font-label-caps text-label-caps hover:bg-white/30 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" strokeWidth={1.5} />
                    拍照
                  </button>
                </div>
              </div>
            </div>
          )}

        <p className="text-on-surface-variant font-body-md max-w-lg mt-2">
          我们的 AI 模型保留了您的原始骨骼结构，同时通过算法生成精准的{categoryLabel}细节，为您提供真实的高级成衣试穿体验。
        </p>

        <footer className="mt-8 pt-8 border-t border-outline-variant w-full flex flex-col md:flex-row justify-between items-center text-on-surface-variant">
          <span className="font-label-caps text-label-caps">© 2024 AI HAIR STYLIST PRO. ALL RIGHTS RESERVED.</span>
          <div className="flex gap-6 mt-4 md:mt-0">
            <span className="font-label-caps text-label-caps hover:text-ink-black transition-colors cursor-pointer">隐私政策</span>
            <span className="font-label-caps text-label-caps hover:text-ink-black transition-colors cursor-pointer">使用条款</span>
          </div>
        </footer>
      </section>

      {/* RIGHT: Control Panel (35%) */}
      <aside className="w-full md:w-[35%] bg-surface-bright border-l border-outline-variant p-6 md:p-8 flex flex-col gap-6 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
        {/* Tabs */}
        <div className="relative flex border-b border-outline-variant">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex-1 py-4 font-label-caps text-label-caps text-center transition-colors ${
                activeTab === t.id ? 'text-ink-black font-bold bg-surface-container-high' : 'text-on-surface-variant hover:text-ink-black hover:bg-surface-container-low'
              }`}
            >
              {t.label}
            </button>
          ))}
          <motion.div
            layoutId="activeTabIndicator"
            className="absolute bottom-[-1px] h-[3px] bg-ink-black w-1/3 shadow-sm"
            initial={false}
            animate={{
              left: activeTab === 'hairstyle' ? '0%' : activeTab === 'makeup' ? '33.33%' : '66.66%',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Gender Filter — only for hairstyle and outfit */}
        {activeTab !== 'makeup' && (
          <div className="flex gap-2">
            {[
              { id: null as null, label: '全部' },
              { id: 'male' as const, label: '男士' },
              { id: 'female' as const, label: '女士' },
              { id: 'unisex' as const, label: '中性' },
            ].map(g => (
              <button
                key={g.label}
                onClick={() => setGenderFilter(g.id)}
                className={`px-3 py-1.5 font-label-caps text-label-caps transition-colors border ${
                  genderFilter === g.id
                    ? 'bg-ink-black text-white border-ink-black font-bold'
                    : 'bg-surface-container-high text-on-surface-variant border-outline-variant hover:bg-surface-container-highest hover:border-outline'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {/* Library Grid — shared across all categories */}
        <div className="flex flex-col gap-3">
          <label className="font-label-caps text-label-caps text-earth-taupe">素材库 — {categoryLabel}</label>
          {libraryItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {libraryItems.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => handleLibrarySelect(item)}
                  className={`group cursor-pointer transition-all ${
                    selectedRecIdx === idx ? 'ring-[3px] ring-ink-black ring-offset-1' : ''
                  }`}
                >
                  <div className={`aspect-square bg-linen-beige transition-all overflow-hidden relative ${
                    selectedRecIdx === idx ? 'border-2 border-ink-black bg-earth-taupe/10' : 'border border-outline-variant group-hover:border-earth-taupe'
                  }`}>
                    <img className="w-full h-full object-cover" alt={item.name} src={item.previewUrl} />
                    {selectedRecIdx === idx && (
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                        <div className="w-8 h-8 bg-ink-black rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-5 h-5 text-white" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="mt-2 block font-label-md text-label-md text-ink-black">{item.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-on-surface-variant font-body-md text-sm py-4 text-center border border-dashed border-outline-variant">
              素材库暂无{categoryLabel}素材
            </p>
          )}
        </div>

        {/* Color Selection (hairstyle only) */}
        {activeTab === 'hairstyle' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <div className="flex flex-col gap-3">
              <label className="font-label-caps text-label-caps text-earth-taupe">发色选择</label>
              <div className="flex flex-wrap gap-3">
                {HAIR_COLOR_PRESETS.slice(0, 8).map(c => (
                  <button
                    key={c.hex}
                    title={c.name}
                    onClick={() => { setSelectedColorName(c.name); setSelectedColorHex(c.hex); }}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColorHex === c.hex
                        ? 'border-ink-black ring-1 ring-offset-2 ring-ink-black'
                        : 'border-white ring-1 ring-outline-variant hover:ring-earth-taupe'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <p className="text-xs text-on-surface-variant/60 mt-1">{selectedColorName}</p>
            </div>
          </motion.div>
        )}

        {/* Result Thumbnails */}
        {currentResults.length > 0 && (
          <div className="flex flex-col gap-3">
            <label className="font-label-caps text-label-caps text-earth-taupe">生成结果</label>
            <div className="grid grid-cols-3 gap-2">
              {currentResults.map((res, idx) => (
                <div
                  key={res.id}
                  onClick={() => setSelectedResultIdx(idx)}
                  className={`aspect-square bg-linen-beige overflow-hidden cursor-pointer transition-all ${
                    selectedResultIdx === idx ? 'border-2 border-ink-black ring-1 ring-ink-black' : 'border border-outline-variant hover:border-earth-taupe'
                  }`}
                >
                  <img className="w-full h-full object-cover" src={res.url} alt={`结果${idx + 1}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reference Image Upload */}
        <div className="flex flex-col gap-3">
          <label className="font-label-caps text-label-caps text-earth-taupe">参考图（可选）</label>
          <div className="flex items-center gap-3">
            <input ref={referenceInputRef} type="file" className="hidden" accept="image/*" onChange={handleReferenceUpload} />
            {referenceImage ? (
              <div className="flex items-center gap-3 w-full">
                <div className="w-16 h-16 border border-outline-variant overflow-hidden flex-shrink-0">
                  <img className="w-full h-full object-cover" src={referenceImage} alt="参考图" />
                </div>
                <span className="text-xs text-on-surface-variant truncate flex-1">参考图已上传</span>
                <button
                  onClick={() => setReferenceImage(null)}
                  className="text-xs text-error hover:text-error/80 underline"
                >
                  移除
                </button>
              </div>
            ) : (
              <button
                onClick={() => { if (referenceInputRef.current) { referenceInputRef.current.value = ''; referenceInputRef.current.click(); } }}
                className="flex items-center gap-2 px-4 py-2 w-full border border-dashed border-outline-variant text-label-caps font-label-caps text-on-surface-variant hover:border-earth-taupe hover:text-earth-taupe transition-colors"
              >
                <Upload className="w-4 h-4" strokeWidth={1.5} />
                上传参考图
              </button>
            )}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="pt-6 border-t border-outline-variant flex flex-col gap-3">
          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-ink-black text-white font-label-caps text-label-caps tracking-widest hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                应用风格变换
              </>
            )}
          </button>
          <button
            onClick={handleAutoRecommend}
            disabled={isAutoRecommending || !selectedImage}
            className="w-full py-3 font-label-caps text-label-caps tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#000000', color: '#ffffff', border: 'none' }}
          >
            {isAutoRecommending ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AI 分析推荐中...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" strokeWidth={1.5} />
                AI 自动推荐
              </>
            )}
          </button>
        </div>
      </aside>

    </div>
  );
}
