import { Suspense, lazy } from 'react';
import { AppProvider, useAppContext } from './store/AppContext';
import Navigation from './components/tabs/Navigation';
import ErrorBoundary from './components/ErrorBoundary';
import type { TabState } from './types';

const LiveCamera = lazy(() => import('./components/tabs/LiveCamera'));
const PhotoEdit = lazy(() => import('./components/tabs/PhotoEdit'));
const Extraction = lazy(() => import('./components/tabs/Extraction'));
const Library = lazy(() => import('./components/tabs/Library'));
const Settings = lazy(() => import('./components/tabs/Settings'));

function MinimalNav() {
	  const { activeTab, setActiveTab } = useAppContext();
	  const tabs: { id: TabState; label: string }[] = [
	    { id: 'live', label: '实时试戴' },
	    { id: 'photo', label: '照片换发' },
	    { id: 'extract', label: '素材提取' },
	    { id: 'library', label: '素材库' },
	    { id: 'settings', label: '设置' },
	  ];
	  return (
	    <nav className="fixed bottom-0 inset-x-0 z-50 bg-black/90 border-t border-white/10">
	      <div className="flex justify-around py-3 px-2 max-w-lg mx-auto">
	        {tabs.map(tab => (
	          <button
	            key={tab.id}
	            onClick={() => setActiveTab(tab.id)}
	            className={`px-3 py-2 text-xs font-medium transition-colors ${
	              activeTab === tab.id ? 'text-white' : 'text-neutral-500'
	            }`}
	          >
	            {tab.label}
	          </button>
	        ))}
	      </div>
	    </nav>
	  );
	}

	const TAB_FALLBACK = (
  <div className="h-full flex items-center justify-center bg-black">
    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  </div>
);

function AppContent() {
  const { activeTab } = useAppContext();

  return (
    <div className="h-screen w-full overflow-hidden bg-black text-neutral-900 font-sans selection:bg-neutral-200">
      <main className="h-full w-full relative">
        <Suspense fallback={TAB_FALLBACK}>
          {activeTab === 'live' && <ErrorBoundary><LiveCamera /></ErrorBoundary>}
          {activeTab === 'photo' && <ErrorBoundary><PhotoEdit /></ErrorBoundary>}
          {activeTab === 'extract' && <ErrorBoundary><Extraction /></ErrorBoundary>}
          {activeTab === 'library' && <ErrorBoundary><Library /></ErrorBoundary>}
          {activeTab === 'settings' && <ErrorBoundary><Settings /></ErrorBoundary>}
        </Suspense>
      </main>
      <ErrorBoundary fallback={<MinimalNav />}><Navigation /></ErrorBoundary>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
