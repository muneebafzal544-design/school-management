import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout     from '../components/layout/Layout';
import PageHeader from '../components/ui/PageHeader';
import { ModalHeader } from '../components/ui/Modal';
import toast from 'react-hot-toast';
import {
  TrendingUp, TrendingDown, Plus, Edit2, Trash2, X,
  DollarSign, Wallet, BarChart3, RefreshCw,
  Search, ChevronDown, Tag, Calendar,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import {
  getIncomeCategories, createIncomeCategory, updateIncomeCategory,
  getIncomes, createIncome, updateIncome, deleteIncome,
  getIncomeSummary, getIncomeMonthly,
} from '../api/income';

// ── helpers ──────────────────────────────────────────────────
const PKR = (n) => Number(n || 0).toLocaleString('en-PK');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const currentYear  = new Date().getFullYear();
const currentMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'online',        label: 'Online' },
  { value: 'card',          label: 'Card' },
];

const METHOD_COLORS = {
  cash:          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  bank_transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cheque:        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  online:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  card:          'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

// ── Income vs Expenses bar chart (pure CSS) ───────────────────
function MonthlyChart({ data }) {
  if (!data || data.length === 0)
    return <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data yet</div>;

  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1);

  return (
    <div className="pt-2">
      <div className="flex items-end gap-1 h-36">
        {data.map((d) => {
          const incPct = Math.round((d.income   / maxVal) * 100);
          const expPct = Math.round((d.expenses / maxVal) * 100);
          const profit = d.income - d.expenses;
          return (
            <div key={d.month_num} className="flex-1 flex flex-col items-center gap-0.5 group">
              <div className="w-full flex items-end justify-center gap-0.5 h-32 relative">
                {/* Tooltip */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none
                  bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-xl min-w-[120px]">
                  <div className="font-semibold mb-0.5">{d.month_short}</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" /> Income: PKR {PKR(d.income)}</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" /> Expenses: PKR {PKR(d.expenses)}</div>
                  <div className={`flex items-center gap-1 mt-0.5 font-medium ${profit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    P&amp;L: {profit >= 0 ? '+' : ''}PKR {PKR(profit)}
                  </div>
                </div>
                {/* Income bar */}
                <div className="w-5/12 rounded-t-md transition-all duration-500 bg-gradient-to-t from-emerald-600 to-emerald-400"
                  style={{ height: `${incPct}%`, minHeight: d.income > 0 ? 4 : 0 }} />
                {/* Expense bar */}
                <div className="w-5/12 rounded-t-md transition-all duration-500 bg-gradient-to-t from-red-600 to-red-400"
                  style={{ height: `${expPct}%`, minHeight: d.expenses > 0 ? 4 : 0 }} />
              </div>
              <span className="text-[9px] text-slate-400 font-medium">{d.month_short}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 justify-center">
        {[['bg-emerald-400','Income'],['bg-red-400','Expenses']].map(([cls,lbl]) => (
          <div key={lbl} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${cls}`} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Category dot + name ───────────────────────────────────────
function CatBadge({ color, name }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-sm text-slate-700 dark:text-slate-300">{name}</span>
    </span>
  );
}

// ── Add / Edit Income Modal ───────────────────────────────────
function IncomeModal({ entry, categories, onClose, onSaved }) {
  const isEdit = !!entry?.id;
  const [form, setForm] = useState({
    category_id:    entry?.category_id    ?? '',
    title:          entry?.title          ?? '',
    description:    entry?.description    ?? '',
    amount:         entry?.amount         ?? '',
    income_date:    entry?.income_date    ? entry.income_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    payment_method: entry?.payment_method ?? 'cash',
    reference_no:   entry?.reference_no   ?? '',
    academic_year:  entry?.academic_year  ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_id) return toast.error('Please select a category');
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Amount must be > 0');
    setSaving(true);
    try {
      if (isEdit) await updateIncome(entry.id, form);
      else        await createIncome(form);
      toast.success(isEdit ? 'Income updated' : 'Income recorded');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <ModalHeader
          title={isEdit ? 'Edit Income Entry' : 'Record Income'}
          subtitle={isEdit ? 'Update income details' : 'Add a new income record'}
          onClose={onClose}
          sticky
        />

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(c => (
                <button type="button" key={c.id}
                  onClick={() => set('category_id', c.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    Number(form.category_id) === c.id
                      ? 'border-transparent text-white shadow-md'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  style={Number(form.category_id) === c.id ? { backgroundColor: c.color } : {}}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Title / Description <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. March Fee Collection — Class 9"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400" />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <input type="number" min="1" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={form.income_date} onChange={e => set('income_date', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400" />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Payment Method</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(m => (
                <button type="button" key={m.value}
                  onClick={() => set('payment_method', m.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    form.payment_method === m.value
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference + Academic Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reference No.</label>
              <input type="text" value={form.reference_no} onChange={e => set('reference_no', e.target.value)}
                placeholder="Receipt / voucher no."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Academic Year</label>
              <input type="text" value={form.academic_year} onChange={e => set('academic_year', e.target.value)}
                placeholder="2025-26"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Optional notes..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60">
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Record Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Manage Categories Modal ───────────────────────────────────
function CategoryModal({ categories, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10B981');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await createIncomeCategory({ name: name.trim(), color });
      toast.success('Category added');
      setName(''); setColor('#10B981');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const toggleActive = async (cat) => {
    try {
      await updateIncomeCategory(cat.id, { is_active: !cat.is_active });
      toast.success(cat.is_active ? 'Category disabled' : 'Category enabled');
      onSaved();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <ModalHeader title="Income Categories" onClose={onClose} />

        <div className="overflow-y-auto flex-1 p-5 space-y-2">
          {categories.map(c => (
            <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${c.is_active ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 opacity-50'}`}>
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
              <button onClick={() => toggleActive(c)}
                className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${c.is_active ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-red-100 hover:text-red-600' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                {c.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} className="border-t border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Add New Category</p>
          <div className="flex gap-2 items-center">
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5" />
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Category name"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-60">
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function IncomePage() {
  const [tab, setTab]               = useState('entries');
  const [summary, setSummary]       = useState(null);
  const [monthly, setMonthly]       = useState([]);
  const [chartYear, setChartYear]   = useState(currentYear);
  const [entries, setEntries]       = useState([]);
  const [filtTotal, setFiltTotal]   = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterMonth, setFilterMonth]   = useState('');
  const [filterYear, setFilterYear]     = useState('');

  // Modals
  const [showModal, setShowModal]   = useState(false);
  const [editEntry, setEditEntry]   = useState(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const params = {};
      if (search)       params.search  = search;
      if (filterCat)    params.category_id = filterCat;
      if (filterMethod) params.payment_method = filterMethod;
      if (filterMonth)  params.month = filterMonth;
      else if (filterYear) params.year = filterYear;

      const [catRes, entRes, sumRes, monRes] = await Promise.all([
        getIncomeCategories(),
        getIncomes(params),
        getIncomeSummary(),
        getIncomeMonthly({ year: chartYear }),
      ]);

      setCategories(catRes.data?.data ?? []);

      const entData = entRes.data?.data ?? entRes.data ?? [];
      setEntries(Array.isArray(entData) ? entData : []);
      setFiltTotal(entRes.data?.filtered_total ?? 0);

      setSummary(sumRes.data?.data ?? null);
      setMonthly(monRes.data?.data ?? []);
    } catch (err) {
      toast.error('Failed to load income data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filterCat, filterMethod, filterMonth, filterYear, chartYear]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteIncome(deleteTarget.id);
      toast.success('Entry deleted');
      setDeleteTarget(null);
      loadAll(true);
    } catch { toast.error('Delete failed'); }
  };

  const s = summary;
  const incMonth  = s?.this_month?.income   ?? 0;
  const expMonth  = s?.this_month?.expenses ?? 0;
  const profMonth = incMonth - expMonth;
  const incYear   = s?.this_year?.income    ?? 0;
  const expYear   = s?.this_year?.expenses  ?? 0;
  const profYear  = incYear - expYear;
  const momChange = s?.mom_change_pct;

  return (
    <Layout>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <PageHeader
          icon={TrendingUp}
          title="Income Tracker"
          subtitle="Track all school income sources — tuition, admissions, donations & more"
          actions={
            <div className="flex items-center gap-2">
              <button onClick={() => loadAll(true)} disabled={refreshing}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setShowCatModal(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <Tag className="w-4 h-4" /> Categories
              </button>
              <button onClick={() => { setEditEntry(null); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors">
                <Plus className="w-4 h-4" /> Record Income
              </button>
            </div>
          }
        />

        {/* ── KPI Cards ── */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Income this month */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                {momChange !== null && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${Number(momChange) >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {Number(momChange) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(momChange)}%
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">PKR {PKR(incMonth)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Income this month</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s?.this_month?.count ?? 0} entries</p>
            </div>

            {/* Expenses this month */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-rose-500" />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">PKR {PKR(expMonth)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Expenses this month</p>
            </div>

            {/* Net Profit/Loss this month */}
            <div className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-4 ${profMonth >= 0 ? 'border-emerald-200/80 dark:border-emerald-900/40' : 'border-red-200/80 dark:border-red-900/40'}`}>
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${profMonth >= 0 ? 'from-emerald-500 to-green-400' : 'from-red-500 to-rose-400'}`} />
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br ${profMonth >= 0 ? 'from-emerald-500 to-green-500' : 'from-red-500 to-rose-500'}`}>
                {profMonth >= 0 ? <ArrowUpRight className="w-5 h-5 text-white" /> : <ArrowDownRight className="w-5 h-5 text-white" />}
              </div>
              <p className={`mt-3 text-2xl font-bold ${profMonth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {profMonth >= 0 ? '+' : ''}PKR {PKR(profMonth)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Net {profMonth >= 0 ? 'Profit' : 'Loss'} — Month</p>
            </div>

            {/* Net Profit/Loss this year */}
            <div className={`relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-4 ${profYear >= 0 ? 'border-blue-200/80 dark:border-blue-900/40' : 'border-red-200/80 dark:border-red-900/40'}`}>
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${profYear >= 0 ? 'from-blue-500 to-indigo-500' : 'from-red-500 to-rose-500'}`} />
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br ${profYear >= 0 ? 'from-blue-500 to-indigo-600' : 'from-red-500 to-rose-600'}`}>
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <p className={`mt-3 text-2xl font-bold ${profYear >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                {profYear >= 0 ? '+' : ''}PKR {PKR(profYear)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Net {profYear >= 0 ? 'Profit' : 'Loss'} — {currentYear}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Income: PKR {PKR(incYear)}</p>
            </div>
          </div>
        )}

        {/* ── Chart + Category Breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Monthly Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" /> Income vs Expenses
              </h3>
              <select value={chartYear} onChange={e => setChartYear(Number(e.target.value))}
                className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none">
                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <MonthlyChart data={monthly} />
          </div>

          {/* Category Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-500" /> By Category ({currentYear})
            </h3>
            {(s?.by_category ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-2.5">
                {(s?.by_category ?? []).map(c => {
                  const total = (s?.by_category ?? []).reduce((a, b) => a + Number(b.total), 0);
                  const pct = total > 0 ? Math.round(Number(c.total) / total * 100) : 0;
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-xs text-slate-600 dark:text-slate-400">{c.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">PKR {PKR(c.total)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{pct}% · {c.count} entries</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search title…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
            </div>

            {/* Category */}
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none appearance-none">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Payment method */}
            <div className="relative">
              <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none appearance-none pr-7">
                <option value="">All Methods</option>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Month */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterYear(''); }}
                className="pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>

            {/* Year */}
            <div className="relative">
              <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterMonth(''); }}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none appearance-none pr-7">
                <option value="">All Years</option>
                {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Clear */}
            {(search || filterCat || filterMethod || filterMonth || filterYear) && (
              <button onClick={() => { setSearch(''); setFilterCat(''); setFilterMethod(''); setFilterMonth(''); setFilterYear(''); }}
                className="px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Entries Table ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Table header row */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Income Entries
              <span className="ml-2 text-xs font-normal text-slate-400">({entries.length} records)</span>
            </h3>
            {filtTotal > 0 && (
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Total: PKR {PKR(filtTotal)}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No income entries found.</p>
              <button onClick={() => { setEditEntry(null); setShowModal(true); }}
                className="mt-4 text-emerald-600 hover:underline text-sm font-medium">
                + Record first income entry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Date</th>
                    <th className="text-left px-5 py-3 font-semibold">Title</th>
                    <th className="text-left px-5 py-3 font-semibold">Category</th>
                    <th className="text-left px-5 py-3 font-semibold">Method</th>
                    <th className="text-left px-5 py-3 font-semibold">Ref. No.</th>
                    <th className="text-right px-5 py-3 font-semibold">Amount</th>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {entries.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {fmtDate(e.income_date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900 dark:text-white">{e.title}</p>
                        {e.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{e.description}</p>}
                        {e.academic_year && <p className="text-[10px] text-blue-500 mt-0.5">{e.academic_year}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <CatBadge color={e.category_color} name={e.category_name} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${METHOD_COLORS[e.payment_method] ?? ''}`}>
                          {PAYMENT_METHODS.find(m => m.value === e.payment_method)?.label ?? e.payment_method}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                        {e.reference_no || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        PKR {PKR(e.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditEntry(e); setShowModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(e)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer total */}
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={5} className="px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Total ({entries.length} entries)
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      PKR {PKR(filtTotal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showModal && (
        <IncomeModal
          entry={editEntry}
          categories={categories}
          onClose={() => { setShowModal(false); setEditEntry(null); }}
          onSaved={() => { setShowModal(false); setEditEntry(null); loadAll(true); }}
        />
      )}

      {showCatModal && (
        <CategoryModal
          categories={categories}
          onClose={() => setShowCatModal(false)}
          onSaved={() => loadAll(true)}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">Delete Entry?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
              "{deleteTarget.title}" — PKR {PKR(deleteTarget.amount)} will be permanently deleted.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold shadow-md hover:bg-red-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}
