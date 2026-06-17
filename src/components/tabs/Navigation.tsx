import { memo, useRef, useState, useEffect, type ReactNode } from 'react';
import { Camera, Image as ImageIcon, Scissors, Library as LibraryIcon, Settings2 } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';
import type { TabState } from '../../types';

const NAV_TABS: { id: TabState; icon: ReactNode; label: string }[] = [
  { id: 'live', icon: <Camera size={22} strokeWidth={1.5} />, label: '实时试戴' },
  { id: 'photo', icon: <ImageIcon size={22} strokeWidth={1.5} />, label: '照片换发' },
  { id: 'extract', icon: <Scissors size={22} strokeWidth={1.5} />, label: '素材提取' },
  { id: 'library', icon: <LibraryIcon size={22} strokeWidth={1.5} />, label: '素材库' },
  { id: 'settings', icon: <Settings2 size={22} strokeWidth={1.5} />, label: '设置' },
];

function Navigation() {
  const { activeTab, setActiveTab } = useAppContext();
  const navRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeIdx = NAV_TABS.findIndex(t => t.id === activeTab);
    const buttons = nav.querySelectorAll('button');
    const activeBtn = buttons[activeIdx] as HTMLElement | undefined;
    if (activeBtn) {
      setPillStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [activeTab]);

  return (
    <nav className="fixed bottom-0 inset-x-0 pb-safe pointer-events-none z-50">
      <div className="mx-auto max-w-lg p-6 pointer-events-auto">
         <div ref={navRef} className="bg-black/90 backdrop-blur-xl rounded-full p-2 flex items-center relative shadow-2xl border border-white/10">
           {/* Active tab indicator pill */}
           <div
             className="absolute bg-white/20 rounded-full ease-[cubic-bezier(0.34,1.56,0.64,1)] transition-all duration-500"
             style={{
               left: pillStyle.left,
               width: pillStyle.width,
               top: 8,
               height: 'calc(100% - 16px)',
             }}
           />
           {NAV_TABS.map((tab) => {
             const isActive = activeTab === tab.id;
             return (
               <button
                 key={tab.id}
                 aria-label={tab.label}
                 onClick={() => setActiveTab(tab.id)}
                 className="relative z-10 flex-1 px-4 py-3 flex flex-col items-center justify-center gap-1"
               >
                 <div className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                    {tab.icon}
                 </div>
               </button>
             );
           })}
         </div>
      </div>
    </nav>
  );
}

export default memo(Navigation);
