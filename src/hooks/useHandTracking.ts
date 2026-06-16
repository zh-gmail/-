import { useEffect, useState, useRef, useCallback } from 'react';

interface HandPosition {
  y: number;
  timestamp: number;
}

/**
 * Real hand gesture tracking using MediaPipe HandLandmarker.
 * Detects upward/downward swipes of the index finger with velocity-based filtering.
 */
export function useHandTracking(
  onGesture: (gesture: 'up' | 'down') => void,
  initialEnabled?: boolean,
  onEnabledChange?: (enabled: boolean) => void,
) {
  const [isHandTracking, setIsHandTracking] = useState(initialEnabled ?? false);
  const [isInitializing, setIsInitializing] = useState(false);
  const handLandmarkerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const positionsRef = useRef<HandPosition[]>([]);
  const lastGestureTimeRef = useRef(0);
  const onGestureRef = useRef(onGesture);
  const keyboardCleanupRef = useRef<(() => void) | null>(null);

  onGestureRef.current = onGesture;

  /**
   * Velocity-based swipe detection.
   * Uses a sliding window of recent positions to compute average velocity.
   * Only triggers when:
   *  - Velocity exceeds threshold (fast enough movement)
   *  - Total displacement exceeds minimum (not just jitter)
   *  - Time window is within bounds (not too slow)
   *  - Enough frames have been collected
   */
  const detectSwipe = useCallback((positions: HandPosition[]) => {
    const now = Date.now();
    if (now - lastGestureTimeRef.current < 350) return;

    // Need at least 4 data points
    if (positions.length < 4) return;

    // Only look at the most recent 8 frames
    const recent = positions.slice(-8);
    if (recent.length < 4) return;

    const first = recent[0];
    const last = recent[recent.length - 1];
    const dy = last.y - first.y;
    const dt = last.timestamp - first.timestamp;

    if (dt < 50 || dt > 500) return;

    const velocity = Math.abs(dy) / (dt / 1000);

    const VELOCITY_THRESHOLD = 0.45;
    const DISPLACEMENT_THRESHOLD = 0.1;
    const MAX_VELOCITY = 5.0;

    if (velocity < VELOCITY_THRESHOLD || velocity > MAX_VELOCITY) return;
    if (Math.abs(dy) < DISPLACEMENT_THRESHOLD) return;

    // Direction: in camera space, down = positive y
    if (dy > 0) {
      onGestureRef.current('down');
    } else {
      onGestureRef.current('up');
    }

    lastGestureTimeRef.current = now;
    positionsRef.current = [];
  }, []);

  const processFrame = useCallback(async () => {
    const handLandmarker = handLandmarkerRef.current;
    const video = videoRef.current;
    if (!handLandmarker || !video || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      const result = handLandmarker.detectForVideo(video, performance.now());

      if (result.landmarks && result.landmarks.length > 0) {
        // Index finger tip is landmark 8
        const indexTip = result.landmarks[0][8];
        const pos: HandPosition = { y: indexTip.y, timestamp: Date.now() };
        positionsRef.current.push(pos);
        if (positionsRef.current.length > 30) {
          positionsRef.current = positionsRef.current.slice(-30);
        }
        detectSwipe(positionsRef.current);
      } else {
        // No hand detected — clear stale positions
        if (positionsRef.current.length > 0) {
          const last = positionsRef.current[positionsRef.current.length - 1];
          if (Date.now() - last.timestamp > 300) {
            positionsRef.current = [];
          }
        }
      }
    } catch {
      // Skip frame
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [detectSwipe]);

  const startTracking = useCallback(async () => {
    setIsInitializing(true);

    try {
      const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
      );

      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      handLandmarkerRef.current = handLandmarker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      await video.play();
      videoRef.current = video;

      setIsHandTracking(true);
      onEnabledChange?.(true);
      setIsInitializing(false);
      animFrameRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('Hand tracking init failed, falling back to keyboard:', err);
      setIsInitializing(false);
      setupKeyboardFallback();
    }
  }, [processFrame, onEnabledChange]);

  const setupKeyboardFallback = useCallback(() => {
    setIsHandTracking(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') onGestureRef.current('down');
      else if (e.key === 'ArrowUp') onGestureRef.current('up');
    };
    window.addEventListener('keydown', handleKeyDown);
    keyboardCleanupRef.current = () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const stopTracking = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);

    if (handLandmarkerRef.current) {
      handLandmarkerRef.current.close();
      handLandmarkerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    if (keyboardCleanupRef.current) {
      keyboardCleanupRef.current();
      keyboardCleanupRef.current = null;
    }

    positionsRef.current = [];
    setIsHandTracking(false);
    onEnabledChange?.(false);
  }, [onEnabledChange]);

  const toggleHandTracking = useCallback(() => {
    if (isHandTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  }, [isHandTracking, startTracking, stopTracking]);

  // Auto-start if initialEnabled is true
  useEffect(() => {
    if (initialEnabled && !isHandTracking && !isInitializing) {
      startTracking();
    }
  }, [initialEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return { isHandTracking, isInitializing, toggleHandTracking };
}
