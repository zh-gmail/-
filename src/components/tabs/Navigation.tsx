import React from 'react';
import { Camera, Image as ImageIcon, Scissors, Library as LibraryIcon, Settings2 } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';
import { TabState } from '../../types';
import { motion } from 'motion/react';

export default function Navigation() {
  const { activeTab, setActiveTab } = useAppContext();

  const tabs: { id: TabState; label: string; icon: React.ReactNode }[] = [
    { id: 'live', label: '实时AR', icon: <Camera size={22} strokeWidth={1.5} /> },
    { id: 'photo', label: '照片精修', icon: <ImageIcon size={22} strokeWidth={1.5} /> },
    { id: 'extract', label: '提取发型', icon: <Scissors size={22} strokeWidth={1.5} /> },
    { id: 'library', label: '素材库', icon: <LibraryIcon size={22} strokeWidth={1.5} /> },
    { id: 'settings', label: '设置', icon: <Settings2 size={22} strokeWidth={1.5} /> },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 pb-safe pointer-events-none z-50">
      <div className="mx-auto max-w-lg p-6 pointer-events-auto">
         <div className="bg-black/90 backdrop-blur-xl rounded-full p-2 flex items-center justify-between shadow-2xl border border-white/10">
           {tabs.map((tab) => {
             const isActive = activeTab === tab.id;
             return (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className="relative px-4 py-3 flex flex-col items-center justify-center gap-1 transition-colors"
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
                 {/* For larger screens we can show label, but icons only is cleaner for mobile */}
               </button>
             );
           })}
         </div>
      </div>
    </nav>
  );
}
