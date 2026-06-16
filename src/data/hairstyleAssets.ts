import { HairstyleAsset } from '../services/arEngine';

/**
 * 3D hairstyle model registry.
 *
 * Each entry points to a .glb file in /assets/hairstyles/.
 * Replace these with real models from TurboSquid/Sketchfab later.
 */
export const HAIRSTYLE_ASSETS: HairstyleAsset[] = [
  {
    id: 'short-hair',
    name: '短发',
    effectUrl: '/assets/hairstyles/short-hair.glb',
    thumbnailUrl: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'long-hair',
    name: '长发',
    effectUrl: '/assets/hairstyles/long-hair.glb',
    thumbnailUrl: 'https://images.unsplash.com/photo-1620331307452-fddba3e6a9ee?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'bob-hair',
    name: '波波头',
    effectUrl: '/assets/hairstyles/bob-hair.glb',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
  },
];

export function getAssetById(id: string): HairstyleAsset | undefined {
  return HAIRSTYLE_ASSETS.find(a => a.id === id);
}
