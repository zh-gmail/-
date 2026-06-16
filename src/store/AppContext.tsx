import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings, HairstyleItem, TabState } from '../types';
import { MOCK_LIBRARY } from '../data/mockLibrary';

interface AppContextType {
  activeTab: TabState;
  setActiveTab: (tab: TabState) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  library: HairstyleItem[];
  addToLibrary: (item: HairstyleItem) => void;
  currentHairstyleIndex: number;
  setCurrentHairstyleIndex: (index: number) => void;
  nextHairstyle: () => void;
  prevHairstyle: () => void;
  getCurrentHairstyle: () => HairstyleItem;
  isHandTracking: boolean;
  setHandTracking: (v: boolean) => void;
}

const defaultSettings: AppSettings = {
  imageApiKey: import.meta.env.VITE_BAIDU_API_KEY || import.meta.env.VITE_DASHSCOPE_API_KEY || '',
  imageApiSecret: import.meta.env.VITE_BAIDU_SECRET_KEY || '',
  imageProvider: 'baidu',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabState>('live');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [library, setLibrary] = useState<HairstyleItem[]>(() => {
    const saved = localStorage.getItem('app_library');
    return saved ? JSON.parse(saved) : MOCK_LIBRARY;
  });
  const [currentHairstyleIndex, setCurrentHairstyleIndex] = useState(0);
  const [isHandTracking, setHandTracking] = useState(() => {
    return localStorage.getItem('hand_tracking') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('hand_tracking', String(isHandTracking));
  }, [isHandTracking]);

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('app_library', JSON.stringify(library));
  }, [library]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const addToLibrary = (item: HairstyleItem) => {
    setLibrary((prev) => [...prev, item]);
  };

  const nextHairstyle = () => {
    setCurrentHairstyleIndex((prev) => (prev + 1) % library.length);
  };

  const prevHairstyle = () => {
    setCurrentHairstyleIndex((prev) => (prev - 1 + library.length) % library.length);
  };

  const getCurrentHairstyle = () => library[currentHairstyleIndex] || MOCK_LIBRARY[0];

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        settings,
        updateSettings,
        library,
        addToLibrary,
        currentHairstyleIndex,
        setCurrentHairstyleIndex,
        nextHairstyle,
        prevHairstyle,
        getCurrentHairstyle,
        isHandTracking,
        setHandTracking
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
