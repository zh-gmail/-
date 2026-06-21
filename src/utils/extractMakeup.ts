import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const LIP_INDICES = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291,
  185, 40, 39, 37, 0, 267, 269, 270, 409,
];
const EYE_INDICES = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398,
];

let sharedLandmarker: FaceLandmarker | null = null;
let initPromise: Promise<FaceLandmarker> | null = null;

async function getLandmarker(): Promise<FaceLandmarker> {
  if (sharedLandmarker) return sharedLandmarker;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
    );
    sharedLandmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      },
      runningMode: 'IMAGE',
      minFaceDetectionConfidence: 0.5,
    });
    return sharedLandmarker;
  })();
  return initPromise;
}

export interface MakeupExtractResult {
  lipPng: string;
  eyePng: string;
  lipColor: string;
  lipColorHex: string;
  eyeColor: string;
  eyeColorHex: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function dominantColor(ctx: CanvasRenderingContext2D, w: number, h: number): { name: string; hex: string } {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
    count++;
  }
  if (count === 0) return { name: '透明', hex: '#00000000' };
  const r = rSum / count, g = gSum / count, b = bSum / count;
  const hex = rgbToHex(r, g, b);

  if (r > 200 && g < 150 && b < 150) return { name: '红色系', hex };
  if (r > 180 && g < 100 && b < 100) return { name: '深红系', hex };
  if (r > 180 && g > 100 && b < 120) return { name: '暖色系', hex };
  if (r < 80 && g < 80 && b < 80) return { name: '深色系', hex };
  if (r > 200 && g > 180 && b > 180) return { name: '浅色系', hex };
  if (g > r && g > b) return { name: '自然系', hex };
  if (b > r && b > g) return { name: '冷色系', hex };
  if (r > 150 && g > 100 && b < 100) return { name: '暖棕系', hex };
  return { name: '自然色', hex };
}

function extractRegion(img: HTMLImageElement, points: Array<{ x: number; y: number }>): { png: string; ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w === 0 || h === 0) return null;

  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (const p of points) {
    const px = p.x * w, py = p.y * h;
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  const pad = 10;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w, maxX + pad);
  maxY = Math.min(h, maxY + pad);
  const rw = maxX - minX, rh = maxY - minY;

  const cvs = document.createElement('canvas');
  cvs.width = rw;
  cvs.height = rh;
  const ctx = cvs.getContext('2d')!;

  ctx.beginPath();
  ctx.moveTo((points[0]!.x * w) - minX, (points[0]!.y * h) - minY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo((points[i]!.x * w) - minX, (points[i]!.y * h) - minY);
  }
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(img, minX, minY, rw, rh, 0, 0, rw, rh);

  return { png: cvs.toDataURL('image/png'), ctx, w: rw, h: rh };
}

export async function extractMakeup(imageUrl: string): Promise<MakeupExtractResult | null> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = imageUrl;
  });

  const landmarker = await getLandmarker();
  const result = landmarker.detect(img);
  if (!result.faceLandmarks || result.faceLandmarks.length === 0) return null;

  const face = result.faceLandmarks[0];
  const lipPoints = LIP_INDICES.map(i => ({ x: face[i]!.x, y: face[i]!.y }));
  const eyePoints = EYE_INDICES.map(i => ({ x: face[i]!.x, y: face[i]!.y }));

  const lipRegion = extractRegion(img, lipPoints);
  const eyeRegion = extractRegion(img, eyePoints);

  const lipColor = lipRegion ? dominantColor(lipRegion.ctx, lipRegion.w, lipRegion.h) : { name: '未知', hex: '#888888' };
  const eyeColor = eyeRegion ? dominantColor(eyeRegion.ctx, eyeRegion.w, eyeRegion.h) : { name: '未知', hex: '#888888' };

  return {
    lipPng: lipRegion?.png || '',
    eyePng: eyeRegion?.png || '',
    lipColor: lipColor.name,
    lipColorHex: lipColor.hex,
    eyeColor: eyeColor.name,
    eyeColorHex: eyeColor.hex,
  };
}
