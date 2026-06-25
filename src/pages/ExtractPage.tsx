import { Upload, Sparkles, Scissors, Brush, Shirt, Loader2, Camera, Check, Crop } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useImageUpload } from '../hooks/useImageUpload';
import { imageGenClient } from '../services/imageGenClient';
import { resizeImage, cropAndBlurImage, imageUrlToBase64 } from '../utils/imageUtils';
import { useAppContext } from '../store/AppContext';
import { generateId } from '../utils/id';
import CameraCapture from '../components/CameraCapture';

type Category = 'hairstyle' | 'makeup' | 'outfit';

const CATEGORIES: { id: Category; label: string; icon: typeof Scissors }[] = [
  { id: 'hairstyle', label: '发型', icon: Scissors },
  { id: 'makeup', label: '妆容', icon: Brush },
  { id: 'outfit', label: '穿搭', icon: Shirt },
];

const CATEGORY_LABEL: Record<Category, string> = {
  hairstyle: '发型', makeup: '妆容', outfit: '穿搭',
};

export default function ExtractPage() {
  const { selectedImage, fileRef, handleFileSelect, setImageFromDataUrl } = useImageUpload();
  const { addToLibrary, library } = useAppContext();
  const [category, setCategory] = useState<Category>('hairstyle');
  const [status, setStatus] = useState<'idle' | 'extracting' | 'done' | 'error'>('idle');
  const [analysis, setAnalysis] = useState<{ name: string; description: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [saved, setSaved] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState<{ name: string; description: string } | null>(null);
  const [manualName, setManualName] = useState('');
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [cropProcessing, setCropProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    setStatus('idle');
    setAnalysis([]);
    setError(null);
    setSaved(false);
    setManualName('');
    setProcessedImage(null);
    setCropMode(false);
    setCropRect(null);
    setIsDrawing(false);
    setDrawStart(null);
  }, []);

  // Crop mode window-level mouse/touch end detection
  useEffect(() => {
    if (!cropMode) return;
    const handleEnd = () => setIsDrawing(false);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [cropMode]);

  const handleStartCrop = useCallback(() => {
    setCropMode(true);
    setCropRect(null);
    setCropProcessing(false);
  }, []);

  const handleCropMouseDown = useCallback((e: React.MouseEvent) => {
    if (!cropMode || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setIsDrawing(true);
    setDrawStart({ x, y });
    setCropRect({ x, y, width: 0, height: 0 });
  }, [cropMode]);

  const handleCropMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !drawStart || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const x = Math.min(drawStart.x, currentX);
    const y = Math.min(drawStart.y, currentY);
    const width = Math.abs(currentX - drawStart.x);
    const height = Math.abs(currentY - drawStart.y);
    setCropRect({ x, y, width, height });
  }, [isDrawing, drawStart]);

  const handleCropTouchStart = useCallback((e: React.TouchEvent) => {
    if (!cropMode || !imageContainerRef.current || e.touches.length !== 1) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(touch.clientY - rect.top, rect.height));
    setIsDrawing(true);
    setDrawStart({ x, y });
    setCropRect({ x, y, width: 0, height: 0 });
  }, [cropMode]);

  const handleCropTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDrawing || !drawStart || !imageContainerRef.current || e.touches.length !== 1) return;
    e.preventDefault();
    const rect = imageContainerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const currentX = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(touch.clientY - rect.top, rect.height));
    const x = Math.min(drawStart.x, currentX);
    const y = Math.min(drawStart.y, currentY);
    const width = Math.abs(currentX - drawStart.x);
    const height = Math.abs(currentY - drawStart.y);
    setCropRect({ x, y, width, height });
  }, [isDrawing, drawStart]);

  const handleConfirmCrop = useCallback(async () => {
    if (!cropRect || !selectedImage || !imageContainerRef.current || cropRect.width < 10 || cropRect.height < 10) return;
    setCropProcessing(true);
    try {
      const rect = imageContainerRef.current.getBoundingClientRect();
      const dataUrl = await cropAndBlurImage(selectedImage, cropRect, rect.width, rect.height);
      setProcessedImage(dataUrl);
      setCropMode(false);
      setCropRect(null);
    } catch (err) {
      console.error('Crop processing failed:', err);
    } finally {
      setCropProcessing(false);
    }
  }, [cropRect, selectedImage]);

  const handleCancelCrop = useCallback(() => {
    setCropMode(false);
    setCropRect(null);
    setIsDrawing(false);
    setDrawStart(null);
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e);
    resetState();
  }, [handleFileSelect, resetState]);

  const handleCameraCapture = useCallback((dataUrl: string) => {
    setImageFromDataUrl(dataUrl);
    setShowCamera(false);
    resetState();
  }, [setImageFromDataUrl, resetState]);

  const handleExtract = useCallback(async () => {
    if (!selectedImage) return;

    setError(null);
    setStatus('extracting');

    try {
      let base64: string;
      if (processedImage) {
        base64 = await imageUrlToBase64(processedImage);
      } else if (fileRef.current) {
        base64 = await resizeImage(fileRef.current);
      } else {
        return;
      }
      const result = await imageGenClient.extractStyleCategory(base64, category);
      setAnalysis(result);
      setStatus('done');
    } catch (err) {
      console.error('Extract failed:', err);
      setError('提取失败，请检查 API 配置和网络连接后重试');
      setStatus('error');
    }
  }, [selectedImage, processedImage, fileRef, category]);

  const findDuplicate = useCallback((analysisName: string): { name: string; description: string } | null => {
    if (!library || library.length === 0) return null;
    for (const item of library) {
      if (item.category !== category) continue;
      if (item.name.includes(analysisName) || analysisName.includes(item.name)) {
        return { name: item.name, description: item.description };
      }
    }
    return null;
  }, [library, category]);

  const doSave = useCallback(() => {
    if (!selectedImage || analysis.length === 0) return;

    const desc = analysis.map(i => `${i.name}：${i.description}`).join('\n');
    const name = analysis.map(i => i.name).join('、').slice(0, 30) || `${CATEGORY_LABEL[category]}素材`;

    addToLibrary({
      id: generateId(),
      name,
      category,
      type: 'extracted',
      colorName: '—',
      colorHex: '#9C8468',
      description: desc,
      previewUrl: processedImage || selectedImage,
      createdAt: Date.now(),
      gender: 'unisex',
    });
    setSaved(true);
    setDuplicateItem(null);
  }, [selectedImage, processedImage, category, analysis, addToLibrary]);

  const handleManualSave = useCallback(() => {
    if (!selectedImage) return;
    const name = manualName.trim() || `${CATEGORY_LABEL[category]}素材（手动）`;
    addToLibrary({
      id: generateId(),
      name,
      category,
      type: 'extracted',
      colorName: '—',
      colorHex: '#9C8468',
      description: '',
      previewUrl: processedImage || selectedImage,
      createdAt: Date.now(),
      gender: 'unisex',
    });
    setSaved(true);
  }, [selectedImage, processedImage, category, manualName, addToLibrary]);

  const handleSave = useCallback(() => {
    if (!selectedImage || analysis.length === 0) return;
    const name = analysis.map(i => i.name).join('、').slice(0, 30) || `${CATEGORY_LABEL[category]}素材`;

    // Check each analysis item for duplicates
    for (const item of analysis) {
      const dup = findDuplicate(item.name);
      if (dup) {
        setDuplicateItem(dup);
        return;
      }
    }
    // Also check the combined name
    const dup = findDuplicate(name);
    if (dup) {
      setDuplicateItem(dup);
      return;
    }

    doSave();
  }, [selectedImage, category, analysis, findDuplicate, doSave]);

  return (
    <main className="max-w-7xl mx-auto w-full px-6 md:px-8 py-8 grid grid-cols-12 gap-6 min-h-[calc(100vh-80px)]">
      {/* LEFT: Image Area */}
      <section className="col-span-12 lg:col-span-7 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="font-headline-lg text-headline-lg">素材提取</h1>
            <p className="font-body-md text-on-surface-variant mt-2 text-sm">选择提取类别，上传照片后 AI 自动分析并归纳特征，保存为素材。</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-2 border border-outline text-label-caps font-label-caps hover:bg-surface-container transition-colors pointer-events-none">
                <Upload className="w-4 h-4" strokeWidth={1.5} />
                上传照片
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload}
                onClick={(e) => { e.currentTarget.value = ''; }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <button
              onClick={() => setShowCamera(true)}
              className="flex items-center gap-2 px-4 py-2 border border-outline text-label-caps font-label-caps hover:bg-surface-container transition-colors"
            >
              <Camera className="w-4 h-4" strokeWidth={1.5} />
              拍照
            </button>
            <button
              onClick={handleStartCrop}
              disabled={!selectedImage}
              className="flex items-center gap-2 px-4 py-2 border border-outline text-label-caps font-label-caps hover:bg-surface-container transition-colors disabled:opacity-40"
            >
              <Crop className="w-4 h-4" strokeWidth={1.5} />
              框选
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div
          ref={imageContainerRef}
          onMouseDown={handleCropMouseDown}
          onMouseMove={handleCropMouseMove}
          onTouchStart={handleCropTouchStart}
          onTouchMove={handleCropTouchMove}
          className="relative w-full aspect-[4/5] bg-surface-container-low overflow-hidden border border-outline-variant select-none"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {showCamera ? (
              <div className="w-full h-full bg-black">
                <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} fullscreen />
              </div>
            ) : selectedImage ? (
              <div className="relative w-full h-full">
                <img className="w-full h-full object-cover" alt="Uploaded" src={cropMode ? selectedImage : (processedImage || selectedImage)} />
                {!cropMode && (
                <div className="absolute top-3 right-3 flex gap-2">
                  <div className="relative">
                    <div className="px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-outline-variant text-label-caps font-label-caps text-ink-black hover:bg-white transition-colors flex items-center gap-1.5 pointer-events-none">
                      <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                      换一张
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload}
                      onClick={(e) => { e.currentTarget.value = ''; }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
                    className="px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-outline-variant text-label-caps font-label-caps text-ink-black hover:bg-white transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" strokeWidth={1.5} />
                    拍照
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartCrop(); }}
                    className="px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-outline-variant text-label-caps font-label-caps text-ink-black hover:bg-white transition-colors flex items-center gap-1.5"
                  >
                    <Crop className="w-3.5 h-3.5" strokeWidth={1.5} />
                    框选
                  </button>
                </div>
              )}
            </div>
            ) : (
              <div className="relative w-full h-full">
                <div
                  className="absolute -inset-[20%] bg-cover bg-center scale-110"
                  style={{
                    backgroundImage: 'url(/assets/休闲白衣.jpg)',
                    filter: 'blur(40px)',
                    opacity: 0.6,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="relative w-full h-full overflow-hidden shadow-lg">
                    <img
                      className="w-full h-full object-cover"
                      src="/assets/休闲白衣.jpg"
                      alt="模特示例"
                    />
                  </div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-white/70" strokeWidth={1} />
                  <p className="font-body-md text-white/90">上传人物照片开始风格提取</p>
                </div>
              </div>
            )}
          </div>

          {/* Crop overlay */}
          {cropMode && selectedImage && (
            <>
              {/* Dark base */}
              <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
              {/* Clear cutout hole */}
              {cropRect && cropRect.width > 0 && (
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    left: cropRect.x,
                    top: cropRect.y,
                    width: cropRect.width,
                    height: cropRect.height,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                    border: '2px dashed rgba(255,255,255,0.8)',
                  }}
                />
              )}
              {/* Instructions or confirm/cancel */}
              <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
                {(!cropRect || cropRect.width === 0) && (
                  <span className="bg-black/70 text-white text-xs px-3 py-1.5 pointer-events-none">
                    在图片上拖动以框选需要保留的区域
                  </span>
                )}
                {cropRect && cropRect.width > 0 && !cropProcessing && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmCrop}
                      className="px-4 py-2 bg-white text-ink-black border-2 border-ink-black font-label-caps text-label-caps shadow-sm hover:opacity-90 cursor-pointer"
                    >
                      确认框选
                    </button>
                    <button
                      onClick={handleCancelCrop}
                      className="px-4 py-2 bg-white/90 text-ink-black border border-outline font-label-caps text-label-caps hover:bg-white cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                )}
                {cropProcessing && (
                  <span className="bg-black/70 text-white text-xs px-3 py-1.5 pointer-events-none">
                    处理中...
                  </span>
                )}
              </div>
              {/* Corner size indicator */}
              {cropRect && cropRect.width > 20 && (
                <div className="absolute bottom-4 right-4 z-30 pointer-events-none">
                  <span className="bg-black/60 text-white text-[11px] px-2 py-1">
                    {Math.round(cropRect.width)} × {Math.round(cropRect.height)}
                  </span>
                </div>
              )}
            </>
          )}

          {status === 'extracting' && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
              <div className="bg-white p-6 flex items-center gap-3 shadow-lg">
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                <span className="font-label-md text-label-md">AI 正在分析{CATEGORY_LABEL[category]}特征...</span>
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

      {/* RIGHT: Category + Analysis */}
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
                  onClick={() => { setCategory(cat.id); resetState(); }}
                  disabled={!selectedImage}
                  title={!selectedImage ? '请先上传照片' : cat.label}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-label-caps text-label-caps transition-all disabled:opacity-40 border ${
                    category === cat.id
                      ? 'bg-white text-ink-black font-bold border-ink-black border-b-4 shadow-sm'
                      : 'bg-surface-container-high text-on-surface-variant border-outline-variant'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  {cat.label}
                </button>
              );
            })}
          </div>
          {!selectedImage && (
            <p className="text-xs text-on-surface-variant/70 mt-3 text-center">请先上传照片</p>
          )}
        </div>

        {/* Analysis */}
        <div className="bg-linen-beige/30 p-4 border border-outline-variant flex-1 flex flex-col">
          <h2 className="font-label-caps text-label-caps text-earth-taupe mb-4">分析结果</h2>
          <div className="h-[2px] w-12 bg-earth-taupe mb-4"></div>

          <div className="flex-grow overflow-y-auto pr-2 flex flex-col gap-4">
            {status === 'idle' && selectedImage && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-outline-variant">
                <Sparkles className="w-12 h-12 text-outline-variant mb-4" strokeWidth={1} />
                <p className="font-body-md text-on-surface-variant mb-6">将分析照片中人物的{CATEGORY_LABEL[category]}特征</p>
                <button
                  onClick={handleExtract}
                  className="flex items-center gap-2 px-8 py-3 bg-white text-ink-black border-2 border-ink-black font-label-caps text-label-caps shadow-md"
                >
                  <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                  提取素材
                </button>
              </div>
            )}

            {status === 'idle' && !selectedImage && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Upload className="w-12 h-12 text-outline-variant mb-4" strokeWidth={1} />
                <p className="font-body-md text-on-surface-variant">请先上传照片</p>
              </div>
            )}

            {status === 'extracting' && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 className="w-10 h-10 text-earth-taupe animate-spin mb-4" strokeWidth={1.5} />
                <p className="font-body-md text-on-surface-variant">正在分析...</p>
              </div>
            )}

            {status === 'done' && analysis.length > 0 && (
              <div className="flex flex-col gap-4">
                {saved && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-linen-beige/40 border border-outline-variant text-label-md text-label-md text-ink-black">
                    <Check className="w-4 h-4" strokeWidth={2} />
                    已保存到素材库
                  </div>
                )}
                <div className="bg-white border border-outline-variant p-4">
                  <h3 className="font-label-caps text-label-caps text-earth-taupe mb-3">{CATEGORY_LABEL[category]}特征</h3>
                  {analysis.map((item, i) => (
                    <div key={i} className="mb-3 last:mb-0">
                      <span className="font-label-md text-label-md text-ink-black font-medium">{item.name}</span>
                      {item.description && (
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
                {!saved && !duplicateItem && (
                  <button
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-ink-black text-white font-label-caps text-label-caps hover:opacity-90 transition-opacity"
                  >
                    <Check className="w-4 h-4" strokeWidth={2} />
                    保存到素材库
                  </button>
                )}
                {duplicateItem && (
                  <div className="bg-white border border-outline-variant p-4">
                    <p className="font-label-md text-label-md text-ink-black mb-2">发现重复素材</p>
                    <p className="text-xs text-on-surface-variant mb-3">
                      素材库中已有类似素材「{duplicateItem.name}」<br />
                      {duplicateItem.description && <span className="block mt-1">{duplicateItem.description.slice(0, 60)}...</span>}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={doSave}
                        className="flex-1 px-4 py-2 bg-ink-black text-white font-label-caps text-label-caps hover:opacity-90 transition-opacity"
                      >
                        仍然保存
                      </button>
                      <button
                        onClick={() => setDuplicateItem(null)}
                        className="flex-1 px-4 py-2 bg-white text-ink-black border border-ink-black font-label-caps text-label-caps hover:bg-surface-container transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {status === 'done' && analysis.length === 0 && (
              <div className="flex flex-col items-center py-8 px-4 text-center">
                <p className="font-body-md text-on-surface-variant">AI 未能识别出{CATEGORY_LABEL[category]}特征</p>
                <p className="text-xs text-on-surface-variant/60 mt-1">照片可能不包含人物或特征不清晰</p>
                {!saved ? (
                  <div className="w-full mt-6 bg-white border border-outline-variant p-4 text-left">
                    <label className="font-label-md text-label-md text-ink-black block mb-2">手动命名保存</label>
                    <input
                      value={manualName}
                      onChange={e => setManualName(e.target.value)}
                      placeholder={`输入${CATEGORY_LABEL[category]}名称...`}
                      className="w-full px-3 py-2 border border-outline-variant font-body-md text-body-md text-ink-black outline-none focus:border-ink-black mb-3"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleManualSave}
                        className="flex-1 px-4 py-2 bg-ink-black text-white font-label-caps text-label-caps hover:opacity-90 transition-opacity"
                      >
                        保存到素材库
                      </button>
                      <button
                        onClick={handleExtract}
                        className="px-4 py-2 bg-white text-ink-black border border-ink-black font-label-caps text-label-caps hover:bg-surface-container transition-colors"
                      >
                        重新提取
                      </button>
                    </div>
                    <p className="text-xs text-on-surface-variant/50 mt-3">提示：上传正面、光线充足的人物照片识别效果更好</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 bg-linen-beige/40 border border-outline-variant text-label-md text-label-md text-ink-black mt-6">
                    <Check className="w-4 h-4" strokeWidth={2} />
                    已保存到素材库
                  </div>
                )}
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center py-8 px-4 text-center">
                <p className="font-body-md text-on-surface-variant">提取失败</p>
                <p className="text-xs text-on-surface-variant/60 mt-1">请检查 API 配置和网络连接后重试</p>
                {selectedImage && (
                  <div className="w-full mt-6 bg-white border border-outline-variant p-4 text-left">
                    <label className="font-label-md text-label-md text-ink-black block mb-2">手动命名保存</label>
                    <input
                      value={manualName}
                      onChange={e => setManualName(e.target.value)}
                      placeholder={`输入${CATEGORY_LABEL[category]}名称...`}
                      className="w-full px-3 py-2 border border-outline-variant font-body-md text-body-md text-ink-black outline-none focus:border-ink-black mb-3"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleManualSave}
                        className="flex-1 px-4 py-2 bg-ink-black text-white font-label-caps text-label-caps hover:opacity-90 transition-opacity"
                      >
                        保存到素材库
                      </button>
                      <button
                        onClick={handleExtract}
                        className="px-4 py-2 bg-white text-ink-black border border-ink-black font-label-caps text-label-caps hover:bg-surface-container transition-colors"
                      >
                        重新提取
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </main>
  );
}
