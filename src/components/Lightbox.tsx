import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { HairstyleItem } from '../types';

interface LightboxProps {
  item: HairstyleItem;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  hairstyle: '发型设计',
  makeup: '妆容艺术',
  outfit: '服饰穿搭',
};

export default function Lightbox({ item, onClose }: LightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl max-h-[90vh] mx-4 bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-ink-black text-white flex items-center justify-center shadow-lg z-10 hover:opacity-80 transition-opacity"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
        <div className="flex-1 overflow-hidden bg-black flex items-center justify-center">
          <img
            className="max-w-full max-h-[65vh] object-contain"
            src={item.previewUrl}
            alt={item.name}
          />
        </div>
        <div className="p-5 bg-white">
          <span className="text-[10px] font-label-caps text-earth-taupe tracking-widest uppercase">
            {CATEGORY_LABELS[item.category] || item.category}
          </span>
          <h2 className="font-headline-md text-headline-md text-ink-black mt-1">{item.name}</h2>
          {item.description && (
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{item.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
