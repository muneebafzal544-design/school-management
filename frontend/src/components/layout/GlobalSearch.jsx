import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Users, UserCheck, Banknote,
  BookMarked, GraduationCap, ClipboardList,
  Megaphone, ArrowRight, Loader2,
} from 'lucide-react';
import api from '../../api/axios';

// ── helpers ──────────────────────────────────────────────────
const PKR = (n) => Number(n || 0).toLocaleString('en-PK');

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Category config ───────────────────────────────────────────
const CATEGORIES = [
  {
    key:   'students',
    label: 'Students',
    Icon:  Users,
    color: 'text-blue-500',
    bg:    'bg-blue-100 dark:bg-blue-900/30',
    getItems: (rows) => rows.map(r => ({
      id:       r.id,
      title:    r.full_name,
      sub:      [r.roll_number && `Roll: ${r.roll_number}`, r.class_name && `${r.class_name}${r.section ? ' – ' + r.section : ''}`].filter(Boolean).join(' · '),
      href:     `/admission/edit/${r.id}`,
    })),
  },
  {
    key:   'teachers',
    label: 'Teachers',
    Icon:  UserCheck,
    color: 'text-indigo-500',
    bg:    'bg-indigo-100 dark:bg-indigo-900/30',
    getItems: (rows) => rows.map(r => ({
      id:    r.id,
      title: r.full_name,
      sub:   [r.subject, r.phone].filter(Boolean).join(' · '),
      href:  `/teachers/${r.id}`,
    })),
  },
  {
    key:   'fees',
    label: 'Fee Invoices',
    Icon:  Banknote,
    color: 'text-emerald-500',
    bg:    'bg-emerald-100 dark:bg-emerald-900/30',
    getItems: (rows) => rows.map(r => ({
      id:    r.id,
      title: r.invoice_number,
      sub:   [r.student_name, r.status && `Status: ${r.status}`, r.total_amount && `PKR ${PKR(r.total_amount)}`].filter(Boolean).join(' · '),
      href:  `/fees`,
    })),
  },
  {
    key:   'books',
    label: 'Library Books',
    Icon:  BookMarked,
    color: 'text-amber-500',
    bg:    'bg-amber-100 dark:bg-amber-900/30',
    getItems: (rows) => rows.map(r => ({
      id:    r.id,
      title: r.title,
      sub:   [r.author && `by ${r.author}`, r.category_name, r.available_copies != null && `${r.available_copies}/${r.total_copies} available`].filter(Boolean).join(' · '),
      href:  `/library`,
    })),
  },
  {
    key:   'classes',
    label: 'Classes',
    Icon:  GraduationCap,
    color: 'text-purple-500',
    bg:    'bg-purple-100 dark:bg-purple-900/30',
    getItems: (rows) => rows.map(r => ({
      id:    r.id,
      title: `${r.name}${r.section ? ' – ' + r.section : ''}`,
      sub:   [r.grade && `Grade ${r.grade}`, r.teacher_name && `Teacher: ${r.teacher_name}`, r.student_count != null && `${r.student_count} students`].filter(Boolean).join(' · '),
      href:  `/classes/${r.id}`,
    })),
  },
  {
    key:   'exams',
    label: 'Exams',
    Icon:  ClipboardList,
    color: 'text-cyan-500',
    bg:    'bg-cyan-100 dark:bg-cyan-900/30',
    getItems: (rows) => rows.map(r => ({
      id:    r.id,
      title: r.exam_name,
      sub:   [r.exam_type, r.start_date && new Date(r.start_date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }), r.status].filter(Boolean).join(' · '),
      href:  `/exams`,
    })),
  },
  {
    key:   'announcements',
    label: 'Announcements',
    Icon:  Megaphone,
    color: 'text-rose-500',
    bg:    'bg-rose-100 dark:bg-rose-900/30',
    getItems: (rows) => rows.map(r => ({
      id:    r.id,
      title: r.title,
      sub:   [r.category, r.priority && `Priority: ${r.priority}`].filter(Boolean).join(' · '),
      href:  `/announcements`,
    })),
  },
];

// ── Main component ────────────────────────────────────────────
export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0); // for keyboard nav
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debouncedQ = useDebounce(query, 280);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // Fetch results
  useEffect(() => {
    if (!open) return;
    if (debouncedQ.length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    api.get('/search', { params: { q: debouncedQ } })
      .then(res => {
        setResults(res.data?.data ?? null);
        setSelected(0);
      })
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debouncedQ, open]);

  // Build flat list of all items for keyboard nav
  const flatItems = CATEGORIES.flatMap(cat => {
    const rows = results?.[cat.key] ?? [];
    if (!rows.length) return [];
    return cat.getItems(rows).map(item => ({ ...item, catKey: cat.key }));
  });

  const hasResults = flatItems.length > 0;

  const handleSelect = useCallback((href) => {
    navigate(href);
    onClose();
  }, [navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (!hasResults) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => (s + 1) % flatItems.length); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => (s - 1 + flatItems.length) % flatItems.length); }
      if (e.key === 'Enter')     { e.preventDefault(); handleSelect(flatItems[selected]?.href ?? '/'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hasResults, flatItems, selected, handleSelect, onClose]);

  if (!open) return null;

  // Count total results
  const totalCount = results
    ? Object.values(results).reduce((a, b) => a + (b?.length ?? 0), 0)
    : 0;

  // Flat index counter for keyboard highlight
  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[10vh] px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Palette */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[75vh]">

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          {loading
            ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin flex-shrink-0" />
            : <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            placeholder="Search students, teachers, fees, books…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-slate-900 dark:text-white text-[15px] placeholder:text-slate-400 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            {query && (
              <button onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-400 font-mono">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1">

          {/* Empty / placeholder */}
          {!query && (
            <div className="py-12 text-center space-y-2">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Type to search across the entire system</p>
              <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
                {['Students', 'Teachers', 'Fees', 'Books', 'Classes'].map(h => (
                  <span key={h} className="text-[11px] text-slate-400 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">{h}</span>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {query.length >= 2 && !loading && results && totalCount === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No results for <span className="font-semibold text-slate-700 dark:text-slate-300">"{query}"</span></p>
            </div>
          )}

          {/* Result groups */}
          {results && totalCount > 0 && (
            <div className="py-2">
              {CATEGORIES.map(cat => {
                const rows = results[cat.key] ?? [];
                if (!rows.length) return null;
                const items = cat.getItems(rows);
                const { Icon, label, color, bg } = cat;

                return (
                  <div key={cat.key} className="mb-1">
                    {/* Category header */}
                    <div className="flex items-center gap-2 px-4 py-1.5">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${bg}`}>
                        <Icon className={`w-3 h-3 ${color}`} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">({items.length})</span>
                    </div>

                    {/* Items */}
                    {items.map((item) => {
                      const isSelected = flatIdx === selected;
                      const currentIdx = flatIdx++;
                      return (
                        <button
                          key={`${cat.key}-${item.id}`}
                          onClick={() => handleSelect(item.href)}
                          onMouseEnter={() => setSelected(currentIdx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                            <Icon className={`w-3.5 h-3.5 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>
                              {/* Highlight query in title */}
                              {highlightMatch(item.title, query)}
                            </p>
                            {item.sub && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.sub}</p>
                            )}
                          </div>
                          <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 transition-opacity ${isSelected ? 'opacity-100 text-indigo-400' : 'opacity-0'}`} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Footer */}
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-1">
                <span className="text-[11px] text-slate-400">{totalCount} result{totalCount !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">↑↓</kbd> navigate</span>
                  <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">↵</kbd> open</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Highlight matching text ───────────────────────────────────
function highlightMatch(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-sm px-0.5 not-italic font-semibold"
        style={{ fontStyle: 'normal' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
