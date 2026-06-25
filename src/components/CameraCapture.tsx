import { useRef, useEffect, useState } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  fullscreen?: boolean;
}

export default function CameraCapture({ onCapture, onClose, fullscreen }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [captured, setCaptured] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') setError('摄像头权限被拒绝，请在浏览器设置中允许摄像头访问');
          else if (err.name === 'NotFoundError') setError('未检测到摄像头设备');
          else setError('无法启动摄像头: ' + (err.message || '未知错误'));
        } else {
          setError('无法启动摄像头');
        }
        setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopStream();
    setCaptured(dataUrl);
  }

  function retake() {
    setCaptured(null);
    setLoading(true);
    async function restart() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError('无法重新启动摄像头');
        setLoading(false);
      }
    }
    restart();
  }

  function confirm() {
    if (captured) onCapture(captured);
  }

  const containerClass = `relative bg-black ${fullscreen ? 'w-full h-full' : 'rounded-2xl overflow-hidden'}`;

  if (captured) {
    return (
      <div className={containerClass}>
        <img className="w-full h-full object-contain" src={captured} alt="拍摄的照片" />
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-6">
          <button
            onClick={retake}
            className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/30"
          >
            <RotateCcw className="w-6 h-6" strokeWidth={1.5} />
          </button>
          <button
            onClick={confirm}
            className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
          >
            <Check className="w-7 h-7" strokeWidth={2} />
          </button>
        </div>
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
        >
          <X size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {error ? (
        <div className={`flex flex-col items-center justify-center text-white px-6 ${fullscreen ? 'h-full' : 'h-72'}`}>
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
          <button onClick={onClose} className="px-5 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-neutral-100 transition-colors">返回</button>
        </div>
      ) : (
        <>
          {loading && (
            <div className={`flex items-center justify-center ${fullscreen ? 'h-full' : 'h-72'}`}>
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay playsInline muted
            className={`w-full object-cover ${loading ? 'hidden' : 'block'} ${fullscreen ? 'h-full' : 'h-72'}`}
            style={{ transform: 'scaleX(-1)' }}
            onLoadedData={() => setLoading(false)}
          />
          {!loading && (
            <>
              <button
                onClick={capture}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white/90 hover:bg-white transition-colors flex items-center justify-center shadow-lg hover:scale-105 active:scale-95"
              >
                <div className="w-[26px] h-[26px] rounded-full border-2 border-black" />
              </button>
              <button
                onClick={onClose}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
              >
                <X size={20} />
              </button>
            </>
          )}
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
