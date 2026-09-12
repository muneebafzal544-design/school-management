import { useEffect, useState, useCallback } from 'react';
import { DollarSign, Users, CheckCircle, Clock, Plus, Printer, Settings2, X, SlidersHorizontal, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout          from '../components/layout/Layout';
import { INPUT_CLS, SELECT_CLS } from '../components/ui/Input';
import { StatCard } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import {
  getSalaryPayments, generateMonthlySalaries, markSalaryPaid,
  getSalaryStructures, upsertSalaryStructure, bulkMarkSalaryPaid,
  getSalaryPolicy, updateSalaryPolicy, exportBankTransferCSV,
} from '../api/salary';
import { getTeachers } from '../api/teachers';

const TABS = ['Payroll', 'Salary Structures'];

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 });

/* ── Salary Structure Modal ── */
function StructureModal({ teacher, existing, onClose, onSaved }) {
  const init = {
    base_salary: '', house_allowance: '', medical_allowance: '',
    transport_allowance: '', other_allowance: '',
    income_tax: '', other_deduction: '', effective_from: '', notes: '',
    ...Object.fromEntries(Object.entries(existing || {}).map(([k, v]) => [k, v ?? ''])),
  };
  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const gross = [form.base_salary, form.house_allowance, form.medical_allowance,
    form.transport_allowance, form.other_allowance].reduce((s, v) => s + parseFloat(v || 0), 0);
  const deductions = [form.income_tax, form.other_deduction].reduce((s, v) => s + parseFloat(v || 0), 0);
  const net = gross - deductions;

  // FBR 2024-25 annual income tax slabs (monthly gross × 12)
  function calcFbrTax(monthlyGross) {
    const annual = monthlyGross * 12;
    let tax = 0;
    if      (annual <= 600_000)   tax = 0;
    else if (annual <= 1_200_000) tax = (annual - 600_000) * 0.05;
    else if (annual <= 2_200_000) tax = 30_000 + (annual - 1_200_000) * 0.15;
    else if (annual <= 3_200_000) tax = 180_000 + (annual - 2_200_000) * 0.25;
    else if (annual <= 4_100_000) tax = 430_000 + (annual - 3_200_000) * 0.30;
    else                          tax = 700_000 + (annual - 4_100_000) * 0.35;
    return Math.round(tax / 12);
  }

  const handleSave = async () => {
    if (!form.base_salary) return toast.error('Base salary required');
    setSaving(true);
    try {
      await upsertSalaryStructure({ ...form, teacher_id: teacher.id });
      toast.success('Salary structure saved');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const inp = INPUT_CLS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Salary Structure</h2>
            <p className="text-xs text-slate-400">{teacher.full_name} — {teacher.designation || 'Teacher'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[['base_salary','Base Salary *'],['house_allowance','House Allowance'],
            ['medical_allowance','Medical Allowance'],['transport_allowance','Transport Allowance'],
            ['other_allowance','Other Allowance'],['income_tax','Income Tax'],
            ['other_deduction','Other Deduction']].map(([k, lbl]) => (
            <div key={k}>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{lbl}</label>
              <input type="number" min="0" value={form[k]} onChange={e => set(k, e.target.value)}
                className={inp} placeholder="0" />
            </div>
          ))}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Effective From</label>
            <input type="date" value={form.effective_from} onChange={e => set('effective_from', e.target.value)} className={inp} />
          </div>
        </div>

        <div className="col-span-2 mb-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            className={`${inp} resize-none`} placeholder="Any notes…" />
        </div>

        {/* FBR auto-calc */}
        {gross > 0 && (
          <div className="col-span-2 flex items-center justify-between px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/40 mb-1">
            <div>
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">FBR 2024-25 estimated tax</p>
              <p className="text-[10px] text-indigo-400">Annual gross: Rs {(gross * 12).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Rs {calcFbrTax(gross).toLocaleString()}/mo</span>
              <button
                onClick={() => set('income_tax', String(calcFbrTax(gross)))}
                className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors">
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center mb-5">
          <div><p className="text-[10px] text-slate-400 uppercase font-bold">Gross</p><p className="text-sm font-bold text-slate-700 dark:text-slate-200">Rs {fmt(gross)}</p></div>
          <div><p className="text-[10px] text-slate-400 uppercase font-bold">Deductions</p><p className="text-sm font-bold text-red-500">Rs {fmt(deductions)}</p></div>
          <div><p className="text-[10px] text-slate-400 uppercase font-bold">Net Pay</p><p className="text-sm font-bold text-emerald-600">Rs {fmt(net)}</p></div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {saving ? 'Saving…' : 'Save Structure'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Mark Paid Modal ── */
function MarkPaidModal({ payment, onClose, onDone }) {
  const [form, setForm] = useState({ payment_date: new Date().toISOString().slice(0,10), payment_method: 'cash', remarks: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = INPUT_CLS;

  const handlePay = async () => {
    setSaving(true);
    try {
      await markSalaryPaid(payment.id, form);
      toast.success('Salary marked as paid');
      onDone();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Mark Salary Paid</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={16} /></button>
        </div>
        <p className="text-sm text-slate-500">{payment.teacher_name} — <strong>Rs {fmt(payment.net_salary)}</strong></p>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Date</label>
            <input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Method</label>
            <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={`${inp} appearance-none cursor-pointer`}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Remarks</label>
            <input value={form.remarks} onChange={e => set('remarks', e.target.value)} className={inp} placeholder="Optional…" />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handlePay} disabled={saving} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {saving ? 'Saving…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Bulk Mark Paid Modal ── */
function BulkPaidModal({ count, onClose, onConfirm }) {
  const [form, setForm] = useState({ payment_date: new Date().toISOString().slice(0,10), payment_method: 'cash' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = INPUT_CLS;

  const handleConfirm = async () => {
    setSaving(true);
    try { await onConfirm(form); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Bulk Mark Paid</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={16} /></button>
        </div>
        <p className="text-sm text-slate-500">Mark <strong>{count}</strong> selected salary payment{count !== 1 ? 's' : ''} as paid.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Date</label>
            <input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Method</label>
            <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={`${inp} appearance-none cursor-pointer`}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handleConfirm} disabled={saving} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {saving ? 'Processing…' : `Mark ${count} Paid`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Policy Modal ── */
function PolicyModal({ policy, onClose, onSaved }) {
  const [form, setForm] = useState({
    allowed_leaves_per_month: policy?.allowed_leaves_per_month ?? 2,
    late_arrivals_per_leave:  policy?.late_arrivals_per_leave  ?? 3,
    working_days_basis:       policy?.working_days_basis       ?? 26,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = INPUT_CLS;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSalaryPolicy(form);
      toast.success('Salary policy updated');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Payroll Policy</h2>
            <p className="text-xs text-slate-400 mt-0.5">Rules applied when generating monthly salaries</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={16} /></button>
        </div>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Free Absent Days / Month</label>
            <input type="number" min="0" max="30" value={form.allowed_leaves_per_month}
              onChange={e => set('allowed_leaves_per_month', +e.target.value)} className={inp} />
            <p className="text-[10px] text-slate-400 mt-1">Absent days below this threshold are not deducted.</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Late Arrivals Per Leave Day</label>
            <input type="number" min="1" max="30" value={form.late_arrivals_per_leave}
              onChange={e => set('late_arrivals_per_leave', +e.target.value)} className={inp} />
            <p className="text-[10px] text-slate-400 mt-1">Every N late arrivals deduct 1 day salary. Set to 0 to disable.</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Working Days Basis</label>
            <input type="number" min="1" max="31" value={form.working_days_basis}
              onChange={e => set('working_days_basis', +e.target.value)} className={inp} />
            <p className="text-[10px] text-slate-400 mt-1">Per-day rate = base salary ÷ this number.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {saving ? 'Saving…' : 'Save Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SalaryPage() {
  const [tab,        setTab]        = useState(0);
  const [payments,   setPayments]   = useState([]);
  const [structures, setStructures] = useState([]);
  const [teachers,   setTeachers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [month,      setMonth]      = useState(new Date().toISOString().slice(0, 7));
  const [statusFilt, setStatusFilt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [structModal,  setStructModal]  = useState(null); // { teacher, existing }
  const [paidModal,    setPaidModal]    = useState(null); // payment
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [bulkModal,    setBulkModal]    = useState(false);
  const [policy,       setPolicy]       = useState(null);
  const [policyModal,  setPolicyModal]  = useState(false);
  const [exporting,    setExporting]    = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getSalaryPayments({ month, status: statusFilt || undefined });
      setPayments(Array.isArray(r.data) ? r.data : []);
    } catch { toast.error('Failed to load salary data'); }
    finally { setLoading(false); }
  }, [month, statusFilt]);

  const fetchStructures = useCallback(async () => {
    try {
      const [sr, tr] = await Promise.all([getSalaryStructures(), getTeachers()]);
      setStructures(Array.isArray(sr.data) ? sr.data : []);
      setTeachers(Array.isArray(tr.data) ? tr.data : []);
    } catch { toast.error('Failed to load salary structures'); }
  }, []);

  const fetchPolicy = useCallback(async () => {
    try { const r = await getSalaryPolicy(); setPolicy(r.data || null); } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { fetchStructures(); }, [fetchStructures]);
  useEffect(() => { fetchPolicy(); }, [fetchPolicy]);

  const handleBankExport = async () => {
    setExporting(true);
    try {
      const r = await exportBankTransferCSV(month);
      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url;
      a.download = `bank_transfer_${month}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await toast.promise(
        generateMonthlySalaries(month),
        {
          loading: 'Generating monthly salaries…',
          success: (r) => r.data?.message || 'Salaries generated successfully',
          error:   (e) => e?.response?.data?.message || 'Generation failed',
        }
      );
      fetchPayments();
    } catch { }
    finally { setGenerating(false); }
  };

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const allPendingSelected = pendingPayments.length > 0 && pendingPayments.every(p => selectedIds.has(p.id));

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAllPending = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingPayments.map(p => p.id)));
    }
  };

  const handleBulkPaid = async (form) => {
    try {
      const r = await bulkMarkSalaryPaid({ ids: [...selectedIds], ...form });
      toast.success(r.data?.message || 'Salaries marked as paid');
      setSelectedIds(new Set());
      setBulkModal(false);
      fetchPayments();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Bulk payment failed');
    }
  };

  // Stats
  const total   = payments.length;
  const paid    = payments.filter(p => p.status === 'paid').length;
  const pending = total - paid;
  const totalNet = payments.reduce((s, p) => s + parseFloat(p.net_salary || 0), 0);
  const paidNet  = payments.filter(p => p.status === 'paid').reduce((s, p) => s + parseFloat(p.net_salary || 0), 0);

  const selCls = SELECT_CLS;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 pb-20"
          style={{ background: 'linear-gradient(135deg, #059669, #0d9488, #0891b2)' }}>
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <DollarSign size={13} className="text-white" />
                </div>
                <span className="text-white/60 text-xs font-semibold uppercase tracking-widest">SchoolMS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Salary & Payroll</h1>
              <p className="text-white/60 text-sm mt-1">Manage teacher salaries and pay slips</p>
            </div>
            <div className="flex gap-2 flex-wrap self-start sm:self-auto">
              <button onClick={() => setPolicyModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-semibold transition-all">
                <SlidersHorizontal size={14} /> Policy
              </button>
              <button onClick={handleBankExport} disabled={exporting}
                title="Download bank bulk-transfer CSV for pending salaries"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-semibold transition-all disabled:opacity-50">
                <Download size={14} /> {exporting ? 'Exporting…' : 'Bank CSV'}
              </button>
              <button onClick={handleGenerate} disabled={generating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-semibold transition-all disabled:opacity-50">
                <Plus size={14} /> {generating ? 'Generating…' : `Generate ${month}`}
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 -mt-10 pb-10 space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Slips"      value={total}                icon={Users}        gradientFrom="#059669" gradientTo="#0d9488" iconBg="bg-emerald-50 dark:bg-emerald-500/10"  textColor="text-emerald-600 dark:text-emerald-400" />
            <StatCard label="Paid"       value={paid}                 icon={CheckCircle}  gradientFrom="#10b981" gradientTo="#059669" iconBg="bg-emerald-50 dark:bg-emerald-500/10"  textColor="text-emerald-600 dark:text-emerald-400" />
            <StatCard label="Pending"    value={pending}              icon={Clock}        gradientFrom="#f59e0b" gradientTo="#d97706" iconBg="bg-amber-50 dark:bg-amber-500/10"      textColor="text-amber-600 dark:text-amber-400" />
            <StatCard label="Total Payroll" value={`Rs ${fmt(totalNet)}`} icon={DollarSign} gradientFrom="#0891b2" gradientTo="#6366f1" iconBg="bg-blue-50 dark:bg-blue-500/10" textColor="text-blue-600 dark:text-blue-400" />
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 pt-4 gap-2">
              {TABS.map((t, i) => (
                <button key={t} onClick={() => setTab(i)}
                  className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-all ${tab === i ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  {t}
                </button>
              ))}
            </div>

            {/* ── Payroll Tab ── */}
            {tab === 0 && (
              <>
                <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                  <input type="month" value={month} onChange={e => { setMonth(e.target.value); setSelectedIds(new Set()); }} className={selCls} />
                  <select value={statusFilt} onChange={e => { setStatusFilt(e.target.value); setSelectedIds(new Set()); }} className={selCls}>
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                  {selectedIds.size > 0 && (
                    <button onClick={() => setBulkModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm">
                      <CheckCircle size={12} /> Mark {selectedIds.size} Paid
                    </button>
                  )}
                  <span className="ml-auto text-xs text-slate-400 font-medium">Disbursed: <strong className="text-emerald-600">Rs {fmt(paidNet)}</strong> of Rs {fmt(totalNet)}</span>
                </div>

                {loading ? <PageLoader /> : payments.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-sm">
                    No salary data for {month}. Click <strong>Generate</strong> to create salary slips.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                          <th className="px-4 py-3 pl-5 w-8">
                            {pendingPayments.length > 0 && (
                              <input type="checkbox" checked={allPendingSelected} onChange={toggleAllPending}
                                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 cursor-pointer" />
                            )}
                          </th>
                          {['Teacher', 'Designation', 'Gross', 'Absent / Late', 'Deductions', 'Net Pay', 'Status', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.08em] whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {payments.map(p => (
                          <tr key={p.id} className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.has(p.id) ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : ''}`}>
                            <td className="px-4 py-3 pl-5 w-8">
                              {p.status === 'pending' && (
                                <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)}
                                  className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 cursor-pointer" />
                              )}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {p.teacher_name}
                              <div className="text-xs text-slate-400 font-normal">{p.subject || ''}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{p.qualification || '—'}</td>
                            <td className="px-4 py-3 font-semibold whitespace-nowrap">Rs {fmt(p.gross_salary)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-slate-600 dark:text-slate-400 text-xs">
                                {p.absent_days ?? 0}d
                                {(p.late_days ?? 0) > 0 && <span className="text-amber-500 ml-1">/ {p.late_days}L</span>}
                              </span>
                              {(p.attendance_deduction > 0 || p.late_deduction > 0) && (
                                <div className="text-[10px] text-red-400 mt-0.5">−Rs {fmt((+p.attendance_deduction || 0) + (+p.late_deduction || 0))}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-red-500 whitespace-nowrap">Rs {fmt(p.total_deductions)}</td>
                            <td className="px-4 py-3 font-bold text-emerald-600 whitespace-nowrap">Rs {fmt(p.net_salary)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40'}`}>
                                {p.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3 pr-5">
                              <div className="flex items-center gap-1">
                                <button title="Print Slip"
                                  onClick={() => window.open(`/salary/slip/${p.id}/print`, '_blank')}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all">
                                  <Printer size={13} />
                                </button>
                                {p.status === 'pending' && (
                                  <button title="Mark Paid" onClick={() => setPaidModal(p)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all">
                                    <CheckCircle size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ── Salary Structures Tab ── */}
            {tab === 1 && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Salary Structures</p>
                    <p className="text-xs text-slate-400 mt-0.5">Set base salary, allowances and deductions for each teacher. Click <strong>Set Up</strong> to define a structure.</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {structures.length} / {teachers.filter(t => t.status === 'active').length} configured
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                        {['Teacher', 'Base Salary', 'Allowances', 'Deductions', 'Net Pay', 'Action'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.08em] whitespace-nowrap first:pl-5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                      {teachers.filter(t => t.status === 'active').length === 0 ? (
                        <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">No active teachers found.</td></tr>
                      ) : teachers.filter(t => t.status === 'active').map(t => {
                        const ss = structures.find(s => s.teacher_id === t.id);
                        const allowances = ss ? (+ss.house_allowance + +ss.medical_allowance + +ss.transport_allowance + +ss.other_allowance) : 0;
                        const deductions = ss ? (+ss.income_tax + +ss.other_deduction) : 0;
                        const gross = ss ? (+ss.base_salary + allowances) : 0;
                        const net   = gross - deductions;
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 pl-5 whitespace-nowrap">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{t.full_name}</p>
                              <p className="text-xs text-slate-400">{t.subject || t.qualification || 'Teacher'}</p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {ss ? <span className="font-semibold text-slate-700 dark:text-slate-300">Rs {fmt(ss.base_salary)}</span>
                                   : <span className="text-xs text-amber-600 font-semibold bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/40">Not set</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">{ss ? `Rs ${fmt(allowances)}` : <span className="text-slate-300 dark:text-slate-700">—</span>}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-red-500">{ss ? `Rs ${fmt(deductions)}` : <span className="text-slate-300 dark:text-slate-700">—</span>}</td>
                            <td className="px-4 py-3 whitespace-nowrap font-bold text-emerald-600">{ss ? `Rs ${fmt(net)}` : <span className="text-slate-300 dark:text-slate-700">—</span>}</td>
                            <td className="px-4 py-3 pr-5">
                              <button
                                onClick={() => setStructModal({ teacher: t, existing: ss })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                  ss
                                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                                    : 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm'
                                }`}>
                                <Settings2 size={12} />
                                {ss ? 'Edit' : 'Set Up'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {structModal && (
        <StructureModal
          teacher={structModal.teacher}
          existing={structModal.existing}
          onClose={() => setStructModal(null)}
          onSaved={fetchStructures}
        />
      )}
      {paidModal && (
        <MarkPaidModal
          payment={paidModal}
          onClose={() => setPaidModal(null)}
          onDone={fetchPayments}
        />
      )}
      {bulkModal && (
        <BulkPaidModal
          count={selectedIds.size}
          onClose={() => setBulkModal(false)}
          onConfirm={handleBulkPaid}
        />
      )}
      {policyModal && (
        <PolicyModal
          policy={policy}
          onClose={() => setPolicyModal(false)}
          onSaved={fetchPolicy}
        />
      )}
    </Layout>
  );
}
