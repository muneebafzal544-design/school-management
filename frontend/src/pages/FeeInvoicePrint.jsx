import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, AlertCircle, Languages } from 'lucide-react';
import { getInvoicePrint } from '../api/fees';
import { useLabels } from '../utils/urduLabels';

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
};
const fmtShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_LABEL = {
  paid:      { label: 'PAID',     color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  partial:   { label: 'PARTIAL',  color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  unpaid:    { label: 'UNPAID',   color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  overdue:   { label: 'OVERDUE',  color: '#7c3aed', bg: '#faf5ff', border: '#d8b4fe' },
  cancelled: { label: 'CANCELLED',color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' },
};

const METHOD_LABELS = {
  cash: 'Cash', bank: 'Bank Transfer', online: 'Online', cheque: 'Cheque', dd: 'Demand Draft',
};

// ── Print styles injected into head ──────────────────────────
const PRINT_STYLES = `
  @media print {
    body { background: white !important; }
    .no-print { display: none !important; }
    .print-page { box-shadow: none !important; margin: 0 !important; padding: 16mm 20mm !important; max-width: 100% !important; border-radius: 0 !important; }
    @page { margin: 0; size: A4; }
  }
`;

const URDU_FONT_LINK = 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap';
const URDU_FONT_FAMILY = "'Noto Nastaliq Urdu', serif";

// ── Fee breakdown with per-head grouping + subtotals ─────────────
function FeeBreakdownTable({ items, T }) {
  // Group items by head_name; ungrouped items fall under 'Other'
  const groups = items.reduce((acc, item) => {
    const key = item.head_name || 'Other Charges';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const groupKeys = Object.keys(groups);
  const multiGroup = groupKeys.length > 1;
  let rowIdx = 0;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50">
          <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide rounded-l-lg w-8">#</th>
          <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{T('description', 'Description')}</th>
          {multiGroup && (
            <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{T('feeHead', 'Fee Head')}</th>
          )}
          <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide rounded-r-lg">{T('amount', 'Amount (PKR)')}</th>
        </tr>
      </thead>
      <tbody>
        {groupKeys.map(headName => {
          const groupItems = groups[headName];
          const groupTotal = groupItems.filter(i => !i.is_waived).reduce((s, i) => s + Number(i.amount || 0), 0);
          return (
            <>
              {groupItems.map(item => {
                rowIdx++;
                return (
                  <tr key={item.id} className={`border-b border-slate-100 ${item.is_waived ? 'opacity-50' : ''}`}>
                    <td className="py-2.5 px-3 text-slate-400 text-xs">{rowIdx}</td>
                    <td className="py-2.5 px-3">
                      <span className={`font-medium ${item.is_waived ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {item.description}
                      </span>
                      {item.is_waived && (
                        <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{T('waived', 'Waived')}</span>
                      )}
                    </td>
                    {multiGroup && (
                      <td className="py-2.5 px-3">
                        <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                          {item.head_name || '—'}
                        </span>
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {item.is_waived
                        ? <span className="line-through text-slate-400">{fmt(item.amount)}</span>
                        : fmt(item.amount)
                      }
                    </td>
                  </tr>
                );
              })}
              {multiGroup && (
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <td colSpan={3} className="py-1.5 px-3 text-xs font-semibold text-slate-500 text-right pr-6">
                    {headName} {T('subtotal', 'Subtotal')}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-xs font-semibold text-slate-600">
                    {fmt(groupTotal)}
                  </td>
                </tr>
              )}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

export default function FeeInvoicePrint() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [isUrdu, setIsUrdu]   = useState(false);
  const T = useLabels(isUrdu);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = PRINT_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Load Urdu font on demand
  useEffect(() => {
    if (!isUrdu) return;
    if (document.getElementById('urdu-font-link')) return;
    const link = document.createElement('link');
    link.id   = 'urdu-font-link';
    link.rel  = 'stylesheet';
    link.href = URDU_FONT_LINK;
    document.head.appendChild(link);
  }, [isUrdu]);

  useEffect(() => {
    getInvoicePrint(id)
      .then(r => setData(r.data?.data ?? r.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading invoice…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center text-red-500">
        <AlertCircle size={40} className="mx-auto mb-3" />
        <p className="font-medium">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-slate-500 hover:underline">← Go back</button>
      </div>
    </div>
  );

  const { invoice, items, payments } = data;
  const status  = STATUS_LABEL[invoice.invoice_status || invoice.status] || STATUS_LABEL.unpaid;
  const netAmt  = Number(invoice.net_amount  || 0);
  const balance = Number(invoice.balance     || 0);
  const paidAmt = Number(invoice.paid_amount || 0);
  const disc    = Number(invoice.discount_amount || 0);
  const fine    = Number(invoice.fine_amount     || 0);

  const pageStyle = isUrdu ? { direction: 'rtl', fontFamily: URDU_FONT_FAMILY } : {};

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {/* Action toolbar */}
      <div className="no-print max-w-3xl mx-auto mb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 shadow-sm">
          <ArrowLeft size={15} /> {T('back', 'Back')}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsUrdu(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 shadow-sm">
            <Languages size={15} />
            {isUrdu ? 'English' : 'اردو'}
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow hover:bg-emerald-700">
            <Printer size={15} /> {T('print', 'Print Invoice')}
          </button>
        </div>
      </div>

      {/* Invoice paper */}
      <div className="print-page max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden" style={pageStyle}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }} className="px-8 py-7 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">SchoolMS</h1>
              <p className="text-emerald-300 text-xs mt-0.5">{T('excellenceInEd', 'Excellence in Education')}</p>
              <div className="mt-3 text-xs text-emerald-200 space-y-0.5">
                <p>123 School Road, Lahore, Pakistan</p>
                <p>Tel: +92-42-1234567 | info@schoolms.edu.pk</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold border mb-2"
                style={{ background: status.bg, color: status.color, borderColor: status.border }}>
                {status.label}
              </div>
              <p className="text-2xl font-black text-white">{invoice.invoice_no || `INV-${invoice.id}`}</p>
              <p className="text-emerald-300 text-xs mt-1 capitalize">
                {invoice.invoice_type} {T('feeInvoice', 'Fee Invoice')}
                {invoice.billing_month && ` — ${invoice.billing_month}`}
              </p>
              <p className="text-emerald-200 text-xs mt-0.5">{T('issueDate', 'Issued')}: {fmtDate(invoice.issued_at)}</p>
            </div>
          </div>
        </div>

        {/* ── STUDENT INFO ────────────────────────────────────── */}
        <div className="px-8 py-5 bg-emerald-50 border-b border-emerald-100">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">{T('billTo', 'Bill To')}</p>
              <p className="font-bold text-slate-800 text-lg leading-tight">{invoice.student_name}</p>
              {invoice.father_name && <p className="text-sm text-slate-600 mt-0.5">S/O: {invoice.father_name}</p>}
              {invoice.address && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{invoice.student_address}</p>}
              {invoice.student_phone && <p className="text-xs text-slate-500 mt-0.5">📞 {invoice.student_phone}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{T('rollNumber', 'Roll Number')}</span>
                <span className="font-semibold text-slate-700">{invoice.roll_number || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{T('class', 'Class')}</span>
                <span className="font-semibold text-slate-700">{invoice.class_name || '—'}</span>
              </div>
              {invoice.academic_year && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{T('academicYear', 'Academic Year')}</span>
                  <span className="font-semibold text-slate-700">{invoice.academic_year}</span>
                </div>
              )}
              {invoice.due_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{T('dueDate', 'Due Date')}</span>
                  <span className={`font-semibold ${new Date(invoice.due_date) < new Date() && balance > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {fmtDate(invoice.due_date)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── FEE BREAKDOWN TABLE ──────────────────────────────── */}
        <div className="px-8 py-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">{T('feeBreakdown', 'Fee Breakdown')}</p>
          <FeeBreakdownTable items={items} T={T} />

          {/* Totals block */}
          <div className="mt-4 flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm text-slate-600 py-1">
                <span>{T('subtotal', 'Subtotal (before adjustments)')}</span>
                <span className="font-mono">PKR {fmt(invoice.total_amount)}</span>
              </div>
              {disc > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 py-1">
                  <span>{T('discount', 'Discount / Concession')}</span>
                  <span className="font-mono">− PKR {fmt(disc)}</span>
                </div>
              )}
              {fine > 0 && (
                <div className="flex justify-between text-sm text-red-600 py-1 border border-red-100 bg-red-50 rounded px-2 -mx-2">
                  <span className="font-medium">{T('lateFine', 'Late Payment Fine')}</span>
                  <span className="font-mono font-semibold">+ PKR {fmt(fine)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-800 border-t-2 border-slate-300 pt-2 text-base">
                <span>{T('totalNetPayable', 'Total Net Payable')}</span>
                <span className="font-mono">PKR {fmt(netAmt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── PAYMENT HISTORY ──────────────────────────────────── */}
        {payments.length > 0 && (
          <div className="px-8 pb-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">{T('paymentHistory', 'Payment History')}</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{T('receiptNo', 'Receipt No.')}</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{T('date', 'Date')}</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{T('method', 'Method')}</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{T('amountPaid', 'Amount Paid')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-mono text-xs text-emerald-700">{p.receipt_no}</td>
                    <td className="py-2 px-3 text-slate-600">{fmtShort(p.payment_date)}</td>
                    <td className="py-2 px-3 text-slate-600 capitalize">
                      {isUrdu ? (T(p.payment_method, METHOD_LABELS[p.payment_method] || p.payment_method)) : (METHOD_LABELS[p.payment_method] || p.payment_method)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">PKR {fmt(p.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50">
                  <td colSpan={3} className="py-2 px-3 font-bold text-slate-700">{T('totalPaid', 'Total Paid')}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">PKR {fmt(paidAmt)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── BALANCE SUMMARY ──────────────────────────────────── */}
        <div className="px-8 pb-6">
          <div className={`rounded-xl p-4 border ${balance > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{T('outstandingBalance', 'Outstanding Balance')}</p>
                <p className={`text-3xl font-black mt-1 font-mono ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  PKR {fmt(balance)}
                </p>
              </div>
              <div className="text-right text-sm text-slate-500 space-y-1">
                <p>{T('netPayable', 'Net Payable')}: <strong className="text-slate-700">PKR {fmt(netAmt)}</strong></p>
                <p>{T('amountPaid', 'Amount Paid')}: <strong className="text-emerald-700">PKR {fmt(paidAmt)}</strong></p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="px-8 pb-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{T('notes', 'Notes')}</p>
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}

        {/* ── FOOTER ───────────────────────────────────────────── */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-end justify-between gap-4">
          <div className="text-xs text-slate-400 space-y-0.5">
            <p>{T('computerGenerated', 'This is a computer-generated invoice and does not require a signature.')}</p>
            <p>{T('contactAccounts', 'For queries, contact the accounts office during school hours.')}</p>
          </div>
          {/* QR code for quick payment verification */}
          <div className="flex flex-col items-center shrink-0">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
                `INV:${invoice.invoice_no || invoice.id}\nAmt:PKR${fmt(netAmt)}\nDue:${invoice.due_date || ''}\nBal:PKR${fmt(balance)}`
              )}`}
              alt="QR"
              width={80} height={80}
              className="rounded border border-slate-200"
            />
            <p className="text-[9px] text-slate-400 mt-1 text-center">{T('scanToVerify', 'Scan to verify')}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="w-32 border-t-2 border-slate-300 pt-1">
              <p className="text-[10px] text-slate-400">{T('authorisedSignature', 'Authorised Signature')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
