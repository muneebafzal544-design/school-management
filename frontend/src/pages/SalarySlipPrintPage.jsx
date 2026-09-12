import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSalarySlip } from '../api/salary';

const CENTER = { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:'Arial,sans-serif' };
const fmt = (n) => parseFloat(n||0).toLocaleString('en-PK', { minimumFractionDigits: 2 });

function Row({ label, value, bold, color }) {
  return (
    <tr>
      <td style={{ padding:'4px 8px', fontSize:'9px', color:'#64748b', fontStyle:'italic', width:'45%' }}>{label}</td>
      <td style={{ padding:'4px 8px', fontSize:'9.5px', color: color || '#0f172a', fontWeight: bold ? 700 : 400, textAlign:'right' }}>
        Rs {fmt(value)}
      </td>
    </tr>
  );
}

export default function SalarySlipPrintPage() {
  const { id } = useParams();
  const [slip,    setSlip]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    getSalarySlip(id)
      .then(r => { const d = r.data?.data ?? r.data; setSlip(d || null); })
      .catch(() => setError('Failed to load salary slip.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && slip) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading, slip]);

  if (loading) return <div style={CENTER}>Loading slip…</div>;
  if (error)   return <div style={{ ...CENTER, color:'#dc2626' }}>{error}</div>;
  if (!slip)   return <div style={{ ...CENTER, color:'#64748b' }}>Slip not found.</div>;

  const monthLabel = slip.month
    ? new Date(slip.month + '-01').toLocaleDateString('en-PK', { month:'long', year:'numeric' })
    : slip.month;

  return (
    <>
      <div className="no-print toolbar">
        <div className="toolbar-info"><strong>Salary Slip</strong> — {slip.teacher_name} — {monthLabel}</div>
        <button className="print-btn" onClick={() => window.print()}>🖨 Print</button>
        <button className="close-btn" onClick={() => window.close()}>✕ Close</button>
      </div>

      <div className="page">
        <div className="slip">
          {/* Header */}
          <div className="slip-header">
            <div className="slip-logo">S</div>
            <div className="slip-school">
              <div className="slip-school-name">SCHOOL MANAGEMENT SYSTEM</div>
              <div className="slip-school-sub">Salary Slip / Pay Slip</div>
            </div>
            <div className="slip-month">{monthLabel}</div>
          </div>
          <div className="slip-divider" />

          {/* Employee Info */}
          <div className="slip-info">
            <div className="slip-info-col">
              <div className="slip-row"><span className="slip-lbl">Teacher Name</span><span className="slip-val bold">{slip.teacher_name}</span></div>
              <div className="slip-row"><span className="slip-lbl">Subject</span><span className="slip-val">{slip.subject || '—'}</span></div>
              <div className="slip-row"><span className="slip-lbl">Qualification</span><span className="slip-val">{slip.qualification || '—'}</span></div>
              <div className="slip-row"><span className="slip-lbl">Phone</span><span className="slip-val">{slip.phone || '—'}</span></div>
            </div>
            <div className="slip-info-col">
              <div className="slip-row"><span className="slip-lbl">Pay Period</span><span className="slip-val bold">{monthLabel}</span></div>
              <div className="slip-row"><span className="slip-lbl">Join Date</span><span className="slip-val">{slip.join_date ? new Date(slip.join_date).toLocaleDateString('en-PK') : '—'}</span></div>
              <div className="slip-row"><span className="slip-lbl">Payment Method</span><span className="slip-val">{slip.payment_method || '—'}</span></div>
              <div className="slip-row"><span className="slip-lbl">Status</span>
                <span className="slip-val bold" style={{ color: slip.status === 'paid' ? '#16a34a' : '#d97706', textTransform:'uppercase', fontSize:'8px', letterSpacing:'0.06em' }}>
                  {slip.status}
                </span>
              </div>
            </div>
          </div>

          {/* Earnings & Deductions side by side */}
          <div className="slip-tables">
            {/* Earnings */}
            <div className="slip-section">
              <div className="slip-section-title" style={{ background:'#1e293b' }}>Earnings</div>
              <table className="slip-table">
                <tbody>
                  <Row label="Basic Salary"         value={slip.base_salary} />
                  <Row label="House Allowance"       value={slip.house_allowance} />
                  <Row label="Medical Allowance"     value={slip.medical_allowance} />
                  <Row label="Transport Allowance"   value={slip.transport_allowance} />
                  <Row label="Other Allowance"       value={slip.other_allowance} />
                </tbody>
                <tfoot>
                  <tr style={{ borderTop:'1.5px solid #94a3b8', background:'#f1f5f9' }}>
                    <td style={{ padding:'5px 8px', fontSize:'9.5px', fontWeight:800, color:'#0f172a' }}>Gross Salary</td>
                    <td style={{ padding:'5px 8px', fontSize:'9.5px', fontWeight:800, color:'#059669', textAlign:'right' }}>Rs {fmt(slip.gross_salary)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Deductions */}
            <div className="slip-section">
              <div className="slip-section-title" style={{ background:'#dc2626' }}>Deductions</div>
              <table className="slip-table">
                <tbody>
                  <Row label="Income Tax"       value={slip.income_tax} />
                  <Row label="Advance Deduction" value={slip.advance_deduction} />
                  <Row label="Fine"             value={slip.fine_deduction} />
                  {parseFloat(slip.attendance_deduction || 0) > 0 && (
                    <Row label={`Absence (${slip.absent_days ?? 0} days)`} value={slip.attendance_deduction} color="#dc2626" />
                  )}
                  <Row label="Other Deduction"  value={slip.other_deduction} />
                </tbody>
                <tfoot>
                  <tr style={{ borderTop:'1.5px solid #94a3b8', background:'#fef2f2' }}>
                    <td style={{ padding:'5px 8px', fontSize:'9.5px', fontWeight:800, color:'#0f172a' }}>Total Deductions</td>
                    <td style={{ padding:'5px 8px', fontSize:'9.5px', fontWeight:800, color:'#dc2626', textAlign:'right' }}>Rs {fmt(slip.total_deductions)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Net Pay banner */}
          <div className="slip-net">
            <span>Net Pay</span>
            <span style={{ fontSize:'15px', fontWeight:900 }}>Rs {fmt(slip.net_salary)}</span>
          </div>

          {slip.remarks && (
            <div className="slip-remarks">Remarks: {slip.remarks}</div>
          )}

          {/* Signatures */}
          <div className="slip-sigs">
            <div className="slip-sig"><div className="slip-sig-line"/><div className="slip-sig-lbl">Employee Signature</div></div>
            <div className="slip-sig"><div className="slip-sig-line"/><div className="slip-sig-lbl">Accounts Officer</div></div>
            <div className="slip-sig" style={{ textAlign:'right' }}><div className="slip-sig-line"/><div className="slip-sig-lbl">Principal</div></div>
          </div>
        </div>
      </div>

      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, Helvetica, sans-serif; background:#f0f0f0; font-size:10px; }
        .toolbar { position:fixed; top:0; left:0; right:0; z-index:100; background:#1e293b; color:#e2e8f0; padding:10px 20px; display:flex; align-items:center; gap:12px; }
        .toolbar-info { flex:1; font-size:13px; }
        .print-btn { background:#10b981; color:#fff; border:none; border-radius:8px; padding:7px 18px; font-size:13px; font-weight:600; cursor:pointer; }
        .close-btn { background:#475569; color:#fff; border:none; border-radius:8px; padding:7px 14px; font-size:13px; cursor:pointer; }
        .page { width:210mm; min-height:148mm; margin:52px auto 24px; background:#fff; box-shadow:0 2px 20px rgba(0,0,0,0.12); padding:10mm 12mm; }
        .slip { display:flex; flex-direction:column; gap:4mm; }
        .slip-header { display:flex; align-items:center; gap:10px; }
        .slip-logo { width:36px; height:36px; border-radius:9px; flex-shrink:0; background:#1e293b; color:#fff; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:900; }
        .slip-school { flex:1; }
        .slip-school-name { font-size:13px; font-weight:900; color:#1e293b; letter-spacing:0.02em; }
        .slip-school-sub  { font-size:8px; color:#64748b; text-transform:uppercase; letter-spacing:0.08em; margin-top:1px; }
        .slip-month { font-size:9px; font-weight:700; color:#64748b; white-space:nowrap; }
        .slip-divider { border-top:2px solid #1e293b; }
        .slip-info { display:flex; gap:12px; padding:3px 0; }
        .slip-info-col { flex:1; display:flex; flex-direction:column; gap:2px; }
        .slip-row { display:flex; align-items:baseline; gap:4px; }
        .slip-lbl { font-size:8px; color:#64748b; min-width:88px; flex-shrink:0; }
        .slip-val { font-size:9px; color:#0f172a; }
        .slip-val.bold { font-weight:700; }
        .slip-tables { display:flex; gap:6mm; }
        .slip-section { flex:1; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; }
        .slip-section-title { color:#fff; font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; padding:4px 8px; }
        .slip-table { width:100%; border-collapse:collapse; }
        .slip-net { display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg,#059669,#0d9488); color:#fff; padding:6px 12px; border-radius:8px; font-size:10px; font-weight:700; letter-spacing:0.03em; }
        .slip-remarks { font-size:8.5px; color:#475569; font-style:italic; }
        .slip-sigs { display:flex; justify-content:space-between; padding-top:6mm; }
        .slip-sig { width:28%; }
        .slip-sig-line { border-bottom:1px solid #94a3b8; height:16px; margin-bottom:3px; }
        .slip-sig-lbl { font-size:7.5px; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; }
        @media print {
          body { background:#fff; }
          .no-print { display:none !important; }
          .page { margin:0; box-shadow:none; width:100%; min-height:auto; }
          @page { size:A5 landscape; margin:10mm 12mm; }
        }
      `}</style>
    </>
  );
}
