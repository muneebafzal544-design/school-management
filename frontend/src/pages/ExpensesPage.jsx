import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusCircle, Pencil, Trash2, Search, Filter,
  TrendingUp, TrendingDown, Wallet, BarChart3,
  RefreshCw, X, ChevronDown, Receipt, PieChart,
  CalendarDays, Tag, CreditCard, FileText, DollarSign,
  Download, Upload,
} from 'lucide-react';
import Layout   from '../components/layout/Layout';
import { downloadBlob } from '../utils';
import {
  getCategories, createCategory, updateCategory,
  getExpenses, createExpense, updateExpense, deleteExpense,
  getExpenseSummary, getMonthlyReport, getYearlyReport, getByCategoryReport,
  getExpenseImportTemplate, importExpenses, exportExpenses,
} from '../api/expenses';
import ImportModal  from '../components/ui/ImportModal';
import PageHeader   from '../components/ui/PageHeader';
import TabBar       from '../components/ui/TabBar';
import StatCard     from '../components/ui/StatCard';
import { ModalHeader } from '../components/ui/Modal';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtDate = (d) => {
  if (!d) return '—';
  // Treat bare date strings (YYYY-MM-DD) as local date to avoid UTC-offset shift
  const date = typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d);
  return date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'online',        label: 'Online' },
  { value: 'card',          label: 'Card' },
];

const PAYMENT_COLORS = {
  cash:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  bank_transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cheque:        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  online:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  card:          'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const STATUS_COLORS = {
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending:  'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  draft:    'bg-slate-100  text-slate-600  dark:bg-slate-700     dark:text-slate-300',
  rejected: 'bg-red-100   text-red-700    dark:bg-red-900/30    dark:text-red-400',
};

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: BarChart3 },
  { id: 'expenses',   label: 'Expenses',   icon: Receipt },
  { id: 'reports',    label: 'Reports',    icon: PieChart },
  { id: 'categories', label: 'Categories', icon: Tag },
];

// ── Small reusable pieces ────────────────────────────────────────────────────

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function SelectField({ label, value, onChange, children, required }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          required={required}
          className="w-full appearance-none pl-3 pr-8 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        >
          {children}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, required, min }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
      />
    </div>
  );
}

// ── Bar chart row ────────────────────────────────────────────────────────────
function CategoryBar({ name, icon, color, total, max, pct }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg w-7 flex-shrink-0 text-center">{icon || '📦'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{name}</span>
          <span className="text-sm font-bold text-slate-800 dark:text-white ml-2 flex-shrink-0">PKR {fmt(total)}</span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: color || '#8b5cf6' }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{Number(pct).toFixed(1)}% of total</p>
      </div>
    </div>
  );
}

// ── Expense Form Modal ───────────────────────────────────────────────────────
function ExpenseModal({ expense, categories, onSave, onClose }) {
  const isEdit = Boolean(expense?.id);
  const today  = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    category_id:      expense?.category_id     ?? '',
    title:            expense?.title           ?? '',
    description:      expense?.description     ?? '',
    amount:           expense?.amount          ?? '',
    expense_date:     expense?.expense_date    ? expense.expense_date.split('T')[0] : today,
    payment_method:   expense?.payment_method  ?? 'cash',
    reference_number: expense?.reference_number ?? '',
    status:           expense?.status          ?? 'approved',
  });

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!form.category_id) return toast.error('Please select a category');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Amount must be greater than 0');
    await onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <ModalHeader title={isEdit ? 'Edit Expense' : 'Record New Expense'} onClose={onClose} />

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category + Title */}
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Category" value={form.category_id} onChange={set('category_id')} required>
              <option value="">Select…</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.category_name}</option>
              ))}
            </SelectField>
            <SelectField label="Status" value={form.status} onChange={set('status')}>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
            </SelectField>
          </div>

          <InputField label="Title" value={form.title} onChange={set('title')} placeholder="e.g. March Electricity Bill" required />

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={2}
              placeholder="Optional notes…"
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Amount (PKR)" type="number" value={form.amount} onChange={set('amount')} placeholder="0" required min="1" />
            <InputField label="Date" type="date" value={form.expense_date} onChange={set('expense_date')} required />
          </div>

          {/* Payment method + Reference */}
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Payment Method" value={form.payment_method} onChange={set('payment_method')}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </SelectField>
            <InputField label="Reference / Voucher No." value={form.reference_number} onChange={set('reference_number')} placeholder="Optional" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow hover:opacity-90">
              {isEdit ? 'Save Changes' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Category Form Modal ──────────────────────────────────────────────────────
function CategoryModal({ category, onSave, onClose }) {
  const isEdit = Boolean(category?.id);
  const [form, setForm] = useState({
    category_name: category?.category_name ?? '',
    description:   category?.description   ?? '',
    icon:          category?.icon          ?? '',
    color:         category?.color         ?? '#8b5cf6',
    is_active:     category?.is_active     ?? true,
  });
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!form.category_name.trim()) return toast.error('Category name is required');
    await onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <ModalHeader title={isEdit ? 'Edit Category' : 'Add Category'} onClose={onClose} />
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <InputField label="Category Name" value={form.category_name} onChange={set('category_name')} required placeholder="e.g. Laboratory" />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Emoji Icon" value={form.icon} onChange={set('icon')} placeholder="🏫" />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
              <input type="color" value={form.color} onChange={set('color')}
                className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-600 cursor-pointer p-1" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-violet-500 resize-none"
              placeholder="Optional description…" />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="w-4 h-4 rounded text-violet-600" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow hover:opacity-90">
              {isEdit ? 'Save' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const [tab, setTab]             = useState('overview');
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses]   = useState([]);
  const [summary, setSummary]     = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData]   = useState([]);
  const [catReport, setCatReport]     = useState([]);
  const [loading, setLoading]     = useState(false);

  // Filters
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterStatus, setFilterStatus] = useState('approved');
  const [filterMonth, setFilterMonth]   = useState('');
  const [reportYear, setReportYear]     = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth]   = useState('');

  // Modals
  const [expModal, setExpModal]   = useState(null);   // null | 'new' | expense obj
  const [catModal, setCatModal]   = useState(null);   // null | 'new' | category obj
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showImport, setShowImport] = useState(false);

  // ── Loaders ──────────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    try {
      const r = await getCategories({ active_only: 'false' });
      setCategories(r.data || []);
    } catch { /* silent */ }
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: 100,
        status: filterStatus || undefined,
        category_id: filterCat || undefined,
        payment_method: filterMethod || undefined,
        month: filterMonth || undefined,
        search: search || undefined,
      };
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
      const r = await getExpenses(params);
      setExpenses(r.data || []);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  }, [filterStatus, filterCat, filterMethod, filterMonth, search]);

  const loadSummary = useCallback(async () => {
    try {
      const r = await getExpenseSummary();
      setSummary(r.data?.data ?? r.data);
    } catch { /* silent */ }
  }, []);

  const loadMonthly = useCallback(async () => {
    try {
      const r = await getMonthlyReport({ year: reportYear });
      // Interceptor unwraps data:[...] → r.data is already the array
      setMonthlyData(Array.isArray(r.data) ? r.data : []);
    } catch { /* silent */ }
  }, [reportYear]);

  const loadYearly = useCallback(async () => {
    try {
      const r = await getYearlyReport();
      setYearlyData(Array.isArray(r.data) ? r.data : []);
    } catch { /* silent */ }
  }, []);

  const loadCatReport = useCallback(async () => {
    try {
      const params = reportMonth ? { month: reportMonth } : { year: reportYear };
      const r = await getByCategoryReport(params);
      setCatReport(Array.isArray(r.data) ? r.data : []);
    } catch { /* silent */ }
  }, [reportYear, reportMonth]);

  useEffect(() => { loadCategories(); loadSummary(); }, [loadCategories, loadSummary]);
  useEffect(() => { if (tab === 'expenses') loadExpenses(); }, [tab, loadExpenses]);
  useEffect(() => {
    if (tab === 'reports') { loadMonthly(); loadYearly(); loadCatReport(); }
  }, [tab, loadMonthly, loadYearly, loadCatReport]);

  // Re-load expenses when filters change without needing "Apply" click
  useEffect(() => {
    if (tab === 'expenses') loadExpenses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCat, filterMethod, filterMonth, filterStatus]);

  // ── Save expense ─────────────────────────────────────────
  const handleSaveExpense = async (form) => {
    try {
      if (expModal?.id) {
        await updateExpense(expModal.id, form);
        toast.success('Expense updated');
      } else {
        await createExpense(form);
        toast.success('Expense recorded');
      }
      setExpModal(null);
      loadExpenses();
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    }
  };

  // ── Delete expense ───────────────────────────────────────
  const handleDeleteExpense = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense(deleteTarget.id);
      toast.success('Expense deleted');
      setDeleteTarget(null);
      loadExpenses();
      loadSummary();
    } catch { toast.error('Failed to delete expense'); }
  };

  // ── Save category ────────────────────────────────────────
  const handleSaveCategory = async (form) => {
    try {
      if (catModal?.id) {
        await updateCategory(catModal.id, form);
        toast.success('Category updated');
      } else {
        await createCategory(form);
        toast.success('Category created');
      }
      setCatModal(null);
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    }
  };

  // ── Derived chart helpers ────────────────────────────────
  const maxMonthly = monthlyData.length ? Math.max(...monthlyData.map(m => Number(m.total_amount) || 0), 1) : 1;
  const maxCat     = catReport.length   ? Math.max(...catReport.map(c => Number(c.total_amount)   || 0), 1) : 1;
  const maxYearly  = yearlyData.length  ? Math.max(...yearlyData.map(r => Number(r.total_amount)  || 0), 1) : 1;

  // CSV export for expenses tab
  const exportCSV = () => {
    if (!expenses.length) return toast.error('No expenses to export');
    const header = ['Date','Category','Title','Description','Amount','Payment Method','Reference','Status'];
    const rows = expenses.map(e => [
      fmtDate(e.expense_date), e.category_name, `"${e.title}"`,
      `"${e.description || ''}"`, e.amount, e.payment_method,
      e.reference_number || '', e.status,
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `expenses_${filterMonth || new Date().toISOString().slice(0,7)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Filtered total of visible expenses
  const visibleTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // ─────────────────────────────────────────────────────────
  return (
    <Layout>
      {/* Page header */}
      <div className="mb-6">
        <PageHeader
          icon={Receipt}
          title="Expense Tracker"
          subtitle="Track school spending and generate financial reports"
          actions={
            <button
              onClick={() => { setTab('expenses'); setExpModal('new'); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <PlusCircle size={16} /> Record Expense
            </button>
          }
        />

        {/* Tabs */}
        <TabBar tabs={TABS} active={tab} onChange={setTab} className="mt-5" />
      </div>

      {/* ══ TAB: OVERVIEW ══════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="This Month"
              value={`PKR ${fmt(summary?.this_month?.total ?? 0)}`}
              sub={`${summary?.this_month?.count ?? 0} transactions`}
              icon={Wallet}
              color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
              trend={summary?.mom_change_pct != null}
              trendVal={summary?.mom_change_pct}
            />
            <StatCard
              label="Last Month"
              value={`PKR ${fmt(summary?.last_month?.total ?? 0)}`}
              sub={`${summary?.last_month?.count ?? 0} transactions`}
              icon={CalendarDays}
              color="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
            />
            <StatCard
              label={`${new Date().getFullYear()} Total`}
              value={`PKR ${fmt(summary?.this_year?.total ?? 0)}`}
              sub={`${summary?.this_year?.count ?? 0} transactions`}
              icon={TrendingUp}
              color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            />
            <StatCard
              label="Avg. Per Transaction"
              value={`PKR ${fmt((() => {
                const cnt = Number(summary?.this_year?.count) || 0;
                const tot = Number(summary?.this_year?.total) || 0;
                return cnt > 0 ? Math.round(tot / cnt) : 0;
              })())}`}
              sub="this year average"
              icon={DollarSign}
              color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            />
          </div>

          {/* Top categories + Recent expenses side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top categories */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Top Spending Categories</h3>
              <div className="space-y-4">
                {(summary?.top_categories ?? []).map((c, i) => {
                  const max = Math.max(Number(summary.top_categories[0]?.total) || 0, 1);
                  const pct = (Number(c.total) / max) * 100;
                  return (
                    <CategoryBar
                      key={i}
                      name={c.category_name}
                      icon={c.icon}
                      color={c.color}
                      total={c.total}
                      max={max}
                      pct={pct}
                    />
                  );
                })}
                {!summary?.top_categories?.length && (
                  <p className="text-sm text-slate-400 text-center py-4">No data yet</p>
                )}
              </div>
            </div>

            {/* Recent expenses */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 dark:text-white">Recent Expenses</h3>
                <button onClick={() => setTab('expenses')}
                  className="text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline">
                  View all →
                </button>
              </div>
              <div className="space-y-3">
                {(summary?.recent_expenses ?? []).map((e) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <span className="text-xl w-8 text-center flex-shrink-0">{e.category_icon || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{e.title}</p>
                      <p className="text-xs text-slate-400">{fmtDate(e.expense_date)}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">
                      PKR {fmt(e.amount)}
                    </span>
                  </div>
                ))}
                {!summary?.recent_expenses?.length && (
                  <p className="text-sm text-slate-400 text-center py-4">No recent expenses</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: EXPENSES ══════════════════════════════════════════ */}
      {tab === 'expenses' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadExpenses()}
                  placeholder="Search expenses…"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Category filter */}
              <div className="relative">
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-violet-500">
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Payment filter */}
              <div className="relative">
                <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-violet-500">
                  <option value="">All Methods</option>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Month filter */}
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-violet-500" />

              <button onClick={loadExpenses}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">
                <Filter size={14} /> Apply
              </button>
              <button onClick={() => {
                  setSearch(''); setFilterCat(''); setFilterMethod('');
                  setFilterMonth(''); setFilterStatus('approved');
                  // loadExpenses will re-run via useEffect dependency on these state values
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                <RefreshCw size={14} /> Reset
              </button>
            </div>
          </div>

          {/* Expenses table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                  {expenses.length > 0 && (
                    <span className="ml-2 text-violet-600 dark:text-violet-400 font-bold">
                      — Total: PKR {fmt(visibleTotal)}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowImport(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <Upload size={13} /> Import
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await exportExpenses({ format: 'xlsx' });
                      downloadBlob(res.data, 'expenses.xlsx');
                    } catch { toast.error('Export failed'); }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <Download size={13} /> Export Excel
                </button>
                <button onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <Download size={13} /> Export CSV
                </button>
                <button onClick={() => setExpModal('new')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700">
                  <PlusCircle size={13} /> Add
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                <RefreshCw size={18} className="animate-spin" /> Loading…
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Receipt size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No expenses found</p>
                <p className="text-sm mt-1">Record your first expense above</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <th className="text-left px-6 py-3">Date</th>
                      <th className="text-left px-4 py-3">Category</th>
                      <th className="text-left px-4 py-3">Title</th>
                      <th className="text-left px-4 py-3">Method</th>
                      <th className="text-right px-4 py-3">Amount</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-center px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {expenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{fmtDate(e.expense_date)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">
                            <span>{e.category_icon || '📦'}</span>
                            <span className="text-slate-600 dark:text-slate-300">{e.category_name}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800 dark:text-white">{e.title}</p>
                            {e.reference_number && (
                              <p className="text-xs text-slate-400">Ref: {e.reference_number}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={PAYMENT_COLORS[e.payment_method]}>
                            {PAYMENT_METHODS.find(m => m.value === e.payment_method)?.label || e.payment_method}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white whitespace-nowrap">
                          PKR {fmt(e.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_COLORS[e.status]}>
                            {e.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setExpModal(e)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeleteTarget(e)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-t-2 border-slate-200 dark:border-slate-600">
                      <td colSpan={4} className="px-6 py-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                        Total ({expenses.length} records)
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-violet-700 dark:text-violet-400 whitespace-nowrap">
                        PKR {fmt(visibleTotal)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: REPORTS ═══════════════════════════════════════════ */}
      {tab === 'reports' && (
        <div className="space-y-6">
          {/* Report filters */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Year</label>
                <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-violet-500">
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Month (for category chart)</label>
                <select value={reportMonth} onChange={e => setReportMonth(e.target.value)}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-white focus:ring-2 focus:ring-violet-500">
                  <option value="">Full Year</option>
                  {MONTHS.map((m, i) => {
                    const val = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                    return <option key={val} value={val}>{m} {reportYear}</option>;
                  })}
                </select>
              </div>
              <button onClick={() => { loadMonthly(); loadCatReport(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Monthly bar chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-5">Monthly Expenses — {reportYear}</h3>
            {monthlyData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No data for {reportYear}</p>
            ) : (
              <div className="flex items-end gap-2 h-48">
                {MONTHS.map((mo, i) => {
                  const monthNum = i + 1;
                  const row = monthlyData.find(r => Number(r.month_num) === monthNum);
                  const val = row ? Number(row.total_amount) : 0;
                  const pct = maxMonthly > 0 ? (val / maxMonthly) * 100 : 0;
                  return (
                    <div key={mo} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="relative w-full flex items-end justify-center" style={{ height: '160px' }}>
                        {val > 0 && (
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            PKR {fmt(val)}
                          </div>
                        )}
                        <div
                          className="w-full rounded-t-lg transition-all duration-500"
                          style={{
                            height: `${Math.max(pct, val > 0 ? 4 : 0)}%`,
                            background: val > 0 ? 'linear-gradient(to top, #7c3aed, #a78bfa)' : '#e2e8f0',
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{mo}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category breakdown + Yearly summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By category */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
                Expenses by Category
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {reportMonth || `FY ${reportYear}`}
                </span>
              </h3>
              <div className="space-y-4">
                {catReport.filter(c => Number(c.total_amount) > 0).map((c, i) => (
                  <CategoryBar
                    key={i}
                    name={c.category_name}
                    icon={c.icon}
                    color={c.color}
                    total={c.total_amount}
                    max={maxCat}
                    pct={Number(c.percentage) || 0}
                  />
                ))}
                {catReport.filter(c => Number(c.total_amount) > 0).length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">No data</p>
                )}
              </div>
            </div>

            {/* Yearly summary table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Yearly Summary</h3>
              {yearlyData.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No yearly data yet</p>
              ) : (
                <div className="space-y-3">
                  {yearlyData.map((y, i) => {
                    const pct = (Number(y.total_amount) / maxYearly) * 100;
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {y.year}
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-slate-800 dark:text-white">PKR {fmt(y.total_amount)}</span>
                            <span className="text-xs text-slate-400 ml-2">{y.transaction_count} txns</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: CATEGORIES ════════════════════════════════════════ */}
      {tab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage expense categories for classification and reporting
            </p>
            <button onClick={() => setCatModal('new')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow hover:opacity-90">
              <PlusCircle size={15} /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map(c => (
              <div key={c.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 flex flex-col gap-3 ${
                  c.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-dashed border-slate-300 dark:border-slate-600 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{c.icon || '📦'}</span>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white text-sm">{c.category_name}</p>
                      {!c.is_active && <span className="text-[10px] text-slate-400 font-medium">Inactive</span>}
                    </div>
                  </div>
                  <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.color || '#8b5cf6', flexShrink: 0 }} />
                </div>
                {c.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{c.description}</p>
                )}
                <button onClick={() => setCatModal(c)}
                  className="mt-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 w-full justify-center">
                  <Pencil size={12} /> Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────── */}
      {expModal && (
        <ExpenseModal
          expense={expModal === 'new' ? null : expModal}
          categories={categories.filter(c => c.is_active)}
          onSave={handleSaveExpense}
          onClose={() => setExpModal(null)}
        />
      )}

      {catModal && (
        <CategoryModal
          category={catModal === 'new' ? null : catModal}
          onSave={handleSaveCategory}
          onClose={() => setCatModal(null)}
        />
      )}

      <ImportModal
        isOpen={showImport}
        onClose={() => { setShowImport(false); loadExpenses(); }}
        title="Import Expenses"
        templateFn={getExpenseImportTemplate}
        importFn={importExpenses}
        templateName="expenses_template.csv"
        description="Upload a CSV with columns: date, title, amount, category, payment_method, vendor, reference_number, notes"
      />

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white">Delete Expense</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              Delete <span className="font-semibold">"{deleteTarget.title}"</span> (PKR {fmt(deleteTarget.amount)})?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300">
                Cancel
              </button>
              <button onClick={handleDeleteExpense}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
