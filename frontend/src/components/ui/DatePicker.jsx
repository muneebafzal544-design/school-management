import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function parseYMD(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return { y, m, d };
}
function toStr(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate(); // m is 1-based
}
function firstWeekday(y, m) {
  return new Date(y, m - 1, 1).getDay();
}

// ── sub-views ─────────────────────────────────────────────────────
function YearView({ current, min, max, onSelect }) {
  const minY = min ? parseYMD(min)?.y : 1970;
  const maxY = max ? parseYMD(max)?.y : new Date().getFullYear() + 10;
  const listRef = useRef(null);

  const years = [];
  for (let y = maxY; y >= minY; y--) years.push(y);

  useEffect(() => {
    // Scroll current year into view
    const el = listRef.current?.querySelector(`[data-year="${current}"]`);
    el?.scrollIntoView({ block: 'center' });
  }, [current]);

  return (
    <div ref={listRef} className="h-56 overflow-y-auto px-2 py-1 custom-scrollbar">
      {years.map(y => (
        <button key={y} data-year={y}
          onClick={() => onSelect(y)}
          className={[
            'w-full text-center py-1.5 rounded-lg text-sm font-medium transition-colors',
            y === current
              ? 'bg-indigo-600 text-white'
              : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
          ].join(' ')}>
          {y}
        </button>
      ))}
    </div>
  );
}

function MonthView({ year, current, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 px-3 py-2">
      {MONTHS.map((name, i) => {
        const m = i + 1;
        const sel = current?.m === m && current?.y === year;
        return (
          <button key={m} onClick={() => onSelect(m)}
            className={[
              'py-2 rounded-lg text-xs font-semibold transition-colors',
              sel
                ? 'bg-indigo-600 text-white'
                : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
            ].join(' ')}>
            {name.slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}

function DayView({ viewY, viewM, value, min, max, today, onSelect }) {
  const parsed = parseYMD(value);
  const minP   = parseYMD(min);
  const maxP   = parseYMD(max);
  const total  = daysInMonth(viewY, viewM);
  const start  = firstWeekday(viewY, viewM);

  const cells = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  const isSelected = (d) => parsed?.y === viewY && parsed?.m === viewM && parsed?.d === d;
  const isToday    = (d) => today.y === viewY && today.m === viewM && today.d === d;
  const isDisabled = (d) => {
    const str = toStr(viewY, viewM, d);
    if (minP && str < toStr(minP.y, minP.m, minP.d)) return true;
    if (maxP && str > toStr(maxP.y, maxP.m, maxP.d)) return true;
    return false;
  };

  return (
    <div className="px-3 pb-3">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1">
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const sel  = isSelected(d);
          const tod  = isToday(d);
          const dis  = isDisabled(d);
          return (
            <button key={d} disabled={dis} onClick={() => onSelect(d)}
              className={[
                'w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-colors',
                dis  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                : sel ? 'bg-indigo-600 text-white shadow-sm'
                : tod ? 'border border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                :       'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
              ].join(' ')}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main DatePicker ───────────────────────────────────────────────
export default function DatePicker({ value, onChange, min, max, placeholder = 'Select date', disabled = false, className = '' }) {
  const today = (() => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth()+1, d: t.getDate() }; })();
  const parsed = parseYMD(value);

  const [open,   setOpen]   = useState(false);
  const [view,   setView]   = useState('days');   // 'days' | 'months' | 'years'
  const [viewY,  setViewY]  = useState(parsed?.y  ?? today.y);
  const [viewM,  setViewM]  = useState(parsed?.m  ?? today.m);

  const ref = useRef(null);

  // Sync view when value changes externally
  useEffect(() => {
    if (parsed) { setViewY(parsed.y); setViewM(parsed.m); }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const openPicker = () => {
    if (disabled) return;
    setView('days');
    setOpen(true);
  };

  const prevMonth = () => {
    if (viewM === 1) { setViewM(12); setViewY(y => y - 1); }
    else setViewM(m => m - 1);
  };
  const nextMonth = () => {
    if (viewM === 12) { setViewM(1); setViewY(y => y + 1); }
    else setViewM(m => m + 1);
  };

  const selectDay = useCallback((d) => {
    onChange(toStr(viewY, viewM, d));
    setOpen(false);
  }, [viewY, viewM, onChange]);

  const selectMonth = (m) => { setViewM(m); setView('days'); };
  const selectYear  = (y) => { setViewY(y); setView('months'); };

  const displayVal = parsed
    ? `${String(parsed.d).padStart(2,'0')} ${MONTHS[parsed.m-1].slice(0,3)} ${parsed.y}`
    : '';

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button type="button" onClick={openPicker} disabled={disabled}
        className={[
          'flex items-center gap-2 w-full px-3 py-1.5 rounded-lg border text-sm transition-colors',
          'bg-white dark:bg-slate-700 text-left',
          open
            ? 'border-indigo-400 ring-2 ring-indigo-500/20'
            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}>
        <CalendarDays size={14} className="shrink-0 text-slate-400" />
        <span className={displayVal ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
          {displayVal || placeholder}
        </span>
        {value && !disabled && (
          <X size={13} className="ml-auto shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            onClick={e => { e.stopPropagation(); onChange(''); }} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-72 overflow-hidden"
          style={{ minWidth: 260 }}>

          {/* Header */}
          <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-700">
            {view === 'days' && (
              <button onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                <ChevronLeft size={15} />
              </button>
            )}

            <div className="flex-1 flex items-center justify-center gap-1">
              {/* Month button */}
              <button onClick={() => setView(v => v === 'months' ? 'days' : 'months')}
                className={[
                  'px-2.5 py-1 rounded-lg text-sm font-semibold transition-colors',
                  view === 'months'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
                ].join(' ')}>
                {MONTHS[viewM - 1]}
              </button>
              {/* Year button */}
              <button onClick={() => setView(v => v === 'years' ? 'days' : 'years')}
                className={[
                  'px-2.5 py-1 rounded-lg text-sm font-semibold transition-colors',
                  view === 'years'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
                ].join(' ')}>
                {viewY}
              </button>
            </div>

            {view === 'days' && (
              <button onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                <ChevronRight size={15} />
              </button>
            )}
          </div>

          {/* Body */}
          {view === 'days'   && <DayView   viewY={viewY} viewM={viewM} value={value} min={min} max={max} today={today} onSelect={selectDay} />}
          {view === 'months' && <MonthView year={viewY} current={parsed} onSelect={selectMonth} />}
          {view === 'years'  && <YearView  current={viewY} min={min} max={max} onSelect={selectYear} />}

          {/* Today shortcut */}
          {view === 'days' && (
            <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <button onClick={() => { setViewY(today.y); setViewM(today.m); }}
                className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors">
                Today
              </button>
              {value && (
                <button onClick={() => { onChange(''); setOpen(false); }}
                  className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors">
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
