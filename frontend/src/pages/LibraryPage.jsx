import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import EmptyState     from '../components/ui/EmptyState';
import {
  BookMarked, Search, Plus, Pencil, Trash2, X, RefreshCw,
  ChevronDown, AlertTriangle, CheckCircle2, Clock, Users,
  BookOpen, RotateCcw, BarChart3, Banknote, BookCopy,
  GraduationCap, ArrowUpDown, ChevronUp, Tag, Calendar,
  TrendingUp, BookX, Package, Layers, Bell, UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import {
  getLibrarySummary, getCategories, createCategory,
  getBooks, createBook, updateBook, deleteBook,
  getCopies, addCopy, updateCopy, deleteCopy,
  getIssues, issueBook, returnBook,
  getFines, markFinePaid,
  getMostBorrowed, getBorrowingHistory, searchBorrowers,
  getReservations, createReservation, cancelReservation, fulfillReservation,
} from '../api/library';
import { useStudentsPicker } from '../hooks/useReferenceData';

/* ─── helpers ─────────────────────────────────────────────────── */
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};
const today  = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

const ISSUE_STATUS = {
  issued:   { label: 'Issued',   bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dot: 'bg-blue-500' },
  overdue:  { label: 'Overdue',  bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', dot: 'bg-red-500' },
  returned: { label: 'Returned', bg: '#f0fdf4', color: '#16a34a', border: '#86efac', dot: 'bg-emerald-500' },
  lost:     { label: 'Lost',     bg: '#faf5ff', color: '#7c3aed', border: '#d8b4fe', dot: 'bg-purple-500' },
};
const COPY_STATUS = {
  available: { label: 'Available', color: '#16a34a' },
  issued:    { label: 'Issued',    color: '#1d4ed8' },
  lost:      { label: 'Lost',      color: '#7c3aed' },
  damaged:   { label: 'Damaged',   color: '#d97706' },
};

/* ─── shared UI atoms ─────────────────────────────────────────── */
function Sel({ label, value, onChange, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>}
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition">
          {children}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function Inp({ label, type = 'text', value, onChange, placeholder, className = '', required, rows }) {
  const cls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition";
  return (
    <div className={className}>
      {label && <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>}
      {rows
        ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${cls} resize-none`} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
    </div>
  );
}

function IssueBadge({ status }) {
  const s = ISSUE_STATUS[status] || ISSUE_STATUS.issued;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function BookSpine({ title, color, size = 'sm' }) {
  const dims = size === 'lg' ? 'w-12 h-16 text-[11px]' : 'w-9 h-12 text-[9px]';
  return (
    <div className={`${dims} rounded-lg shrink-0 flex items-center justify-center text-white font-bold leading-tight text-center px-0.5 shadow-sm`}
      style={{ background: `linear-gradient(160deg, ${color || '#6366f1'} 0%, ${color || '#6366f1'}99 100%)` }}>
      {title?.slice(0, 4).toUpperCase()}
    </div>
  );
}

function Spinner({ size = 8 }) {
  return <div className={`w-${size} h-${size} border-2 border-t-indigo-500 border-indigo-200 rounded-full animate-spin`} />;
}

function BorrowerAvatar({ name = '', type = 'student' }) {
  const initial = name[0]?.toUpperCase() ?? '?';
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
      style={{ background: type === 'teacher' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
      {initial}
    </div>
  );
}

/* ─── ISSUE BOOK MODAL ────────────────────────────────────────── */
function IssueModal({ onClose, onDone }) {
  const [step, setStep]           = useState(1);
  // Step 1 — borrower
  const [bSearch, setBSearch]     = useState('');
  const [bResults, setBResults]   = useState([]);
  const [borrower, setBorrower]   = useState(null);
  const [loadingB, setLoadingB]   = useState(false);
  // Step 2 — book + copy
  const [books, setBooks]         = useState([]);
  const [bookSearch, setBookSearch] = useState('');
  const [selBook, setSelBook]     = useState(null);
  const [copies, setCopies]       = useState([]);
  const [selCopy, setSelCopy]     = useState(null);
  const [loadingBooks, setLoadingBooks] = useState(false);
  // Step 3 — dates
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate]     = useState(addDays(14));
  const [remarks, setRemarks]     = useState('');
  const [saving, setSaving]       = useState(false);
  const bRef = useRef(null);

  // Focus borrower input on open
  useEffect(() => { bRef.current?.focus(); }, []);

  // Borrower search with debounce
  useEffect(() => {
    if (bSearch.length < 2) { setBResults([]); return; }
    const t = setTimeout(async () => {
      setLoadingB(true);
      try {
        const r = await searchBorrowers(bSearch);
        setBResults(Array.isArray(r.data) ? r.data : []);
      } catch { setBResults([]); }
      finally { setLoadingB(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [bSearch]);

  // Load available books
  useEffect(() => {
    setLoadingBooks(true);
    getBooks({ limit: 500 }).then(r => {
      const all = Array.isArray(r.data) ? r.data : [];
      setBooks(all.filter(b => (b.available_copies || 0) > 0));
    }).catch(() => {}).finally(() => setLoadingBooks(false));
  }, []);

  // Load copies when book selected
  useEffect(() => {
    if (!selBook) { setCopies([]); setSelCopy(null); return; }
    getCopies(selBook.id).then(r => {
      const avail = (Array.isArray(r.data) ? r.data : []).filter(c => c.status === 'available');
      setCopies(avail);
      setSelCopy(avail[0] || null);
    }).catch(() => {});
  }, [selBook]);

  const filteredBooks = useMemo(() =>
    books.filter(b =>
      !bookSearch ||
      b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.author.toLowerCase().includes(bookSearch.toLowerCase())
    ), [books, bookSearch]);

  const handleNext = () => {
    if (step === 1 && !borrower) { toast.error('Please select a borrower'); return; }
    if (step === 2 && !selCopy)  { toast.error('Please select a book and copy'); return; }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!borrower || !selCopy) { toast.error('Incomplete selection'); return; }
    setSaving(true);
    try {
      await issueBook({
        book_copy_id:  selCopy.id,
        borrower_type: borrower.borrower_type,
        borrower_id:   borrower.id,
        issue_date:    issueDate,
        due_date:      dueDate,
        remarks:       remarks || undefined,
      });
      toast.success(`"${selBook.title}" issued to ${borrower.name}`);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue book');
    } finally { setSaving(false); }
  };

  const STEPS = ['Select Borrower', 'Choose Book', 'Confirm & Issue'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <BookMarked size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Issue Book</h2>
              <p className="text-xs text-slate-400 mt-0.5">{STEPS[step - 1]}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition">
            <X size={16} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > i + 1 ? 'bg-indigo-600 text-white' :
                  step === i + 1 ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/40' :
                  'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {step > i + 1 ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={`text-[10px] font-semibold text-center leading-tight ${step >= i + 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>
          <div className="flex mt-2 mb-4">
            {STEPS.map((_, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full mx-0.5 transition-all ${step > i ? 'bg-indigo-500' : 'bg-slate-100 dark:bg-slate-800'}`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">

          {/* ── Step 1: Borrower ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                {loadingB && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
                <input ref={bRef} value={bSearch} onChange={e => { setBSearch(e.target.value); if (borrower) setBorrower(null); }}
                  placeholder="Search student or teacher by name…"
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-700 transition" />
              </div>

              {/* Search results */}
              {bResults.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  {bResults.map(b => (
                    <button key={`${b.borrower_type}-${b.id}`}
                      onClick={() => { setBorrower(b); setBSearch(b.name); setBResults([]); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition text-left">
                      <BorrowerAvatar name={b.name} type={b.borrower_type} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{b.name}</div>
                        <div className="text-xs text-slate-400">{b.extra_info || '—'} · {b.identifier || '—'}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        b.borrower_type === 'teacher'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      }`}>
                        {b.borrower_type === 'teacher' ? 'Teacher' : 'Student'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {bSearch.length >= 2 && bResults.length === 0 && !loadingB && (
                <div className="py-6 text-center text-sm text-slate-400">No active students or teachers found</div>
              )}

              {/* Selected borrower card */}
              {borrower && (
                <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20">
                  <BorrowerAvatar name={borrower.name} type={borrower.borrower_type} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{borrower.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        borrower.borrower_type === 'teacher'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                      }`}>
                        {borrower.borrower_type === 'teacher' ? '👩‍🏫 Teacher' : '🎓 Student'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{borrower.extra_info || '—'}</div>
                  </div>
                  <CheckCircle2 size={18} className="text-indigo-500 shrink-0" />
                </div>
              )}

              {!borrower && bSearch.length < 2 && (
                <div className="py-8 text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3"
                    style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)' }}>
                    <Users size={24} className="text-indigo-500" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Search for a borrower</p>
                  <p className="text-xs text-slate-400 mt-1">Students and teachers can both borrow books</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Book + Copy ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={bookSearch} onChange={e => setBookSearch(e.target.value)}
                  placeholder="Search by title or author…"
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white dark:focus:bg-slate-700 transition"
                  autoFocus />
              </div>

              {loadingBooks ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBooks.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      <BookX size={24} className="mx-auto mb-2 text-slate-300" />
                      No available books found
                    </div>
                  ) : filteredBooks.map(b => (
                    <button key={b.id} onClick={() => setSelBook(b)}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition text-left ${
                        selBook?.id === b.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}>
                      <BookSpine title={b.title} color={b.cover_color} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{b.title}</div>
                        <div className="text-xs text-slate-400 truncate">{b.author}</div>
                        {b.category_name && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md mt-0.5 font-medium"
                            style={{ background: (b.category_color || '#6366f1') + '22', color: b.category_color || '#6366f1' }}>
                            {b.category_icon} {b.category_name}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-emerald-600">{b.available_copies}</div>
                        <div className="text-[10px] text-slate-400">avail.</div>
                      </div>
                      {selBook?.id === b.id && <CheckCircle2 size={15} className="text-indigo-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {selBook && copies.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Select copy</label>
                  <div className="space-y-1.5">
                    {copies.map(c => (
                      <button key={c.id} onClick={() => setSelCopy(c)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition text-left ${
                          selCopy?.id === c.id
                            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ background: '#16a34a' }}>
                          {c.copy_number?.replace(/^C-0*/, '') || '?'}
                        </div>
                        <div className="flex-1 text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{c.copy_number}</span>
                          <span className="text-slate-400 ml-2">{c.barcode}</span>
                          {c.location && <span className="text-slate-400 ml-2">· {c.location}</span>}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{c.condition}</span>
                        {selCopy?.id === c.id && <CheckCircle2 size={13} className="text-indigo-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Dates + Confirm ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Inp label="Issue Date" type="date" value={issueDate} onChange={setIssueDate} />
                <Inp label="Due Date"   type="date" value={dueDate}   onChange={setDueDate} />
              </div>
              <Inp label="Remarks (optional)" value={remarks} onChange={setRemarks} placeholder="Notes about this issue…" rows={2} />

              {/* Summary card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Issue Summary</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <BorrowerAvatar name={borrower?.name} type={borrower?.borrower_type} />
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{borrower?.name}</div>
                      <div className="text-xs text-slate-400 capitalize">{borrower?.borrower_type} · {borrower?.extra_info || '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <BookSpine title={selBook?.title} color={selBook?.cover_color} />
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{selBook?.title}</div>
                      <div className="text-xs text-slate-400">{selBook?.author} · Copy {selCopy?.copy_number}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {[['Issue Date', fmtDate(issueDate)], ['Due Date', fmtDate(dueDate)]].map(([l, v]) => (
                      <div key={l}>
                        <div className="text-xs text-slate-400">{l}</div>
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              ← Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={handleNext}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {saving ? <Spinner size={4} /> : <BookMarked size={15} />}
              Confirm Issue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── RETURN BOOK MODAL ───────────────────────────────────────── */
function ReturnModal({ issue, onClose, onDone }) {
  const [retDate, setRetDate] = useState(today());
  const [remarks, setRemarks] = useState('');
  const [saving,  setSaving]  = useState(false);

  const lateDays = Math.max(0, Math.floor((new Date(retDate) - new Date(issue.due_date)) / 86_400_000));
  const fineAmt  = lateDays * 5;

  const handleReturn = async () => {
    setSaving(true);
    try {
      const res = await returnBook(issue.id, { return_date: retDate, remarks: remarks || undefined });
      toast.success(res.data?.message || 'Book returned successfully');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to return'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              <RotateCcw size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Return Book</h2>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{issue.book_title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Book + borrower info */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <BookSpine title={issue.book_title} color={issue.cover_color} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{issue.book_title}</div>
              <div className="text-xs text-slate-400 mt-0.5">Copy: {issue.copy_number}</div>
              <div className="flex items-center gap-1.5 mt-2">
                <BorrowerAvatar name={issue.borrower_name} type={issue.borrower_type} />
                <div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{issue.borrower_name}</div>
                  <div className="text-xs text-slate-400 capitalize">{issue.borrower_type}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dates summary */}
          <div className="grid grid-cols-2 gap-3">
            {[['Issued On', fmtDate(issue.issue_date)], ['Was Due', fmtDate(issue.due_date)]].map(([l, v]) => (
              <div key={l} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-400">{l}</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">{v}</div>
              </div>
            ))}
          </div>

          <Inp label="Return Date" type="date" value={retDate} onChange={setRetDate} />

          {/* Fine indicator */}
          {lateDays > 0 ? (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40">
              <div>
                <div className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle size={14} /> Late Return Fine
                </div>
                <div className="text-xs text-red-500 mt-0.5">{lateDays} day{lateDays > 1 ? 's' : ''} × PKR 5/day</div>
              </div>
              <div className="text-2xl font-black text-red-600">PKR {fineAmt}</div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={15} />
              <span className="text-sm font-semibold">No fine — returned on time</span>
            </div>
          )}

          <Inp label="Remarks (optional)" value={remarks} onChange={setRemarks} placeholder="Condition notes, damage report…" rows={2} />

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              Cancel
            </button>
            <button onClick={handleReturn} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              {saving ? <Spinner size={4} /> : <RotateCcw size={14} />}
              {fineAmt > 0 ? `Return & Charge PKR ${fineAmt}` : 'Confirm Return'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ADD/EDIT BOOK MODAL ─────────────────────────────────────── */
function BookModal({ book, categories, onClose, onDone }) {
  const blank = { title: '', author: '', isbn: '', publisher: '', published_year: '', category_id: '', language: 'English', edition: '', cover_color: '#6366f1', description: '' };
  const [form, setForm] = useState(book ? { ...book, category_id: book.category_id || '', published_year: book.published_year || '' } : blank);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const lookupISBN = async () => {
    const isbn = form.isbn?.trim();
    if (!isbn) { toast.error('Enter an ISBN first'); return; }
    setLookingUp(true);
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await res.json();
      const info = data?.items?.[0]?.volumeInfo;
      if (!info) { toast.error('Book not found on Google Books'); return; }
      setForm(f => ({
        ...f,
        title:          info.title          || f.title,
        author:         info.authors?.[0]   || f.author,
        publisher:      info.publisher      || f.publisher,
        published_year: info.publishedDate?.slice(0, 4) || f.published_year,
        description:    info.description    || f.description,
      }));
      toast.success('Auto-filled from Google Books');
    } catch { toast.error('Lookup failed'); }
    finally { setLookingUp(false); }
  };

  const handleSave = async () => {
    if (!form.title || !form.author) { toast.error('Title and author are required'); return; }
    setSaving(true);
    try {
      if (book) await updateBook(book.id, form);
      else      await createBook(form);
      toast.success(book ? 'Book updated' : 'Book added to catalog');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <BookSpine title={form.title || 'NEW'} color={form.cover_color} size="lg" />
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{book ? 'Edit Book' : 'Add New Book'}</h2>
              <p className="text-xs text-slate-400">{book ? 'Update catalog entry' : 'Add to library catalog'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <Inp label="Title" value={form.title} onChange={v => set('title', v)} required placeholder="Book title" />
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Author" value={form.author} onChange={v => set('author', v)} required />
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">ISBN</label>
              <div className="flex gap-1.5">
                <input value={form.isbn} onChange={e => set('isbn', e.target.value)} placeholder="978-…"
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
                <button type="button" onClick={lookupISBN} disabled={lookingUp}
                  title="Auto-fill from Google Books"
                  className="px-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 transition text-xs font-semibold flex items-center gap-1">
                  {lookingUp ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                  {lookingUp ? '' : 'Lookup'}
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Category" value={form.category_id} onChange={v => set('category_id', v)}>
              <option value="">— None —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Sel>
            <Sel label="Language" value={form.language} onChange={v => set('language', v)}>
              {['English','Urdu','Arabic','Other'].map(l => <option key={l} value={l}>{l}</option>)}
            </Sel>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Inp label="Publisher" value={form.publisher} onChange={v => set('publisher', v)} className="col-span-2" />
            <Inp label="Year" type="number" value={form.published_year} onChange={v => set('published_year', v)} placeholder="2024" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Edition" value={form.edition} onChange={v => set('edition', v)} placeholder="1st" />
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Cover Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.cover_color} onChange={e => set('cover_color', e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-1 bg-white" />
                <span className="text-xs text-slate-400">{form.cover_color}</span>
              </div>
            </div>
          </div>
          <Inp label="Description (optional)" value={form.description} onChange={v => set('description', v)} placeholder="Short description…" rows={2} />
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {saving ? <Spinner size={4} /> : null}
              {book ? 'Save Changes' : 'Add Book'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── COPIES PANEL ────────────────────────────────────────────── */
function CopiesPanel({ book, onClose }) {
  const [copies, setCopies]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getCopies(book.id); setCopies(Array.isArray(r.data) ? r.data : []); }
    catch { toast.error('Failed to load copies'); }
    finally { setLoading(false); }
  }, [book.id]);

  useEffect(() => { load(); }, [load]);

  const handleAddCopy = async () => {
    setAdding(true);
    try { await addCopy(book.id, {}); toast.success('Copy added'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setAdding(false); }
  };

  const handleStatusChange = async (copyId, status) => {
    try { await updateCopy(copyId, { status }); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (copyId) => {
    if (!window.confirm('Delete this copy?')) return;
    try { await deleteCopy(copyId); toast.success('Copy deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Cannot delete issued copy'); }
  };

  const available = copies.filter(c => c.status === 'available').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <BookSpine title={book.title} color={book.cover_color} size="lg" />
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[180px]">{book.title}</h2>
              <p className="text-xs text-slate-400">{copies.length} copies · <span className="text-emerald-600 font-semibold">{available} available</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : copies.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              <Package size={24} className="mx-auto mb-2 text-slate-300" />
              No copies registered yet
            </div>
          ) : copies.map(c => (
            <div key={c.id}
              className="flex items-center gap-3 px-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: COPY_STATUS[c.status]?.color || '#6366f1' }}>
                {c.copy_number?.replace(/^C-0*/, '') || '#'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{c.copy_number}</div>
                <div className="text-xs text-slate-400 font-mono">{c.barcode}</div>
                {c.location && <div className="text-xs text-slate-400">{c.location}</div>}
              </div>
              <Sel value={c.status} onChange={v => handleStatusChange(c.id, v)} className="w-28">
                {Object.entries(COPY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Sel>
              <button onClick={() => handleDelete(c.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button onClick={handleAddCopy} disabled={adding}
            className="w-full py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            {adding ? <Spinner size={4} /> : <Plus size={14} />}
            Add Copy
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── TAB: OVERVIEW ───────────────────────────────────────────── */
function OverviewTab({ stats }) {
  const [recentIssues, setRecentIssues] = useState([]);
  const [overdue,      setOverdue]      = useState([]);

  useEffect(() => {
    getIssues({ status: 'active',  limit: 8  }).then(r => setRecentIssues(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    getIssues({ status: 'overdue', limit: 5  }).then(r => setOverdue(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const statCards = [
    { label: 'Total Books',     value: stats?.total_books    ?? '—', icon: BookOpen,       color: '#6366f1' },
    { label: 'Total Copies',    value: stats?.total_copies   ?? '—', icon: BookCopy,       color: '#8b5cf6' },
    { label: 'Available',       value: stats?.available_copies ?? '—', icon: CheckCircle2, color: '#16a34a' },
    { label: 'Active Issues',   value: stats?.active_issues  ?? '—', icon: Layers,         color: '#06b6d4' },
    { label: 'Overdue',         value: stats?.overdue_count  ?? '—', icon: AlertTriangle,  color: '#dc2626' },
    { label: 'Fines Pending',   value: stats?.fines_pending  ? `PKR ${Number(stats.fines_pending).toFixed(0)}` : 'PKR 0', icon: Banknote, color: '#d97706' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: color + '20' }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100">{value}</div>
            <div className="text-xs text-slate-400 mt-0.5 font-medium">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {overdue.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-800/40 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-sm font-bold text-red-700 dark:text-red-400">Overdue Books</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 font-bold">{overdue.length}</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {overdue.map(i => (
                <div key={i.id} className="px-5 py-3 flex items-center gap-3">
                  <BookSpine title={i.book_title} color={i.cover_color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{i.book_title}</div>
                    <div className="text-xs text-slate-400">{i.borrower_name} · <span className="capitalize">{i.borrower_type}</span></div>
                  </div>
                  <div className="text-xs font-bold text-red-600 shrink-0 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg">{i.days_overdue}d late</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Recent Issues</span>
            <span className="text-xs text-slate-400">{recentIssues.length} active</span>
          </div>
          {recentIssues.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              <BookMarked size={24} className="mx-auto mb-2 text-slate-300" />
              No active issues
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentIssues.map(i => (
                <div key={i.id} className="px-5 py-3 flex items-center gap-3">
                  <BookSpine title={i.book_title} color={i.cover_color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{i.book_title}</div>
                    <div className="text-xs text-slate-400">
                      {i.borrower_name} · Due {fmtDate(i.due_date)}
                    </div>
                  </div>
                  <IssueBadge status={i.computed_status || i.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── TAB: BOOKS ──────────────────────────────────────────────── */
function BooksTab({ categories }) {
  const [books,      setBooks]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [catFilter,  setCatFilter]  = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [editBook,   setEditBook]   = useState(null);
  const [addOpen,    setAddOpen]    = useState(false);
  const [copiesBook, setCopiesBook] = useState(null);
  const [sort,       setSort]       = useState({ key: 'title', dir: 'asc' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = { limit: 300 };
      if (debouncedSearch) p.search      = debouncedSearch;
      if (catFilter)       p.category_id = catFilter;
      if (langFilter)      p.language    = langFilter;
      const r = await getBooks(p);
      setBooks(Array.isArray(r.data) ? r.data : []);
    } catch { toast.error('Failed to load books'); }
    finally { setLoading(false); }
  }, [debouncedSearch, catFilter, langFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this book?')) return;
    try { await deleteBook(id); toast.success('Book deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Cannot delete book with active issues'); }
  };

  const cycleSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  const sorted = useMemo(() => {
    return [...books].sort((a, b) => {
      const va = (sort.key === 'available' ? (a.available_copies || 0) : (a[sort.key] || '').toString().toLowerCase());
      const vb = (sort.key === 'available' ? (b.available_copies || 0) : (b[sort.key] || '').toString().toLowerCase());
      return sort.dir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });
  }, [books, sort]);

  const ThSort = ({ label, sKey }) => (
    <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => cycleSort(sKey)}>
      <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 dark:hover:text-slate-300">
        {label}
        {sort.key === sKey ? (sort.dir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-44">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, author, ISBN…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
          <Sel value={catFilter} onChange={setCatFilter} className="w-44">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Sel>
          <Sel value={langFilter} onChange={setLangFilter} className="w-32">
            <option value="">All Languages</option>
            {['English','Urdu','Arabic'].map(l => <option key={l} value={l}>{l}</option>)}
          </Sel>
          <div className="flex gap-2">
            <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Plus size={14} /> Add Book
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : sorted.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <EmptyState
            icon={BookOpen}
            title="No books found"
            description="Try different filters or add a new book to the library."
            actionLabel="Add Book"
            onAction={() => setAddOpen(true)}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">{sorted.length} book{sorted.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                  <ThSort label="Book" sKey="title" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Lang</th>
                  <ThSort label="Copies" sKey="available" />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <BookSpine title={b.title} color={b.cover_color} />
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{b.title}</div>
                          <div className="text-xs text-slate-400">{b.author}</div>
                          {b.isbn && <div className="text-xs text-slate-400 font-mono">{b.isbn}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {b.category_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
                          style={{ background: (b.category_color||'#6366f1')+'22', color: b.category_color||'#6366f1', borderColor: (b.category_color||'#6366f1')+'55' }}>
                          {b.category_icon} {b.category_name}
                        </span>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{b.language}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${b.available_copies > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{b.available_copies || 0}</span>
                        <span className="text-slate-400 text-xs">/ {b.total_copies || 0}</span>
                        <button onClick={() => setCopiesBook(b)} className="p-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 transition" title="Manage Copies">
                          <BookCopy size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditBook(b)} className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 transition"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(addOpen || editBook) && (
        <BookModal book={editBook} categories={categories}
          onClose={() => { setAddOpen(false); setEditBook(null); }}
          onDone={() => { setAddOpen(false); setEditBook(null); load(); }} />
      )}
      {copiesBook && <CopiesPanel book={copiesBook} onClose={() => setCopiesBook(null)} />}
    </div>
  );
}

/* ─── TAB: ISSUES ─────────────────────────────────────────────── */
function IssuesTab({ categories }) {
  const [issues,      setIssues]      = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [filter,      setFilter]      = useState('active');
  const [borrowerType,setBorrowerType]= useState('');
  const [search,      setSearch]      = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [issueOpen,   setIssueOpen]   = useState(false);
  const [returnIssue, setReturnIssue] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getIssues({ limit: 200, status: filter, search: debouncedSearch, borrower_type: borrowerType });
      setIssues(Array.isArray(r.data) ? r.data : []);
    } catch { toast.error('Failed to load issues'); }
    finally { setLoading(false); }
  }, [filter, debouncedSearch, borrowerType]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { active: 0, overdue: 0, returned: 0 };
    issues.forEach(i => {
      const s = i.computed_status || i.status;
      if (s === 'overdue') c.overdue++;
      else if (s === 'issued') c.active++;
      else if (s === 'returned') c.returned++;
    });
    return c;
  }, [issues]);

  const FILTERS = [
    { key: 'active',   label: 'Active' },
    { key: 'overdue',  label: 'Overdue' },
    { key: 'returned', label: 'Returned' },
    { key: 'all',      label: 'All' },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-44">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search book title or borrower…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
          {/* Filter pills */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f.key ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {[['', 'All'], ['student', 'Students'], ['teacher', 'Teachers']].map(([v, l]) => (
              <button key={v} onClick={() => setBorrowerType(v)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  borrowerType === v ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                {v === 'teacher' && <GraduationCap size={11} />}
                {v === 'student' && <Users size={11} />}
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setIssueOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Plus size={14} /> Issue Book
            </button>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      {issues.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active',   value: counts.active,   color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Overdue',  value: counts.overdue,  color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
            { label: 'Returned', value: counts.returned, color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-2xl border"
              style={{ background: bg, borderColor: border }}>
              <div className="text-2xl font-black" style={{ color }}>{value}</div>
              <div className="text-xs font-semibold" style={{ color }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : issues.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <EmptyState
            icon={BookMarked}
            title="No issues found"
            description="Try a different filter or issue a book to a student or teacher."
            actionLabel="Issue Book"
            onAction={() => setIssueOpen(true)}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                  {['Book', 'Borrower', 'Issued', 'Due / Returned', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {issues.map(iss => {
                  const st = iss.computed_status || iss.status;
                  return (
                    <tr key={iss.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors`}
                      style={{ borderLeft: `3px solid ${st === 'overdue' ? '#dc2626' : st === 'issued' ? '#1d4ed8' : st === 'returned' ? '#16a34a' : 'transparent'}` }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <BookSpine title={iss.book_title} color={iss.cover_color} />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs truncate max-w-[150px]">{iss.book_title}</div>
                            <div className="text-xs text-slate-400 font-mono">{iss.copy_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BorrowerAvatar name={iss.borrower_name} type={iss.borrower_type} />
                          <div>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{iss.borrower_name}</div>
                            <div className="text-xs text-slate-400 capitalize">{iss.borrower_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{fmtDate(iss.issue_date)}</td>
                      <td className="px-4 py-3">
                        {st === 'returned' ? (
                          <div>
                            <div className="text-xs text-slate-500">Ret: {fmtDate(iss.return_date)}</div>
                            <div className="text-xs text-slate-400">Due was {fmtDate(iss.due_date)}</div>
                          </div>
                        ) : (
                          <div>
                            <div className={`text-xs font-semibold ${st === 'overdue' ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}>
                              {fmtDate(iss.due_date)}
                            </div>
                            {st === 'overdue' && (
                              <div className="text-xs text-red-500 font-bold">{iss.days_overdue}d overdue · PKR {iss.days_overdue * 5}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3"><IssueBadge status={st} /></td>
                      <td className="px-4 py-3">
                        {(st === 'issued' || st === 'overdue') && (
                          <button onClick={() => setReturnIssue(iss)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 transition">
                            <RotateCcw size={11} /> Return
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {issueOpen && (
        <IssueModal onClose={() => setIssueOpen(false)} onDone={() => { setIssueOpen(false); load(); }} />
      )}
      {returnIssue && (
        <ReturnModal issue={returnIssue} onClose={() => setReturnIssue(null)} onDone={() => { setReturnIssue(null); load(); }} />
      )}
    </div>
  );
}

/* ─── TAB: REPORTS ────────────────────────────────────────────── */
function ReportsTab() {
  const [subTab,     setSubTab]     = useState('overdue');
  const [overdue,    setOverdue]    = useState([]);
  const [fines,      setFines]      = useState([]);
  const [mostBorrowed, setMostBorrowed] = useState([]);
  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [paidFilter, setPaidFilter] = useState('false');
  const [histSearch, setHistSearch] = useState('');
  const [histType,   setHistType]   = useState('');

  const loadOverdue      = useCallback(async () => { setLoading(true); try { const r = await getIssues({ status: 'overdue', limit: 100 }); setOverdue(Array.isArray(r.data) ? r.data : []); } finally { setLoading(false); } }, []);
  const loadFines        = useCallback(async () => { setLoading(true); try { const r = await getFines({ paid_status: paidFilter, limit: 200 }); setFines(Array.isArray(r.data) ? r.data : []); } finally { setLoading(false); } }, [paidFilter]);
  const loadMostBorrowed = useCallback(async () => { setLoading(true); try { const r = await getMostBorrowed({ limit: 10 }); setMostBorrowed(Array.isArray(r.data) ? r.data : []); } finally { setLoading(false); } }, []);
  const loadHistory      = useCallback(async () => { setLoading(true); try { const r = await getBorrowingHistory({ search: histSearch, borrower_type: histType, limit: 200 }); setHistory(Array.isArray(r.data) ? r.data : []); } finally { setLoading(false); } }, [histSearch, histType]);

  useEffect(() => {
    if (subTab === 'overdue') loadOverdue();
    if (subTab === 'fines')   loadFines();
    if (subTab === 'most')    loadMostBorrowed();
    if (subTab === 'history') loadHistory();
  }, [subTab, loadOverdue, loadFines, loadMostBorrowed, loadHistory]);

  const handlePayFine = async (id) => {
    try { await markFinePaid(id); toast.success('Fine marked as paid'); loadFines(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const pendingFines  = fines.reduce((s, f) => s + (!f.paid_status ? Number(f.fine_amount) : 0), 0);

  const SUB_TABS = [
    { key: 'overdue', label: 'Overdue',       icon: AlertTriangle },
    { key: 'fines',   label: 'Fines',         icon: Banknote },
    { key: 'most',    label: 'Most Borrowed', icon: TrendingUp },
    { key: 'history', label: 'History',       icon: Clock },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm">
        {SUB_TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              subTab === key ? 'text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            style={subTab === key ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {subTab === 'fines' && (
        <div className="flex flex-wrap gap-3 items-center">
          <Sel value={paidFilter} onChange={setPaidFilter} className="w-36">
            <option value="">All Fines</option>
            <option value="false">Unpaid</option>
            <option value="true">Paid</option>
          </Sel>
          {pendingFines > 0 && (
            <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-xs font-bold text-amber-700 dark:text-amber-400">
              PKR {pendingFines.toFixed(0)} pending
            </div>
          )}
        </div>
      )}
      {subTab === 'history' && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-44">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={histSearch} onChange={e => setHistSearch(e.target.value)} placeholder="Search book or borrower…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
          <Sel value={histType} onChange={setHistType} className="w-36">
            <option value="">All Borrowers</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
          </Sel>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

          {subTab === 'overdue' && (overdue.length === 0 ? (
            <div className="p-14 text-center"><CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-3" /><p className="font-bold text-slate-500">No overdue books!</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                {['Book', 'Borrower', 'Due Date', 'Days Late', 'Est. Fine'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overdue.map(o => (
                  <tr key={o.id} className="hover:bg-red-50/30 dark:hover:bg-red-900/5 transition-colors" style={{ borderLeft: '3px solid #dc2626' }}>
                    <td className="px-4 py-3"><div className="flex items-center gap-2.5"><BookSpine title={o.book_title} color={o.cover_color} /><div><div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">{o.book_title}</div><div className="text-xs text-slate-400">{o.copy_number}</div></div></div></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><BorrowerAvatar name={o.borrower_name} type={o.borrower_type} /><div><div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{o.borrower_name}</div><div className="text-xs text-slate-400 capitalize">{o.borrower_type}</div></div></div></td>
                    <td className="px-4 py-3 text-xs font-semibold text-red-600">{fmtDate(o.due_date)}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold">{o.days_overdue}d</span></td>
                    <td className="px-4 py-3 text-xs font-bold text-red-600">PKR {o.days_overdue * 5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

          {subTab === 'fines' && (fines.length === 0 ? (
            <div className="p-14 text-center text-slate-400 text-sm"><Banknote size={28} className="mx-auto mb-2 text-slate-300" />No fines found</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                {['Book','Borrower','Late Days','Amount','Status',''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {fines.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3"><div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">{f.book_title}</div><div className="text-xs text-slate-400">{f.copy_number}</div></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><BorrowerAvatar name={f.borrower_name} type={f.borrower_type} /><div><div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{f.borrower_name}</div><div className="text-xs text-slate-400 capitalize">{f.borrower_type}</div></div></div></td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold">{f.late_days}d</span></td>
                    <td className="px-4 py-3 text-sm font-black text-slate-800 dark:text-slate-100">PKR {f.fine_amount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${f.paid_status ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40'}`}>
                        {f.paid_status ? '✓ Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!f.paid_status && (
                        <button onClick={() => handlePayFine(f.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40 transition">
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

          {subTab === 'most' && (mostBorrowed.length === 0 ? (
            <div className="p-14 text-center text-slate-400 text-sm"><TrendingUp size={28} className="mx-auto mb-2 text-slate-300" />No data yet</div>
          ) : (
            <div className="p-5 space-y-3">
              {mostBorrowed.map((b, i) => (
                <div key={b.id} className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                    style={{ background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : '#6366f1' }}>
                    {i + 1}
                  </div>
                  <BookSpine title={b.title} color={b.cover_color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{b.title}</div>
                    <div className="text-xs text-slate-400">{b.author} · {b.category_icon} {b.category_name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-black text-indigo-600">{b.total_issues}</div>
                    <div className="text-xs text-slate-400">borrows</div>
                  </div>
                  <div className="w-20 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${Math.round((b.total_issues / mostBorrowed[0].total_issues) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ))}

          {subTab === 'history' && (history.length === 0 ? (
            <div className="p-14 text-center text-slate-400 text-sm"><Clock size={28} className="mx-auto mb-2 text-slate-300" />No history found</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                {['Book','Borrower','Issued','Returned','Late','Fine'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3"><div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">{h.book_title}</div><div className="text-xs text-slate-400 font-mono">{h.copy_number}</div></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><BorrowerAvatar name={h.borrower_name} type={h.borrower_type} /><div><div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{h.borrower_name}</div><div className="text-xs text-slate-400 capitalize">{h.borrower_type}</div></div></div></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(h.issue_date)}</td>
                    <td className="px-4 py-3 text-xs">{h.return_date ? fmtDate(h.return_date) : <IssueBadge status={h.status} />}</td>
                    <td className="px-4 py-3">{h.late_days > 0 ? <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-lg">{h.late_days}d</span> : <span className="text-xs text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200">{h.fine_amount ? `PKR ${h.fine_amount}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── READING HISTORY TAB ────────────────────────────────────── */
function ReadingHistoryTab() {
  // No status filter here (unlike the default picker) — reading history can
  // be looked up for any student regardless of active/inactive status.
  const { data: students = [] }     = useStudentsPicker({ status: undefined });
  const [studentId,  setStudentId]  = useState('');
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);

  const load = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true); setSearched(true);
    try {
      const r = await getBorrowingHistory({ student_id: sid, limit: 200 });
      setRows(r.data?.data || []);
    } catch { toast.error('Failed to load reading history'); }
    finally { setLoading(false); }
  }, []);

  const statusColor = (s) => ({
    issued:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    returned: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    overdue:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }[s] || 'bg-slate-100 text-slate-600');

  const totalBooks  = rows.length;
  const returned    = rows.filter(r => r.return_date).length;
  const lateReturns = rows.filter(r => r.late_days > 0).length;
  const fineTotal   = rows.reduce((s, r) => s + (+r.fine_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Student Reading History</h3>
        <div className="flex gap-3 max-w-sm">
          <select value={studentId} onChange={e => { setStudentId(e.target.value); load(e.target.value); }}
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
            <option value="">— Select a student —</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name || s.full_name} ({s.roll_number})</option>)}
          </select>
        </div>
      </div>

      {studentId && searched && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Books', value: totalBooks,   color: 'indigo' },
              { label: 'Returned',    value: returned,     color: 'green'  },
              { label: 'Late Returns',value: lateReturns,  color: 'amber'  },
              { label: 'Total Fines', value: `Rs ${fineTotal}`, color: 'red' },
            ].map(c => (
              <div key={c.label} className={`bg-${c.color}-50 dark:bg-${c.color}-900/20 rounded-2xl p-4 border border-${c.color}-100 dark:border-${c.color}-800`}>
                <p className={`text-2xl font-bold text-${c.color}-700 dark:text-${c.color}-400`}>{c.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Spinner size={8} /><span className="ml-3 text-sm text-slate-400">Loading…</span></div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400"><BookX size={32} className="mb-2 opacity-40" /><p className="text-sm">No borrowing records found</p></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>{['Book','Copy','Issued','Due','Returned','Late Days','Fine','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BookSpine title={r.book_title} color={r.cover_color} size="sm" />
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100 text-xs leading-tight">{r.book_title}</p>
                            <p className="text-xs text-slate-400">{r.author}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">#{r.copy_number}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{r.issue_date}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{r.due_date}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{r.return_date || '—'}</td>
                      <td className="px-4 py-3 text-xs">{r.late_days > 0 ? <span className="text-red-600 font-semibold">{r.late_days}d</span> : <span className="text-green-600">—</span>}</td>
                      <td className="px-4 py-3 text-xs">{r.fine_amount > 0 ? <span className={r.fine_paid ? 'text-green-600' : 'text-red-600'}>Rs {r.fine_amount}</span> : '—'}</td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(r.status)}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── RESERVATIONS TAB ────────────────────────────────────────── */
function ReservationsTab() {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState('pending');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getReservations({ status });
      setRows(r.data?.data || []);
    } catch { toast.error('Failed to load reservations'); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this reservation?')) return;
    try {
      await cancelReservation(id);
      toast.success('Reservation cancelled');
      load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const handleFulfill = async (id) => {
    try {
      await fulfillReservation(id);
      toast.success('Marked as fulfilled');
      load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const STATUS_CFG = {
    pending:   { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',  label: 'Pending'   },
    fulfilled: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  label: 'Fulfilled' },
    cancelled: { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',          label: 'Cancelled' },
    expired:   { cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',           label: 'Expired'   },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Bell size={16} className="text-indigo-500" /> Book Reservations
        </h2>
        <div className="flex items-center gap-2">
          {['pending', 'fulfilled', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-xl capitalize border transition-colors ${
                status === s ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                             : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300'
              }`}>{s}</button>
          ))}
          <button onClick={load} className="text-slate-400 hover:text-indigo-500"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-slate-400"><RefreshCw size={18} className="animate-spin inline mr-2" />Loading…</div>}

      {!loading && rows.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Bell size={32} className="mx-auto mb-2 opacity-30" />
          <p>No {status} reservations</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                {['Book', 'Student', 'Reserved', 'Expires', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {rows.map(r => {
                const sc = STATUS_CFG[r.status] || STATUS_CFG.pending;
                return (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{r.book_title}</div>
                      <div className="text-xs text-slate-400">{r.author || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800 dark:text-slate-200">{r.student_name}</div>
                      <div className="text-xs text-slate-400">Roll {r.roll_number || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{fmtDate(r.reserved_at)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{fmtDate(r.expires_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleFulfill(r.id)}
                            className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:opacity-80 flex items-center gap-1 transition-opacity">
                            <UserCheck size={12} /> Fulfill
                          </button>
                          <button onClick={() => handleCancel(r.id)}
                            className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:opacity-80 transition-opacity">
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────────────────── */
export default function LibraryPage() {
  const [tab,        setTab]        = useState('overview');
  const [stats,      setStats]      = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getLibrarySummary().then(r => setStats(r.data?.data ?? r.data)).catch(() => {});
    getCategories().then(r => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const TABS = [
    { key: 'overview',     label: 'Overview',     icon: BarChart3  },
    { key: 'books',        label: 'Books',        icon: BookOpen   },
    { key: 'issues',       label: 'Issues',       icon: BookMarked },
    { key: 'reservations', label: 'Reservations',    icon: Bell       },
    { key: 'reading',      label: 'Reading History', icon: BookOpen   },
    { key: 'reports',      label: 'Reports',         icon: TrendingUp },
  ];

  return (
    <Layout>
      {/* Hero */}
      <div className="sticky top-14 lg:top-0 z-30 px-4 sm:px-6 lg:px-8 py-4"
        style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4338ca 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg,#818cf8,#6366f1)' }}>
                <BookMarked size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-none">Library</h1>
                <p className="text-xs text-indigo-300 mt-0.5">Books · Issues · Fines · Reports</p>
              </div>
            </div>
            {stats && (
              <div className="hidden sm:flex items-center gap-2">
                {[
                  { l: 'Books',     v: stats.total_books   ?? 0, c: '#a5b4fc' },
                  { l: 'Available', v: stats.available_copies ?? 0, c: '#6ee7b7' },
                  { l: 'Issued',    v: stats.active_issues  ?? 0, c: '#67e8f9' },
                  { l: 'Overdue',   v: stats.overdue_count  ?? 0, c: '#fca5a5' },
                ].map(({ l, v, c }) => (
                  <div key={l} className="text-center px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
                    <div className="text-sm font-black leading-none" style={{ color: c }}>{v}</div>
                    <div className="text-[10px] text-indigo-300 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded-2xl p-1 backdrop-blur-sm w-fit">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  tab === key ? 'bg-white text-slate-800 shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}>
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tab === 'overview'     && <OverviewTab stats={stats} />}
        {tab === 'books'        && <BooksTab   categories={categories} />}
        {tab === 'issues'       && <IssuesTab  categories={categories} />}
        {tab === 'reservations' && <ReservationsTab />}
        {tab === 'reading'      && <ReadingHistoryTab />}
        {tab === 'reports'      && <ReportsTab />}
      </div>
    </Layout>
  );
}
