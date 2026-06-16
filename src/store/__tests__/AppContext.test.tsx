import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { AppProvider, useAppContext } from '../AppContext';
import type { HairstyleItem } from '../../types';

// Mock libraryDB to avoid IndexedDB dependency
vi.mock('../../services/libraryDB', () => ({
  getAllItems: vi.fn(() => Promise.resolve([])),
  saveItem: vi.fn(() => Promise.resolve()),
  deleteItem: vi.fn(() => Promise.resolve()),
}));

// Helper to get full context state via a test component
function renderContext() {
  return renderHook(() => useAppContext(), {
    wrapper: AppProvider,
  });
}

const testItem: HairstyleItem = {
  id: 'test-1',
  name: '测试发型',
  type: 'short',
  colorName: '黑色',
  colorHex: '#1a1a1a',
  previewUrl: 'data:image/svg+xml,test',
  createdAt: Date.now(),
};

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('provides default settings and active tab', () => {
    const { result } = renderContext();

    expect(result.current.activeTab).toBe('live');
    expect(result.current.settings.imageProvider).toBe('baidu');
    expect(result.current.settings.imageApiKey).toBe('');
    expect(result.current.library).toEqual([]);
    expect(result.current.libraryLoading).toBe(true);
  });

  it('updates settings via updateSettings', () => {
    const { result } = renderContext();

    act(() => {
      result.current.updateSettings({ imageProvider: 'ali' });
    });

    expect(result.current.settings.imageProvider).toBe('ali');
  });

  it('merges partial settings without losing existing values', () => {
    const { result } = renderContext();

    act(() => {
      result.current.updateSettings({ imageApiKey: 'test-key' });
    });

    expect(result.current.settings.imageApiKey).toBe('test-key');
    expect(result.current.settings.imageProvider).toBe('baidu');
  });

  it('adds item to library via addToLibrary', () => {
    const { result } = renderContext();

    act(() => {
      result.current.addToLibrary(testItem);
    });

    expect(result.current.library).toHaveLength(1);
    expect(result.current.library[0].id).toBe('test-1');
  });

  it('deletes item from library via deleteFromLibrary', () => {
    const { result } = renderContext();

    act(() => {
      result.current.addToLibrary(testItem);
    });
    expect(result.current.library).toHaveLength(1);

    act(() => {
      result.current.deleteFromLibrary('test-1');
    });
    expect(result.current.library).toHaveLength(0);
  });

  it('returns placeholder when library is empty', () => {
    const { result } = renderContext();

    const placeholder = result.current.getCurrentHairstyle();
    expect(placeholder.id).toBe('placeholder');
    expect(placeholder.name).toBe('无素材');
  });

  it('persists settings to localStorage', () => {
    renderContext();

    const saved = JSON.parse(localStorage.getItem('app_settings')!);
    expect(saved.imageProvider).toBe('baidu');
  });
});

describe('deleteFromLibrary index correction', () => {
  function setupThreeItems(renderResult: ReturnType<typeof renderContext>) {
    const { result } = renderResult;
    const itemA = { ...testItem, id: 'a', name: 'Item A' };
    const itemB = { ...testItem, id: 'b', name: 'Item B' };
    const itemC = { ...testItem, id: 'c', name: 'Item C' };
    // addToLibrary prepends, so add in reverse to get [a(idx0), b(idx1), c(idx2)]
    act(() => result.current.addToLibrary(itemC));
    act(() => result.current.addToLibrary(itemB));
    act(() => result.current.addToLibrary(itemA));
    // library = [{id:'a', idx0}, {id:'b', idx1}, {id:'c', idx2}]
    return { result, itemA, itemB, itemC };
  }

  it('keeps index unchanged when deleting an item before the current selection', () => {
    const { result, itemA } = setupThreeItems(renderContext());
    // current=1 (b), delete a at idx0 (before current) → index stays 1
    act(() => result.current.setCurrentHairstyleIndex(1));
    expect(result.current.currentHairstyleIndex).toBe(1);
    expect(result.current.library[1].id).toBe('b');

    act(() => result.current.deleteFromLibrary(itemA.id));
    expect(result.current.library).toHaveLength(2);
    // Index stays at 1 (not decremented) — useEffect only fixes out-of-bounds, not shift
    expect(result.current.currentHairstyleIndex).toBe(1);
    // Now points to 'c' (shifted from index 2 to index 1)
    expect(result.current.library[1].id).toBe('c');
  });

  it('keeps index unchanged when deleting the currently selected item (no out-of-bounds)', () => {
    const { result, itemB } = setupThreeItems(renderContext());
    // current=1 (b), delete b at idx1 → index stays 1 (still in bounds, length=2)
    act(() => result.current.setCurrentHairstyleIndex(1));
    expect(result.current.currentHairstyleIndex).toBe(1);

    act(() => result.current.deleteFromLibrary(itemB.id));
    expect(result.current.library).toHaveLength(2);
    // Index stays at 1 — still in bounds after deletion
    expect(result.current.currentHairstyleIndex).toBe(1);
    // Points to 'c' (shifted from index 2 to index 1)
    expect(result.current.library[1].id).toBe('c');
  });

  it('keeps index at 0 when deleting the only remaining item', () => {
    const { result } = renderContext();
    const onlyItem = { ...testItem, id: 'only', name: 'Only' };

    act(() => result.current.addToLibrary(onlyItem));
    expect(result.current.library).toHaveLength(1);
    expect(result.current.currentHairstyleIndex).toBe(0);

    act(() => result.current.deleteFromLibrary(onlyItem.id));
    expect(result.current.library).toHaveLength(0);
    expect(result.current.currentHairstyleIndex).toBe(0);
  });

  it('leaves index unchanged when deleting an item after current selection', () => {
    const { result, itemC } = setupThreeItems(renderContext());
    // current=1 (b), delete c at idx2 (after current) → index stays 1
    act(() => result.current.setCurrentHairstyleIndex(1));
    expect(result.current.currentHairstyleIndex).toBe(1);

    act(() => result.current.deleteFromLibrary(itemC.id));
    expect(result.current.library).toHaveLength(2);
    expect(result.current.currentHairstyleIndex).toBe(1);
    // Still points to 'b' (still at index 1 after removing idx2)
    expect(result.current.library[1].id).toBe('b');
  });
});
