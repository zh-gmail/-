import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

export function useImageUpload(maxSizeBytes = 10 * 1024 * 1024) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxSizeBytes) {
      setError('图片大小超过限制，请选择 10MB 以内的图片');
      e.target.value = '';
      return;
    }
    setError(null);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    fileRef.current = file;
    objectUrlRef.current = URL.createObjectURL(file);
    setSelectedImage(objectUrlRef.current);
    e.target.value = '';
  }, [maxSizeBytes]);

  const setImageFromDataUrl = useCallback((dataUrl: string) => {
    const blob = dataUrlToBlob(dataUrl);
    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    fileRef.current = file;
    objectUrlRef.current = URL.createObjectURL(file);
    setSelectedImage(objectUrlRef.current);
    setError(null);
  }, []);

  const clearImage = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    fileRef.current = null;
    setSelectedImage(null);
    setError(null);
  }, []);

  return { selectedImage, fileRef, handleFileSelect, setImageFromDataUrl, clearImage, error };
}
