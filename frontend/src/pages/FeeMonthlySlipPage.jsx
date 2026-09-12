import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { getStudentFeeAccount } from '../api/fees';
import { useSettings } from '../hooks/useReferenceData';

// ── Helpers ───────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Build list of months for an academic year
// Pakistani schools: April YYYY – March YYYY+1  (e.g. 2024-25 → Apr 2024 … Mar 2025)
function buildMonths(academicYear) {
  const match = academicYear.match(/(\d{4})-(\d{2,4})/);
  if (!match) return [];
  const startYear = parseInt(match[1], 10);
  const endYear   = startYear + 1;

  const months = [];
  // Apr → Dec of startYear
  for (let m = 4; m <= 12; m++) {
    months.push(`${startYear}-${String(m).padStart(2, '0')}`);
  }
  // Jan → Mar of endYear
  for (let m = 1; m <= 3; m++) {
    months.push(`${endYear}-${String(m).padStart(2, '0')}`);
  }
  return months;
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_PRINT = {
  paid:    { label: 'PAID',    style: { color: '#15803d', fontWeight: '700' } },
  partial: { label: 'PARTIAL', style: { color: '#b45309', fontWeight: '700' } },
  unpaid:  { label: 'UNPAID',  style: { color: '#dc2626', fontWeight: '700' } },
  overdue: { label: 'OVERDUE', style: { color: '#7c3aed', fontWeight: '700' } },
  waived:  { label: 'WAIVED',  style: { color: '#0369a1', fontWeight: '700' } },
};

export default function FeeMonthlySlipPage() {
  const { studentId } = useParams();

  const [loading, setLoading]     = useState(true);
  const [data, setData]           = useState(null);
  const { data: schoolInfo = {} } = useSettings();
  const [academicYear, setAcademicYear] = useState('');

  // Build available academic years from invoices
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const accRes = await getStudentFeeAccount(studentId);
        const acc = accRes.data;
        setData(acc);

        // Derive available academic years from invoices
        const years = new Set();
        (acc.invoices || []).forEach(inv => {
          if (inv.academic_year) years.add(inv.academic_year);
        });
        // Add current academic year always
        const now = new Date();
        const m   = now.getMonth() + 1; // 1-12
        const y   = now.getFullYear();
        const curYear = m >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
        years.add(curYear);

        const sortedYears = [...years].sort().reverse();
        setAvailableYears(sortedYears);
        setAcademicYear(sortedYears[0] || curYear);
      } finally { setLoading(false); }
    };
    load();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!data?.student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Student not found.</p>
      </div>
    );
  }

  const { student, invoices } = data;
  const months = buildMonths(academicYear);

  // Map invoices to billing_month key — only monthly invoices
  const invByMonth = {};
  invoices
    .filter(i => i.invoice_type === 'monthly' && i.academic_year === academicYear)
    .forEach(inv => { invByMonth[inv.billing_month] = inv; });

  // Totals for this year
  const yearInvoices = months.map(m => invByMonth[m]).filter(Boolean);
  const totals = yearInvoices.reduce((acc, inv) => ({
    billed:    acc.billed    + parseFloat(inv.total_amount  || 0),
    discount:  acc.discount  + parseFloat(inv.discount_amount || 0),
    fine:      acc.fine      + parseFloat(inv.fine_amount   || 0),
    net:       acc.net       + parseFloat(inv.net_amount    || 0),
    paid:      acc.paid      + parseFloat(inv.paid_amount   || 0),
    balance:   acc.balance   + parseFloat(inv.balance       || 0),
  }), { billed: 0, discount: 0, fine: 0, net: 0, paid: 0, balance: 0 });

  return (
    <>
      {/* ── Screen controls (hidden on print) ─────── */}
      <div className="no-print fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-sm px-4 py-2 flex items-center gap-3 flex-wrap">
        <Link
          to={`/fees/student/${studentId}`}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={15} /> Back to Fee Account
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs font-medium text-slate-600">Academic Year:</label>
          <select
            value={academicYear}
            onChange={e => setAcademicYear(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* ── Print styles ──────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 10mm 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* ── Printable Content ─────────────────────── */}
      <div className="bg-white min-h-screen pt-14 pb-8 px-4 no-print-pt print:pt-0">
        <div className="max-w-[720px] mx-auto print:max-w-full">

          {/* School + Student Header */}
          <div className="mb-4 text-center border-b-2 border-slate-800 pb-3">
            <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide">
              {schoolInfo.school_name || 'School Management System'}
            </h1>
            {schoolInfo.address && (
              <p className="text-xs text-slate-500">{schoolInfo.address}</p>
            )}
            {schoolInfo.phone && (
              <p className="text-xs text-slate-500">Phone: {schoolInfo.phone}</p>
            )}
            <div className="mt-2">
              <span className="text-sm font-bold uppercase tracking-widest text-slate-700">
                Annual Fee Statement — {academicYear}
              </span>
            </div>
          </div>

          {/* Student info */}
          <div className="grid grid-cols-2 gap-x-8 text-sm mb-5 border border-slate-200 rounded-lg p-3 bg-slate-50 print:bg-white">
            <div className="space-y-1">
              <Row label="Student Name"   value={student.full_name} />
              <Row label="Class"          value={student.class_name || '—'} />
              <Row label="Roll Number"    value={student.roll_number || '—'} />
            </div>
            <div className="space-y-1">
              <Row label="Admission No."  value={student.admission_number || '—'} />
              <Row label="Father's Name"  value={student.father_name || '—'} />
              <Row label="Contact"        value={student.phone || student.guardian_phone || '—'} />
            </div>
          </div>

          {/* Monthly fee table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                {['Month','Invoice No.','Amount','Discount','Fine','Net Payable','Paid','Balance','Status','Paid On'].map(h => (
                  <th key={h} style={{ padding: '7px 6px', textAlign: h === 'Amount' || h === 'Discount' || h === 'Fine' || h === 'Net Payable' || h === 'Paid' || h === 'Balance' ? 'right' : 'left', fontWeight: 700, letterSpacing: '0.02em', fontSize: 11 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((ym, idx) => {
                const inv    = invByMonth[ym];
                const [year, mon] = ym.split('-');
                const monthLabel = `${MONTH_NAMES[parseInt(mon, 10)]} ${year}`;
                const isEven = idx % 2 === 0;

                if (!inv) {
                  return (
                    <tr key={ym} style={{ background: isEven ? '#f8fafc' : '#fff' }}>
                      <td style={tdStyle()}>{monthLabel}</td>
                      {Array(9).fill(null).map((_, i) => (
                        <td key={i} style={tdStyle(i > 0 && i < 7 ? 'right' : 'left')}>
                          {i === 0 ? '—' : '—'}
                        </td>
                      ))}
                    </tr>
                  );
                }

                const netAmount = parseFloat(inv.net_amount || 0);
                const paid      = parseFloat(inv.paid_amount || 0);
                const balance   = parseFloat(inv.balance || 0);
                const sCfg      = STATUS_PRINT[inv.status] || STATUS_PRINT.unpaid;
                const latestPay = inv.payments?.[0];

                return (
                  <tr key={ym} style={{ background: isEven ? '#f8fafc' : '#fff' }}>
                    <td style={tdStyle()}>{monthLabel}</td>
                    <td style={{ ...tdStyle(), fontFamily: 'monospace', fontSize: 10 }}>{inv.invoice_no || `#${inv.id}`}</td>
                    <td style={tdStyle('right')}>Rs {fmt(inv.total_amount)}</td>
                    <td style={{ ...tdStyle('right'), color: parseFloat(inv.discount_amount) > 0 ? '#15803d' : 'inherit' }}>
                      {parseFloat(inv.discount_amount) > 0 ? `Rs ${fmt(inv.discount_amount)}` : '—'}
                    </td>
                    <td style={{ ...tdStyle('right'), color: parseFloat(inv.fine_amount) > 0 ? '#dc2626' : 'inherit' }}>
                      {parseFloat(inv.fine_amount) > 0 ? `Rs ${fmt(inv.fine_amount)}` : '—'}
                    </td>
                    <td style={{ ...tdStyle('right'), fontWeight: 600 }}>Rs {fmt(netAmount)}</td>
                    <td style={{ ...tdStyle('right'), color: '#15803d', fontWeight: 600 }}>
                      {paid > 0 ? `Rs ${fmt(paid)}` : '—'}
                    </td>
                    <td style={{ ...tdStyle('right'), color: balance > 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                      {balance > 0 ? `Rs ${fmt(balance)}` : '✓'}
                    </td>
                    <td style={{ ...tdStyle(), ...sCfg.style, fontSize: 10 }}>{sCfg.label}</td>
                    <td style={{ ...tdStyle(), fontSize: 10, color: '#64748b' }}>
                      {latestPay ? fmtDate(latestPay.payment_date) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#1e3a5f', color: '#fff', fontWeight: 700 }}>
                <td colSpan={2} style={tdStyle()}>TOTAL</td>
                <td style={tdStyle('right')}>Rs {fmt(totals.billed)}</td>
                <td style={{ ...tdStyle('right'), color: '#86efac' }}>
                  {totals.discount > 0 ? `Rs ${fmt(totals.discount)}` : '—'}
                </td>
                <td style={{ ...tdStyle('right'), color: '#fca5a5' }}>
                  {totals.fine > 0 ? `Rs ${fmt(totals.fine)}` : '—'}
                </td>
                <td style={{ ...tdStyle('right') }}>Rs {fmt(totals.net)}</td>
                <td style={{ ...tdStyle('right'), color: '#86efac' }}>Rs {fmt(totals.paid)}</td>
                <td style={{ ...tdStyle('right'), color: totals.balance > 0 ? '#fca5a5' : '#86efac' }}>
                  {totals.balance > 0 ? `Rs ${fmt(totals.balance)}` : '✓'}
                </td>
                <td colSpan={2} style={tdStyle()} />
              </tr>
            </tfoot>
          </table>

          {/* Summary box */}
          <div className="mt-4 grid grid-cols-3 gap-3 print:mt-3">
            <SummaryBox label="Total Invoiced" value={`Rs ${fmt(totals.net)}`} color="#1e3a5f" />
            <SummaryBox label="Total Collected" value={`Rs ${fmt(totals.paid)}`} color="#15803d" />
            <SummaryBox label="Outstanding" value={`Rs ${fmt(totals.balance)}`} color={totals.balance > 0 ? '#dc2626' : '#15803d'} />
          </div>

          {/* Footer */}
          <div className="mt-6 pt-3 border-t border-slate-300 flex justify-between text-xs text-slate-400 print:mt-4">
            <span>Printed: {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <span className="italic">This is a computer-generated statement. No signature required.</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Small helpers ─────────────────────────────────────────
function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-slate-500 w-28 shrink-0">{label}:</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}

function SummaryBox({ label, value, color }) {
  return (
    <div style={{ border: `1px solid ${color}`, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
      <p style={{ fontSize: 10, color: '#64748b', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 800, color }}>{value}</p>
    </div>
  );
}

function tdStyle(align = 'left') {
  return {
    padding: '6px 6px',
    textAlign: align,
    borderBottom: '1px solid #e2e8f0',
    verticalAlign: 'middle',
  };
}
