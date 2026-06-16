import type { HairstyleItem } from '../types';

export const MOCK_LIBRARY: HairstyleItem[] = [
  {
    id: 'h1',
    name: '清爽短发',
    type: 'short',
    colorName: '自然黑',
    colorHex: '#1a1a1a',
    previewUrl: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=300&q=80',
    createdAt: Date.now() - 3 * 86400000,
  },
  {
    id: 'h2',
    name: '复古羊毛卷',
    type: 'wool',
    colorName: '摩卡棕',
    colorHex: '#5c4033',
    previewUrl: 'https://images.unsplash.com/photo-1620331307452-fddba3e6a9ee?auto=format&fit=crop&w=300&q=80',
    createdAt: Date.now() - 2 * 86400000,
  },
  {
    id: 'h3',
    name: '硬汉寸头',
    type: 'buzz',
    colorName: '极致黑',
    colorHex: '#0a0a0a',
    previewUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'h4',
    name: '气质法式波波头',
    type: 'bob',
    colorName: '亚麻金',
    colorHex: '#C4A265',
    previewUrl: 'https://images.unsplash.com/photo-1580618672591-eb18e285d852?auto=format&fit=crop&w=300&q=80',
    createdAt: Date.now(),
  }
];
