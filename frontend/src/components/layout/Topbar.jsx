import { Menu, GraduationCap, Sun, Moon, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import NotificationBell from './NotificationBell';

export default function Topbar({ onMenuClick, onSearch }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Menu button */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Brand */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <GraduationCap size={14} className="text-white" />
        </div>
        <span className="text-sm font-bold text-slate-800 dark:text-white">SchoolMS</span>
      </div>

      {/* Right icons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onSearch}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Search size={18} />
        </button>
        <NotificationBell />
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
