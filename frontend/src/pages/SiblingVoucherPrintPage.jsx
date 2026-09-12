import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, AlertCircle, ArrowLeft } from 'lucide-react';
import { getSiblingVoucher } from '../api/fees';
import { useSettings }       from '../hooks/useReferenceData';

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtMonth = (ym) => {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
};

// ── Print styles ──────────────────────────────────────────────
const PRINT_STYLES = `
  @media print {
    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    @page { margin: 10mm; size: A4; }
    .voucher-copy { page-break-inside: avoid; }
    .cut-line { border-top: 1.5px dashed #9ca3af !important; }
  }
`;

// ── One printed copy ──────────────────────────────────────────
function VoucherCopy({ voucher, settings, copyLabel, accentColor }) {
  const currency = settings?.currency || 'PKR';

  return (
    <div
      className="voucher-copy"
      style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: 11,
        border: `2px solid ${accentColor}`,
        borderRadius: 6,
        overflow: 'hidden',
        background: 'white',
        pageBreakInside: 'avoid',
      }}
    >
      {/* ── Header bar ── */}
      <div style={{ background: accentColor, color: 'white', padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {settings?.school_logo && (
            <img src={settings.school_logo} alt="logo"
              style={{ height: 32, width: 32, objectFit: 'contain', borderRadius: 4, background: 'white', padding: 2 }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{settings?.school_name || 'School'}</div>
            {settings?.school_address && (
              <div style={{ fontSize: 9, opacity: 0.85 }}>{settings.school_address}</div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>SIBLING VOUCHER</div>
          <div style={{ fontSize: 9, opacity: 0.85 }}>{copyLabel}</div>
        </div>
      </div>

      {/* ── Voucher meta ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ padding: '8px 12px', borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 4, letterSpacing: '0.5px' }}>Family</div>
          <div style={{ fontWeight: 700, fontSize: 12 }}>{voucher.father_name || '—'}</div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>CNIC: {voucher.father_cnic}</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>{voucher.sibling_count || voucher.students?.length} children enrolled</div>
        </div>
        <div style={{ padding: '8px 12px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 4, letterSpacing: '0.5px' }}>Voucher Details</div>
          <div style={{ fontSize: 10 }}><span style={{ color: '#64748b' }}>Ref: </span><span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{voucher.voucher_ref}</span></div>
          <div style={{ fontSize: 10 }}><span style={{ color: '#64748b' }}>Month: </span><span style={{ fontWeight: 700 }}>{fmtMonth(voucher.billing_month)}</span></div>
        </div>
      </div>

      {/* ── Per-student fee breakdown ── */}
      <div style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 6, letterSpacing: '0.5px' }}>
          Fee Breakdown by Student
        </div>

        {voucher.students.map((s, i) => (
          <div key={s.student_id || i} style={{ marginBottom: 8 }}>
            {/* student row header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '3px 6px', borderRadius: 4, marginBottom: 3 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 11 }}>{s.full_name}</span>
                <span style={{ color: '#94a3b8', fontSize: 10, marginLeft: 6 }}>{s.class_name}</span>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#64748b' }}>{s.invoice_no}</span>
            </div>

            {/* fee items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <tbody>
                {(s.items || []).map((item, j) => (
                  <tr key={j}>
                    <td style={{ padding: '2px 6px', color: '#475569' }}>{item.description}</td>
                    <td style={{ padding: '2px 6px', textAlign: 'right', fontWeight: 600 }}>
                      {currency} {fmt(item.amount)}
                    </td>
                  </tr>
                ))}
                {s.discount > 0 && (
                  <tr>
                    <td style={{ padding: '2px 6px', color: '#16a34a' }}>Concession / Discount</td>
                    <td style={{ padding: '2px 6px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                      − {currency} {fmt(s.discount)}
                    </td>
                  </tr>
                )}
                {s.fine > 0 && (
                  <tr>
                    <td style={{ padding: '2px 6px', color: '#dc2626' }}>Late Fine</td>
                    <td style={{ padding: '2px 6px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                      + {currency} {fmt(s.fine)}
                    </td>
                  </tr>
                )}
                <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '3px 6px', fontWeight: 700, color: '#1e293b' }}>Outstanding</td>
                  <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 700, color: s.outstanding > 0 ? '#dc2626' : '#16a34a' }}>
                    {currency} {fmt(s.outstanding)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* ── Grand total ── */}
      <div style={{ background: accentColor, color: 'white', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, opacity: 0.9 }}>
          Total Billed: {currency} {fmt(voucher.combined_total)}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, opacity: 0.85, marginBottom: 1 }}>COMBINED OUTSTANDING</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{currency} {fmt(voucher.combined_outstanding)}</div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '6px 12px', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #e2e8f0' }}>
        <div>Please pay before due date to avoid late fines</div>
        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 2, minWidth: 80, textAlign: 'center' }}>School Stamp</div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
const COPIES = [
  { label: 'School Copy', color: '#065f46' },
  { label: 'Parent Copy', color: '#1e40af' },
];

export default function SiblingVoucherPrintPage() {
  const [searchParams]           = useSearchParams();
  const billing_month            = searchParams.get('billing_month');
  const father_cnic              = searchParams.get('father_cnic');

  const [voucher,  setVoucher]   = useState(null);
  const { data: settings = {} }  = useSettings();
  const [loading,  setLoading]   = useState(true);
  const [error,    setError]     = useState(null);
  const [copies,   setCopies]    = useState('2');   // '1' or '2'

  // Inject print styles once
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = PRINT_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    if (!billing_month || !father_cnic) {
      setError('billing_month and father_cnic are required in the URL');
      setLoading(false);
      return;
    }
    getSiblingVoucher(billing_month, father_cnic)
      .then(vRes => setVoucher(vRes.data?.voucher || null))
      .catch(err => setError(err.response?.data?.message || 'Failed to load voucher'))
      .finally(() => setLoading(false));
  }, [billing_month, father_cnic]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '4px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !voucher) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center', color: '#dc2626' }}>
        <AlertCircle size={40} style={{ margin: '0 auto 8px' }} />
        <p style={{ fontWeight: 600 }}>{error || 'Voucher not found'}</p>
      </div>
    </div>
  );

  const visibleCopies = copies === '1' ? COPIES.slice(0, 1) : COPIES;

  return (
    <div style={{ minHeight: '100vh', background: '#e2e8f0', padding: '24px 16px' }}>

      {/* ── Toolbar (hidden on print) ── */}
      <div className="no-print" style={{ maxWidth: 720, margin: '0 auto 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
        <button onClick={() => window.history.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13, color: '#475569', fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ flex: 1, fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: '#1e293b' }}>Sibling Voucher</span>
          <span style={{ color: '#94a3b8', marginLeft: 8 }}>{voucher.voucher_ref} · {fmtMonth(voucher.billing_month)}</span>
        </div>

        {/* Copies selector */}
        <select value={copies} onChange={e => setCopies(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#475569', background: 'white', cursor: 'pointer' }}>
          <option value="2">2 Copies</option>
          <option value="1">1 Copy (School)</option>
        </select>

        <button onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 8, background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          <Printer size={14} /> Print
        </button>
      </div>

      {/* ── Voucher copies ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {visibleCopies.map((copy, i) => (
          <div key={copy.label}>
            <VoucherCopy
              voucher={voucher}
              settings={settings}
              copyLabel={copy.label}
              accentColor={copy.color}
            />
            {i < visibleCopies.length - 1 && (
              <div className="cut-line" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 10 }}>
                <div style={{ flex: 1, borderTop: '1.5px dashed #cbd5e1' }} />
                <span>✂ cut here</span>
                <div style={{ flex: 1, borderTop: '1.5px dashed #cbd5e1' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
