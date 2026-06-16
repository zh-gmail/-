import { memo, type ReactNode } from 'react';
import { Camera, Image as ImageIcon, Scissors, Library as LibraryIcon, Settings2 } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';
import type { TabState } from '../../types';
import { motion } from 'motion/react';

const NAV_TABS: { id: TabState; icon: ReactNode; label: string }[] = [
  { id: 'live', icon: <Camera size={22} strokeWidth={1.5} />, label: '实时试戴' },
  { id: 'photo', icon: <ImageIcon size={22} strokeWidth={1.5} />, label: '照片换发' },
  { id: 'extract', icon: <Scissors size={22} strokeWidth={1.5} />, label: '素材提取' },
  { id: 'library', icon: <LibraryIcon size={22} strokeWidth={1.5} />, label: '素材库' },
  { id: 'settings', icon: <Settings2 size={22} strokeWidth={1.5} />, label: '设置' },
];

function Navigation() {
  const { activeTab, setActiveTab } = useAppContext();

  return (
    <nav className="fixed bottom-0 inset-x-0 pb-safe pointer-events-none z-50">
      <div className="mx-auto max-w-lg p-6 pointer-events-auto">
         <div className="bg-black/90 backdrop-blur-xl rounded-full p-2 flex items-center justify-between shadow-2xl border border-white/10">
           {NAV_TABS.map((tab) => {
             const isActive = activeTab === tab.id;
             return (
               <button
                 key={tab.id}
                 aria-label={tab.label}
                 onClick={() => setActiveTab(tab.id)}
                 className="relative px-4 py-3 flex flex-col items-center justify-center gap-1"
               >
                 {isActive && (
                   <motion.div 
                     layoutId="nav-pill" 
                     className="absolute inset-0 bg-white/20 rounded-full"
                     transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                   />
                 )}
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
