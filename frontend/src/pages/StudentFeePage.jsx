import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Banknote, TrendingDown, AlertCircle, ReceiptText,
  Plus, ChevronDown, ChevronRight, Printer, RefreshCw, Loader2,
  Tag, CreditCard, Calendar, User, School, Phone,
  CheckCircle2, Clock, XCircle, Trash2, X, Zap,
  BadgePercent, Layers, BookOpen, CalendarDays, Hash,
  ClipboardList, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import {
  getStudentFeeAccount,
  generateMonthlyFees, generateAdmissionInvoice,
  recordPayment,
  getConcessions, saveConcession, deleteConcession,
  getFeeHeads,
} from '../api/fees';

// ── Helpers ───────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const currentMonth = () => new Date().toISOString().slice(0, 7);

const STATUS_CFG = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  partial: { label: 'Partial', cls: 'bg-amber-100  text-amber-700  border-amber-200',   dot: 'bg-amber-500'   },
  unpaid:  { label: 'Unpaid',  cls: 'bg-red-100    text-red-700    border-red-200',     dot: 'bg-red-500'     },
  overdue: { label: 'Overdue', cls: 'bg-purple-100 text-purple-700 border-purple-200',  dot: 'bg-purple-500'  },
  waived:  { label: 'Waived',  cls: 'bg-sky-100    text-sky-700    border-sky-200',     dot: 'bg-sky-500'     },
};
const TYPE_CFG = {
  monthly:   { label: 'Monthly',   cls: 'bg-green-50  text-green-700  border-green-200'  },
  admission: { label: 'Admission', cls: 'bg-blue-50   text-blue-700   border-blue-200'   },
  one_time:  { label: 'One-Time',  cls: 'bg-violet-50 text-violet-700 border-violet-200' },
};

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.unpaid;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const c = TYPE_CFG[type] || TYPE_CFG.monthly;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, highlight }) {
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${highlight ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className={`text-xl font-bold ${highlight ? 'text-red-600' : 'text-slate-800'}`}>
          Rs {fmt(value)}
        </p>
        {sub != null && (
          <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ── Invoice Accordion Card ────────────────────────────────
function InvoiceCard({ inv, onPayment, onPrint }) {
  const [open, setOpen] = useState(false);
  const net     = parseFloat(inv.net_amount || 0);
  const paid    = parseFloat(inv.paid_amount || 0);
  const balance = parseFloat(inv.balance || 0);
  const pct     = net > 0 ? Math.min(100, (paid / net) * 100) : 0;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 items-center">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs text-slate-500 shrink-0">{inv.invoice_no || `#${inv.id}`}</span>
            <TypeBadge type={inv.invoice_type} />
            {inv.billing_month && (
              <span className="text-xs text-slate-600 font-medium">
                {new Date(inv.billing_month + '-01').toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <StatusBadge status={inv.status} />

          {/* Progress bar */}
          <div className="col-span-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-400' : 'bg-slate-300'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 ml-2">
          <p className="text-base font-bold text-slate-800">Rs {fmt(net)}</p>
          {balance > 0 && (
            <p className="text-xs text-red-500 font-medium">Due: Rs {fmt(balance)}</p>
          )}
        </div>

        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 pb-4 pt-3 space-y-4">
          {/* Meta row */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            {inv.due_date && (
              <span className="flex items-center gap-1">
                <Calendar size={12} /> Due: {fmtDate(inv.due_date)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Layers size={12} /> Billed: Rs {fmt(inv.total_amount)}
            </span>
            {parseFloat(inv.discount_amount) > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <BadgePercent size={12} /> Discount: Rs {fmt(inv.discount_amount)}
              </span>
            )}
            {parseFloat(inv.fine_amount) > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle size={12} /> Fine: Rs {fmt(inv.fine_amount)}
              </span>
            )}
          </div>

          {/* Line items */}
          {inv.items && inv.items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Fee Heads</p>
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                {inv.items.map((item, i) => (
                  <div key={item.id} className={`flex justify-between px-3 py-2 text-sm ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                    <span className="text-slate-700">{item.description || item.fee_head_name}</span>
                    <span className="font-medium text-slate-800">Rs {fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment history */}
          {inv.payments && inv.payments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Payments Received</p>
              <div className="rounded-lg border border-emerald-200 overflow-hidden bg-white">
                {inv.payments.map((p, i) => (
                  <div key={p.id} className={`flex items-center justify-between px-3 py-2 text-sm ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span className="text-slate-700">{fmtDate(p.payment_date)}</span>
                      <span className="text-xs text-slate-400 capitalize">{p.payment_method || 'cash'}</span>
                      {p.receipt_no && (
                        <span className="font-mono text-xs text-slate-400">{p.receipt_no}</span>
                      )}
                    </div>
                    <span className="font-semibold text-emerald-600">+ Rs {fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {balance > 0 && (
              <button
                onClick={() => onPayment(inv)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                <CreditCard size={13} /> Record Payment
              </button>
            )}
            <Link
              to={`/fees/invoice/${inv.id}/print`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-100 transition-colors"
            >
              <Printer size={13} /> Print Invoice
            </Link>
            <Link
              to={`/fees/invoice/${inv.id}/challan`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-100 transition-colors"
            >
              <BookOpen size={13} /> Challan
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Record Payment Modal ──────────────────────────────────
function PaymentModal({ invoice, studentId, onClose, onDone }) {
  const [form, setForm] = useState({
    amount: String(parseFloat(invoice?.balance || 0).toFixed(0)),
    payment_method: 'cash',
    payment_date: new Date().toISOString().slice(0, 10),
    remarks: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Enter a valid amount');
    setSaving(true);
    try {
      await recordPayment({
        invoice_id: invoice.id,
        student_id: studentId,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        remarks: form.remarks || null,
      });
      toast.success('Payment recorded');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Record Payment</h2>
            <p className="text-xs text-slate-500">{invoice.invoice_no} — Balance: Rs {fmt(invoice.balance)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (Rs) *</label>
              <input
                type="number" min="1" step="1" required
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Method</label>
              <select
                value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {['cash','bank','online','cheque','dd'].map(m => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Date</label>
            <input
              type="date" value={form.payment_date}
              onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks (optional)</label>
            <input
              type="text" value={form.remarks}
              onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              placeholder="e.g. Cash collected by admin"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Generate Monthly Modal ────────────────────────────────
function GenMonthlyModal({ studentId, studentName, onClose, onDone }) {
  const [form, setForm] = useState({
    billing_month: currentMonth(),
    due_date: '',
    academic_year: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await generateMonthlyFees({
        student_id: studentId,
        billing_month: form.billing_month,
        due_date: form.due_date || null,
        academic_year: form.academic_year || undefined,
      });
      const d = res.data;
      if (d.created > 0) {
        toast.success(`Monthly invoice generated for ${studentName}`);
        onDone();
      } else {
        toast(d.message || 'Invoice already exists or no fee structure found', { icon: 'ℹ️' });
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Generate Monthly Invoice</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Billing Month *</label>
            <input
              type="month" required value={form.billing_month}
              onChange={e => setForm(f => ({ ...f, billing_month: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date (optional)</label>
            <input
              type="date" value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {saving ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Concessions Tab ───────────────────────────────────────
function ConcessionsTab({ studentId, concessions, feeHeads, onRefresh }) {
  const [showForm, setShowForm]  = useState(false);
  const [deleting, setDeleting]  = useState(null);
  const [form, setForm] = useState({
    discount_type: 'fixed',
    discount_value: '',
    fee_head_id: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.discount_value) return toast.error('Enter a discount value');
    setSaving(true);
    try {
      await saveConcession({
        student_id: studentId,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        fee_head_id: form.fee_head_id || null,
        reason: form.reason || null,
      });
      toast.success('Concession saved');
      setForm({ discount_type: 'fixed', discount_value: '', fee_head_id: '', reason: '' });
      setShowForm(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save concession');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteConcession(id);
      toast.success('Concession removed');
      onRefresh();
    } catch (err) {
      toast.error('Failed to remove concession');
    } finally { setDeleting(null); }
  };

  const monthlyHeads = feeHeads.filter(h => h.category === 'monthly' && h.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Concessions are auto-applied when generating monthly invoices.
        </p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
        >
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? 'Cancel' : 'Add Concession'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">New Concession</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
              <select
                value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fixed">Fixed Amount (Rs)</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {form.discount_type === 'fixed' ? 'Amount (Rs) *' : 'Percentage (%) *'}
              </label>
              <input
                type="number" min="0.01" step="0.01" required
                value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                placeholder={form.discount_type === 'fixed' ? 'e.g. 500' : 'e.g. 25'}
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Applied On (optional — leave blank for all heads)</label>
            <select
              value={form.fee_head_id}
              onChange={e => setForm(f => ({ ...f, fee_head_id: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Monthly Heads</option>
              {monthlyHeads.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Reason (optional)</label>
            <input
              type="text" value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="e.g. Sibling discount, Merit scholarship"
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit" disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            {saving ? 'Saving…' : 'Save Concession'}
          </button>
        </form>
      )}

      {/* Concession list */}
      {concessions.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <BadgePercent size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No concessions yet</p>
          <p className="text-xs mt-1">Add a concession to automatically apply discounts on monthly invoices.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {concessions.map(c => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.is_active ? 'bg-green-100' : 'bg-slate-100'}`}>
                  <BadgePercent size={16} className={c.is_active ? 'text-green-600' : 'text-slate-400'} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">
                      {c.discount_type === 'fixed'
                        ? `Rs ${fmt(c.discount_value)} off`
                        : `${c.discount_value}% off`}
                    </span>
                    {c.fee_head_name ? (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">on {c.fee_head_name}</span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">all heads</span>
                    )}
                    {!c.is_active && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                  {c.reason && <p className="text-xs text-slate-500 mt-0.5 truncate">{c.reason}</p>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                disabled={deleting === c.id}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
              >
                {deleting === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Main Page
// ══════════════════════════════════════════════════════════
export default function StudentFeePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading]       = useState(true);
  const [data, setData]             = useState(null);   // { student, invoices, payments, totals, concessions }
  const [feeHeads, setFeeHeads]     = useState([]);
  const [tab, setTab]               = useState('invoices');

  // Filters
  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals
  const [payModal, setPayModal]             = useState(null);  // invoice object
  const [genMonthly, setGenMonthly]         = useState(false);
  const [genAdmission, setGenAdmission]     = useState(false);
  const [genAdmSaving, setGenAdmSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, headsRes] = await Promise.all([
        getStudentFeeAccount(id),
        getFeeHeads({ is_active: true }),
      ]);
      setData(accRes.data);
      setFeeHeads(headsRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load student fee account');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleGenAdmission = async () => {
    setGenAdmSaving(true);
    try {
      const res = await generateAdmissionInvoice(id, {});
      if (res.data?.success) {
        toast.success('Admission invoice generated');
        load();
      } else {
        toast(res.data?.message || 'Already exists', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate admission invoice');
    } finally { setGenAdmSaving(false); }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      </Layout>
    );
  }

  if (!data?.student) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
          <div className="text-center">
            <User size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Student not found</p>
            <button onClick={() => navigate('/fees')} className="mt-3 text-blue-600 text-sm hover:underline">
              ← Back to Fees
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const { student, invoices, totals, concessions } = data;

  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const filteredInvoices = invoices.filter(inv => {
    if (filterType !== 'all'   && inv.invoice_type !== filterType) return false;
    if (filterStatus !== 'all' && inv.status       !== filterStatus) return false;
    return true;
  });

  const initials = (student.full_name || 'S')
    .split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();

  return (
    <Layout>
      {/* ── Back nav ───────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => navigate('/fees')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Fees
        </button>
      </div>

      <div className="px-4 pb-8 max-w-4xl mx-auto space-y-5">

        {/* ── Student Header Card ─────────────────────── */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200">
          {/* Gradient banner */}
          <div className="h-20 bg-linear-to-r from-blue-600 via-blue-500 to-indigo-600" />
          <div className="bg-white px-5 pb-5">
            {/* Avatar + name row */}
            <div className="flex items-end justify-between -mt-10 mb-4 gap-4">
              <div className="flex items-end gap-4">
                <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl font-bold text-white border-4 border-white shadow-lg">
                  {initials}
                </div>
                <div className="pb-1">
                  <h1 className="text-xl font-bold text-slate-900">{student.full_name}</h1>
                  <div className="flex items-center gap-3 flex-wrap mt-0.5">
                    {student.class_name && (
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <School size={13} /> {student.class_name}
                      </span>
                    )}
                    {student.roll_number && (
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <Hash size={13} /> Roll {student.roll_number}
                      </span>
                    )}
                    {student.admission_number && (
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <ClipboardList size={13} /> {student.admission_number}
                      </span>
                    )}
                    {(student.phone || student.guardian_phone) && (
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <Phone size={13} /> {student.phone || student.guardian_phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pb-1 flex-wrap justify-end">
                <Link
                  to={`/fees/monthly-slip/${id}`}
                  target="_blank"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  <Printer size={13} /> Annual Slip
                </Link>
                <button
                  onClick={load}
                  className="p-1.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard icon={ReceiptText}  label="Total Billed"  value={totals.billed}    color="bg-blue-500"    />
              <KpiCard icon={CheckCircle2} label="Total Paid"    value={totals.collected} color="bg-emerald-500" />
              <KpiCard icon={TrendingDown} label="Outstanding"   value={totals.balance}   color="bg-red-500"     highlight={totals.balance > 0} />
              <KpiCard
                icon={AlertCircle}
                label="Overdue"
                value={null}
                color="bg-amber-500"
                sub={`${overdueCount} invoice${overdueCount !== 1 ? 's' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* ── Quick Actions Bar ───────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setGenMonthly(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
          >
            <CalendarDays size={15} /> Generate Monthly Invoice
          </button>
          <button
            onClick={handleGenAdmission}
            disabled={genAdmSaving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {genAdmSaving ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={15} />}
            Generate Admission Invoice
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100">
            {[
              { id: 'invoices',    label: 'Invoices & Payments', icon: Receipt },
              { id: 'concessions', label: 'Concessions',          icon: BadgePercent },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <t.icon size={15} />
                {t.label}
                {t.id === 'invoices' && invoices.length > 0 && (
                  <span className="ml-1 bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">
                    {invoices.length}
                  </span>
                )}
                {t.id === 'concessions' && concessions.length > 0 && (
                  <span className="ml-1 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                    {concessions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* ── Invoices Tab ───────────────────────── */}
            {tab === 'invoices' && (
              <div className="space-y-4">
                {/* Filters */}
                {invoices.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                      <Tag size={12} className="text-slate-400" />
                      <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="text-xs text-slate-600 bg-transparent focus:outline-none"
                      >
                        <option value="all">All Types</option>
                        <option value="monthly">Monthly</option>
                        <option value="admission">Admission</option>
                        <option value="one_time">One-Time</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                      <Clock size={12} className="text-slate-400" />
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="text-xs text-slate-600 bg-transparent focus:outline-none"
                      >
                        <option value="all">All Statuses</option>
                        {Object.entries(STATUS_CFG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Invoice list */}
                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <Banknote size={44} className="mx-auto mb-3 opacity-25" />
                    {invoices.length === 0 ? (
                      <>
                        <p className="text-sm font-semibold text-slate-600">No invoices yet</p>
                        <p className="text-xs mt-1 max-w-xs mx-auto">
                          Use the buttons above to generate a monthly or admission invoice for this student.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm">No invoices match the selected filters</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInvoices.map(inv => (
                      <InvoiceCard
                        key={inv.id}
                        inv={inv}
                        onPayment={setPayModal}
                        onPrint={() => {}}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Concessions Tab ────────────────────── */}
            {tab === 'concessions' && (
              <ConcessionsTab
                studentId={id}
                concessions={concessions}
                feeHeads={feeHeads}
                onRefresh={load}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────── */}
      {payModal && (
        <PaymentModal
          invoice={payModal}
          studentId={id}
          onClose={() => setPayModal(null)}
          onDone={() => { setPayModal(null); load(); }}
        />
      )}

      {genMonthly && (
        <GenMonthlyModal
          studentId={id}
          studentName={student.full_name}
          onClose={() => setGenMonthly(false)}
          onDone={() => { setGenMonthly(false); load(); }}
        />
      )}
    </Layout>
  );
}
