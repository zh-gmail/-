import { Outlet, NavLink } from 'react-router-dom';
import { User } from 'lucide-react';

const NAV_LINKS = [
  { to: '/transform', label: '智能变换' },
  { to: '/extract', label: '素材提取' },
  { to: '/library', label: '素材库' },
  { to: '/settings', label: '设置' },
];

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-canvas-white">
      {/* Top NavBar */}
      <header className="w-full top-0 sticky z-50 bg-canvas-white border-b border-outline-variant">
        <div className="flex items-center justify-between px-6 md:px-8 py-4 w-full max-w-7xl mx-auto">
          <NavLink to="/" className="font-headline-md text-headline-md text-ink-black tracking-tight no-underline">
            AI 美学工坊
          </NavLink>
          <nav className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `font-label-caps text-label-caps transition-opacity duration-300 no-underline ${
                    isActive
                      ? 'text-ink-black font-semibold border-b-2 border-ink-black pb-1'
                      : 'text-on-surface-variant hover:text-ink-black'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button className="cursor-pointer active:scale-95 transition-transform hover:opacity-80">
              <User className="text-ink-black w-6 h-6" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
