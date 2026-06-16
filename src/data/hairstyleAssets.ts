import type { HairstyleAsset } from '../types';

export const HAIRSTYLE_ASSETS: HairstyleAsset[] = [
  {
    id: 'short-hair',
    name: '短发',
    effectUrl: '/assets/hairstyles/short-hair.glb',
    thumbnailUrl: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=200&q=80',
    scale: [1, 1, 1],
    position: [0, 0.10, -0.02],
  },
  {
    id: 'long-hair',
    name: '长发',
    effectUrl: '/assets/hairstyles/long-hair.glb',
    thumbnailUrl: 'https://images.unsplash.com/photo-1620331307452-fddba3e6a9ee?auto=format&fit=crop&w=200&q=80',
    scale: [1, 1, 1],
    position: [0, 0.15, -0.02],
  },
  {
    id: 'bob-hair',
    name: '波波头',
    effectUrl: '/assets/hairstyles/bob-hair.glb',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
    scale: [1, 1, 1],
    position: [0, 0.12, -0.02],
  },
];
