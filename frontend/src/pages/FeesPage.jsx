import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Banknote, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  Clock3, ChevronDown, Search, Plus, Pencil, Trash2, Save, X,
  Download, RefreshCw, Eye, CreditCard, Layers, ReceiptText,
  Settings2, BarChart3, CalendarDays, Users, Printer, FileText,
  Tag, Zap, MessageSquare, Copy, Check, Send, Mail, Loader2, UserCircle, Users2,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadBlob } from '../utils';
import Layout          from '../components/layout/Layout';
import { INPUT_CLS }  from '../components/ui/Input';
import EmptyState     from '../components/ui/EmptyState';
import { getStudents } from '../api/students';
import {
  getFeeHeads, createFeeHead, updateFeeHead, deleteFeeHead,
  getFeeStructures, upsertFeeStructure, deleteFeeStructure,
  getInvoices, getInvoice, createInvoice, generateMonthlyFees, generateAdmissionInvoice,
  updateInvoice, cancelInvoice, recordPayment, bulkRecordPayments, getMonthlySummary,
  getOutstandingBalances, getDashboardStats, getExportURL,
  getConcessions, saveConcession, deleteConcession, applyScholarshipTier, applyLateFees,
  sendFeeReminders, getSiblingGroups, getSiblingVoucher,
  getClassFeeCollection,
  getInstallments, createInstallmentPlan, deleteInstallmentPlan, payInstallment,
  bulkClassConcession,
} from '../api/fees';
import { initiatePayment, getPaymentStatus } from '../api/onlinePayments';
import { useClasses, useSettings } from '../hooks/useReferenceData';
import {
  getLateRules, createLateRule, updateLateRule, deleteLateRule, runLateFeeEngine,
  getFeePolicy, upsertFeePolicy,
  getAdjustments, createAdjustment, approveAdjustment, rejectAdjustment,
  getDefaultersList, getDefaulterActions, addDefaulterAction,
} from '../api/feeAdvanced';
import FeeAnalyticsPage from './FeeAnalyticsPage';
import { useDebounce } from '../hooks/useDebounce';

const PKR = (n) =>
  'PKR ' + Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ── Constants ─────────────────────────────────────────────────
const STATUS_CONFIG = {
  paid:      { label: 'Paid',     color: '#16a34a', bg: '#f0fdf4', border: '#86efac', dot: 'bg-emerald-500' },
  partial:   { label: 'Partial',  color: '#d97706', bg: '#fffbeb', border: '#fcd34d', dot: 'bg-amber-500'   },
  unpaid:    { label: 'Unpaid',   color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', dot: 'bg-red-500'     },
  overdue:   { label: 'Overdue',  color: '#7c3aed', bg: '#faf5ff', border: '#d8b4fe', dot: 'bg-purple-500'  },
  cancelled: { label: 'Cancelled',color: '#64748b', bg: '#f8fafc', border: '#cbd5e1', dot: 'bg-slate-400'   },
  waived:    { label: 'Waived',   color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', dot: 'bg-sky-500'     },
};
const METHODS = ['cash','bank','online','cheque','dd'];
const CATEGORIES = { admission: 'Admission', monthly: 'Monthly', one_time: 'One-Time' };
const CAT_COLORS  = {
  admission: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  monthly:   { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  one_time:  { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
};
const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const currentMonth = () => new Date().toISOString().slice(0, 7);
const currentAcademicYear = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-12
  // Academic year starts in April (adjust if school uses different start month)
  const startYear = m >= 4 ? y : y - 1;
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}` // e.g. "25-26"
    .replace(/^(\d{2})-(\d{2})$/, (_, a, b) => `20${a}-${b}`); // "2025-26"
};
const ACADEMIC_YEARS = (() => {
  const base = new Date().getFullYear();
  return [base - 2, base - 1, base, base + 1].map(y => `${y}-${String(y + 1).slice(-2)}`);
})();

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.unpaid;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={{ background: c.bg, color: c.color, borderColor: c.border }}>
      <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function Sel({ label, value, onChange, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>}
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-emerald-400">
          {children}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-emerald-400" />
    </div>
  );
}

// ── Payment Modal ──────────────────────────────────────────────
function PaymentModal({ invoice, onClose, onPaid }) {
  // net_amount from the API already equals total_amount + fine_amount - discount_amount
  const net     = parseFloat(invoice.net_amount ?? invoice.total_amount);
  const balance = net - parseFloat(invoice.paid_amount || 0);

  const [form, setForm] = useState({
    amount: balance.toFixed(0),
    payment_method: 'cash',
    payment_date: new Date().toISOString().slice(0, 10),
    bank_name: '', transaction_ref: '', remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePay = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      const res = await recordPayment({ invoice_id: invoice.id, ...form });
      const msg = res.data?.message || 'Payment recorded';
      toast.success(msg);
      onPaid();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
              <CreditCard size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Record Payment</h2>
              <p className="text-xs text-slate-400">{invoice.invoice_no} · {invoice.student_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
        </div>

        {/* Balance info */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-4 text-center">
          {[['Total', fmt(net)], ['Paid', fmt(invoice.paid_amount)], ['Balance', fmt(balance)]].map(([l, v]) => (
            <div key={l}>
              <div className="text-xs text-slate-400">{l}</div>
              <div className={`text-sm font-bold ${l === 'Balance' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                Rs. {v}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handlePay} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (Rs.)" type="number" value={form.amount} onChange={v => set('amount', v)} placeholder={balance.toFixed(0)} />
            <Input label="Date" type="date" value={form.payment_date} onChange={v => set('payment_date', v)} />
          </div>
          <Sel label="Payment Method" value={form.payment_method} onChange={v => set('payment_method', v)}>
            {METHODS.map(m => <option key={m} value={m} className="capitalize">{m.toUpperCase()}</option>)}
          </Sel>
          {['bank','cheque','dd'].includes(form.payment_method) && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Bank Name" value={form.bank_name} onChange={v => set('bank_name', v)} placeholder="Bank name" />
              <Input label="Transaction / Cheque Ref" value={form.transaction_ref} onChange={v => set('transaction_ref', v)} placeholder="Ref no." />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Remarks (optional)</label>
            <textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} placeholder="Any notes…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
              style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              Pay Rs. {fmt(form.amount)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── WhatsApp message builder ───────────────────────────────────
function buildWhatsAppText(inv, settings) {
  const s = settings || {};
  const schoolName  = s.school_name  || 'School Management System';
  const schoolPhone = s.school_phone || '';
  const bankName    = s.bank_name    || '';
  const bankTitle   = s.bank_account_title || '';
  const bankAccNo   = s.bank_account_no    || '';
  const bankIban    = s.bank_iban          || '';
  const bankBranch  = s.bank_branch        || '';

  const net     = parseFloat(inv.total_amount || 0) + parseFloat(inv.fine_amount || 0) - parseFloat(inv.discount_amount || 0);
  const balance = net - parseFloat(inv.paid_amount || 0);
  const fmtAmt  = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const lines = [
    `Assalam-o-Alaikum! 🌙`,
    ``,
    `Dear Parent/Guardian of *${inv.student_name || ''}*,`,
    ``,
    `📢 *Fee Reminder — ${schoolName}*`,
    ``,
    `🎓 *Student:* ${inv.student_name || '—'}`,
    `🏫 *Class:* ${inv.class_name || '—'}`,
    inv.roll_number ? `🔢 *Roll No:* ${inv.roll_number}` : null,
    `📋 *Invoice No:* ${inv.invoice_no || '—'}`,
    inv.billing_month ? `📅 *Month:* ${inv.billing_month}` : null,
    inv.due_date ? `📆 *Due Date:* ${fmtDate(inv.due_date)}` : null,
    ``,
    `💰 *Total Fee:* ${fmtAmt(net)}`,
    parseFloat(inv.paid_amount) > 0 ? `✅ *Paid:* ${fmtAmt(inv.paid_amount)}` : null,
    `⚠️ *Balance Due: ${fmtAmt(balance)}*`,
    ``,
  ];

  if (bankName) {
    lines.push(`🏦 *Bank Payment Details:*`);
    lines.push(`Bank: ${bankName}`);
    if (bankTitle)  lines.push(`Account Title: ${bankTitle}`);
    if (bankAccNo)  lines.push(`Account No: ${bankAccNo}`);
    if (bankIban)   lines.push(`IBAN: ${bankIban}`);
    if (bankBranch) lines.push(`Branch: ${bankBranch}`);
    lines.push(``);
  }

  if (inv.due_date) lines.push(`Kindly pay before *${fmtDate(inv.due_date)}* to avoid late fine.`);
  else lines.push(`Kindly pay the outstanding balance at your earliest convenience.`);
  lines.push(``);
  lines.push(`Regards,`);
  lines.push(`*${schoolName}*`);
  if (schoolPhone) lines.push(`📞 ${schoolPhone}`);

  return lines.filter(l => l !== null).join('\n');
}

// ── WhatsApp Reminder Modal (single + bulk) ────────────────────
function WhatsAppReminderModal({ inv, onClose }) {
  const { data: settings, isLoading: loading } = useSettings();
  const [copiedId,     setCopiedId]     = useState(null);
  const [bulkIdx,      setBulkIdx]      = useState(0);

  const isBulk = inv?._bulk === true;
  const list   = isBulk ? (inv._list || []) : [inv];
  const current = list[bulkIdx] || list[0];

  const getMessage = (item) => settings ? buildWhatsAppText(item, settings) : '';

  const handleCopy = async (item) => {
    try {
      await navigator.clipboard.writeText(getMessage(item));
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Message copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleOpenWhatsApp = (item) => {
    const phone = item.father_phone || item.student_phone || '';
    const clean = phone.replace(/\D/g, '');
    const intl  = clean.startsWith('0') ? '92' + clean.slice(1) : clean.startsWith('92') ? clean : '92' + clean;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(getMessage(item))}`, '_blank');
  };

  const balance = (item) => parseFloat(item.total_amount || 0) + parseFloat(item.fine_amount || 0)
    - parseFloat(item.discount_amount || 0) - parseFloat(item.paid_amount || 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full border border-slate-200 dark:border-slate-700 flex flex-col max-h-[92vh]"
        style={{ maxWidth: isBulk ? '860px' : '520px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
              <MessageSquare size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {isBulk ? `WhatsApp Reminders — ${list.length} Outstanding` : 'WhatsApp Fee Reminder'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBulk ? 'Copy each message and send to parent\'s WhatsApp' : `${current.student_name} · ${current.invoice_no}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {isBulk ? (
          /* ── BULK VIEW ── */
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : list.map((item) => {
              const phone   = item.father_phone || item.student_phone || '';
              const bal     = balance(item);
              const isCopied = copiedId === item.id;
              return (
                <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {/* Student header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.student_name}</span>
                      <span className="ml-2 text-xs text-slate-400">{item.class_name || '—'} · {item.invoice_no}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Balance</p>
                        <p className="text-sm font-black text-red-600">Rs. {Number(bal).toLocaleString('en-PK', { minimumFractionDigits: 0 })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Phone</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{phone || '—'}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleCopy(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all"
                          style={isCopied
                            ? { borderColor: '#16a34a', color: '#16a34a', background: '#f0fdf4' }
                            : { borderColor: '#6366f1', color: '#6366f1', background: 'white' }}
                        >
                          {isCopied ? <Check size={11} /> : <Copy size={11} />}
                          {isCopied ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          onClick={() => handleOpenWhatsApp(item)}
                          disabled={!phone}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-40 transition-all"
                          style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}
                        >
                          <Send size={11} /> {phone ? 'Send' : 'No Phone'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Message preview (compact) */}
                  <textarea
                    readOnly
                    value={getMessage(item)}
                    rows={5}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-[10px] font-mono leading-relaxed resize-none focus:outline-none border-t border-slate-100 dark:border-slate-800"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          /* ── SINGLE VIEW ── */
          <>
            {/* Info strip */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Balance Due</p>
                  <p className="text-lg font-black text-red-600">Rs. {Number(balance(current)).toLocaleString('en-PK', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Parent Phone</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {current.father_phone || current.student_phone || 'No phone on record'}
                  </p>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Message Preview</p>
                  <textarea
                    readOnly
                    value={getMessage(current)}
                    rows={18}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-mono leading-relaxed resize-none focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    * denotes bold text in WhatsApp. You can edit the message after copying.
                  </p>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-2">
              <button
                onClick={() => handleCopy(current)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all disabled:opacity-50"
                style={copiedId === current.id
                  ? { borderColor: '#16a34a', color: '#16a34a', background: '#f0fdf4' }
                  : { borderColor: '#6366f1', color: '#6366f1', background: 'white' }}
              >
                {copiedId === current.id ? <Check size={15} /> : <Copy size={15} />}
                {copiedId === current.id ? 'Copied!' : 'Copy Message'}
              </button>
              <button
                onClick={() => handleOpenWhatsApp(current)}
                disabled={loading || !(current.father_phone || current.student_phone)}
                title={!(current.father_phone || current.student_phone) ? 'No phone number on record' : ''}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}
              >
                <Send size={15} />
                {(current.father_phone || current.student_phone) ? 'Open WhatsApp' : 'No Phone Number'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Online Pay Modal ───────────────────────────────────────────
const GATEWAYS = [
  { id: 'jazzcash',  label: 'JazzCash',  color: '#e01f3d', logo: '📱' },
  { id: 'easypaisa', label: 'EasyPaisa', color: '#3cb043', logo: '💚' },
];
const STATUS_POLL_LABELS = {
  pending:   { text: 'Waiting for OTP confirmation…',  cls: 'text-amber-600' },
  completed: { text: 'Payment successful!',             cls: 'text-green-600'  },
  failed:    { text: 'Payment failed. Please retry.',   cls: 'text-red-600'    },
  expired:   { text: 'Request expired.',                cls: 'text-slate-500'  },
};

function OnlinePayModal({ invoice, onClose, onPaid }) {
  const balance = parseFloat(invoice.net_amount ?? invoice.total_amount) - parseFloat(invoice.paid_amount || 0);
  const [gateway, setGateway] = useState('jazzcash');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'polling'
  const [txnRef, setTxnRef] = useState(null);
  const [pollStatus, setPollStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  const clearPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  useEffect(() => () => clearPoll(), []);

  const startPoll = (ref) => {
    setTxnRef(ref);
    setStep('polling');
    setPollStatus('pending');
    pollRef.current = setInterval(async () => {
      try {
        const r = await getPaymentStatus(ref);
        const st = r.data?.data?.status;
        setPollStatus(st);
        if (st === 'completed' || st === 'failed' || st === 'expired') {
          clearPoll();
          if (st === 'completed') { toast.success('Payment confirmed!'); setTimeout(onPaid, 800); }
        }
      } catch { /* silent */ }
    }, 5000);
  };

  const handleInitiate = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) return toast.error('Enter a valid 10-11 digit mobile number');
    setBusy(true);
    try {
      const r = await initiatePayment({ invoice_id: invoice.id, gateway, phone: cleaned });
      const d = r.data?.data;
      toast.success(d?.message || 'OTP sent');
      startPoll(d.txn_ref);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Payment initiation failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Smartphone size={17} className="text-violet-500" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Pay Online</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><X size={17} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">{invoice.invoice_no} · {invoice.student_name}</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">Rs. {fmt(balance)}</span>
          </div>

          {step === 'form' && (
            <>
              {/* Gateway selector */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Payment Gateway</label>
                <div className="grid grid-cols-2 gap-2">
                  {GATEWAYS.map(g => (
                    <button key={g.id} onClick={() => setGateway(g.id)}
                      className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all
                        ${gateway === g.id ? 'border-2 shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}
                      style={gateway === g.id ? { borderColor: g.color, color: g.color, background: g.color + '12' } : {}}>
                      <span>{g.logo}</span> {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Parent's {gateway === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} Number
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="03XX XXXXXXX"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm px-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400" />
                <p className="text-xs text-slate-400 mt-1">An OTP will be sent to this number for confirmation.</p>
              </div>

              <button onClick={handleInitiate} disabled={busy}
                className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                style={{ background: GATEWAYS.find(g => g.id === gateway)?.color || '#6366f1' }}>
                {busy ? <><Loader2 size={16} className="animate-spin" /> Initiating…</> : <><Smartphone size={16} /> Send OTP & Pay</>}
              </button>
            </>
          )}

          {step === 'polling' && (
            <div className="text-center py-6 space-y-4">
              {pollStatus === 'pending' && (
                <div className="w-12 h-12 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto" />
              )}
              {pollStatus === 'completed' && <CheckCircle2 size={48} className="text-green-500 mx-auto" />}
              {(pollStatus === 'failed' || pollStatus === 'expired') && <XCircle size={48} className="text-red-500 mx-auto" />}

              <p className={`text-sm font-medium ${STATUS_POLL_LABELS[pollStatus]?.cls || 'text-slate-600'}`}>
                {STATUS_POLL_LABELS[pollStatus]?.text}
              </p>

              {pollStatus === 'pending' && (
                <p className="text-xs text-slate-400">Ask the parent to approve the payment on their mobile. Checking every 5 seconds…</p>
              )}

              {txnRef && (
                <p className="text-xs text-slate-400 font-mono bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">Ref: {txnRef}</p>
              )}

              {(pollStatus === 'failed' || pollStatus === 'expired') && (
                <button onClick={() => { setStep('form'); setPollStatus(null); setTxnRef(null); }}
                  className="text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-300 transition-colors">
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Invoice Detail Modal ───────────────────────────────────────
function InvoiceDetailModal({ invoiceId, onClose, onPayClick, onWhatsApp, onOnlinePayClick }) {
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvoice(invoiceId).then(r => setInv(r.data?.data ?? r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [invoiceId]);

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /></div>
  );
  if (!inv) return null;

  const net     = parseFloat(inv.total_amount) + parseFloat(inv.fine_amount || 0) - parseFloat(inv.discount_amount || 0);
  const balance = net - parseFloat(inv.paid_amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{inv.invoice_no}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{inv.student_name} · {inv.class_name || '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={inv.status} />
            <button
              onClick={() => window.open(`/fees/invoice/${inv.id}/print`, '_blank')}
              title="Print Invoice"
              className="p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 transition-colors">
              <Printer size={15} />
            </button>
            <button
              onClick={() => window.open(`/fees/invoice/${inv.id}/challan`, '_blank')}
              title="Print Fee Challan (Bank Copy)"
              className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-600 transition-colors">
              <FileText size={15} />
            </button>
            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
              <button
                onClick={() => onWhatsApp && onWhatsApp(inv)}
                title="Send WhatsApp Reminder"
                className="p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                style={{ '--tw-bg-opacity': 1 }}
                onMouseEnter={e => e.currentTarget.style.background = '#25d366'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <MessageSquare size={15} />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Amounts */}
          <div className="grid grid-cols-4 gap-3">
            {[
              ['Total', net,               '#64748b'],
              ['Paid',  inv.paid_amount,   '#16a34a'],
              ['Balance', balance,         balance > 0 ? '#dc2626' : '#16a34a'],
              ['Due', inv.due_date || '—', '#d97706'],
            ].map(([l, v, c]) => (
              <div key={l} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400">{l}</div>
                <div className="text-sm font-bold mt-0.5" style={{ color: c }}>
                  {l === 'Due' ? (v === '—' ? '—' : v) : `Rs. ${fmt(v)}`}
                </div>
              </div>
            ))}
          </div>

          {/* Items */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fee Breakdown</h3>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              {inv.items?.map((item, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''} ${item.is_waived ? 'opacity-50 line-through' : ''}`}>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item.description}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Rs. {fmt(item.amount)}</span>
                </div>
              ))}
              {inv.discount_amount > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <span className="text-sm text-emerald-700 dark:text-emerald-400">Discount</span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">- Rs. {fmt(inv.discount_amount)}</span>
                </div>
              )}
              {inv.fine_amount > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-red-50/50 dark:bg-red-900/10">
                  <span className="text-sm text-red-700 dark:text-red-400">Late Fine</span>
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">+ Rs. {fmt(inv.fine_amount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-2.5 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 font-bold">
                <span className="text-sm text-slate-700 dark:text-slate-200">Net Payable</span>
                <span className="text-sm text-slate-800 dark:text-slate-100">Rs. {fmt(net)}</span>
              </div>
            </div>
          </div>

          {/* Payments */}
          {inv.payments?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Payment History</h3>
              <div className="space-y-2">
                {inv.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">Rs. {fmt(p.amount)}</div>
                      <div className="text-xs text-slate-400">{p.receipt_no} · {p.payment_date} · {p.payment_method.toUpperCase()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-900/20 dark:text-emerald-400">Received</span>
                      <button
                        onClick={() => window.open(`/fees/receipt/${p.id}`, '_blank')}
                        title="Print Receipt"
                        className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Printer size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {balance > 0.01 && inv.status !== 'cancelled' && (
            <div className="flex gap-2">
              <button onClick={() => onPayClick(inv)}
                className="flex-1 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-md"
                style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
                <CreditCard size={16} />
                Pay Cash
              </button>
              <button onClick={() => onOnlinePayClick && onOnlinePayClick(inv)}
                className="flex-1 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-md"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <Smartphone size={16} />
                Pay Online
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create Invoice Modal ───────────────────────────────────────
function CreateInvoiceModal({ onClose, onCreated, feeHeads }) {
  const [query,      setQuery]      = useState('');
  const [students,   setStudents]   = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [searching,  setSearching]  = useState(false);
  const [invoiceType, setType]      = useState('one_time');
  const [month,      setMonth]      = useState('');
  const [dueDate,    setDueDate]    = useState('');
  const [notes,      setNotes]      = useState('');
  const [items,      setItems]      = useState([{ description: '', amount: '', fee_head_id: '' }]);
  const [saving,     setSaving]     = useState(false);
  const debounceRef                 = useRef(null);

  // Debounced student search
  useEffect(() => {
    if (!query.trim()) { setStudents([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await getStudents({ search: query, limit: 8 });
        setStudents(Array.isArray(r.data) ? r.data : []);
      } catch { setStudents([]); }
      finally { setSearching(false); }
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const addItem    = () => setItems(it => [...it, { description: '', amount: '', fee_head_id: '' }]);
  const removeItem = (i) => setItems(it => it.filter((_, idx) => idx !== i));
  const setItem    = (i, k, v) => setItems(it => it.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const total = items.reduce((s, it) => s + parseFloat(it.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) { toast.error('Select a student'); return; }
    const valid = items.filter(it => it.description.trim() && parseFloat(it.amount || 0) > 0);
    if (valid.length === 0) { toast.error('Add at least one fee item with description and amount'); return; }
    setSaving(true);
    try {
      const res = await createInvoice({
        student_id: selected.id,
        invoice_type: invoiceType,
        billing_month: invoiceType === 'monthly' ? month : undefined,
        due_date: dueDate || undefined,
        notes: notes || undefined,
        items: valid.map(it => ({
          description: it.description.trim(),
          amount: parseFloat(it.amount),
          fee_head_id: it.fee_head_id || undefined,
        })),
      });
      const inv = res.data?.data ?? res.data;
      toast.success(`Invoice ${inv.invoice_no} created — Rs. ${fmt(inv.total_amount)}`);
      onCreated();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create invoice'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">New Invoice</h2>
              <p className="text-xs text-slate-400">Create a custom fee invoice for any student</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* ── Student search ── */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Student *</label>
            {selected ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20">
                <div>
                  <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{selected.full_name}</div>
                  <div className="text-xs text-indigo-500">{selected.class_name || 'No class'}{selected.roll_number ? ` · Roll: ${selected.roll_number}` : ''}</div>
                </div>
                <button type="button" onClick={() => { setSelected(null); setQuery(''); }}
                  className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800 text-indigo-400 hover:text-indigo-600 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Type student name to search…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                {(students.length > 0 || searching) && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                    {searching
                      ? <div className="p-3 text-sm text-slate-400 text-center">Searching…</div>
                      : students.map(s => (
                          <button key={s.id} type="button" onClick={() => { setSelected(s); setQuery(''); setStudents([]); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.full_name}</div>
                            <div className="text-xs text-slate-400">{s.class_name || 'No class assigned'}{s.roll_number ? ` · Roll: ${s.roll_number}` : ''}</div>
                          </button>
                        ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Invoice type ── */}
          <div className="grid grid-cols-3 gap-2">
            {[['admission','Admission'],['monthly','Monthly'],['one_time','One-Time']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setType(k)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${invoiceType === k ? 'text-white border-transparent shadow-sm' : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                style={invoiceType === k ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
                {l}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {invoiceType === 'monthly' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Billing Month *</label>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            </div>
          </div>

          {/* ── Fee items ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Fee Items *</label>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium">
                <Plus size={12} /> Add row
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <input
                      value={item.description}
                      onChange={e => setItem(i, 'description', e.target.value)}
                      placeholder="Description (e.g. Tuition Fee)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                  </div>
                  <div className="w-28 shrink-0">
                    <input
                      type="number"
                      min="1"
                      value={item.amount}
                      onChange={e => setItem(i, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                  </div>
                  <div className="w-36 shrink-0">
                    <select value={item.fee_head_id} onChange={e => setItem(i, 'fee_head_id', e.target.value)}
                      className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none">
                      <option value="">No category</option>
                      {feeHeads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-0.5">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {total > 0 && (
              <div className="mt-3 flex justify-end">
                <div className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                  <span className="text-xs text-indigo-500">Total: </span>
                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Rs. {fmt(total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Notes ── */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any remarks…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 shadow-md"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ReceiptText size={14} />}
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Bulk Pay Modal ────────────────────────────────────────────
function BulkPayModal({ count, onClose, onConfirm }) {
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
  });
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
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Bulk Record Payment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={16} /></button>
        </div>
        <p className="text-sm text-slate-500">Record full payment for <strong>{count}</strong> selected invoice{count !== 1 ? 's' : ''}.</p>
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
              <option value="online">Online</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handleConfirm} disabled={saving} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {saving ? 'Processing…' : `Pay ${count} Invoice${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Installment Modal ─────────────────────────────────────────
const INST_STATUS = {
  unpaid:  { label: 'Unpaid',  bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  partial: { label: 'Partial', bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
  paid:    { label: 'Paid',    bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
  overdue: { label: 'Overdue', bg: '#faf5ff', color: '#7c3aed', border: '#d8b4fe' },
};
const INST_METHODS = ['cash', 'bank', 'online', 'cheque'];

function InstallmentModal({ invoice, onClose, onUpdated }) {
  const [installments, setInstallments]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  // create plan form
  const [count, setCount]                 = useState('3');
  const [startDate, setStartDate]         = useState(() => new Date().toISOString().slice(0, 10));
  // pay form per installment
  const [payingId, setPayingId]           = useState(null);
  const [payAmount, setPayAmount]         = useState('');
  const [payMethod, setPayMethod]         = useState('cash');

  const net = parseFloat(invoice.net_amount || invoice.total_amount || 0);
  const hasplan = invoice.has_installments || installments.length > 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getInstallments(invoice.id);
      setInstallments(r.data || []);
    } catch { setInstallments([]); }
    finally { setLoading(false); }
  }, [invoice.id]);

  useEffect(() => { load(); }, [load]);

  const paidCount   = installments.filter(i => i.status === 'paid').length;
  const totalCount  = installments.length;
  const paidAmount  = installments.reduce((s, i) => s + parseFloat(i.paid_amount || 0), 0);
  const totalAmount = installments.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const pct         = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createInstallmentPlan(invoice.id, { count: parseInt(count, 10), start_date: startDate });
      toast.success('Installment plan created');
      onUpdated();
      load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to create plan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete the entire installment plan? This cannot be undone.')) return;
    setSaving(true);
    try {
      await deleteInstallmentPlan(invoice.id);
      toast.success('Installment plan deleted');
      onUpdated();
      load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to delete plan'); }
    finally { setSaving(false); }
  };

  const handlePay = async (instId) => {
    if (!payAmount || parseFloat(payAmount) <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      await payInstallment(instId, { amount: parseFloat(payAmount), method: payMethod });
      toast.success('Payment recorded');
      setPayingId(null); setPayAmount('');
      onUpdated();
      load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Payment failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Layers size={17} className="text-indigo-500" />
              Installment Plan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {invoice.student_name} · Invoice #{invoice.id} · Rs. {fmt(net)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-t-indigo-600 border-indigo-200 rounded-full animate-spin" />
            </div>
          ) : !hasplan && installments.length === 0 ? (
            /* ── Create plan form ── */
            <div className="space-y-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-2xl p-4">
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">No installment plan yet</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                  Split this invoice of <strong>Rs. {fmt(net)}</strong> into equal monthly installments.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Number of Installments</label>
                  <div className="relative">
                    <select value={count} onChange={e => setCount(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      {[2,3,4,6,8,10,12].map(n => (
                        <option key={n} value={n}>{n} installments (Rs. {fmt(Math.round(net / n))} each)</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Start Date (1st due date)</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              {/* Preview */}
              <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-500 mb-2">Preview</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: parseInt(count) }, (_, i) => {
                    const d = new Date(startDate);
                    d.setMonth(d.getMonth() + i);
                    return (
                      <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">#{i + 1}</span>
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="text-slate-600 dark:text-slate-400">{d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="font-medium text-indigo-600">Rs. {fmt(Math.round(net / parseInt(count)))}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button onClick={handleCreate} disabled={saving || invoice.status === 'cancelled'}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Layers size={14} />}
                Create Installment Plan
              </button>
            </div>
          ) : (
            /* ── Plan exists: show schedule ── */
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="bg-slate-50 dark:bg-slate-700/40 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {paidCount} of {totalCount} paid
                  </span>
                  <span className="text-xs font-bold text-indigo-600">{pct}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2.5 overflow-hidden">
                  <div className="h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#6366f1' }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-slate-400">Paid: Rs. {fmt(paidAmount)}</span>
                  <span className="text-xs text-slate-400">Remaining: Rs. {fmt(totalAmount - paidAmount)}</span>
                </div>
              </div>

              {/* Installment rows */}
              <div className="space-y-2">
                {installments.map(inst => {
                  const sc = INST_STATUS[inst.status] || INST_STATUS.unpaid;
                  const remaining = parseFloat(inst.amount) - parseFloat(inst.paid_amount || 0);
                  const isPaying = payingId === inst.id;
                  return (
                    <div key={inst.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <div className="flex items-center px-4 py-3 gap-3">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-indigo-600">#{inst.installment_no}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            Rs. {fmt(inst.amount)}
                            {parseFloat(inst.paid_amount) > 0 && inst.status !== 'paid' && (
                              <span className="text-xs text-emerald-600 ml-1.5">({fmt(inst.paid_amount)} paid)</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">Due: {new Date(inst.due_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0"
                          style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                          {sc.label}
                        </span>
                        {inst.status !== 'paid' && (
                          <button onClick={() => { setPayingId(isPaying ? null : inst.id); setPayAmount(String(remaining.toFixed(2))); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${isPaying ? 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100'}`}>
                            {isPaying ? 'Cancel' : 'Pay'}
                          </button>
                        )}
                        {inst.status === 'paid' && inst.paid_at && (
                          <span className="text-xs text-slate-400 shrink-0">
                            {new Date(inst.paid_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                      {/* Inline pay form */}
                      {isPaying && (
                        <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-4 py-3 flex flex-wrap gap-2 items-end">
                          <div className="flex-1 min-w-[120px]">
                            <label className="block text-xs text-slate-500 mb-1">Amount (Rs.)</label>
                            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                              min="1" max={remaining}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Method</label>
                            <div className="relative">
                              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                                {INST_METHODS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
                              </select>
                              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          <button onClick={() => handlePay(inst.id)} disabled={saving}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5">
                            {saving ? <RefreshCw size={13} className="animate-spin" /> : <CreditCard size={13} />}
                            Record
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Delete plan button (only if no installment paid) */}
              {paidCount === 0 && (
                <button onClick={handleDelete} disabled={saving}
                  className="w-full py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                  Delete Plan
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Invoices ─────────────────────────────────────────────
function InvoicesTab({ classes, feeHeads }) {
  const [invoices,     setInvoices]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [search,        setSearch]       = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass,  setFilterClass]  = useState('');
  const [filterMonth,  setFilterMonth]  = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [payInvoice,       setPayInvoice]       = useState(null);
  const [viewInvoice,      setViewInvoice]      = useState(null);
  const [onlinePayInvoice, setOnlinePayInvoice] = useState(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [bulkModal,    setBulkModal]    = useState(false);
  const [whatsAppInv,  setWhatsAppInv]  = useState(null);
  const [installModal, setInstallModal] = useState(null); // invoice object
  const [page,         setPage]         = useState(0);
  const [totalCount,   setTotalCount]   = useState(0);
  const PAGE_SIZE = 50;

  const load = useCallback(async (pageOverride) => {
    setLoading(true);
    const currentPage = pageOverride !== undefined ? pageOverride : page;
    try {
      const p = { limit: PAGE_SIZE, offset: currentPage * PAGE_SIZE };
      if (filterStatus) p.status = filterStatus;
      if (filterClass)  p.class_id = filterClass;
      if (filterMonth)  p.billing_month = filterMonth;
      if (filterType)   p.invoice_type = filterType;
      if (debouncedSearch) p.search = debouncedSearch;
      const res = await getInvoices(p);
      setInvoices(Array.isArray(res.data) ? res.data : []);
      setTotalCount(res.total ?? res.data?.length ?? 0);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, [filterStatus, filterClass, filterMonth, filterType, debouncedSearch, page]);

  // Reset to page 0 when filters change (not when page itself changes)
  const filtersRef = useRef({ filterStatus, filterClass, filterMonth, filterType, debouncedSearch });
  useEffect(() => {
    const prev = filtersRef.current;
    if (prev.filterStatus !== filterStatus || prev.filterClass !== filterClass ||
        prev.filterMonth !== filterMonth || prev.filterType !== filterType ||
        prev.debouncedSearch !== debouncedSearch) {
      filtersRef.current = { filterStatus, filterClass, filterMonth, filterType, debouncedSearch };
      setPage(0);
    }
  }, [filterStatus, filterClass, filterMonth, filterType, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const handleExportInvoices = async () => {
    try {
      const res = await getExportURL({
        ...(filterMonth  ? { billing_month: filterMonth } : {}),
        ...(filterClass  ? { class_id: filterClass } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterType   ? { invoice_type: filterType } : {}),
      });
      downloadBlob(res.data, `fees_invoices_${filterMonth || 'all'}.csv`);
    } catch { toast.error('Export failed'); }
  };

  const totals = useMemo(() => invoices.reduce((a, r) => ({
    billed:    a.billed    + parseFloat(r.net_amount  || r.total_amount || 0),
    collected: a.collected + parseFloat(r.paid_amount || 0),
    balance:   a.balance   + parseFloat(r.balance     || 0),
  }), { billed: 0, collected: 0, balance: 0 }), [invoices]);

  const payableInvoices = invoices.filter(inv => parseFloat(inv.balance || 0) > 0.01 && inv.status !== 'cancelled');
  const allPayableSelected = payableInvoices.length > 0 && payableInvoices.every(inv => selectedIds.has(inv.id));

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAllPayable = () => {
    if (allPayableSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(payableInvoices.map(inv => inv.id)));
  };

  const handleBulkPay = async (form) => {
    try {
      const r = await bulkRecordPayments({ invoice_ids: [...selectedIds], ...form });
      const msg = r.data?.message || r.data?.data?.message || `${r.data?.saved ?? selectedIds.size} invoice(s) paid`;
      toast.success(msg);
      setSelectedIds(new Set());
      setBulkModal(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Bulk payment failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, invoice no…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-800 dark:text-slate-100" />
          </div>
          <Sel value={filterStatus} onChange={setFilterStatus} className="w-36">
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Sel>
          <Sel value={filterType} onChange={setFilterType} className="w-36">
            <option value="">All Types</option>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
          <Sel value={filterClass} onChange={setFilterClass} className="w-44">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Sel>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Month</label>
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <button onClick={() => setBulkModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
                style={{ background: 'linear-gradient(135deg,#16a34a,#059669)' }}>
                <CreditCard size={14} /> Pay {selectedIds.size} Selected
              </button>
            )}
            <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExportInvoices}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-md"
              style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => {
                const p = new URLSearchParams();
                if (filterMonth)  p.set('billing_month', filterMonth);
                if (filterClass)  p.set('class_id', filterClass);
                if (filterStatus) p.set('status', filterStatus);
                if (filterType)   p.set('invoice_type', filterType);
                window.open(`/fees/bulk-print?${p.toString()}`, '_blank');
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
              <Printer size={14} /> Bulk Print
            </button>
            <button
              onClick={() => {
                const outstanding = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');
                if (!outstanding.length) { toast.error('No outstanding invoices to remind'); return; }
                setWhatsAppInv({ _bulk: true, _list: outstanding });
              }}
              title="Bulk WhatsApp Reminders for all outstanding invoices"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
              style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
              <MessageSquare size={14} /> WhatsApp Reminders
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Plus size={14} /> New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Totals strip */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: 'Total Billed',  v: totals.billed,    color: '#6366f1' },
            { l: 'Collected',     v: totals.collected, color: '#16a34a' },
            { l: 'Outstanding',   v: totals.balance,   color: '#dc2626' },
          ].map(({ l, v, color }) => (
            <div key={l} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color }}>
                <Banknote size={17} className="text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">Rs. {fmt(v)}</div>
                <div className="text-xs text-slate-400">{l} ({totalCount} invoices)</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 flex items-center justify-center shadow-sm">
          <div className="w-8 h-8 border-2 border-t-emerald-600 border-emerald-200 rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <EmptyState
            icon={ReceiptText}
            title="No invoices found"
            description="Try adjusting your filters or create a new invoice to get started."
            actionLabel="New Invoice"
            onAction={() => setShowCreate(true)}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 w-8">
                    {payableInvoices.length > 0 && (
                      <input type="checkbox" checked={allPayableSelected} onChange={toggleAllPayable}
                        className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 cursor-pointer" />
                    )}
                  </th>
                  {['Invoice','Student','Class','Type','Month','Total','Paid','Balance','Status',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => {
                  const net     = parseFloat(inv.net_amount  || inv.total_amount || 0);
                  const balance = parseFloat(inv.balance     || 0);
                  const cat     = CAT_COLORS[inv.invoice_type] || CAT_COLORS.one_time;
                  const isPayable = balance > 0.01 && inv.status !== 'cancelled';
                  return (
                    <tr key={inv.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.has(inv.id) ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : i % 2 ? 'bg-slate-50/20 dark:bg-slate-800/10' : ''}`}>
                      <td className="px-4 py-3 w-8">
                        {isPayable && (
                          <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleSelect(inv.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 cursor-pointer" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400">{inv.invoice_no}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[160px]">{inv.student_name}</div>
                        {inv.roll_number && <div className="text-xs text-slate-400">Roll: {inv.roll_number}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{inv.class_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                          style={{ background: cat.bg, color: cat.text, borderColor: cat.border }}>
                          {CATEGORIES[inv.invoice_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{inv.billing_month || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 text-right">Rs. {fmt(net)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400 text-right">Rs. {fmt(inv.paid_amount)}</td>
                      <td className="px-4 py-3 font-semibold text-right" style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>Rs. {fmt(balance)}</td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewInvoice(inv.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors">
                            <Eye size={14} />
                          </button>
                          {balance > 0.01 && inv.status !== 'cancelled' && (
                            <button onClick={() => setPayInvoice(inv)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-600 transition-colors">
                              <CreditCard size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => window.open(`/fees/invoice/${inv.id}/challan`, '_blank')}
                            title="Print Fee Challan"
                            className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-400 hover:text-amber-600 transition-colors">
                            <FileText size={14} />
                          </button>
                          {isPayable && (
                            <button
                              onClick={() => setWhatsAppInv(inv)}
                              title="WhatsApp Fee Reminder"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                              onMouseEnter={e => e.currentTarget.style.background = '#25d366'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <MessageSquare size={14} />
                            </button>
                          )}
                          {inv.student_id && (
                            <button
                              onClick={() => window.open(`/fees/student/${inv.student_id}`, '_blank')}
                              title="View Fee Account"
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 transition-colors">
                              <UserCircle size={14} />
                            </button>
                          )}
                          {inv.status !== 'cancelled' && (
                            <button
                              onClick={() => setInstallModal(inv)}
                              title={inv.has_installments ? 'View Installment Plan' : 'Create Installment Plan'}
                              className={`p-1.5 rounded-lg transition-colors ${inv.has_installments ? 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                              <Layers size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalCount > PAGE_SIZE && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
              </span>
              <div className="flex items-center gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                  ← Prev
                </button>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Page {page + 1} / {Math.ceil(totalCount / PAGE_SIZE)}
                </span>
                <button disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {payInvoice && (
        <PaymentModal invoice={payInvoice} onClose={() => setPayInvoice(null)} onPaid={() => { setPayInvoice(null); load(); }} />
      )}
      {installModal && (
        <InstallmentModal
          invoice={installModal}
          onClose={() => setInstallModal(null)}
          onUpdated={() => { load(); setInstallModal(prev => prev ? { ...prev, has_installments: true } : null); }}
        />
      )}
      {onlinePayInvoice && (
        <OnlinePayModal invoice={onlinePayInvoice} onClose={() => setOnlinePayInvoice(null)}
          onPaid={() => { setOnlinePayInvoice(null); load(); }} />
      )}
      {viewInvoice && (
        <InvoiceDetailModal invoiceId={viewInvoice} onClose={() => setViewInvoice(null)}
          onPayClick={(inv) => { setViewInvoice(null); setPayInvoice(inv); }}
          onWhatsApp={(inv) => { setViewInvoice(null); setWhatsAppInv(inv); }}
          onOnlinePayClick={(inv) => { setViewInvoice(null); setOnlinePayInvoice(inv); }} />
      )}
      {whatsAppInv && (
        <WhatsAppReminderModal inv={whatsAppInv} onClose={() => setWhatsAppInv(null)} />
      )}
      {bulkModal && (
        <BulkPayModal
          count={selectedIds.size}
          onClose={() => setBulkModal(false)}
          onConfirm={handleBulkPay}
        />
      )}
      {showCreate && (
        <CreateInvoiceModal
          feeHeads={feeHeads}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

// ── Tab: Generate Fees ────────────────────────────────────────
function GenerateTab({ classes }) {
  const [mode,         setMode]      = useState('monthly');
  const [classId,      setClassId]   = useState('');
  const [month,        setMonth]     = useState(currentMonth());
  const [dueDate,      setDueDate]   = useState('');
  const [year,         setYear]      = useState(currentAcademicYear);
  // Admission: student search
  const [stuQuery,     setStuQuery]  = useState('');
  const [stuResults,   setStuRes]    = useState([]);
  const [selStudent,   setSelStu]    = useState(null);
  const [stuSearching, setStuSrch]   = useState(false);
  const [loading,      setLoading]   = useState(false);
  const [result,       setResult]    = useState(null);
  const debRef                       = useRef(null);

  useEffect(() => {
    if (!stuQuery.trim()) { setStuRes([]); return; }
    clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setStuSrch(true);
      try {
        const r = await getStudents({ search: stuQuery, limit: 8 });
        setStuRes(Array.isArray(r.data) ? r.data : []);
      } catch { setStuRes([]); }
      finally { setStuSrch(false); }
    }, 280);
    return () => clearTimeout(debRef.current);
  }, [stuQuery]);

  const handleGenerate = async () => {
    if (mode === 'monthly' && !month) { toast.error('Select billing month'); return; }
    if (mode === 'admission' && !selStudent) { toast.error('Select a student first'); return; }
    setLoading(true); setResult(null);
    try {
      if (mode === 'monthly') {
        const res = await toast.promise(
          generateMonthlyFees({ class_id: classId || undefined, billing_month: month, academic_year: year, due_date: dueDate || undefined }),
          {
            loading: classId ? 'Generating fees for class…' : 'Generating fees for all classes…',
            success: (r) => r.data?.message || 'Fees generated successfully',
            error:   (err) => err?.response?.data?.message || 'Failed to generate',
          }
        );
        setResult(res.data);
      } else {
        const res = await toast.promise(
          generateAdmissionInvoice(selStudent.id, { academic_year: year, due_date: dueDate || undefined }),
          {
            loading: 'Creating admission invoice…',
            success: (r) => { const inv = r.data?.data ?? r.data; return `Admission invoice created: ${inv.invoice_no}`; },
            error:   (err) => err?.response?.data?.message || 'Failed to generate',
          }
        );
        const inv = res.data?.data ?? res.data;
        setResult({ created: 1, invoice_no: inv.invoice_no, total_amount: inv.total_amount });
      }
    } catch { /* toast.promise handles error display */ }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Generate Invoices</h2>
          <p className="text-xs text-slate-400 mt-0.5">Bulk-generate monthly fees or create an admission invoice</p>
        </div>

        {/* Mode */}
        <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {[['monthly','Monthly Fees'],['admission','Admission Invoice']].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${mode === k ? 'text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              style={mode === k ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
              {l}
            </button>
          ))}
        </div>

        {mode === 'monthly' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Billing Month *</label>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </div>
            </div>
            <Sel label="Class (leave blank for all classes)" value={classId} onChange={setClassId}>
              <option value="">— All Classes —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>)}
            </Sel>
            <Sel label="Academic Year" value={year} onChange={setYear}>
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </Sel>
          </>
        ) : (
          <>
            {/* Student search for admission invoice */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Student *</label>
              {selStudent ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20">
                  <div>
                    <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{selStudent.full_name}</div>
                    <div className="text-xs text-indigo-500">{selStudent.class_name || 'No class'}</div>
                  </div>
                  <button type="button" onClick={() => { setSelStu(null); setStuQuery(''); setStuRes([]); }}
                    className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800 text-indigo-400 hover:text-indigo-600 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={stuQuery} onChange={e => setStuQuery(e.target.value)} placeholder="Search student by name…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                  {(stuResults.length > 0 || stuSearching) && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {stuSearching
                        ? <div className="p-3 text-sm text-slate-400 text-center">Searching…</div>
                        : stuResults.map(s => (
                            <button key={s.id} type="button" onClick={() => { setSelStu(s); setStuQuery(''); setStuRes([]); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.full_name}</div>
                              <div className="text-xs text-slate-400">{s.class_name || 'No class'}</div>
                            </button>
                          ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Sel label="Academic Year" value={year} onChange={setYear}>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </Sel>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </div>
            </div>
          </>
        )}

        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-400">
          {mode === 'monthly'
            ? 'Students who already have an invoice for the selected month will be skipped automatically.'
            : 'An admission invoice will be generated using the fee structures defined for the student\'s class.'}
        </div>

        <button onClick={handleGenerate} disabled={loading}
          className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ReceiptText size={16} />}
          Generate {mode === 'monthly' ? 'Monthly Fees' : 'Admission Invoice'}
        </button>
      </div>

      {result && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center"><CheckCircle2 size={16} className="text-white" /></div>
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">Generation Complete</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {result.created !== undefined && <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-emerald-600">{result.created}</div><div className="text-slate-400 text-xs">Invoices Created</div></div>}
            {result.skipped !== undefined && <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-slate-500">{result.skipped}</div><div className="text-slate-400 text-xs">Skipped</div></div>}
            {result.invoice_no && <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl p-3 text-center"><div className="font-mono font-bold text-indigo-600">{result.invoice_no}</div><div className="text-xs text-slate-400">Total: Rs. {fmt(result.total_amount)}</div></div>}
          </div>
        </div>
      )}

      <LateFeeCard />
    </div>
  );
}

// ── Late Fee Card (used inside GenerateTab) ────────────────────
function LateFeeCard() {
  const [feeType,  setFeeType]  = useState('fixed');
  const [feeValue, setFeeValue] = useState('');
  const [month,    setMonth]    = useState('');
  const [applying, setApplying] = useState(false);
  const [result,   setResult]   = useState(null);

  const handleApply = async () => {
    if (!feeValue || parseFloat(feeValue) <= 0) { toast.error('Enter a late fee value > 0'); return; }
    setApplying(true); setResult(null);
    try {
      const res = await applyLateFees({
        late_fee_type: feeType,
        late_fee_value: parseFloat(feeValue),
        ...(month ? { billing_month: month } : {}),
      });
      const d = res.data?.data ?? res.data;
      setResult(d);
      toast.success(d?.message || 'Done');
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setApplying(false); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-orange-200 dark:border-orange-800/40 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)' }}>
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Apply Late Fee Surcharge</h3>
          <p className="text-xs text-slate-400">Add surcharge to all overdue unpaid invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Type</label>
          <div className="relative">
            <select value={feeType} onChange={e => setFeeType(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
              <option value="fixed">Fixed (PKR)</option>
              <option value="percent">Percent (%)</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Amount {feeType === 'percent' ? '(%)' : '(PKR)'}
          </label>
          <input type="number" min="0.01" step="0.01" value={feeValue}
            onChange={e => setFeeValue(e.target.value)}
            placeholder={feeType === 'percent' ? 'e.g. 5' : 'e.g. 200'}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Billing Month (optional — leave blank for all overdue)</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
      </div>

      <button onClick={handleApply} disabled={applying}
        className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)' }}>
        {applying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap size={14} />}
        Apply Late Fee
      </button>

      {result && (
        <div className={`rounded-xl p-3 text-sm font-medium ${result.updated > 0 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}

// ── Tab: Concessions ──────────────────────────────────────────
// ── Bulk Class Waiver Modal ───────────────────────────────────
function BulkWaiverModal({ classes, feeHeads, onClose, onDone }) {
  const [classId,       setClassId]       = useState('');
  const [discountType,  setDiscountType]  = useState('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [feeHeadId,     setFeeHeadId]     = useState('');
  const [reason,        setReason]        = useState('');
  const [saving,        setSaving]        = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classId) { toast.error('Select a class'); return; }
    const val = parseFloat(discountValue);
    if (!val || val <= 0) { toast.error('Enter a valid discount value'); return; }
    if (!window.confirm(`Apply ${discountType === 'percent' ? val + '%' : 'Rs ' + val} discount to ALL active students in this class?`)) return;
    setSaving(true);
    try {
      const res = await bulkClassConcession({ class_id: classId, discount_type: discountType, discount_value: val, fee_head_id: feeHeadId || null, reason });
      toast.success(res.data?.message || 'Bulk waiver applied');
      onDone();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to apply waiver'); }
    finally { setSaving(false); }
  };

  const inp = 'w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
  const selProps = { className: inp + ' appearance-none' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users2 size={17} className="text-indigo-500" />
            Bulk Class Waiver
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Class *</label>
            <div className="relative">
              <select value={classId} onChange={e => setClassId(e.target.value)} required {...selProps}>
                <option value="">— Select Class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Discount Type</label>
              <div className="relative">
                <select value={discountType} onChange={e => setDiscountType(e.target.value)} {...selProps}>
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (Rs)</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Value {discountType === 'percent' ? '(%)' : '(Rs)'}
              </label>
              <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                min="1" max={discountType === 'percent' ? 100 : undefined} step="0.01" required
                placeholder={discountType === 'percent' ? '10' : '500'}
                className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Fee Head (optional)</label>
            <div className="relative">
              <select value={feeHeadId} onChange={e => setFeeHeadId(e.target.value)} {...selProps}>
                <option value="">All Fee Heads</option>
                {feeHeads.map(fh => <option key={fh.id} value={fh.id}>{fh.name}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Reason</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Merit scholarship, Hardship waiver…"
              className={inp} />
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300">
            This will create individual concession records for every active student in the selected class. Existing concessions are not overwritten.
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Users2 size={14} />}
              Apply to Class
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConcessionsTab({ classes, feeHeads }) {
  const [classId,     setClassId]   = useState('');
  const [students,    setStudents]  = useState([]);
  const [studentId,   setStudentId] = useState('');
  const [items,       setItems]     = useState([]);
  const [loading,     setLoading]   = useState(false);
  const [modal,       setModal]     = useState(null); // null | { student_id } | concession obj
  const [delId,       setDelId]     = useState(null);
  const [bulkWaiverOpen, setBulkWaiverOpen] = useState(false);
  const [tierApplying,   setTierApplying]   = useState(false);

  // Scholarship tier quick-apply constants
  const SCHOLARSHIP_TIERS = [
    { tier: 'full', label: 'Full (100%)', color: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400' },
    { tier: '75',   label: '75%',         color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400' },
    { tier: '50',   label: '50%',         color: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/20 dark:text-indigo-400' },
    { tier: '25',   label: '25%',         color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400' },
  ];

  const handleApplyTier = async (tier) => {
    if (!studentId) return;
    if (!window.confirm(`Apply ${tier === 'full' ? '100%' : tier + '%'} scholarship to ${selStudent?.full_name}?`)) return;
    setTierApplying(true);
    try {
      await applyScholarshipTier({ student_id: studentId, tier });
      toast.success(`${tier === 'full' ? 'Full' : tier + '%'} scholarship applied`);
      load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to apply tier'); }
    finally { setTierApplying(false); }
  };

  // Form state
  const emptyForm = { fee_head_id: '', discount_type: 'fixed', discount_value: '', reason: '', is_active: true };
  const [form,  setForm]  = useState(emptyForm);
  const [saving,setSaving]= useState(false);

  // Load students when class changes
  useEffect(() => {
    if (!classId) { setStudents([]); setStudentId(''); return; }
    getStudents({ class_id: classId, status: 'active', limit: 200 })
      .then(r => setStudents(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [classId]);

  // Load concessions when student changes
  const load = useCallback(async () => {
    if (!studentId) { setItems([]); return; }
    setLoading(true);
    try {
      const r = await getConcessions({ student_id: studentId });
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch { toast.error('Failed to load concessions'); }
    finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm({ ...emptyForm, student_id: studentId });
    setModal({ student_id: studentId });
  };
  const openEdit = (c) => {
    setForm({ id: c.id, student_id: c.student_id, fee_head_id: c.fee_head_id || '', discount_type: c.discount_type, discount_value: c.discount_value, reason: c.reason || '', is_active: c.is_active });
    setModal(c);
  };

  const handleSave = async () => {
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) { toast.error('Discount value must be > 0'); return; }
    setSaving(true);
    try {
      await saveConcession({ ...form, fee_head_id: form.fee_head_id || null });
      toast.success(form.id ? 'Concession updated' : 'Concession added');
      setModal(null);
      load();
    } catch (e) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteConcession(id);
      toast.success('Deleted');
      setDelId(null);
      load();
    } catch { toast.error('Delete failed'); }
  };

  const selStudent = students.find(s => String(s.id) === String(studentId));
  const inp = INPUT_CLS;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <Sel label="Class" value={classId} onChange={v => { setClassId(v); setStudentId(''); }} className="w-48">
            <option value="">— Select Class —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>)}
          </Sel>
          <Sel label="Student" value={studentId} onChange={setStudentId} className="w-64">
            <option value="">— Select Student —</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}{s.roll_number ? ` (${s.roll_number})` : ''}</option>)}
          </Sel>
          {studentId && (
            <>
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
                style={{ background: 'linear-gradient(135deg,#10b981,#0d9488)' }}>
                <Plus size={14} /> Add Concession
              </button>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 mr-1">Scholarship:</span>
                {SCHOLARSHIP_TIERS.map(t => (
                  <button key={t.tier} onClick={() => handleApplyTier(t.tier)} disabled={tierApplying}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:shadow-sm disabled:opacity-50 ${t.color}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </>
          )}
          <button onClick={() => setBulkWaiverOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md ml-auto"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <Users2 size={14} /> Bulk Class Waiver
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl px-4 py-3 text-xs text-indigo-700 dark:text-indigo-300">
        Concessions are auto-applied as <strong>discount_amount</strong> when monthly invoices are generated for a student.
        Fixed = flat PKR deduction · Percent = % of total or specific fee head.
      </div>

      {!studentId ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-sm">
          <Tag size={28} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 font-medium">Select a class and student to manage their concessions</p>
        </div>
      ) : loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 flex items-center justify-center shadow-sm">
          <div className="w-8 h-8 border-2 border-t-emerald-600 border-emerald-200 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {selStudent?.full_name} — {items.length} concession{items.length !== 1 ? 's' : ''}
            </span>
          </div>
          {items.length === 0 ? (
            <div className="p-12 text-center">
              <Tag size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">No concessions for this student</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  {['Fee Head','Type','Discount','Reason','Status',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{c.fee_head_name || <span className="text-slate-400 italic">All fees</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.discount_type === 'fixed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'}`}>
                        {c.discount_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">
                      {c.discount_type === 'fixed' ? `PKR ${fmt(c.discount_value)}` : `${c.discount_value}%`}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{c.reason || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                          <Pencil size={13} />
                        </button>
                        {delId === c.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(c.id)} className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold">Yes</button>
                            <button onClick={() => setDelId(null)} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDelId(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Bulk Class Waiver Modal */}
      {bulkWaiverOpen && (
        <BulkWaiverModal
          classes={classes}
          feeHeads={feeHeads}
          onClose={() => setBulkWaiverOpen(false)}
          onDone={() => { setBulkWaiverOpen(false); load(); }}
        />
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#0d9488)' }}>
                  <Tag size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{form.id ? 'Edit' : 'Add'} Concession</h2>
                  <p className="text-xs text-slate-400">{selStudent?.full_name}</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Applies To (leave blank for all fees)</label>
                <div className="relative">
                  <select value={form.fee_head_id} onChange={e => setForm(f => ({ ...f, fee_head_id: e.target.value }))} className={inp}>
                    <option value="">— All Fees (total invoice) —</option>
                    {feeHeads.filter(h => h.category === 'monthly').map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Discount Type *</label>
                  <div className="relative">
                    <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} className={inp}>
                      <option value="fixed">Fixed (PKR)</option>
                      <option value="percent">Percent (%)</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    Value * {form.discount_type === 'percent' ? '(%)' : '(PKR)'}
                  </label>
                  <input type="number" min="0.01" step="0.01" value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                    placeholder={form.discount_type === 'percent' ? 'e.g. 10' : 'e.g. 500'}
                    className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Reason</label>
                <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Staff child, Sibling discount, Merit scholarship…"
                  className={inp} />
              </div>
              {form.id && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600" />
                  <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">Active</label>
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-md disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#10b981,#0d9488)' }}>
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                {form.id ? 'Update' : 'Add Concession'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Fee Setup ────────────────────────────────────────────
function SetupTab({ classes }) {
  const [heads,      setHeads]      = useState([]);
  const [structures, setStructures] = useState([]);
  const [selClass,   setSelClass]   = useState('');
  const [selYear,    setSelYear]    = useState(currentAcademicYear);

  const [headForm,   setHeadForm]   = useState({ name: '', category: 'monthly', description: '' });
  const [structForm, setStructForm] = useState({ fee_head_id: '', amount: '' });
  const [editHead,   setEditHead]   = useState(null);
  const [saving,     setSaving]     = useState(false);

  const loadHeads = useCallback(async () => {
    const r = await getFeeHeads();
    setHeads(Array.isArray(r.data) ? r.data : []);
  }, []);

  const loadStructures = useCallback(async () => {
    if (!selClass) return;
    const r = await getFeeStructures({ class_id: selClass, academic_year: selYear });
    setStructures(Array.isArray(r.data) ? r.data : []);
  }, [selClass, selYear]);

  useEffect(() => { loadHeads(); }, [loadHeads]);
  useEffect(() => { loadStructures(); }, [loadStructures]);

  const handleSaveHead = async () => {
    if (!headForm.name || !headForm.category) { toast.error('Name and category required'); return; }
    setSaving(true);
    try {
      if (editHead) await updateFeeHead(editHead.id, { ...editHead, ...headForm });
      else          await createFeeHead(headForm);
      toast.success(editHead ? 'Updated' : 'Fee head created');
      setHeadForm({ name: '', category: 'monthly', description: '' });
      setEditHead(null);
      loadHeads();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteHead = async (id) => {
    if (!window.confirm('Delete this fee head?')) return;
    try { await deleteFeeHead(id); toast.success('Deleted'); loadHeads(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleSaveStructure = async () => {
    if (!structForm.fee_head_id || !structForm.amount) { toast.error('Fee head and amount required'); return; }
    if (!selClass) { toast.error('Select a class first'); return; }
    setSaving(true);
    try {
      await upsertFeeStructure({ fee_head_id: structForm.fee_head_id, class_id: selClass, amount: structForm.amount, academic_year: selYear });
      toast.success('Fee structure saved');
      setStructForm({ fee_head_id: '', amount: '' });
      loadStructures();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteStructure = async (id) => {
    try { await deleteFeeStructure(id); toast.success('Removed'); loadStructures(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Fee Heads */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Layers size={16} className="text-indigo-500" />Fee Heads</h2>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          {/* Form */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={editHead ? headForm.name || editHead.name : headForm.name} onChange={v => setHeadForm(f => ({ ...f, name: v }))} placeholder="e.g. Tuition Fee" />
            <Sel label="Category" value={editHead ? headForm.category || editHead.category : headForm.category} onChange={v => setHeadForm(f => ({ ...f, category: v }))}>
              {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Sel>
          </div>
          <div className="flex gap-2">
            {editHead && <button onClick={() => { setEditHead(null); setHeadForm({ name: '', category: 'monthly', description: '' }); }} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-sm"><X size={14} /></button>}
            <button onClick={handleSaveHead} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Plus size={14} /> {editHead ? 'Update' : 'Add Fee Head'}
            </button>
          </div>
          {/* List */}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {heads.map(h => {
              const cat = CAT_COLORS[h.category] || CAT_COLORS.one_time;
              return (
                <div key={h.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border" style={{ background: cat.bg, color: cat.text, borderColor: cat.border }}>{CATEGORIES[h.category]}</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{h.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditHead(h); setHeadForm({ name: h.name, category: h.category, description: h.description || '' }); }}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => handleDeleteHead(h.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fee Structures */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Settings2 size={16} className="text-emerald-500" />Fee Structures</h2>
          <button
            onClick={() => {
              const p = new URLSearchParams({ year: selYear, ...(selClass ? { class_id: selClass } : {}) });
              window.open(`/fees/structure/print?${p}`, '_blank');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            <Printer size={13} /> Print Structure
          </button>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Class *" value={selClass} onChange={setSelClass}>
              <option value="">— Select class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Sel>
            <Sel label="Academic Year" value={selYear} onChange={setSelYear}>
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </Sel>
          </div>

          {selClass && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Sel label="Fee Head" value={structForm.fee_head_id} onChange={v => setStructForm(f => ({ ...f, fee_head_id: v }))}>
                  <option value="">— Select fee head —</option>
                  {heads.map(h => <option key={h.id} value={h.id}>{h.name} ({CATEGORIES[h.category]})</option>)}
                </Sel>
                <Input label="Amount (Rs.)" type="number" value={structForm.amount} onChange={v => setStructForm(f => ({ ...f, amount: v }))} placeholder="e.g. 3000" />
              </div>
              <button onClick={handleSaveStructure} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
                <Plus size={14} /> Add / Update Amount
              </button>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {structures.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No fee structure defined for this class yet</p>
                ) : structures.map(s => {
                  const cat = CAT_COLORS[s.category] || CAT_COLORS.one_time;
                  return (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border" style={{ background: cat.bg, color: cat.text, borderColor: cat.border }}>{CATEGORIES[s.category]}</span>
                        <span className="text-sm text-slate-700 dark:text-slate-200">{s.fee_head_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Rs. {fmt(s.amount)}</span>
                        <button onClick={() => handleDeleteStructure(s.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Reports ───────────────────────────────────────────────
function ReportsTab({ classes }) {
  const [monthFrom,    setMonthFrom]    = useState(currentMonth());
  const [monthTo,      setMonthTo]      = useState(currentMonth());
  const [classId,      setClassId]      = useState('');
  const [summary,      setSummary]      = useState([]);
  const [outstanding,  setOut]          = useState([]);
  const [classColl,    setClassColl]    = useState([]);
  const [tab,          setTab]          = useState('monthly');
  const [loading,      setLoading]      = useState(false);
  const [ccLoading,    setCcLoading]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, oRes] = await Promise.all([
        getMonthlySummary({ month_from: monthFrom, month_to: monthTo, ...(classId ? { class_id: classId } : {}) }),
        getOutstandingBalances({ ...(classId ? { class_id: classId } : {}) }),
      ]);
      setSummary(Array.isArray(sRes.data) ? sRes.data : []);
      setOut(Array.isArray(oRes.data) ? oRes.data : []);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  }, [monthFrom, monthTo, classId]);

  const loadClassCollection = useCallback(async () => {
    setCcLoading(true);
    try {
      const res = await getClassFeeCollection(monthFrom);
      setClassColl(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    } catch { toast.error('Failed to load class collection report'); }
    finally { setCcLoading(false); }
  }, [monthFrom]);

  useEffect(() => { load(); }, [load]);

  const handleExportSummary = async () => {
    try {
      const res = await getExportURL({ billing_month: monthFrom, ...(classId ? { class_id: classId } : {}) });
      downloadBlob(res.data, `fees_summary_${monthFrom || 'all'}.csv`);
    } catch { toast.error('Export failed'); }
  };

  const totalBilled    = summary.reduce((a, r) => a + parseFloat(r.total_billed    || 0), 0);
  const totalCollected = summary.reduce((a, r) => a + parseFloat(r.total_collected || 0), 0);
  const totalPending   = summary.reduce((a, r) => a + parseFloat(r.total_pending   || 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">From Month</label>
            <input type="month" value={monthFrom} onChange={e => setMonthFrom(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">To Month</label>
            <input type="month" value={monthTo} onChange={e => setMonthTo(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
          <Sel label="Class" value={classId} onChange={setClassId} className="w-44">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Sel>
          <div className="flex items-end gap-2">
            <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExportSummary}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-md"
              style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary totals */}
      {summary.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[['Total Billed', totalBilled, '#6366f1'], ['Collected', totalCollected, '#16a34a'], ['Pending', totalPending, '#dc2626']].map(([l, v, c]) => (
            <div key={l} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="text-xs text-slate-400 mb-1">{l}</div>
              <div className="text-2xl font-bold" style={{ color: c }}>Rs. {fmt(v)}</div>
              {l === 'Collected' && totalBilled > 0 && (
                <div className="text-xs text-slate-400 mt-1">{Math.round((totalCollected/totalBilled)*100)}% collection rate</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[['monthly','Monthly Summary'],['outstanding','Outstanding Balances'],['class-collection','Class Collection']].map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k); if (k === 'class-collection') loadClassCollection(); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === k ? 'text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            style={tab === k ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 flex items-center justify-center shadow-sm">
          <div className="w-8 h-8 border-2 border-t-emerald-600 border-emerald-200 rounded-full animate-spin" />
        </div>
      ) : tab === 'monthly' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {summary.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No data for selected period</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  {['Month','Invoices','Paid','Partial','Unpaid','Billed','Collected','Pending','Collection %'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.map((r, i) => {
                  const pct = r.total_billed > 0 ? Math.round((r.total_collected / r.total_billed) * 100) : 0;
                  return (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{r.billing_month}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.total_invoices}</td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold">{r.paid_count}</td>
                      <td className="px-4 py-3 text-amber-600 font-semibold">{r.partial_count}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold">{r.unpaid_count}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">Rs. {fmt(r.total_billed)}</td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold">Rs. {fmt(r.total_collected)}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold">Rs. {fmt(r.total_pending)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626' }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : tab === 'outstanding' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {outstanding.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{outstanding.length} student{outstanding.length !== 1 ? 's' : ''} with outstanding balance</span>
              <button
                onClick={() => {
                  const p = new URLSearchParams();
                  if (classId) { p.set('class_id', classId); }
                  window.open(`/fees/defaulters/print?${p}`, '_blank');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-800/40 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
                <Printer size={12} /> Print Defaulters List
              </button>
            </div>
          )}
          {outstanding.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
              <p className="font-semibold text-slate-500 dark:text-slate-400">No outstanding balances!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  {['Student','Class','Invoices','Total Billed','Total Paid','Outstanding'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outstanding.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{r.full_name}</div>
                      {r.roll_number && <div className="text-xs text-slate-400">Roll: {r.roll_number}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{r.class_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.invoices}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Rs. {fmt(r.total_billed)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">Rs. {fmt(r.total_paid)}</td>
                    <td className="px-4 py-3 font-bold text-red-600">Rs. {fmt(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Class-wise Collection — {monthFrom}</span>
            <button onClick={loadClassCollection} disabled={ccLoading}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
              <RefreshCw size={13} className={ccLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          {ccLoading ? (
            <div className="p-12 flex justify-center"><div className="w-8 h-8 border-2 border-t-indigo-600 border-indigo-200 rounded-full animate-spin" /></div>
          ) : classColl.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No data for {monthFrom}</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                    {['Class','Section','Students','Billed','Collected','Outstanding','Rate'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classColl.map((r, i) => {
                    const rate = r.total_billed > 0 ? Math.round((r.total_collected / r.total_billed) * 100) : 0;
                    return (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{r.class_name}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{r.section || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.total_students}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Rs. {fmt(r.total_billed)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">Rs. {fmt(r.total_collected)}</td>
                        <td className="px-4 py-3 font-bold text-red-600">Rs. {fmt(r.outstanding)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 w-20">
                              <div className="h-1.5 rounded-full transition-all"
                                style={{ width: `${Math.min(rate, 100)}%`, background: rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626' }} />
                            </div>
                            <span className="text-xs font-semibold" style={{ color: rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626' }}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={3} className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200 text-xs uppercase">Total</td>
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">Rs. {fmt(classColl.reduce((a,r) => a + parseFloat(r.total_billed||0), 0))}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">Rs. {fmt(classColl.reduce((a,r) => a + parseFloat(r.total_collected||0), 0))}</td>
                    <td className="px-4 py-3 font-bold text-red-600">Rs. {fmt(classColl.reduce((a,r) => a + parseFloat(r.outstanding||0), 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sibling Voucher Tab ───────────────────────────────────────
function SiblingsTab() {
  const [month,   setMonth]   = useState(currentMonth());
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [voucher, setVoucher] = useState(null);   // currently open voucher
  const [vLoad,   setVLoad]   = useState(false);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await getSiblingGroups(month);
      setGroups(res.data?.data || []);
    } catch { toast.error('Failed to load sibling groups'); }
    finally  { setLoading(false); }
  };

  const openVoucher = async (father_cnic) => {
    setVLoad(true);
    try {
      const res = await getSiblingVoucher(month, father_cnic);
      setVoucher(res.data?.voucher || null);
    } catch { toast.error('Failed to load voucher'); }
    finally  { setVLoad(false); }
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Billing Month</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className={INPUT_CLS + ' w-44'} />
          </div>
          <button onClick={loadGroups} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Users2 size={15} />}
            Load Sibling Groups
          </button>
        </div>
      </div>

      {/* Groups table */}
      {groups.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              {groups.length} Sibling Group{groups.length !== 1 ? 's' : ''} — {month}
            </h3>
            <span className="text-xs text-slate-400">Click a row to generate combined voucher</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700">
                  {['Father CNIC','Siblings','Combined Total','Outstanding',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(g => (
                  <tr key={g.father_cnic}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{g.father_cnic}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                        <Users2 size={11} /> {g.sibling_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      Rs. {fmt(g.combined_total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${g.combined_outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        Rs. {fmt(g.combined_outstanding)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openVoucher(g.father_cnic)} disabled={vLoad}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                        <Printer size={12} /> Voucher
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {groups.length === 0 && !loading && (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
          Select a month and click "Load Sibling Groups" to see families with multiple enrolled children.
        </div>
      )}

      {/* Voucher print modal */}
      {voucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white">Sibling Combined Voucher</h2>
                <p className="text-xs text-slate-400 mt-0.5">{voucher.voucher_ref} · {voucher.billing_month}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.open(`/fees/sibling-voucher/print?billing_month=${voucher.billing_month}&father_cnic=${encodeURIComponent(voucher.father_cnic)}`, '_blank')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors">
                  <Printer size={13} /> Print
                </button>
                <button onClick={() => setVoucher(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Voucher body */}
            <div className="p-6 space-y-5">
              {/* Family info */}
              <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-4 flex flex-wrap gap-4 justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Father / Guardian</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                    {voucher.father_name || '—'}
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{voucher.father_cnic}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Voucher Ref</p>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 font-mono">{voucher.voucher_ref}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{voucher.billing_month}</p>
                </div>
              </div>

              {/* Per-student sections */}
              {voucher.students.map((s, i) => (
                <div key={s.student_id || i} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700">
                    <div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-white">{s.full_name}</span>
                      <span className="ml-2 text-xs text-slate-400">{s.class_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">{s.invoice_no}</span>
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-1.5">
                    {(s.items || []).map((item, j) => (
                      <div key={j} className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{item.description}</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">Rs. {fmt(item.amount)}</span>
                      </div>
                    ))}
                    {s.discount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                        <span>Discount</span>
                        <span>− Rs. {fmt(s.discount)}</span>
                      </div>
                    )}
                    {s.fine > 0 && (
                      <div className="flex justify-between text-sm text-red-500">
                        <span>Late Fine</span>
                        <span>+ Rs. {fmt(s.fine)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-white border-t border-slate-100 dark:border-slate-700 pt-2 mt-2">
                      <span>Outstanding</span>
                      <span className={s.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600'}>
                        Rs. {fmt(s.outstanding)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Grand total */}
              <div className="bg-slate-800 dark:bg-slate-950 rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Total Billed</p>
                  <p className="text-sm font-semibold text-slate-300 mt-0.5">Rs. {fmt(voucher.combined_total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Combined Outstanding</p>
                  <p className="text-2xl font-bold text-white mt-0.5">Rs. {fmt(voucher.combined_outstanding)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function FeesPage() {
  const [tab,              setTab]             = useState('invoices');
  const { data: classes = [] }                 = useClasses();
  const [feeHeads,         setFeeHeads]        = useState([]);
  const [stats,            setStats]           = useState(null);
  const [sendingReminders, setSendingReminders]= useState(false);

  useEffect(() => {
    getFeeHeads().then(r => setFeeHeads(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    getDashboardStats().then(r => setStats(r.data?.data ?? r.data)).catch(() => {});
  }, []);

  const handleSendReminders = async () => {
    if (!window.confirm('Send fee reminders (email + SMS) to all parents with overdue or due-soon invoices?\n\nEach invoice will only be reminded once per day.')) return;
    setSendingReminders(true);
    try {
      const { data } = await sendFeeReminders({ channel: 'both', status: 'both' });
      toast.success(`Reminders sent — ${data.emailsSent} email(s), ${data.smsSent} SMS (${data.skipped} skipped)`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const TABS = [
    { key: 'invoices',    label: 'Invoices',     icon: ReceiptText  },
    { key: 'generate',    label: 'Generate',     icon: CalendarDays },
    { key: 'concessions', label: 'Concessions',  icon: Tag          },
    { key: 'setup',       label: 'Fee Setup',    icon: Settings2    },
    { key: 'reports',     label: 'Reports',      icon: BarChart3    },
    { key: 'siblings',    label: 'Siblings',     icon: Users2       },
    { key: 'analytics',   label: 'Analytics',    icon: TrendingUp   },
    { key: 'adjustments', label: 'Adjustments',  icon: Zap          },
    { key: 'defaulters',  label: 'Defaulters',   icon: AlertTriangle},
    { key: 'late-rules',  label: 'Late Rules',   icon: Clock3       },
    { key: 'policy',      label: 'Policy',       icon: Settings2    },
  ];

  return (
    <Layout>
      {/* ── Hero ─────────────────────────────────────── */}
      <div className="sticky top-14 lg:top-0 z-30 px-4 sm:px-6 lg:px-8 py-5"
        style={{ background: 'linear-gradient(135deg,#052e16 0%,#065f46 50%,#047857 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg,#34d399,#10b981)' }}>
                <Banknote size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Fee Management</h1>
                <p className="text-xs text-emerald-300 mt-0.5">Invoices · Payments · Reports</p>
              </div>
            </div>

            {/* Quick stats */}
            {stats && (
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { l: 'Collected',  v: `Rs.${fmt(stats.collected_this_month||0)}`, color: '#34d399' },
                  { l: 'Pending',    v: `Rs.${fmt(stats.total_pending||0)}`,        color: '#fbbf24' },
                  { l: 'Overdue',    v: stats.overdue_count || 0,                   color: '#f87171' },
                ].map(({ l, v, color }) => (
                  <div key={l} className="text-center px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                    <div className="text-base font-bold" style={{ color }}>{v}</div>
                    <div className="text-xs text-emerald-300">{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Send Reminders */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleSendReminders}
              disabled={sendingReminders}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all disabled:opacity-50 backdrop-blur-sm">
              {sendingReminders
                ? <><Loader2 size={12} className="animate-spin" /> Sending…</>
                : <><Mail size={12} /> Send Fee Reminders</>}
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-white/10 rounded-2xl p-1 backdrop-blur-sm w-fit">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === key ? 'bg-white text-slate-800 shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}>
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tab === 'invoices'    && <InvoicesTab    classes={classes} feeHeads={feeHeads} />}
        {tab === 'generate'    && <GenerateTab    classes={classes} />}
        {tab === 'concessions' && <ConcessionsTab classes={classes} feeHeads={feeHeads} />}
        {tab === 'setup'       && <SetupTab       classes={classes} />}
        {tab === 'reports'     && <ReportsTab     classes={classes} />}
        {tab === 'siblings'    && <SiblingsTab />}
        {tab === 'analytics'   && <FeeAnalyticsPage />}
        {tab === 'adjustments' && <AdjustmentsTab />}
        {tab === 'defaulters'  && <DefaultersWorkflowTab />}
        {tab === 'late-rules'  && <LateRulesTab />}
        {tab === 'policy'      && <PolicyTab />}
      </div>
    </Layout>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ADJUSTMENTS TAB  (Waiver / Refund / Correction workflow)
// ═══════════════════════════════════════════════════════════════
function AdjustmentsTab() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [status,      setStatus]      = useState('pending');
  const [form,        setForm]        = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [stuQuery,    setStuQuery]    = useState('');
  const [stuResults,  setStuResults]  = useState([]);
  const [stuLoading,  setStuLoading]  = useState(false);
  const [stuInvoices, setStuInvoices] = useState([]);
  const debRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getAdjustments({ status: status !== 'all' ? status : undefined });
      setItems((r.data?.data ?? r.data) || []);
    } catch { toast.error('Failed to load adjustments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  useEffect(() => {
    if (!form) { setStuQuery(''); setStuResults([]); setStuInvoices([]); return; }
  }, [form]);

  const searchStudents = (q) => {
    setStuQuery(q);
    clearTimeout(debRef.current);
    if (!q.trim()) { setStuResults([]); return; }
    debRef.current = setTimeout(async () => {
      setStuLoading(true);
      try {
        const r = await getStudents({ search: q, limit: 8 });
        setStuResults(Array.isArray(r.data) ? r.data : []);
      } catch { setStuResults([]); }
      finally { setStuLoading(false); }
    }, 280);
  };

  const pickStudent = async (stu) => {
    setStuQuery(stu.full_name);
    setStuResults([]);
    try {
      const r = await getInvoices({ student_id: stu.id, limit: 50 });
      const invs = (Array.isArray(r.data) ? r.data : []).filter(i => i.status !== 'cancelled' && i.status !== 'paid');
      setStuInvoices(invs);
    } catch { setStuInvoices([]); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createAdjustment(form);
      toast.success('Adjustment request submitted');
      setForm(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve and apply this adjustment?')) return;
    try {
      await approveAdjustment(id, {});
      toast.success('Adjustment approved and applied');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleReject = async (id) => {
    const notes = window.prompt('Rejection reason (optional):');
    if (notes === null) return;
    try {
      await rejectAdjustment(id, { notes });
      toast.success('Adjustment rejected');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const TYPE_COLORS = {
    waiver:      'bg-sky-100 text-sky-700',
    refund:      'bg-purple-100 text-purple-700',
    correction:  'bg-amber-100 text-amber-700',
    fine_waiver: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['pending','approved','rejected','all'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize transition-colors ${
                status === s ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
              }`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => setForm({ invoice_id: '', type: 'waiver', amount: '', reason: '' })}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">
          <Plus size={14} /> New Request
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No {status} adjustments</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {['Student','Invoice','Type','Amount','Reason','Status','Requested','Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700 dark:text-slate-200">{item.student_name}</p>
                    <p className="text-xs text-slate-400">{item.roll_number} · {item.class_name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{item.invoice_no}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TYPE_COLORS[item.type] || 'bg-slate-100 text-slate-600'}`}>
                      {item.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{PKR(item.amount)}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={item.reason}>{item.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize
                      ${item.status === 'approved' ? 'bg-green-100 text-green-700' :
                        item.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(item.requested_at).toLocaleDateString()}
                    {item.requested_by_name && <div>{item.requested_by_name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleApprove(item.id)}
                          className="px-2.5 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg">
                          Approve
                        </button>
                        <button onClick={() => handleReject(item.id)}
                          className="px-2.5 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg">
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create form modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white">New Adjustment Request</h3>
              <button onClick={() => setForm(null)}><X size={16} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              {/* Student search → Invoice picker */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Search Student</label>
                <div className="relative">
                  <input type="text" placeholder="Type student name…" value={stuQuery}
                    onChange={e => searchStudents(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
                  {stuLoading && <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />}
                  {stuResults.length > 0 && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg overflow-hidden">
                      {stuResults.map(s => (
                        <button key={s.id} type="button" onClick={() => pickStudent(s)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {s.full_name} <span className="text-xs text-slate-400">({s.roll_number})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Invoice *</label>
                <select required value={form.invoice_id}
                  onChange={e => setForm(f => ({ ...f, invoice_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  <option value="">Select invoice…</option>
                  {stuInvoices.map(i => (
                    <option key={i.id} value={i.id}>{i.invoice_no} — Rs.{fmt(i.net_amount || i.total_amount)} ({i.billing_month || i.invoice_type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  <option value="waiver">Waiver (reduce amount owed)</option>
                  <option value="fine_waiver">Fine Waiver (remove late fee)</option>
                  <option value="correction">Correction (fix billing error)</option>
                  <option value="refund">Refund (return paid amount)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Amount (PKR)</label>
                <input type="number" step="0.01" required min="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Reason *</label>
                <textarea required value={form.reason} rows={3}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                  {saving ? 'Submitting…' : 'Submit Request'}
                </button>
                <button type="button" onClick={() => setForm(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-sm rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DEFAULTERS WORKFLOW TAB
// ═══════════════════════════════════════════════════════════════
function DefaultersWorkflowTab() {
  const [defaulters, setDefaulters] = useState([]);
  const [actions,    setActions]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState(null);
  const [actionForm, setActionForm] = useState(null);

  const ACTION_TYPES = [
    { value: 'notice_sent',  label: 'Notice Sent' },
    { value: 'parent_called',label: 'Parent Called' },
    { value: 'sms_sent',     label: 'SMS Sent' },
    { value: 'email_sent',   label: 'Email Sent' },
    { value: 'escalated',    label: 'Escalated' },
    { value: 'resolved',     label: 'Resolved' },
    { value: 'other',        label: 'Other' },
  ];

  const ACTION_COLORS = {
    notice_sent:   'bg-blue-100 text-blue-700',
    parent_called: 'bg-purple-100 text-purple-700',
    sms_sent:      'bg-indigo-100 text-indigo-700',
    email_sent:    'bg-cyan-100 text-cyan-700',
    escalated:     'bg-red-100 text-red-700',
    resolved:      'bg-green-100 text-green-700',
    other:         'bg-slate-100 text-slate-600',
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getDefaultersList({});
      setDefaulters((r.data?.data ?? r.data) || []);
    } catch { toast.error('Failed to load defaulters'); }
    finally { setLoading(false); }
  };

  const loadActions = async (studentId) => {
    try {
      const r = await getDefaulterActions({ student_id: studentId });
      setActions(p => ({ ...p, [studentId]: (r.data?.data ?? r.data) || [] }));
    } catch { /* silent */ }
  };

  const toggleExpand = (id) => {
    setExpanded(e => e === id ? null : id);
    if (expanded !== id) loadActions(id);
  };

  const handleAddAction = async (e) => {
    e.preventDefault();
    try {
      await addDefaulterAction(actionForm);
      toast.success('Action logged');
      setActionForm(null);
      loadActions(actionForm.student_id);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const urgencyColor = (days) => {
    if (days > 60) return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    if (days > 30) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
    return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">
          Fee Defaulters
          {defaulters.length > 0 && <span className="ml-2 text-sm font-normal text-slate-400">({defaulters.length})</span>}
        </h3>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : defaulters.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-green-400" />
          No defaulters found
        </div>
      ) : (
        <div className="space-y-2">
          {defaulters.map(d => (
            <div key={d.student_id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30"
                onClick={() => toggleExpand(d.student_id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{d.full_name}</p>
                    <span className="text-xs text-slate-400">{d.roll_number}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{d.class_name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{PKR(d.total_owed)}</span>
                    {d.days_overdue != null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${urgencyColor(d.days_overdue)}`}>
                        {d.days_overdue}d overdue
                      </span>
                    )}
                    {d.last_action && (
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ACTION_COLORS[d.last_action] || 'bg-slate-100 text-slate-500'}`}>
                        {d.last_action.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setActionForm({ student_id: d.student_id, action_type: 'parent_called', notes: '', amount_owed: d.total_owed }); }}
                  className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shrink-0">
                  + Action
                </button>
                <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${expanded === d.student_id ? 'rotate-180' : ''}`} />
              </div>

              {expanded === d.student_id && (
                <div className="px-4 pb-3 border-t border-slate-50 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-3 mb-2">Action History</p>
                  {!actions[d.student_id] ? (
                    <p className="text-xs text-slate-400">Loading…</p>
                  ) : actions[d.student_id].length === 0 ? (
                    <p className="text-xs text-slate-400">No actions taken yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {actions[d.student_id].map(a => (
                        <div key={a.id} className="flex items-start gap-2 text-xs">
                          <span className={`mt-0.5 px-2 py-0.5 rounded-full font-semibold capitalize shrink-0 ${ACTION_COLORS[a.action_type] || 'bg-slate-100 text-slate-500'}`}>
                            {a.action_type.replace('_', ' ')}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">{a.notes || '—'}</span>
                          <span className="text-slate-300 dark:text-slate-600 ml-auto shrink-0">
                            {new Date(a.taken_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add action modal */}
      {actionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white">Log Action</h3>
              <button onClick={() => setActionForm(null)}><X size={16} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddAction} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Action Type</label>
                <select value={actionForm.action_type}
                  onChange={e => setActionForm(f => ({ ...f, action_type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                <textarea rows={3} value={actionForm.notes}
                  onChange={e => setActionForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
                  Save Action
                </button>
                <button type="button" onClick={() => setActionForm(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-sm rounded-lg text-slate-600 dark:text-slate-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LATE RULES TAB
// ═══════════════════════════════════════════════════════════════
function LateRulesTab() {
  const [rules,   setRules]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [running, setRunning] = useState(false);

  const BLANK = { name: '', applies_to: 'all', class_id: '', grade: '',
                  grace_days: 0, fine_type: 'percent', fine_value: '', max_fine: '',
                  recurs: false, recur_days: '', is_active: true };

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getLateRules();
      setRules((r.data?.data ?? r.data) || []);
    } catch { toast.error('Failed to load rules'); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (form.id) {
        await updateLateRule(form.id, form);
      } else {
        await createLateRule(form);
      }
      toast.success(form.id ? 'Rule updated' : 'Rule created');
      setForm(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try { await deleteLateRule(id); toast.success('Deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRun = async (dry = true) => {
    setRunning(true);
    try {
      await toast.promise(
        runLateFeeEngine({ dry_run: dry }),
        {
          loading: dry ? 'Running dry run…' : 'Applying late fee rules to overdue invoices…',
          success: (r) => {
            const d = r.data?.data ?? r.data;
            return dry
              ? `Dry run: ${d?.updated || 0} invoice(s) would be updated`
              : d?.message || `${d?.updated || 0} invoices updated`;
          },
          error: (err) => err?.response?.data?.message || 'Engine failed',
        }
      );
    } catch { }
    finally { setRunning(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Smart Late Fee Rules</h3>
        <div className="flex gap-2">
          <button onClick={() => handleRun(true)} disabled={running}
            className="px-3 py-1.5 text-xs border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 disabled:opacity-50">
            Dry Run
          </button>
          <button onClick={() => { if(window.confirm('Apply late fee rules to all overdue invoices now?')) handleRun(false); }}
            disabled={running}
            className="px-3 py-1.5 text-xs bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg">
            {running ? 'Running…' : 'Run Engine'}
          </button>
          <button onClick={() => setForm({ ...BLANK })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
            <Plus size={12} /> New Rule
          </button>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
        Rules are evaluated in order. The most specific matching rule (by class or grade) wins.
        Use "Dry Run" to preview before applying.
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No rules yet. Create one to automate late fees.</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {['Name','Applies To','Grace','Fine','Max Fine','Recurs','Status',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {rules.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{r.name}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{r.applies_to}{r.class_name ? ` — ${r.class_name}` : r.grade ? ` — Grade ${r.grade}` : ''}</td>
                  <td className="px-4 py-3 text-slate-500">{r.grace_days}d</td>
                  <td className="px-4 py-3 font-medium text-orange-600">
                    {r.fine_type === 'percent' ? `${r.fine_value}%` : PKR(r.fine_value)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{r.max_fine ? PKR(r.max_fine) : '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{r.recurs ? `Every ${r.recur_days}d` : 'Once'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setForm({ ...r })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-white">{form.id ? 'Edit Rule' : 'New Late Fee Rule'}</h3>
              <button onClick={() => setForm(null)}><X size={16} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Rule Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Applies To</label>
                <select value={form.applies_to} onChange={e => setForm(f => ({ ...f, applies_to: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  <option value="all">All Students</option>
                  <option value="class">Specific Class</option>
                  <option value="grade">Specific Grade</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Grace Period (days)</label>
                <input type="number" min="0" value={form.grace_days}
                  onChange={e => setForm(f => ({ ...f, grace_days: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Fine Type</label>
                <select value={form.fine_type} onChange={e => setForm(f => ({ ...f, fine_type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  <option value="percent">Percentage of Invoice</option>
                  <option value="fixed">Fixed Amount (PKR)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Fine Value *</label>
                <input type="number" step="0.01" required min="0.01" value={form.fine_value}
                  onChange={e => setForm(f => ({ ...f, fine_value: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Max Fine (PKR, optional)</label>
                <input type="number" step="0.01" value={form.max_fine}
                  onChange={e => setForm(f => ({ ...f, max_fine: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.recurs}
                    onChange={e => setForm(f => ({ ...f, recurs: e.target.checked }))}
                    className="rounded" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">Recurring fine</span>
                </label>
                {form.recurs && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">every</span>
                    <input type="number" min="1" value={form.recur_days}
                      onChange={e => setForm(f => ({ ...f, recur_days: e.target.value }))}
                      className="w-16 px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
                    <span className="text-xs text-slate-500">days</span>
                  </div>
                )}
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="rounded" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">Active</span>
                </label>
              </div>
              <div className="col-span-2 flex gap-2 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                  {saving ? 'Saving…' : (form.id ? 'Update Rule' : 'Create Rule')}
                </button>
                <button type="button" onClick={() => setForm(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-sm rounded-lg text-slate-600 dark:text-slate-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  POLICY TAB
// ═══════════════════════════════════════════════════════════════
function PolicyTab() {
  const [policy,  setPolicy]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [year,    setYear]    = useState(currentAcademicYear());

  const load = async () => {
    setLoading(true);
    try {
      const r = await getFeePolicy(year);
      setPolicy(r.data?.data ?? r.data);
    } catch { toast.error('Failed to load policy'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [year]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await upsertFeePolicy(year, policy);
      toast.success('Policy saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <label className="block text-xs font-medium text-slate-500">Academic Year</label>
        <select value={year} onChange={e => setYear(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : policy && (
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-6 space-y-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">Fee Policy — {year}</h3>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Auto-Generate Day of Month
              <span className="ml-1 text-slate-400">(1–28)</span>
            </label>
            <input type="number" min="1" max="28" value={policy.auto_generate_day || 1}
              onChange={e => setPolicy(p => ({ ...p, auto_generate_day: e.target.value }))}
              className="w-24 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
            <p className="text-xs text-slate-400 mt-1">Fees will be auto-generated on this day each month</p>
          </div>

          <div className="flex items-start gap-3">
            <input type="checkbox" id="carry_forward" checked={policy.carry_forward || false}
              onChange={e => setPolicy(p => ({ ...p, carry_forward: e.target.checked }))}
              className="rounded mt-0.5" />
            <div>
              <label htmlFor="carry_forward" className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                Carry Forward Unpaid Balances
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                When generating monthly fees, add previous unpaid amounts as an "Arrears" line item
              </p>
            </div>
          </div>

          {policy.carry_forward && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Arrears Label</label>
              <input value={policy.carry_forward_label || 'Arrears'}
                onChange={e => setPolicy(p => ({ ...p, carry_forward_label: e.target.value }))}
                className="w-full max-w-xs px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Invoice Lock After Days
              <span className="ml-1 text-slate-400">(leave blank = never lock)</span>
            </label>
            <input type="number" min="1" value={policy.lock_after_days || ''}
              onChange={e => setPolicy(p => ({ ...p, lock_after_days: e.target.value || null }))}
              className="w-24 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
            <p className="text-xs text-slate-400 mt-1">Invoices cannot be edited after this many days from month end</p>
          </div>

          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Policy'}
          </button>
        </form>
      )}
    </div>
  );
}
