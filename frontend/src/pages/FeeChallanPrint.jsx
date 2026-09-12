import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft, AlertCircle, Languages } from 'lucide-react';
import { getChallanPrint } from '../api/fees';
import { useLabels } from '../utils/urduLabels';

const URDU_FONT_LINK   = 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap';
const URDU_FONT_FAMILY = "'Noto Nastaliq Urdu', Arial, serif";

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
};

const challanNo = (invoiceNo) => {
  if (!invoiceNo) return '—';
  return invoiceNo.replace('INV-', 'CHN-');
};

const COPY_LABELS = [
  { label: 'Bank Copy',    color: '#1e40af' },
  { label: 'School Copy',  color: '#065f46' },
  { label: 'Parent Copy',  color: '#7c2d12' },
];

// ── Print styles ─────────────────────────────────────────────
const PRINT_STYLES = `
  @media print {
    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    @page { margin: 8mm; size: A4; }
    .challan-copy { page-break-inside: avoid; }
    .cut-line { border-top: 1.5px dashed #9ca3af !important; }
  }
`;

// ── Single challan copy ───────────────────────────────────────
function ChallanCopy({ inv, items, settings, copyMeta, T }) {
  const currency = settings.currency || 'PKR';
  const netAmount = parseFloat(inv.net_amount || 0);
  const balance   = parseFloat(inv.balance   || 0);
  const isPaid    = inv.status === 'paid';

  return (
    <div
      className="challan-copy"
      style={{
        fontFamily: "Arial",
        fontSize: 11,
        border: `2px solid ${copyMeta.color}`,
        borderRadius: '6px',
        overflow: 'hidden',
        background: 'white',
        pageBreakInside: 'avoid',
      }}
    >
      {/* Header bar */}
      <div style={{ background: copyMeta.color, color: 'white', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {settings.school_logo && (
            <img
              src={settings.school_logo}
              alt="logo"
              style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'contain', background: 'white', padding: '2px' }}
            />
          )}
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '13px', lineHeight: '1.2' }}>
              {settings.school_name || 'School Management System'}
            </div>
            {settings.school_address && (
              <div style={{ fontSize: '9px', opacity: 0.9, marginTop: '1px' }}>{settings.school_address}</div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.5px' }}>{T('feeChallan', 'FEE CHALLAN')}</div>
          <div
            style={{
              fontSize: '10px',
              background: 'rgba(255,255,255,0.25)',
              borderRadius: '3px',
              padding: '1px 6px',
              marginTop: '2px',
              fontWeight: '600',
            }}
          >
            {copyMeta.label}
          </div>
        </div>
      </div>

      {/* Challan meta row */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '5px 12px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div>
          <span style={{ color: '#64748b', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase' }}>{T('challanNo', 'Challan No.')}</span>
          <div style={{ fontWeight: 'bold', color: copyMeta.color, fontSize: '12px' }}>{challanNo(inv.invoice_no)}</div>
        </div>
        <div>
          <span style={{ color: '#64748b', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase' }}>{T('monthlyFee', 'Month')}</span>
          <div style={{ fontWeight: '600' }}>{inv.billing_month || '—'}</div>
        </div>
        <div>
          <span style={{ color: '#64748b', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase' }}>{T('issueDate', 'Issue Date')}</span>
          <div style={{ fontWeight: '600' }}>{fmtDate(inv.issued_at)}</div>
        </div>
        <div>
          <span style={{ color: '#64748b', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase' }}>{T('dueDate', 'Due Date')}</span>
          <div style={{ fontWeight: '600', color: '#dc2626' }}>{fmtDate(inv.due_date)}</div>
        </div>
        <div>
          <span style={{ color: '#64748b', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase' }}>{T('academicYear', 'Academic Year')}</span>
          <div style={{ fontWeight: '600' }}>{inv.academic_year || '—'}</div>
        </div>
        {isPaid && (
          <div style={{
            marginLeft: 'auto',
            background: '#dcfce7',
            border: '1px solid #86efac',
            color: '#15803d',
            fontWeight: 'bold',
            fontSize: '11px',
            padding: '2px 10px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
          }}>
            ✓ PAID
          </div>
        )}
      </div>

      {/* Student + Bank info two-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', borderBottom: '1px solid #e2e8f0' }}>
        {/* Student info */}
        <div style={{ padding: '8px 12px', borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '5px', letterSpacing: '0.5px' }}>
            {T('studentName', 'Student Information')}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              {[
                [T('studentName', 'Student Name'), inv.student_name],
                [T('fatherName',  'Father Name'),  inv.father_name],
                [T('class',       'Class'),        inv.class_name ? `${inv.class_name}` : (inv.grade ? `${inv.grade}${inv.section ? ' ' + inv.section : ''}` : '—')],
                [T('rollNumber',  'Roll No.'),     inv.roll_number],
                ['Contact',                        inv.father_phone || inv.student_phone],
              ].map(([lbl, val]) => (
                <tr key={lbl}>
                  <td style={{ color: '#64748b', paddingRight: '6px', paddingBottom: '3px', whiteSpace: 'nowrap', width: '80px', verticalAlign: 'top' }}>
                    {lbl}:
                  </td>
                  <td style={{ fontWeight: '600', paddingBottom: '3px', verticalAlign: 'top' }}>{val || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bank info */}
        <div style={{ padding: '8px 12px' }}>
          <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '5px', letterSpacing: '0.5px' }}>
            Bank Details
          </div>
          {settings.bank_name ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                {[
                  ['Bank Name',    settings.bank_name],
                  ['Account Title',settings.bank_account_title],
                  ['Account No.',  settings.bank_account_no],
                  ['IBAN',         settings.bank_iban],
                  ['Branch',       settings.bank_branch ? `${settings.bank_branch}${settings.bank_branch_code ? ' (' + settings.bank_branch_code + ')' : ''}` : '—'],
                ].map(([lbl, val]) => (
                  <tr key={lbl}>
                    <td style={{ color: '#64748b', paddingRight: '6px', paddingBottom: '3px', whiteSpace: 'nowrap', width: '90px', verticalAlign: 'top' }}>
                      {lbl}:
                    </td>
                    <td style={{ fontWeight: '600', paddingBottom: '3px', verticalAlign: 'top', wordBreak: 'break-all' }}>{val || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: '10px', fontStyle: 'italic' }}>
              Bank details not configured.
            </div>
          )}
        </div>
      </div>

      {/* Fee breakdown table */}
      <div style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px', letterSpacing: '0.5px' }}>
          {T('feeBreakdown', 'Fee Breakdown')}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #e2e8f0', fontWeight: '700', color: '#475569' }}>#</th>
              <th style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #e2e8f0', fontWeight: '700', color: '#475569' }}>{T('description', 'Description')}</th>
              <th style={{ textAlign: 'right', padding: '4px 6px', borderBottom: '1px solid #e2e8f0', fontWeight: '700', color: '#475569' }}>{T('amount', `Amount (${currency})`)}</th>
            </tr>
          </thead>
          <tbody>
            {items.filter(it => !it.is_waived).map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '3px 6px', color: '#94a3b8' }}>{i + 1}</td>
                <td style={{ padding: '3px 6px' }}>{it.head_name || it.description}</td>
                <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: '600' }}>{fmt(it.amount)}</td>
              </tr>
            ))}
            {parseFloat(inv.discount_amount) > 0 && (
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '3px 6px', color: '#94a3b8' }}>—</td>
                <td style={{ padding: '3px 6px', color: '#16a34a' }}>{T('discount', 'Discount / Concession')}</td>
                <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>- {fmt(inv.discount_amount)}</td>
              </tr>
            )}
            {parseFloat(inv.fine_amount) > 0 && (
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '3px 6px', color: '#94a3b8' }}>—</td>
                <td style={{ padding: '3px 6px', color: '#dc2626' }}>{T('lateFine', 'Late Fine')}</td>
                <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>+ {fmt(inv.fine_amount)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: copyMeta.color }}>
              <td colSpan="2" style={{ padding: '5px 6px', color: 'white', fontWeight: 'bold', fontSize: '12px' }}>
                {T('totalAmount', 'Total Payable')} ({currency})
              </td>
              <td style={{ padding: '5px 6px', textAlign: 'right', color: 'white', fontWeight: 'bold', fontSize: '13px' }}>
                {fmt(netAmount)}
              </td>
            </tr>
            {parseFloat(inv.paid_amount) > 0 && (
              <tr>
                <td colSpan="2" style={{ padding: '3px 6px', color: '#16a34a', fontWeight: '600' }}>{T('amountPaid', 'Amount Paid')}</td>
                <td style={{ padding: '3px 6px', textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>{fmt(inv.paid_amount)}</td>
              </tr>
            )}
            {!isPaid && (
              <tr style={{ background: '#fef2f2' }}>
                <td colSpan="2" style={{ padding: '4px 6px', color: '#dc2626', fontWeight: 'bold' }}>{T('outstandingBalance', 'Balance Due')} ({currency})</td>
                <td style={{ padding: '4px 6px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold', fontSize: '13px' }}>{fmt(balance)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Footer with signature lines + QR code */}
      <div
        style={{
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '5px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: '9px',
          color: '#94a3b8',
        }}
      >
        <div>
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '2px', marginTop: '14px', minWidth: '100px', textAlign: 'center' }}>
            {T('bankStamp', 'Bank Stamp')} &amp; {T('authorisedSignature', 'Signature')}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(
              `${inv.invoice_no || inv.id}\nPKR ${balance}\nDue:${inv.due_date || ''}`
            )}`}
            alt="QR"
            width={60} height={60}
            style={{ display: 'block', margin: '0 auto 2px' }}
          />
          <div style={{ fontStyle: 'italic' }}>{T('scanToVerify', 'Scan to verify')}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontStyle: 'italic' }}>Please pay before due date to avoid late fine</div>
          {settings.school_phone && <div>Tel: {settings.school_phone}</div>}
          {settings.school_email && <div>{settings.school_email}</div>}
        </div>
        <div>
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '2px', marginTop: '14px', minWidth: '100px', textAlign: 'center' }}>
            School Stamp
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
const COPY_OPTIONS = [
  { id: '3', label: '3 Copies', copies: [0, 1, 2] },
  { id: '2', label: '2 Copies', copies: [1, 2] },   // School + Parent
  { id: '1', label: '1 Copy',   copies: [1] },       // School only
];

export default function FeeChallanPrint() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [searchParams]        = useSearchParams();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [copies, setCopies]   = useState(searchParams.get('copies') || '3');
  const [isUrdu, setIsUrdu]   = useState(false);
  const T = useLabels(isUrdu);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = PRINT_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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
    getChallanPrint(id)
      .then(r => setData(r.data?.data ?? r.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load challan'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '4px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center', color: '#dc2626' }}>
        <AlertCircle size={40} style={{ margin: '0 auto 8px' }} />
        <p style={{ fontWeight: '600' }}>{error}</p>
      </div>
    </div>
  );

  const { invoice: inv, items, settings } = data;

  const pageStyle = isUrdu ? { direction: 'rtl', fontFamily: URDU_FONT_FAMILY } : {};

  return (
    <div style={{ minHeight: '100vh', background: '#e2e8f0', padding: '24px 16px', ...pageStyle }}>

      {/* Toolbar */}
      <div
        className="no-print"
        style={{
          maxWidth: '780px',
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'white',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#475569' }}
        >
          <ArrowLeft size={15} /> {T('back', 'Back')}
        </button>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{T('feeChallan', 'Fee Challan')}</span>
          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#64748b' }}>
            {challanNo(inv.invoice_no)} — {inv.student_name}
          </span>
        </div>
        {/* Copies selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', padding: '0 4px' }}>Copies:</span>
          {COPY_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setCopies(opt.id)}
              style={{
                padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: '600',
                background: copies === opt.id ? '#6366f1' : 'transparent',
                color: copies === opt.id ? 'white' : '#475569',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsUrdu(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: isUrdu ? '#7c3aed' : 'white', color: isUrdu ? 'white' : '#475569', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
        >
          <Languages size={15} /> {isUrdu ? 'English' : 'اردو'}
        </button>
        <button
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
        >
          <Printer size={15} /> {T('print', 'Print Challan')}
        </button>
      </div>

      {/* Challan copies */}
      <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
        {(COPY_OPTIONS.find(o => o.id === copies)?.copies || [0, 1, 2]).map((idx, pos, arr) => (
          <div key={idx}>
            <ChallanCopy inv={inv} items={items} settings={settings} copyMeta={COPY_LABELS[idx]} T={T} />
            {pos < arr.length - 1 && (
              <div
                className="cut-line"
                style={{
                  borderTop: '1.5px dashed #9ca3af',
                  margin: '6px 0',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  className="no-print"
                  style={{
                    background: '#e2e8f0',
                    padding: '0 8px',
                    fontSize: '9px',
                    color: '#9ca3af',
                    fontWeight: '600',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}
                >
                  ✂ Cut Here
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
