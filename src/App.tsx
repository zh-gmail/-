/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { AppProvider, useAppContext } from './store/AppContext';
import Navigation from './components/tabs/Navigation';
import ErrorBoundary from './components/ErrorBoundary';

const LiveCamera = React.lazy(() => import('./components/tabs/LiveCamera'));
const PhotoEdit = React.lazy(() => import('./components/tabs/PhotoEdit'));
const Extraction = React.lazy(() => import('./components/tabs/Extraction'));
const Library = React.lazy(() => import('./components/tabs/Library'));
const Settings = React.lazy(() => import('./components/tabs/Settings'));

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
      <Navigation />
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
