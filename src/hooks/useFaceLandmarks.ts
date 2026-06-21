import { useState, useEffect, useRef } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const SELECTED_INDICES = [
  0, 4, 8, 12, 16, 17, 21, 22, 26,
  36, 39, 41, 42, 45, 47,
  27, 30, 33, 48, 51, 57, 60, 64,
];

type Point = { x: number; y: number };

let sharedLandmarker: FaceLandmarker | null = null;
let initPromise: Promise<FaceLandmarker> | null = null;

async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (sharedLandmarker) return sharedLandmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
    );
    sharedLandmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      },
      runningMode: 'IMAGE',
      minFaceDetectionConfidence: 0.5,
    });
    return sharedLandmarker;
  })();

  return initPromise;
}

export function useFaceLandmarks(imageUrl: string | null): Point[] | null {
  const [landmarks, setLandmarks] = useState<Point[] | null>(null);
  const failCountRef = useRef(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setLandmarks(null);
      return;
    }

    let cancelled = false;
    const img = new Image();
    imgRef.current = img;
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      if (cancelled) return;

      getFaceLandmarker()
        .then((landmarker) => {
          if (cancelled) return;

          const result = landmarker.detect(img);
          if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
            failCountRef.current++;
            if (failCountRef.current >= 3) {
              setLandmarks(null);
            }
            return;
          }

          failCountRef.current = 0;
          const face = result.faceLandmarks[0];
          const w = img.naturalWidth;
          const h = img.naturalHeight;

          const points = SELECTED_INDICES.map((i) => ({
            x: (face[i]!.x * w) / w * 100,
            y: (face[i]!.y * h) / h * 100,
          }));

          if (!cancelled) setLandmarks(points);
        })
        .catch(() => {
          failCountRef.current++;
        });
    };

    img.onerror = () => {
      console.warn('Failed to load image for face detection');
    };

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return landmarks;
}
