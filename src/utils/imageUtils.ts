export function getImgFallbackDataUri(char?: string): string {
  const c = encodeURIComponent(char ?? '?');
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23f5f5f5' width='400' height='400'/%3E%3Ctext x='200' y='200' text-anchor='middle' dominant-baseline='central' fill='%23ccc' font-size='64'%3E${c}%3C/text%3E%3C/svg%3E`;
}

// Returns raw base64 — no data: prefix; providers add their own.
export function resizeImage(file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建 Canvas 2D 上下文'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const parts = dataUrl.split(',');
      resolve(parts.length > 1 ? parts[1] : '');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropAndBlurImage(
  imageSrc: string,
  cropRect: CropRect,
  containerWidth: number,
  containerHeight: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: nw, naturalHeight: nh } = img;

      // Calculate object-fit:cover mapping from display to natural coordinates
      const containerAspect = containerWidth / containerHeight;
      const imageAspect = nw / nh;

      let scale: number, offsetX: number, offsetY: number;

      if (imageAspect > containerAspect) {
        // Image wider than container: constrained by height
        scale = containerHeight / nh;
        const displayedWidth = nw * scale;
        offsetX = (displayedWidth - containerWidth) / 2;
        offsetY = 0;
      } else {
        // Image taller than container: constrained by width
        scale = containerWidth / nw;
        const displayedHeight = nh * scale;
        offsetX = 0;
        offsetY = (displayedHeight - containerHeight) / 2;
      }

      // Map crop rect from display space to natural image space
      const natX = (cropRect.x + offsetX) / scale;
      const natY = (cropRect.y + offsetY) / scale;
      const natW = cropRect.width / scale;
      const natH = cropRect.height / scale;

      // Create main canvas at natural resolution
      const canvas = document.createElement('canvas');
      canvas.width = nw;
      canvas.height = nh;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }

      // Step 1: Draw original image
      ctx.drawImage(img, 0, 0, nw, nh);

      // Step 2: Create strong background blur via downscale+upscale
      const blurCvs = document.createElement('canvas');
      const blurScale = 0.08;
      blurCvs.width = Math.max(80, Math.round(nw * blurScale));
      blurCvs.height = Math.max(80, Math.round(nh * blurScale));
      const blurCtx = blurCvs.getContext('2d')!;
      blurCtx.drawImage(img, 0, 0, blurCvs.width, blurCvs.height);
      // Apply additional CSS blur on the small canvas for smoother result
      blurCtx.filter = 'blur(6px)';
      blurCtx.drawImage(blurCvs, 0, 0); // re-draw with blur
      blurCtx.filter = 'none';
      // Paint blurred version scaled up over whole canvas
      ctx.drawImage(blurCvs, 0, 0, nw, nh);

      // Step 3: Restore the selected region from original image
      ctx.save();
      ctx.beginPath();
      ctx.rect(natX, natY, natW, natH);
      ctx.clip();
      ctx.drawImage(img, 0, 0, nw, nh);
      ctx.restore();

      // Step 4: Soft transition — feather the edge with a subtle fade
      // Draw a thin border inside the selection edge
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = Math.max(1, Math.round(nw * 0.0015));
      ctx.strokeRect(natX, natY, natW, natH);
      ctx.restore();

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = imageSrc;
  });
}

export async function imageUrlToBase64(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    const parts = url.split(',');
    return parts.length > 1 ? parts[1] : url;
  }
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const parts = (reader.result as string).split(',');
      resolve(parts.length > 1 ? parts[1] : '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
