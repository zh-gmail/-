import { useRef, useEffect, useCallback, useState } from 'react';
import type { RefObject } from 'react';
import { createAREngine } from '../services/arEngine';
import type { AREngineInstance, FaceTrackingCallback } from '../services/arEngine';
import type { HairstyleAsset } from '../types';

interface UseAREngineOptions {
  previewRef: RefObject<HTMLElement | null>;
  onFaceTracked?: FaceTrackingCallback;
}

export function useAREngine({ previewRef, onFaceTracked }: UseAREngineOptions) {
  const engineRef = useRef<AREngineInstance | null>(null);
  const initCalledRef = useRef(false);
  const onFaceTrackedRef = useRef(onFaceTracked);
  onFaceTrackedRef.current = onFaceTracked;
  const [isActive, setIsActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [arError, setArError] = useState<string | null>(null);

  useEffect(() => {
    const engine = createAREngine();
    engineRef.current = engine;

    engine.onFaceTracked((detected) => {
      setFaceDetected(detected);
      onFaceTrackedRef.current?.(detected);
    });

    return () => {
      engine.destroy();
      engineRef.current = null;
      initCalledRef.current = false;
      setIsActive(false);
      setFaceDetected(false);
      setArError(null);
    };
  }, []);

  const initEngine = useCallback(async () => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    const engine = engineRef.current;
    const preview = previewRef.current;
    if (!engine || !preview) {
      initCalledRef.current = false;
      return;
    }

    setArError(null);

    // Race engine init against a timeout — MindAR can hang on camera/network
    const TIMEOUT_MS = 15000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const result = await Promise.race([
        engine.init({ previewElement: preview }).then(() => 'ok' as const),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('引擎初始化超时，请检查摄像头权限和网络连接')),
            TIMEOUT_MS
          );
        }),
      ]);

      if (timeoutId) clearTimeout(timeoutId);
      if (result === 'ok') setIsActive(true);
    } catch (err: unknown) {
      if (timeoutId) clearTimeout(timeoutId);
      const errMsg = err instanceof Error ? err.message : err ? String(err) : '';
      console.error('AR engine init failed:', err);

      let userMsg: string;
      if (errMsg.includes('Device in use') || errMsg.includes('NotReadableError')) {
        userMsg = '摄像头被占用，请关闭其他使用摄像头的标签页或应用后重新加载页面';
      } else if (errMsg.includes('Permission denied') || errMsg.includes('NotAllowedError')) {
        userMsg = '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问';
      } else {
        userMsg = errMsg || '引擎初始化失败：未知错误';
      }

      setArError(userMsg);
      initCalledRef.current = false;
    }
  }, [previewRef]);

  const switchHairstyle = useCallback(async (asset: HairstyleAsset) => {
    const engine = engineRef.current;
    if (!engine || !engine.isReady()) return;
    await engine.switchHairstyle(asset);
  }, []);

  const setHairColor = useCallback((hex: string) => {
    engineRef.current?.setHairColor(hex);
  }, []);

  const takeScreenshot = useCallback(async (): Promise<string> => {
    const engine = engineRef.current;
    if (!engine || !engine.isReady()) return '';
    return engine.takeScreenshot();
  }, []);

  return {
    isActive,
    faceDetected,
    arError,
    initEngine,
    switchHairstyle,
    setHairColor,
    takeScreenshot,
  };
}
