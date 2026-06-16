import { HairstyleItem } from '../types';

export const MOCK_LIBRARY: HairstyleItem[] = [
  {
    id: 'h1',
    name: '清爽短发',
    type: 'short',
    colorName: '自然黑',
    colorHex: 'rgba(20, 20, 20, 0.8)',
    previewUrl: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'h2',
    name: '复古羊毛卷',
    type: 'wool',
    colorName: '摩卡棕',
    colorHex: 'rgba(92, 64, 51, 0.8)',
    previewUrl: 'https://images.unsplash.com/photo-1620331307452-fddba3e6a9ee?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'h3',
    name: '硬汉寸头',
    type: 'buzz',
    colorName: '极致黑',
    colorHex: 'rgba(10, 10, 10, 0.9)',
    previewUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'h4',
    name: '气质法式波波头',
    type: 'bob',
    colorName: '亚麻金',
    colorHex: 'rgba(200, 175, 130, 0.8)',
    previewUrl: 'https://images.unsplash.com/photo-1580618672591-eb18e285d852?auto=format&fit=crop&w=300&q=80',
  }
];

// Reusable SVG placeholder for AR hair overlay
export const getHairOverlaySvg = (colorHex: string, type: string) => {
  const isShort = type === 'buzz' || type === 'short';
  // A simplistic SVG representing a hair overlay
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path fill="${encodeURIComponent(colorHex)}" d="${isShort ? 'M50 80 Q100 20 150 80 Q160 120 150 150 Q100 130 50 150 Q40 120 50 80' : 'M30 100 Q100 0 170 100 Q180 180 150 200 Q100 120 50 200 Q20 180 30 100'}"/></svg>`;
};
