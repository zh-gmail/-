import type { Context } from 'hono';
import { readItems, writeItems } from '../storage.js';

interface HairstyleItem {
  id: string;
  name: string;
  category: string;
  type: string;
  colorName: string;
  colorHex: string;
  description: string;
  previewUrl: string;
  createdAt: number;
}

export async function getAllItems(c: Context): Promise<Response> {
  try {
    const items = await readItems<HairstyleItem>();
    return c.json(items);
  } catch (err) {
    console.error('Failed to read items:', err);
    return c.json({ error: 'Failed to read items' }, 500);
  }
}

export async function createItem(c: Context): Promise<Response> {
  try {
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const imageFile = formData.get('image') as File | null;
      const metadataRaw = formData.get('metadata') as string | null;

      if (!metadataRaw) {
        return c.json({ error: 'Missing metadata' }, 400);
      }

      const item: HairstyleItem = JSON.parse(metadataRaw);

      if (imageFile) {
        const ext = imageFile.name?.split('.').pop() || 'png';
        const fileName = `${item.id}.${ext}`;
        const uploadsDir = new URL('../../uploads/', import.meta.url);
        const filePath = new URL(fileName, uploadsDir.href);
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        await import('node:fs/promises').then(fs => fs.writeFile(filePath, buffer));

        item.previewUrl = `/api/files/${fileName}`;
      }

      const items = await readItems<HairstyleItem>();
      items.unshift(item);
      await writeItems(items);

      return c.json(item, 201);
    }

    const item: HairstyleItem = await c.req.json();
    const items = await readItems<HairstyleItem>();
    items.unshift(item);
    await writeItems(items);

    return c.json(item, 201);
  } catch (err) {
    console.error('Failed to create item:', err);
    return c.json({ error: 'Failed to create item' }, 500);
  }
}

export async function deleteItem(c: Context): Promise<Response> {
  try {
    const id = c.req.param('id');
    const items = await readItems<HairstyleItem>();
    const idx = items.findIndex(i => i.id === id);

    if (idx === -1) {
      return c.json({ error: 'Item not found' }, 404);
    }

    const removed = items[idx];
    items.splice(idx, 1);
    await writeItems(items);

    // Delete the associated image file
    if (removed.previewUrl?.startsWith('/api/files/')) {
      const fileName = removed.previewUrl.replace('/api/files/', '');
      const uploadsDir = new URL('../../uploads/', import.meta.url);
      const filePath = new URL(fileName, uploadsDir.href);
      try {
        await import('node:fs/promises').then(fs => fs.unlink(filePath));
      } catch { /* file may not exist */ }
    }

    return c.json({ success: true });
  } catch (err) {
    console.error('Failed to delete item:', err);
    return c.json({ error: 'Failed to delete item' }, 500);
  }
}

export async function clearAllItems(c: Context): Promise<Response> {
  try {
    await writeItems<HairstyleItem>([]);

    // Clean up uploads directory
    const uploadsDir = new URL('../../uploads/', import.meta.url);
    try {
      const fs = await import('node:fs/promises');
      const files = await fs.readdir(uploadsDir);
      for (const file of files) {
        await fs.unlink(new URL(file, uploadsDir.href));
      }
    } catch { /* directory may not exist */ }

    return c.json({ success: true });
  } catch (err) {
    console.error('Failed to clear items:', err);
    return c.json({ error: 'Failed to clear items' }, 500);
  }
}
