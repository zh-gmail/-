import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';

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

  const clearImage = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    fileRef.current = null;
    setSelectedImage(null);
    setError(null);
  }, []);

  return { selectedImage, fileRef, handleFileSelect, clearImage, error };
}
