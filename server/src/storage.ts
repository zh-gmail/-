import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const ITEMS_FILE = join(DATA_DIR, 'items.json');

let writeLock: Promise<void> = Promise.resolve();

function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    return mkdir(DATA_DIR, { recursive: true }).then();
  }
  return Promise.resolve();
}

export async function readItems<T>(): Promise<T[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(ITEMS_FILE, 'utf-8');
    return JSON.parse(raw) as T[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

export async function writeItems<T>(items: T[]): Promise<void> {
  writeLock = writeLock.then(async () => {
    await ensureDataDir();
    const tmp = ITEMS_FILE + '.tmp';
    await writeFile(tmp, JSON.stringify(items, null, 2), 'utf-8');
    await writeFile(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf-8');
  });
  return writeLock;
}
