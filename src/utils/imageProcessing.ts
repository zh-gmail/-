export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      reject(new Error(`Failed to load image (${src.slice(0, 80)})`));
    };
    img.src = src;
  });
}

export async function urlToBase64(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`获取图片失败: ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('FileReader result is not a string'));
      };
      reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
      reader.readAsDataURL(blob);
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function compositeHairOnWhite(
  originalBase64: string,
  maskBase64: string,
): Promise<string> {
  const [img, mask] = await Promise.all([
    loadImage(originalBase64),
    loadImage(maskBase64),
  ]);
  if (!img.width || !img.height || !mask.width || !mask.height) {
    throw new Error('图片尺寸无效，无法执行合成操作');
  }
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D 上下文不可用');

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // Separate canvas for mask — avoids overwriting the source canvas
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = img.width;
  maskCanvas.height = img.height;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) throw new Error('Mask Canvas 2D 上下文不可用');
  maskCtx.drawImage(mask, 0, 0, img.width, img.height);
  const maskData = maskCtx.getImageData(0, 0, img.width, img.height);
  const mp = maskData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const brightness = (mp[i] + mp[i + 1] + mp[i + 2]) / 3;
    const alpha = brightness / 255;
    const invAlpha = 1 - alpha;
    pixels[i] = pixels[i] * alpha + 255 * invAlpha;
    pixels[i + 1] = pixels[i + 1] * alpha + 255 * invAlpha;
    pixels[i + 2] = pixels[i + 2] * alpha + 255 * invAlpha;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function invertMaskImage(maskBase64: string): Promise<string> {
  const mask = await loadImage(maskBase64);
  if (!mask.width || !mask.height) throw new Error('遮罩图片尺寸无效');
  const canvas = document.createElement('canvas');
  canvas.width = mask.width;
  canvas.height = mask.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D 上下文不可用');

  ctx.drawImage(mask, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const p = imageData.data;

  for (let i = 0; i < p.length; i += 4) {
    p[i] = 255 - p[i];
    p[i + 1] = 255 - p[i + 1];
    p[i + 2] = 255 - p[i + 2];
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
