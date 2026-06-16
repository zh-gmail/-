import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings, HairstyleItem, TabState } from '../types';
import { getAllItems, saveItem, deleteItem } from '../services/libraryDB';

interface AppContextType {
  activeTab: TabState;
  setActiveTab: (tab: TabState) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  library: HairstyleItem[];
  libraryLoading: boolean;
  addToLibrary: (item: HairstyleItem) => void;
  deleteFromLibrary: (id: string) => void;
  currentHairstyleIndex: number;
  setCurrentHairstyleIndex: React.Dispatch<React.SetStateAction<number>>;
  nextHairstyle: () => void;
  prevHairstyle: () => void;
  getCurrentHairstyle: () => HairstyleItem;
}

const defaultSettings: AppSettings = {
  imageApiKey: import.meta.env.VITE_BAIDU_API_KEY || import.meta.env.VITE_DASHSCOPE_API_KEY || '',
  imageApiSecret: import.meta.env.VITE_BAIDU_SECRET_KEY || '',
  imageFalKey: import.meta.env.VITE_FAL_KEY || '',
  imageProvider: 'baidu',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabState>('live');
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('app_settings');
      return saved ? JSON.parse(saved) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });
  const [library, setLibrary] = useState<HairstyleItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [currentHairstyleIndex, setCurrentHairstyleIndex] = useState(0);

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    setLibraryLoading(true);
    getAllItems()
      .then(setLibrary)
      .catch((err) => console.error('Failed to load library from IndexedDB:', err))
      .finally(() => setLibraryLoading(false));
  }, []);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const addToLibrary = (item: HairstyleItem) => {
    saveItem(item).catch((err) => console.error('Failed to save to library:', err));
    setLibrary((prev) => [...prev, item]);
  };

  const deleteFromLibrary = (id: string) => {
    deleteItem(id).catch((err) => console.error('Failed to delete from library:', err));
    setLibrary((prev) => prev.filter((i) => i.id !== id));
  };

  const nextHairstyle = () => {
    setCurrentHairstyleIndex((prev) => (prev + 1) % Math.max(library.length, 1));
  };

  const prevHairstyle = () => {
    setCurrentHairstyleIndex((prev) => (prev - 1 + Math.max(library.length, 1)) % Math.max(library.length, 1));
  };

  const getCurrentHairstyle = () => library[currentHairstyleIndex] || {
    id: 'placeholder', name: '无素材', type: 'short' as const,
    colorName: '—', colorHex: '#666666', previewUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E',
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        settings,
        updateSettings,
        library,
        libraryLoading,
        addToLibrary,
        deleteFromLibrary,
        currentHairstyleIndex,
        setCurrentHairstyleIndex,
        nextHairstyle,
        prevHairstyle,
        getCurrentHairstyle
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
