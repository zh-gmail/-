import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { AppSettings, HairstyleItem, TabState, ImageProviderType } from '../types';
import { getAllItems, saveItem, deleteItem, clearAll } from '../services/libraryDB';
import { seedLibrary } from '../data/seed';

interface AppContextType {
  activeTab: TabState;
  setActiveTab: (tab: TabState) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  library: HairstyleItem[];
  libraryLoading: boolean;
  libraryError: string | null;
  clearLibraryError: () => void;
  addToLibrary: (item: HairstyleItem) => void;
  deleteFromLibrary: (id: string) => void;
  clearLibrary: () => Promise<void>;
  currentHairstyleIndex: number;
  setCurrentHairstyleIndex: React.Dispatch<React.SetStateAction<number>>;
  getCurrentHairstyle: () => HairstyleItem;
}

const PLACEHOLDER_HAIRSTYLE: HairstyleItem = {
  id: 'placeholder', name: '无素材', type: 'short' as const,
  colorName: '—', colorHex: '#666666', previewUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E', createdAt: 0,
};

const defaultSettings: AppSettings = (() => {
  const baiduKey = import.meta.env.VITE_BAIDU_API_KEY || '';
  const dashscopeKey = import.meta.env.VITE_DASHSCOPE_API_KEY || '';
  const falKey = import.meta.env.VITE_FAL_KEY || '';
  const provider: ImageProviderType = baiduKey ? 'baidu' : dashscopeKey ? 'ali' : falKey ? 'fal' : 'baidu';
  return {
    imageApiKey: baiduKey || dashscopeKey || '',
    imageApiSecret: import.meta.env.VITE_BAIDU_SECRET_KEY || '',
    imageFalKey: falKey,
    imageProvider: provider,
  };
})();

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabState>('live');
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('app_settings');
      return saved ? JSON.parse(saved) : defaultSettings;
    } catch (err) {
      console.warn('Failed to parse settings from localStorage:', err);
      return defaultSettings;
    }
  });
  const [library, setLibrary] = useState<HairstyleItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [currentHairstyleIndex, setCurrentHairstyleIndex] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem('app_settings', JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to persist settings to localStorage:', err);
    }
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    setLibraryLoading(true);
    getAllItems()
      .then(async (items) => {
        if (items.length === 0) {
          await seedLibrary();
          if (cancelled) return;
          items = await getAllItems();
        }
        items.sort((a, b) => b.createdAt - a.createdAt);
        setLibrary(items);
      })
      .catch((err) => console.error('Failed to load library from IndexedDB:', err))
      .finally(() => { if (!cancelled) setLibraryLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const clearLibraryError = useCallback(() => setLibraryError(null), []);

  const addToLibrary = useCallback((item: HairstyleItem) => {
    saveItem(item).catch((err) => {
      console.error('Failed to save to library:', err);
      setLibraryError('保存素材失败，请检查存储空间后重试');
    });
    setLibrary((prev) => [item, ...prev]);
  }, []);

  const deleteFromLibrary = useCallback((id: string) => {
    deleteItem(id).catch((err) => {
      console.error('Failed to delete from library:', err);
      setLibraryError('删除素材失败，请重试');
    });
    setLibrary((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearLibrary = useCallback(async () => {
    try {
      await clearAll();
      setLibrary([]);
    } catch (err) {
      console.error('Failed to clear library:', err);
    }
  }, []);

  useEffect(() => {
    setCurrentHairstyleIndex((current) => {
      if (library.length > 0 && current >= library.length) {
        return library.length - 1;
      }
      return current;
    });
  }, [library.length]);

  const getCurrentHairstyle = useCallback(() => library[currentHairstyleIndex] || PLACEHOLDER_HAIRSTYLE, [library, currentHairstyleIndex]);

  const contextValue = useMemo(() => ({
    activeTab,
    setActiveTab,
    settings,
    updateSettings,
    library,
    libraryLoading,
    libraryError,
    clearLibraryError,
    addToLibrary,
    deleteFromLibrary,
    clearLibrary,
    currentHairstyleIndex,
    setCurrentHairstyleIndex,
    getCurrentHairstyle,
  }), [activeTab, settings, library, libraryLoading, libraryError, clearLibraryError,
      addToLibrary, currentHairstyleIndex, setCurrentHairstyleIndex, deleteFromLibrary,
      clearLibrary, getCurrentHairstyle, updateSettings]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
