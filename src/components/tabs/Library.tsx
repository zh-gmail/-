import React, { useState, useMemo } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useAppContext } from '../../store/AppContext';

export default function Library() {
  const { library, setActiveTab } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLibrary = useMemo(() => {
    if (!searchQuery.trim()) return library;
    const q = searchQuery.trim().toLowerCase();
    return library.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.colorName.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q)
    );
  }, [library, searchQuery]);

  return (
    <div className="h-full bg-neutral-50 flex flex-col p-6 overflow-y-auto pb-32">
      <div className="max-w-5xl mx-auto w-full space-y-8 mt-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">本地素材仓库</h1>
            <p className="text-neutral-500">已保存的 AR 头膜模型及所有支持一秒变装的发型都在这儿汇集。</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="搜索素材..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent w-full md:w-64 transition-all"
            />
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredLibrary.map((item) => (
            <div key={item.id} className="group bg-white rounded-3xl p-4 shadow-sm border border-neutral-200 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-50 mb-4 border border-neutral-100 flex items-center justify-center">
                <img
                  src={item.previewUrl}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  alt={item.name}
                  loading="lazy"
                />
                <button 
                   onClick={() => setActiveTab('live')}
                   className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                   <span className="px-5 py-2 bg-white text-black font-medium tracking-wide text-sm rounded-full backdrop-blur-md shadow-lg flex items-center gap-2">
                      <Sparkles size={16} />
                      前往试戴
                   </span>
                </button>
              </div>
              
              <div className="space-y-1 mt-auto">
                <h3 className="font-semibold text-neutral-900 truncate">{item.name}</h3>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-neutral-200" style={{ backgroundColor: item.colorHex }} />
                  <span className="text-xs text-neutral-500 font-medium">{item.colorName}</span>
                  <span className="text-xs text-neutral-300 ml-auto uppercase tracking-widest">{item.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
