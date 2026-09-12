import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import GlobalSearch from './GlobalSearch';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);

  // Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Fixed sidebar — taken out of normal flow */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSearch={() => setSearchOpen(true)} />

      {/* Main area: offset by sidebar width on lg+ */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Mobile-only topbar (hidden on lg+) */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} onSearch={() => setSearchOpen(true)} />

        {/* Page content */}
        <main className="flex-1 w-full min-w-0">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
