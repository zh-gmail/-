import type { HairstyleItem } from '../types';

const API_BASE = '/api/items';

async function base64ToBlob(dataUri: string): Promise<Blob> {
  const [header, base64] = dataUri.split(',', 2);
  const mime = header?.match(/:(.*?);/)?.[1] || 'image/png';
  const bytes = atob(base64 || '');
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function getAllItems(): Promise<HairstyleItem[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error(`Failed to fetch items: ${res.status}`);
  return res.json();
}

export async function saveItem(item: HairstyleItem): Promise<void> {
  if (item.previewUrl.startsWith('data:')) {
    const blob = await base64ToBlob(item.previewUrl);
    const formData = new FormData();
    formData.append('image', blob, `${item.id}.png`);
    formData.append('metadata', JSON.stringify(item));
    const res = await fetch(API_BASE, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Failed to save item: ${res.status}`);
    return;
  }

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`Failed to save item: ${res.status}`);
}

export async function deleteItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete item: ${res.status}`);
}

export async function clearAll(): Promise<void> {
  const res = await fetch(API_BASE, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to clear items: ${res.status}`);
}
