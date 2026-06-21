import { useState, useMemo, useRef, useCallback } from 'react';
import { Search, Grid, Wand2, Scissors, Shirt, Plus, Box, Upload } from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import { generateId } from '../utils/id';
import type { AssetCategory } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  hairstyle: '发型设计',
  makeup: '妆容艺术',
  outfit: '服饰穿搭',
};

export default function LibraryPage() {
  const { library, libraryLoading, deleteFromLibrary, addToLibrary } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const category = (categoryFilter || 'hairstyle') as AssetCategory;
    const name = file.name.replace(/\.[^.]+$/, ''); // remove extension
    const reader = new FileReader();
    reader.onload = () => {
      addToLibrary({
        id: generateId(),
        name,
        category,
        type: 'extracted',
        colorName: '—',
        colorHex: '#9C8468',
        description: `手动上传的${CATEGORY_LABELS[category] || category}素材`,
        previewUrl: reader.result as string,
        createdAt: Date.now(),
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [categoryFilter, addToLibrary]);

  const filteredItems = useMemo(() => {
    let items = library;
    if (categoryFilter) {
      items = items.filter(item => item.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    }
    return items;
  }, [library, categoryFilter, searchQuery]);

  const categories = [
    { id: null, label: '全部收藏', icon: Grid },
    { id: 'hairstyle', label: '发型设计', icon: Wand2 },
    { id: 'makeup', label: '妆容艺术', icon: Scissors },
    { id: 'outfit', label: '服饰穿搭', icon: Shirt },
  ];

  return (
    <div className="flex flex-1 w-full max-w-7xl mx-auto">
      {/* SideNavBar */}
      <aside className="w-64 flex-shrink-0 bg-canvas-white border-r border-outline-variant/30 h-[calc(100vh-73px)] sticky top-[73px] p-4 hidden md:flex flex-col">
        <div className="mb-8">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-taupe w-4 h-4" strokeWidth={1.5} />
            <input
              className="w-full pl-9 pr-4 py-2 bg-transparent border-b border-earth-taupe focus:border-ink-black transition-colors outline-none font-label-md text-label-md placeholder-on-surface-variant/50"
              placeholder="搜索灵感..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <nav className="flex flex-col space-y-2">
          <h3 className="font-label-caps text-label-caps text-earth-taupe mb-2 px-2">档案分类</h3>
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.label}
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 font-label-md text-label-md ${
                  categoryFilter === cat.id
                    ? 'bg-linen-beige text-ink-black font-medium'
                    : 'text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} fill={categoryFilter === cat.id ? 'currentColor' : 'none'} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-outline-variant/20">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-earth-taupe/20 flex items-center justify-center overflow-hidden border border-earth-taupe/30">
              <img
                className="w-full h-full object-cover"
                alt="Avatar"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAs9bGYyRgNbIX5_A_VcdZ8wb1BuPV5ZAb1ITQDL4FpZ6QXVPwnLdURU8mXzAZI4Zp-zlGlImFkysTysS7NcnvIUrzN1-y5CY3TSNKIf4FCa7RmVaY3gVFcN4kjLAyWJl75mJegykbgGf6JjMr1fr8wdV2Rj6lDmpppXyZP_EwH8FoIn-RAf3YmIDUmBr3yl1eV3O3fppCY2YwKt5gcWlCrm9xY_i9C2QEnaxDOAMLDV2HqRJkMKg8VSal7cw4CH1UENU7rR3o9CM8"
              />
            </div>
            <div>
              <p className="font-label-md text-[13px] leading-tight text-ink-black">Atelier Studio</p>
              <p className="text-[11px] text-earth-taupe">尊享会员</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto h-[calc(100vh-73px)]">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-ink-black mb-2">灵感档案 Library</h1>
            <p className="font-body-md text-on-surface-variant max-w-xl">
              探索并策划您的个人审美空间。这里汇集了由 Atelier AI 驱动的所有造型灵感，作为您高端私人造型顾问的灵感来源。
            </p>
          </div>
          <div className="flex gap-4">
            <input ref={fileInputRef} type="file" className="absolute w-0 h-0 opacity-0 pointer-events-none" accept="image/*" onChange={handleFileUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-2 bg-ink-black text-canvas-white font-label-caps text-label-caps uppercase transition-transform active:scale-95"
            >
              <Upload className="w-5 h-5" strokeWidth={1.5} />
              上传图片
            </button>
          </div>
        </header>

        {libraryLoading ? (
          <div className="masonry-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="masonry-item animate-pulse bg-surface-variant h-64 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Masonry Grid */}
            {filteredItems.length > 0 && (
              <div className="masonry-grid">
                {filteredItems.map(item => (
                  <div key={item.id} className="masonry-item group cursor-pointer relative overflow-hidden rounded-lg">
                    <img
                      className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                      alt={item.name}
                      src={item.previewUrl}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 p-4 flex flex-col justify-end">
                      <span className="text-canvas-white font-label-caps text-[10px] tracking-widest uppercase mb-1">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                      <h4 className="text-canvas-white font-headline-md text-lg">{item.name}</h4>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('确定删除？')) deleteFromLibrary(item.id);
                      }}
                      className="absolute top-3 right-3 w-7 h-7 bg-black/30 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-10"
                    >
                      <Plus className="w-3 h-3 rotate-45" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center h-64">
                <Box className="w-16 h-16 text-surface-variant mb-6" strokeWidth={1} />
                <h3 className="font-headline-md text-ink-black mb-2">档案室目前是空的</h3>
                <p className="text-on-surface-variant max-w-xs mx-auto">开始您的 AI 变换旅程，保存您的第一个造型方案。</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
