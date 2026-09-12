import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getReceiptPrint } from '../api/fees';

// ── Helpers ──────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
};

const fmtTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
};

const METHOD_LABELS = {
  cash: 'Cash', bank: 'Bank Transfer', online: 'Online',
  cheque: 'Cheque', dd: 'Demand Draft',
};

// ── Template 1: Thermal (narrow) ────────────────────────────────────────
function ThermalReceipt({ r }) {
  const netAmt   = Number(r.net_amount  || 0);
  const balance  = Number(r.balance     || 0);
  const paidAmt  = Number(r.paid_amount || 0);
  const isPaid   = balance <= 0.01;
  const paymentIndex  = (r.invoice_payments || []).findIndex(p => p.id === r.id) + 1;
  const totalPayments = (r.invoice_payments || []).length;

  return (
    <div className="thermal-wrap">
      {/* Top stripe */}
      <div className="thermal-header">
        <p className="th-school">{r.school_name || 'SchoolMS'}</p>
        <p className="th-tagline">Excellence in Education</p>
        <div className="th-icon">✓</div>
        <p className="th-title">PAYMENT RECEIPT</p>
      </div>

      <div className="thermal-body">
        {/* Meta */}
        <div className="th-meta">
          <p className="th-receipt-no">{r.receipt_no}</p>
          <p className="th-date">{fmtDate(r.payment_date)}{r.created_at ? ` • ${fmtTime(r.created_at)}` : ''}</p>
          {totalPayments > 1 && <p className="th-date">Payment {paymentIndex} of {totalPayments}</p>}
          {/* QR code linking to public verification page */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 2px' }}>
            <QRCodeSVG
              value={`${window.location.origin}/verify-receipt/${r.receipt_no}`}
              size={72}
              level="M"
            />
          </div>
          <p style={{ textAlign: 'center', fontSize: '8px', color: '#888', marginTop: '2px' }}>Scan to verify</p>
        </div>

        <div className="th-dash" />

        {/* Student */}
        <div className="th-section-lbl">Student Details</div>
        <p className="th-bold">{r.student_name}</p>
        {r.father_name && <p className="th-sub">S/O: {r.father_name}</p>}
        <div className="th-rows">
          <TRow label="Roll No." value={r.roll_number || '—'} />
          <TRow label="Class"    value={r.class_name  || '—'} />
        </div>

        <div className="th-dash" />

        {/* Invoice */}
        <div className="th-section-lbl">Invoice Details</div>
        <div className="th-rows">
          <TRow label="Invoice No." value={r.invoice_no || '—'} />
          <TRow label="Type" value={r.invoice_type ? r.invoice_type.replace('_',' ') : '—'} />
          {r.billing_month && <TRow label="Month" value={r.billing_month} />}
        </div>

        <div className="th-dash" />

        {/* Payment */}
        <div className="th-section-lbl">Payment Details</div>
        <div className="th-rows">
          <TRow label="Date"   value={fmtDate(r.payment_date)} />
          <TRow label="Method" value={METHOD_LABELS[r.payment_method] || r.payment_method} />
          {r.bank_name       && <TRow label="Bank"     value={r.bank_name} />}
          {r.transaction_ref && <TRow label="Ref/TxnID" value={r.transaction_ref} />}
          {r.collector_name  && <TRow label="Received By" value={r.collector_name} />}
        </div>

        <div className="th-dash" />

        {/* Amounts */}
        <div className="th-rows">
          <TRow label="Total Invoice"   value={`PKR ${fmt(netAmt)}`} />
          <TRow label="Previously Paid" value={`PKR ${fmt(paidAmt - Number(r.amount))}`} />
        </div>

        <div className="th-amount-box">
          <p className="th-amt-lbl">Amount Received</p>
          <p className="th-amt-val">PKR {fmt(r.amount)}</p>
        </div>

        <div className={`th-balance-box ${isPaid ? 'paid' : 'due'}`}>
          <p className={`th-bal-lbl ${isPaid ? 'paid' : 'due'}`}>
            {isPaid ? '✓ Invoice Fully Paid' : 'Remaining Balance'}
          </p>
          {!isPaid && <p className="th-bal-val">PKR {fmt(balance)}</p>}
        </div>

        {r.remarks && <><div className="th-dash" /><p className="th-remark">{r.remarks}</p></>}

        <div className="th-dash" />
        <div className="th-footer">
          <p>Thank you for your payment!</p>
          <p>{r.school_address || '123 School Road, Lahore'}</p>
          {r.school_phone && <p>{r.school_phone}</p>}
          <p className="th-gen">Generated: {new Date().toLocaleString('en-PK')}</p>
        </div>
      </div>
    </div>
  );
}

function TRow({ label, value, bold }) {
  return (
    <div className={`th-row ${bold ? 'bold-row' : ''}`}>
      <span className="th-lbl">{label}</span>
      <span className="th-val">{value}</span>
    </div>
  );
}

// ── Template 2: A4 Formal ────────────────────────────────────────────────
function FormalReceipt({ r }) {
  const netAmt  = Number(r.net_amount  || 0);
  const balance = Number(r.balance     || 0);
  const paidAmt = Number(r.paid_amount || 0);
  const isPaid  = balance <= 0.01;

  return (
    <div className="formal-wrap">
      {/* Letterhead */}
      <div className="formal-letterhead">
        <div className="formal-logo-area">
          {r.school_logo
            ? <img src={r.school_logo} alt="logo" className="formal-logo" />
            : <div className="formal-logo-fallback">{(r.school_name || 'S').charAt(0)}</div>
          }
        </div>
        <div className="formal-school-info">
          <div className="formal-school-name">{r.school_name || 'SCHOOL MANAGEMENT SYSTEM'}</div>
          {r.school_address && <div className="formal-school-addr">{r.school_address}</div>}
          {r.school_phone   && <div className="formal-school-addr">{r.school_phone}</div>}
        </div>
        <div className="formal-receipt-meta">
          <div className="formal-receipt-label">PAYMENT RECEIPT</div>
          <div className="formal-receipt-no">{r.receipt_no}</div>
          <div className="formal-receipt-date">{fmtDate(r.payment_date)}</div>
          <div className={`formal-status ${isPaid ? 'status-paid' : 'status-partial'}`}>
            {isPaid ? '● PAID' : '● PARTIAL'}
          </div>
        </div>
      </div>

      <div className="formal-divider" />

      {/* Two-column: Student info + Payment info */}
      <div className="formal-cols">
        <div className="formal-col">
          <div className="formal-col-title">Received From</div>
          <div className="formal-student-name">{r.student_name}</div>
          {r.father_name && <div className="formal-col-row">S/O: {r.father_name}</div>}
          <table className="formal-table">
            <tbody>
              <FRow label="Roll Number" value={r.roll_number || '—'} />
              <FRow label="Class"       value={r.class_name  || '—'} />
              {r.billing_month && <FRow label="Billing Month" value={r.billing_month} />}
              <FRow label="Invoice No." value={r.invoice_no || '—'} />
              <FRow label="Invoice Type" value={r.invoice_type ? r.invoice_type.replace('_',' ') : '—'} />
            </tbody>
          </table>
        </div>
        <div className="formal-col">
          <div className="formal-col-title">Payment Information</div>
          <table className="formal-table">
            <tbody>
              <FRow label="Payment Date"   value={fmtDate(r.payment_date)} />
              <FRow label="Payment Method" value={METHOD_LABELS[r.payment_method] || r.payment_method} />
              {r.bank_name       && <FRow label="Bank Name"    value={r.bank_name} />}
              {r.transaction_ref && <FRow label="Reference No." value={r.transaction_ref} />}
              {r.collector_name  && <FRow label="Received By"   value={r.collector_name} />}
            </tbody>
          </table>
          {/* Amount box */}
          <div className="formal-amount-section">
            <div className="formal-amt-row">
              <span>Total Invoice</span>
              <span className="formal-amt-num">PKR {fmt(netAmt)}</span>
            </div>
            {paidAmt - Number(r.amount) > 0 && (
              <div className="formal-amt-row sub">
                <span>Previously Paid</span>
                <span className="formal-amt-num">PKR {fmt(paidAmt - Number(r.amount))}</span>
              </div>
            )}
            <div className="formal-amt-total">
              <span>AMOUNT RECEIVED</span>
              <span className="formal-amt-big">PKR {fmt(r.amount)}</span>
            </div>
            {!isPaid && (
              <div className="formal-amt-row due">
                <span>Balance Due</span>
                <span className="formal-amt-num due">PKR {fmt(balance)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {r.remarks && (
        <div className="formal-remarks">
          <span className="formal-remarks-lbl">Remarks:</span> {r.remarks}
        </div>
      )}

      {/* Previous payments on invoice */}
      {(r.invoice_payments || []).length > 1 && (
        <div className="formal-prev-payments">
          <div className="formal-col-title">Payment History on {r.invoice_no}</div>
          <table className="formal-history-table">
            <thead>
              <tr><th>Receipt No.</th><th>Date</th><th>Method</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {r.invoice_payments.map(p => (
                <tr key={p.id} className={p.id === r.id ? 'current-row' : ''}>
                  <td>{p.receipt_no}</td>
                  <td>{fmtDate(p.payment_date)}</td>
                  <td>{METHOD_LABELS[p.payment_method] || p.payment_method}</td>
                  <td className="right">PKR {fmt(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="formal-footer-area">
        <div className="formal-sig-col">
          <div className="formal-sig-line" />
          <div className="formal-sig-lbl">Cashier / Accountant</div>
        </div>
        <div className="formal-footer-note">
          This is a computer-generated receipt.<br />
          Generated: {new Date().toLocaleString('en-PK')}
        </div>
        <div className="formal-sig-col">
          <div className="formal-sig-line" />
          <div className="formal-sig-lbl">School Stamp / Principal</div>
        </div>
      </div>
    </div>
  );
}

function FRow({ label, value }) {
  return (
    <tr>
      <td className="formal-td-lbl">{label}</td>
      <td className="formal-td-val">{value}</td>
    </tr>
  );
}

// ── Template 3: Compact Slip ─────────────────────────────────────────────
function CompactSlip({ r }) {
  const netAmt  = Number(r.net_amount  || 0);
  const balance = Number(r.balance     || 0);
  const isPaid  = balance <= 0.01;

  return (
    <div className="compact-wrap">
      {/* Color bar header */}
      <div className="compact-header">
        <div>
          <div className="compact-school">{r.school_name || 'SchoolMS'}</div>
          <div className="compact-slip-title">FEE RECEIPT</div>
        </div>
        <div className="compact-right">
          <div className="compact-receipt-no">{r.receipt_no}</div>
          <div className="compact-date">{fmtDate(r.payment_date)}</div>
        </div>
      </div>

      {/* Student + Class */}
      <div className="compact-student-bar">
        <span className="compact-sname">{r.student_name}</span>
        <span className="compact-sclass">{r.class_name || '—'}</span>
        {r.roll_number && <span className="compact-sroll">Roll: {r.roll_number}</span>}
      </div>

      {/* Main info grid */}
      <div className="compact-grid">
        <CRow label="Father Name"    value={r.father_name   || '—'} />
        <CRow label="Invoice No."    value={r.invoice_no    || '—'} />
        {r.billing_month && <CRow label="Month"  value={r.billing_month} />}
        <CRow label="Payment Method" value={METHOD_LABELS[r.payment_method] || r.payment_method} />
        {r.bank_name       && <CRow label="Bank"   value={r.bank_name} />}
        {r.transaction_ref && <CRow label="Ref No." value={r.transaction_ref} />}
        {r.collector_name  && <CRow label="Received By" value={r.collector_name} />}
      </div>

      {/* Amount band */}
      <div className="compact-amount-band">
        <div className="compact-amt-item">
          <div className="compact-amt-lbl">Invoice Total</div>
          <div className="compact-amt-val compact-small">PKR {fmt(netAmt)}</div>
        </div>
        <div className="compact-amt-divider" />
        <div className="compact-amt-item highlight">
          <div className="compact-amt-lbl">Paid Now</div>
          <div className="compact-amt-val compact-big">PKR {fmt(r.amount)}</div>
        </div>
        <div className="compact-amt-divider" />
        <div className={`compact-amt-item ${isPaid ? 'paid' : 'due'}`}>
          <div className="compact-amt-lbl">{isPaid ? 'Status' : 'Balance'}</div>
          <div className={`compact-amt-val ${isPaid ? 'compact-paid' : 'compact-due'}`}>
            {isPaid ? '✓ PAID' : `PKR ${fmt(balance)}`}
          </div>
        </div>
      </div>

      {r.remarks && <div className="compact-remarks">{r.remarks}</div>}

      <div className="compact-footer">
        <span>{r.school_address || 'Thank you for your payment!'}</span>
        <span className="compact-gen">Generated: {new Date().toLocaleString('en-PK')}</span>
      </div>
    </div>
  );
}

function CRow({ label, value }) {
  return (
    <div className="compact-row">
      <span className="compact-lbl">{label}</span>
      <span className="compact-val">{value}</span>
    </div>
  );
}

// ── Template config ──────────────────────────────────────────────────────
const TEMPLATES = [
  { id: '1', label: 'Thermal'  },
  { id: '2', label: 'A4 Formal'},
  { id: '3', label: 'Compact'  },
];

// ── Main page ────────────────────────────────────────────────────────────
export default function FeeReceiptPrint() {
  const { id }                      = useParams();
  const navigate                    = useNavigate();
  const [searchParams]              = useSearchParams();
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [template, setTemplate]     = useState(searchParams.get('template') || '1');

  // Inject print styles based on selected template
  useEffect(() => {
    const style = document.createElement('style');
    const pageSize = template === '1' ? '80mm auto' : template === '3' ? 'A5 landscape' : 'A4';
    style.textContent = `
      @media print {
        body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
        .receipt-outer { padding: 0 !important; background: white !important; }
        @page { margin: ${template === '1' ? '4mm' : '10mm'}; size: ${pageSize}; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [template]);

  useEffect(() => {
    getReceiptPrint(id)
      .then(r => setData(r.data?.data ?? r.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load receipt'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading receipt…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center text-red-500">
        <AlertCircle size={40} className="mx-auto mb-3" />
        <p className="font-medium">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-slate-500 hover:underline">← Go back</button>
      </div>
    </div>
  );

  const r = data;

  return (
    <div className="receipt-outer min-h-screen bg-gray-100 py-8 px-4 flex flex-col items-center">

      {/* ── Toolbar ── */}
      <div className="no-print w-full max-w-3xl mb-4 flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 shadow-sm">
          <ArrowLeft size={15} /> Back
        </button>

        {/* Template switcher */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
          <span className="text-xs text-slate-400 mr-1">Template:</span>
          {TEMPLATES.map(t => (
            <button key={t.id}
              onClick={() => setTemplate(t.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                template === t.id
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow hover:bg-emerald-700 ml-auto">
          <Printer size={15} /> Print
        </button>
      </div>

      {/* ── Receipt ── */}
      <div className={`w-full ${template === '1' ? 'max-w-sm' : template === '3' ? 'max-w-2xl' : 'max-w-3xl'}`}>
        {template === '1' && <ThermalReceipt r={r} />}
        {template === '2' && <FormalReceipt  r={r} />}
        {template === '3' && <CompactSlip    r={r} />}
      </div>

      {/* All payments on invoice (screen only) */}
      {(r.invoice_payments || []).length > 1 && (
        <div className="no-print w-full max-w-sm mt-4 bg-white rounded-2xl shadow border border-slate-200 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">All Payments on {r.invoice_no}</p>
          <div className="space-y-2">
            {r.invoice_payments.map(p => (
              <div key={p.id}
                className={`flex items-center justify-between text-sm py-2 px-3 rounded-lg ${p.id === r.id ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
                <div>
                  <p className="font-mono text-xs text-emerald-700">{p.receipt_no}</p>
                  <p className="text-xs text-slate-400">{fmtDate(p.payment_date)} · {p.payment_method}</p>
                </div>
                <p className="font-bold font-mono text-slate-700">PKR {fmt(p.amount)}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-sm mt-3 pt-3 border-t border-slate-200">
            <span>Total Paid</span>
            <span className="font-mono text-emerald-700">PKR {fmt(r.paid_amount)}</span>
          </div>
        </div>
      )}

      <style>{`
        /* ══════════════ TEMPLATE 1: THERMAL ══════════════ */
        .thermal-wrap {
          background: white; border-radius: 12px; overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12); font-family: Arial, sans-serif;
        }
        .thermal-header {
          background: linear-gradient(135deg,#064e3b,#065f46); color: white;
          padding: 20px 24px; text-align: center;
        }
        .th-school   { font-size: 17px; font-weight: 900; letter-spacing: -0.3px; }
        .th-tagline  { font-size: 11px; color: #6ee7b7; margin-top: 1px; }
        .th-icon     {
          width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; margin: 10px auto 6px;
        }
        .th-title    { font-size: 13px; font-weight: 700; color: white; letter-spacing: 0.06em; }
        .thermal-body { padding: 20px 24px; }
        .th-meta        { text-align: center; margin-bottom: 12px; }
        .th-receipt-no  { font-size: 18px; font-weight: 900; font-family: monospace; color: #064e3b; }
        .th-date        { font-size: 11px; color: #94a3b8; margin-top: 2px; }
        .th-dash        { border-top: 1px dashed #cbd5e1; margin: 10px 0; }
        .th-section-lbl { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
        .th-bold        { font-size: 14px; font-weight: 700; color: #0f172a; }
        .th-sub         { font-size: 12px; color: #64748b; margin-top: 1px; }
        .th-rows        { margin-top: 6px; display: flex; flex-direction: column; gap: 3px; }
        .th-row         { display: flex; justify-content: space-between; font-size: 12px; }
        .th-lbl         { color: #64748b; }
        .th-val         { font-family: monospace; font-size: 11px; color: #1e293b; text-align: right; }
        .bold-row .th-val { font-weight: 700; }
        .th-amount-box  {
          margin-top: 10px; background: #ecfdf5; border: 1px solid #a7f3d0;
          border-radius: 10px; padding: 10px; text-align: center;
        }
        .th-amt-lbl { font-size: 10px; color: #059669; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .th-amt-val { font-size: 26px; font-weight: 900; font-family: monospace; color: #065f46; margin-top: 2px; }
        .th-balance-box {
          margin-top: 8px; border-radius: 10px; padding: 8px; text-align: center;
        }
        .th-balance-box.paid { background: #ecfdf5; border: 1px solid #a7f3d0; }
        .th-balance-box.due  { background: #fffbeb; border: 1px solid #fde68a; }
        .th-bal-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .th-bal-lbl.paid { color: #059669; }
        .th-bal-lbl.due  { color: #d97706; }
        .th-bal-val { font-size: 18px; font-weight: 900; font-family: monospace; color: #92400e; margin-top: 2px; }
        .th-remark { font-size: 11px; color: #64748b; text-align: center; font-style: italic; }
        .th-footer { text-align: center; font-size: 10px; color: #94a3b8; line-height: 1.8; }
        .th-gen    { font-family: monospace; font-size: 9px; margin-top: 6px; }

        /* ══════════════ TEMPLATE 2: A4 FORMAL ══════════════ */
        .formal-wrap {
          background: white; border-radius: 12px; overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12); font-family: Arial, sans-serif;
          padding: 32px 36px;
        }
        .formal-letterhead {
          display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px;
        }
        .formal-logo-area { flex-shrink: 0; }
        .formal-logo     { width: 64px; height: 64px; border-radius: 8px; object-fit: contain; }
        .formal-logo-fallback {
          width: 64px; height: 64px; border-radius: 8px; background: #1e293b;
          color: white; font-size: 28px; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
        }
        .formal-school-info { flex: 1; }
        .formal-school-name { font-size: 18px; font-weight: 900; color: #0f172a; }
        .formal-school-addr { font-size: 12px; color: #64748b; margin-top: 2px; }
        .formal-receipt-meta { text-align: right; flex-shrink: 0; }
        .formal-receipt-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }
        .formal-receipt-no   { font-size: 20px; font-weight: 900; font-family: monospace; color: #064e3b; margin-top: 2px; }
        .formal-receipt-date { font-size: 12px; color: #64748b; margin-top: 2px; }
        .formal-status { font-size: 11px; font-weight: 700; margin-top: 4px; border-radius: 20px; padding: 2px 10px; display: inline-block; }
        .formal-status.status-paid    { background: #dcfce7; color: #166534; }
        .formal-status.status-partial { background: #fef9c3; color: #854d0e; }
        .formal-divider { border: none; border-top: 2px solid #e2e8f0; margin: 4px 0 16px; }
        .formal-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 16px; }
        .formal-col  { }
        .formal-col-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 8px; }
        .formal-student-name { font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
        .formal-col-row { font-size: 12px; color: #475569; margin-bottom: 6px; }
        .formal-table { width: 100%; border-collapse: collapse; }
        .formal-td-lbl { font-size: 11px; color: #94a3b8; padding: 3px 8px 3px 0; white-space: nowrap; vertical-align: top; width: 120px; }
        .formal-td-val { font-size: 12px; color: #1e293b; padding: 3px 0; vertical-align: top; font-weight: 500; }
        .formal-amount-section { margin-top: 12px; background: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #e2e8f0; }
        .formal-amt-row  { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; padding: 2px 0; }
        .formal-amt-row.sub  { font-size: 11px; }
        .formal-amt-row.due  { color: #dc2626; }
        .formal-amt-num { font-family: monospace; color: #1e293b; }
        .formal-amt-num.due  { color: #dc2626; }
        .formal-amt-total {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 8px; padding-top: 8px; border-top: 2px solid #e2e8f0;
          font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;
        }
        .formal-amt-big { font-size: 20px; font-family: monospace; color: #064e3b; font-weight: 900; }
        .formal-remarks { font-size: 12px; color: #64748b; background: #f8fafc; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; }
        .formal-remarks-lbl { font-weight: 700; color: #374151; }
        .formal-prev-payments { margin-top: 16px; }
        .formal-history-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
        .formal-history-table th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; padding: 5px 8px; text-align: left; }
        .formal-history-table td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; color: #374151; }
        .formal-history-table .current-row td { background: #ecfdf5; }
        .formal-history-table .right { text-align: right; font-family: monospace; }
        .formal-footer-area {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;
        }
        .formal-sig-col { text-align: center; }
        .formal-sig-line { width: 120px; border-bottom: 1.5px solid #374151; margin-bottom: 4px; }
        .formal-sig-lbl  { font-size: 10px; color: #64748b; white-space: nowrap; }
        .formal-footer-note { font-size: 10px; color: #94a3b8; text-align: center; line-height: 1.6; }

        /* ══════════════ TEMPLATE 3: COMPACT SLIP ══════════════ */
        .compact-wrap {
          background: white; border-radius: 12px; overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12); font-family: Arial, sans-serif;
        }
        .compact-header {
          background: linear-gradient(135deg,#1e40af,#1d4ed8); color: white;
          padding: 14px 20px; display: flex; justify-content: space-between; align-items: center;
        }
        .compact-school     { font-size: 15px; font-weight: 900; }
        .compact-slip-title { font-size: 10px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 1px; }
        .compact-right      { text-align: right; }
        .compact-receipt-no { font-size: 14px; font-weight: 900; font-family: monospace; }
        .compact-date       { font-size: 11px; color: rgba(255,255,255,0.75); margin-top: 1px; }
        .compact-student-bar {
          background: #1e293b; color: white;
          padding: 8px 20px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        }
        .compact-sname  { font-size: 14px; font-weight: 900; }
        .compact-sclass { font-size: 11px; color: #94a3b8; background: #334155; padding: 1px 8px; border-radius: 20px; }
        .compact-sroll  { font-size: 11px; color: #94a3b8; }
        .compact-grid {
          padding: 12px 20px;
          display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .compact-row  { display: flex; flex-direction: column; }
        .compact-lbl  { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
        .compact-val  { font-size: 12px; color: #1e293b; font-weight: 500; }
        .compact-amount-band {
          display: flex; align-items: stretch; background: #f8fafc;
          border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;
        }
        .compact-amt-item {
          flex: 1; padding: 12px 16px; text-align: center; display: flex; flex-direction: column; gap: 2px;
        }
        .compact-amt-item.highlight { background: #ecfdf5; }
        .compact-amt-item.paid      { background: #ecfdf5; }
        .compact-amt-item.due       { background: #fffbeb; }
        .compact-amt-divider { width: 1px; background: #e2e8f0; }
        .compact-amt-lbl   { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
        .compact-amt-val   { font-weight: 700; font-family: monospace; }
        .compact-small     { font-size: 14px; color: #374151; }
        .compact-big       { font-size: 20px; color: #064e3b; }
        .compact-paid      { font-size: 16px; color: #059669; }
        .compact-due       { font-size: 18px; color: #d97706; }
        .compact-remarks {
          font-size: 11px; color: #64748b; padding: 8px 20px;
          border-bottom: 1px solid #f1f5f9; font-style: italic;
        }
        .compact-footer {
          padding: 8px 20px; display: flex; justify-content: space-between; align-items: center;
          font-size: 10px; color: #94a3b8;
        }
        .compact-gen { font-family: monospace; font-size: 9px; }
      `}</style>
    </div>
  );
}
