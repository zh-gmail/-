import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Settings2, Image as ImageIcon, Hand, Palette, Camera } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';
import { useHandTracking } from '../../hooks/useHandTracking';
import { useAREngine } from '../../hooks/useAREngine';
import { HAIRSTYLE_ASSETS } from '../../data/hairstyleAssets';

const HAIR_COLORS = [
  { name: '自然黑', hex: '#1a1a1a' },
  { name: '深棕', hex: '#3B2F2F' },
  { name: '栗棕', hex: '#6B3A2A' },
  { name: '金棕', hex: '#8B5E3C' },
  { name: '亚麻金', hex: '#C4A265' },
  { name: '白金', hex: '#E8D5B7' },
  { name: '酒红', hex: '#8B2252' },
  { name: '雾蓝', hex: '#4A6B8A' },
];

export default function LiveCamera() {
  const { settings, library, currentHairstyleIndex, setCurrentHairstyleIndex, getCurrentHairstyle, setActiveTab, isHandTracking, setHandTracking } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [assetIndex, setAssetIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [screenshotting, setScreenshotting] = useState(false);
  const currentHair = getCurrentHairstyle();

  const handleHandGesture = (gesture: 'up' | 'down') => {
    if (gesture === 'down') {
      setAssetIndex(i => (i + 1) % HAIRSTYLE_ASSETS.length);
    } else if (gesture === 'up') {
      setAssetIndex(i => (i - 1 + HAIRSTYLE_ASSETS.length) % HAIRSTYLE_ASSETS.length);
    }
  };

  const selectHairstyle = (index: number) => {
    setCurrentHairstyleIndex(index);
    setAssetIndex(index % HAIRSTYLE_ASSETS.length);
  };

  const { isInitializing: handInit, toggleHandTracking } = useHandTracking(handleHandGesture, isHandTracking, setHandTracking);

  // MindAR integration
  const { isActive: arActive, faceDetected, arError, initEngine, switchHairstyle, setHairColor, takeScreenshot } = useAREngine({
    licenseKey: '',
    previewRef: containerRef,
  });

  // Initialize MindAR when component mounts
  useEffect(() => {
    if (containerRef.current && !arActive && !arError) {
      initEngine();
    }
  }, [arActive, arError, initEngine]);

  const handleRetry = () => {
    window.location.reload();
  };

  // Switch hairstyle when asset index changes
  useEffect(() => {
    if (arActive && HAIRSTYLE_ASSETS[assetIndex]) {
      switchHairstyle(HAIRSTYLE_ASSETS[assetIndex]);
    }
  }, [arActive, assetIndex, switchHairstyle]);

  const cycleAsset = () => {
    const nextIdx = (assetIndex + 1) % HAIRSTYLE_ASSETS.length;
    setAssetIndex(nextIdx);
  };

  const handleColorSelect = (hex: string) => {
    setHairColor(hex);
    setShowColorPicker(false);
  };

  const handleScreenshot = async () => {
    if (screenshotting) return;
    setScreenshotting(true);
    try {
      const dataUrl = await takeScreenshot();
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `hairstyle-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Screenshot failed:', err);
    } finally {
      setScreenshotting(false);
    }
  };

  return (
    <div className="relative h-full w-full flex overflow-hidden"
         ref={containerRef}>

      {/* ===== LEFT HAIRSTYLE LIBRARY ===== */}
      {sidebarOpen && (
        <div className="w-[104px] flex-shrink-0 flex flex-col bg-black/60 backdrop-blur-xl border-r border-white/10 z-20 transition-all">
          <div className="flex items-center justify-between px-3 py-4 border-b border-white/10">
            <h3 className="text-white/80 text-xs font-medium tracking-wider">发型库</h3>
            <button onClick={() => setSidebarOpen(false)}
              className="text-white/40 hover:text-white/80 transition-colors">
              <ChevronLeft size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
            {library.map((item, index) => (
              <button key={item.id} onClick={() => selectHairstyle(index)}
                className={`w-full rounded-xl overflow-hidden transition-all duration-200 ${
                  index === currentHairstyleIndex
                    ? 'ring-2 ring-white'
                    : 'ring-1 ring-white/10 hover:ring-white/30'
                }`}>
                <div className="relative">
                  <img src={item.previewUrl} alt={item.name}
                    className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white font-medium leading-tight truncate">
                    {item.name}
                  </span>
                  {index === currentHairstyleIndex && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
                      <span className="text-black text-[7px] font-bold">✓</span>
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sidebar toggle button (when collapsed) */}
      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 border-l-0 rounded-r-lg p-1.5 text-white/60 hover:text-white transition-all">
          <ChevronRight size={16} />
        </button>
      )}

      {/* ===== CAMERA / AR VIEW ===== */}
      <div className="relative flex-1">

        {/* Top Bar */}
        <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent text-white z-10">
          <div className="flex flex-col">
            <h2 className="text-lg font-medium tracking-wide">实时AR试戴</h2>
            {arActive ? (
              <span className="text-[10px] text-green-400 font-mono tracking-widest mt-0.5">
                {faceDetected ? '· 面部已检测' : '· 等待面部'}
              </span>
            ) : arError ? (
              <span className="text-[10px] text-red-400 font-mono tracking-widest mt-0.5">AR 引擎错误</span>
            ) : (
              <span className="text-[10px] text-amber-400 font-mono tracking-widest mt-0.5">AR 引擎加载中...</span>
            )}
          </div>
          <button onClick={() => setActiveTab('settings')} className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all">
            <Settings2 strokeWidth={1.5} size={20} />
          </button>
        </div>

        {/* Loading overlay */}
        {!arActive && !arError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="text-white/60 text-sm">AR 引擎加载中...</span>
            </div>
          </div>
        )}

        {/* Error fallback */}
        {arError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
              <div className="w-14 h-14 rounded-full bg-red-900/40 border border-red-500/30 flex items-center justify-center">
                <span className="text-red-400 text-2xl">!</span>
              </div>
              <span className="text-white/80 text-sm leading-relaxed">
                AR 引擎初始化失败
              </span>
              <span className="text-white/40 text-xs leading-relaxed">
                {arError}
              </span>
              <button onClick={handleRetry}
                className="mt-2 px-5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm transition-all">
                重新加载页面
              </button>
            </div>
          </div>
        )}

        {/* Bottom Info — current hairstyle name + gesture status */}
        <div className="absolute bottom-4 left-4 flex flex-col items-start gap-2 z-10">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/15">
            <div className="w-3 h-3 rounded-full border border-white/40" style={{ backgroundColor: currentHair.colorHex }} />
            <span className="text-white text-xs font-medium drop-shadow-md">
              {currentHair.name} - {currentHair.colorName}
            </span>
          </div>
          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10 ${
            handInit ? 'text-amber-300 bg-black/30' : isHandTracking ? 'text-green-300 bg-black/30' : 'text-white/60 bg-black/30'
          }`}>
            {handInit ? '✋ 手势初始化中...' : isHandTracking ? '✋ 手势已开启' : '手势未开启'}
          </span>
        </div>

        {/* Right Side Controls */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-10">
          <button onClick={toggleHandTracking}
            className={`p-3.5 rounded-full backdrop-blur-md transition-all shadow-xl shadow-black/20 ${
              isHandTracking ? 'bg-blue-500/80 border border-blue-400 text-white' : 'bg-black/40 border border-white/20 text-white hover:bg-black/60'
            }`}>
            <Hand size={22} />
          </button>

          <button onClick={cycleAsset} className="p-4 bg-white/90 hover:scale-105 active:scale-95 text-black rounded-full transition-all shadow-2xl shadow-black/30">
            <RefreshCw size={26} strokeWidth={1.5} />
          </button>

          <button onClick={handleScreenshot} disabled={screenshotting}
            className="p-3.5 bg-black/40 border border-white/20 text-white hover:bg-white/20 rounded-full transition-all backdrop-blur-md shadow-xl shadow-black/20 disabled:opacity-50">
             <Camera size={22} strokeWidth={1.5} />
          </button>

          <div className="relative">
            <button onClick={() => setShowColorPicker(v => !v)}
              className="p-3.5 bg-black/40 border border-white/20 text-white hover:bg-white/20 rounded-full transition-all backdrop-blur-md shadow-xl shadow-black/20">
              <Palette size={22} strokeWidth={1.5} />
            </button>
            {showColorPicker && (
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-xl border border-white/15 rounded-xl p-2.5 shadow-2xl">
                <div className="grid grid-cols-2 gap-2">
                  {HAIR_COLORS.map(c => (
                    <button key={c.hex} onClick={() => handleColorSelect(c.hex)}
                      className="w-7 h-7 rounded-full border border-white/20 hover:scale-110 hover:border-white/60 transition-all"
                      style={{ backgroundColor: c.hex }}
                      title={c.name} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setActiveTab('photo')} className="p-3.5 bg-black/40 border border-white/20 text-white hover:bg-black/60 rounded-full transition-all backdrop-blur-md shadow-xl shadow-black/20">
             <ImageIcon size={22} strokeWidth={1.5} />
          </button>
        </div>

      </div>
    </div>
  );
}
