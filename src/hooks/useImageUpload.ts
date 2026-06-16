import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';

export function useImageUpload() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    fileRef.current = file;
    objectUrlRef.current = URL.createObjectURL(file);
    setSelectedImage(objectUrlRef.current);
    (e.target as HTMLInputElement).value = '';
  }, []);

  const clearImage = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    fileRef.current = null;
    setSelectedImage(null);
  }, []);

  return { selectedImage, fileRef, handleFileSelect, clearImage };
}
