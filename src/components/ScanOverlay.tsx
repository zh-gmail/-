import { memo } from 'react';

interface ScanStage {
  key: string;
  label: string;
}

const STAGES: ScanStage[] = [
  { key: 'analyzing', label: '图像分析中…' },
  { key: 'detecting', label: '面部特征识别中…' },
  { key: 'face_shape', label: '脸型分析中…' },
  { key: 'recommend', label: '推荐生成中…' },
];

const FALLBACK_CONTOUR = Array.from({ length: 12 }).map((_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const rx = 44, ry = 52, cx = 48, cy = 50;
  return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
});

const FALLBACK_FEATURES = [
  { x: 35, y: 32 }, { x: 38, y: 35 }, { x: 42, y: 37 },
  { x: 58, y: 32 }, { x: 62, y: 35 }, { x: 65, y: 37 },
  { x: 36, y: 26 }, { x: 42, y: 24 },
  { x: 58, y: 24 }, { x: 64, y: 26 },
  { x: 48, y: 45 }, { x: 50, y: 52 }, { x: 48, y: 58 },
  { x: 36, y: 62 }, { x: 42, y: 66 }, { x: 48, y: 68 }, { x: 54, y: 66 }, { x: 60, y: 62 },
];

interface ScanOverlayProps {
  imageUrl: string;
  currentStage: number;
  landmarks?: Array<{ x: number; y: number }> | null;
}

function ScanOverlay({ imageUrl, currentStage, landmarks }: ScanOverlayProps) {
  const hasLandmarks = landmarks && landmarks.length > 0;
  const contourDots = hasLandmarks ? landmarks.slice(0, 5) : FALLBACK_CONTOUR;
  const featureDots = hasLandmarks ? landmarks.slice(5) : FALLBACK_FEATURES;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-100">
      <img src={imageUrl} alt="分析中" className="w-full h-72 object-contain" />

      {/* 暗色遮罩 */}
      <div className="absolute inset-0 bg-black/50" />

      {/* 扫描线 */}
      <div
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.6)]"
        style={{
          animation: 'scanLine 2.5s ease-in-out infinite',
          top: '20%',
        }}
      />

      {/* 瞄点网格 - 面部特征点 */}
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div className="relative w-48 h-56">
          {/* 面部轮廓点 */}
          {contourDots.map((p, i) => (
            <div
              key={`dot-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.8)]"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                animation: `pulseDot 1.5s ${i * 0.12}s infinite`,
                opacity: 0.7,
              }}
            />
          ))}
          {/* 眼睛、眉毛等关键点 */}
          {featureDots.map((p, i) => (
            <div
              key={`kp-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                animation: `pulseDot 2s ${0.3 + i * 0.08}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* 阶段文字 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-5 py-2.5">
        {STAGES.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                i <= currentStage ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-neutral-600'
              }`}
            />
            <span
              className={`text-xs whitespace-nowrap transition-all duration-500 ${
                i === currentStage
                  ? 'text-white font-medium'
                  : i < currentStage
                    ? 'text-emerald-300'
                    : 'text-neutral-500'
              }`}
            >
              {s.label}
            </span>
            {i < STAGES.length - 1 && (
              <div className={`w-6 h-px ${i < currentStage ? 'bg-emerald-400/50' : 'bg-neutral-700'}`} />
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; }
          50% { top: 75%; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}

export default memo(ScanOverlay);
