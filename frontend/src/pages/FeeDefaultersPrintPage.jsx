import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getOutstandingBalances } from '../api/fees';

const CENTER = { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:'Arial,sans-serif' };
const fmt = (n) => parseFloat(n||0).toLocaleString('en-PK', { minimumFractionDigits: 2 });

export default function FeeDefaultersPrintPage() {
  const [params]    = useSearchParams();
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [rows,      setRows]      = useState([]);
  const [classRows, setClassRows] = useState([]); // grouped by class

  const classId   = params.get('class_id')   || '';
  const classNm   = params.get('class_name') || '';
  const printDate = new Date().toLocaleDateString('en-PK', { day:'numeric', month:'long', year:'numeric' });

  useEffect(() => {
    const p = {};
    if (classId) p.class_id = classId;
    getOutstandingBalances(p)
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : [];
        setRows(data);

        // Group by class
        const groups = {};
        data.forEach(s => {
          const key = s.class_name || 'No Class';
          if (!groups[key]) groups[key] = { class_name: key, students: [], total: 0 };
          groups[key].students.push(s);
          groups[key].total += parseFloat(s.balance || 0);
        });
        setClassRows(Object.values(groups).sort((a,b) => a.class_name.localeCompare(b.class_name)));
      })
      .catch(() => setError('Failed to load defaulters data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && rows.length > 0) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading, rows]);

  if (loading) return <div style={CENTER}>Loading defaulters list…</div>;
  if (error)   return <div style={{ ...CENTER, color:'#dc2626' }}>{error}</div>;
  if (rows.length === 0) return <div style={{ ...CENTER, color:'#64748b' }}>No outstanding fee records found.</div>;

  const grandTotal = rows.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
  const title = classNm ? `Fee Defaulters — ${classNm}` : 'Fee Defaulters — All Classes';

  return (
    <>
      <div className="no-print toolbar">
        <div className="toolbar-info"><strong>{title}</strong> — {rows.length} student{rows.length !== 1 ? 's' : ''} — Total: Rs {fmt(grandTotal)}</div>
        <button className="print-btn" onClick={() => window.print()}>🖨 Print</button>
        <button className="close-btn" onClick={() => window.close()}>✕ Close</button>
      </div>

      <div className="page">
        {/* Header */}
        <div className="rpt-header">
          <div className="rpt-logo">S</div>
          <div className="rpt-school">
            <div className="rpt-school-name">SCHOOL MANAGEMENT SYSTEM</div>
            <div className="rpt-school-sub">Fee Defaulters Report — Outstanding Balances</div>
          </div>
          <div className="rpt-date-wrap">
            <div className="rpt-date-lbl">Print Date</div>
            <div className="rpt-date">{printDate}</div>
          </div>
        </div>
        <div className="rpt-divider" />

        {classId ? (
          /* Single class view — flat table */
          <>
            <div className="rpt-section-title">{classNm || 'Class'} — {rows.length} Student{rows.length !== 1 ? 's' : ''}</div>
            <FlatTable rows={rows} />
          </>
        ) : (
          /* All classes — grouped */
          classRows.map(g => (
            <div key={g.class_name} className="rpt-class-block">
              <div className="rpt-class-header">
                <span>{g.class_name}</span>
                <span>{g.students.length} student{g.students.length !== 1 ? 's' : ''}</span>
                <span style={{ color:'#dc2626', fontWeight:800 }}>Rs {fmt(g.total)}</span>
              </div>
              <FlatTable rows={g.students} compact />
            </div>
          ))
        )}

        {/* Grand total */}
        <div className="rpt-grand">
          <span>Total Outstanding Balance</span>
          <span>Rs {fmt(grandTotal)}</span>
        </div>

        {/* Signatures */}
        <div className="rpt-sigs">
          <div className="rpt-sig"><div className="rpt-sig-line"/><div className="rpt-sig-lbl">Accounts Officer</div></div>
          <div className="rpt-sig" style={{ textAlign:'right' }}><div className="rpt-sig-line"/><div className="rpt-sig-lbl">Principal</div></div>
        </div>
      </div>

      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, Helvetica, sans-serif; background:#f0f0f0; font-size:10px; }
        .toolbar { position:fixed; top:0; left:0; right:0; z-index:100; background:#1e293b; color:#e2e8f0; padding:10px 20px; display:flex; align-items:center; gap:12px; }
        .toolbar-info { flex:1; font-size:13px; }
        .print-btn { background:#10b981; color:#fff; border:none; border-radius:8px; padding:7px 18px; font-size:13px; font-weight:600; cursor:pointer; }
        .close-btn { background:#475569; color:#fff; border:none; border-radius:8px; padding:7px 14px; font-size:13px; cursor:pointer; }
        .page { width:210mm; min-height:297mm; margin:52px auto 24px; background:#fff; box-shadow:0 2px 20px rgba(0,0,0,0.12); padding:12mm 14mm; display:flex; flex-direction:column; gap:5mm; }
        .rpt-header { display:flex; align-items:flex-start; gap:12px; }
        .rpt-logo { width:40px; height:40px; border-radius:10px; flex-shrink:0; background:#1e293b; color:#fff; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:900; }
        .rpt-school { flex:1; }
        .rpt-school-name { font-size:14px; font-weight:900; color:#1e293b; letter-spacing:0.02em; }
        .rpt-school-sub { font-size:8.5px; color:#64748b; text-transform:uppercase; letter-spacing:0.08em; margin-top:2px; }
        .rpt-date-wrap { text-align:right; }
        .rpt-date-lbl { font-size:8px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; }
        .rpt-date { font-size:9.5px; font-weight:700; color:#1e293b; margin-top:2px; }
        .rpt-divider { border-top:2.5px solid #1e293b; }
        .rpt-section-title { font-size:10px; font-weight:800; color:#1e293b; text-transform:uppercase; letter-spacing:0.06em; }
        .rpt-class-block { margin-bottom:4mm; }
        .rpt-class-header { display:flex; justify-content:space-between; align-items:center; padding:4px 8px; background:#1e293b; color:#e2e8f0; font-size:9px; font-weight:700; border-radius:4px 4px 0 0; }
        .rpt-table { width:100%; border-collapse:collapse; font-size:8.5px; }
        .rpt-table thead tr { background:#f8fafc; }
        .rpt-table thead th { padding:4px 6px; text-align:left; font-size:8px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #e2e8f0; }
        .rpt-table thead th:last-child { text-align:right; }
        .rpt-table tbody td { padding:4px 6px; border-bottom:1px solid #f1f5f9; color:#1e293b; }
        .rpt-table tbody td:last-child { text-align:right; font-weight:700; color:#dc2626; }
        .rpt-table tbody tr:nth-child(even) { background:#fafafa; }
        .rpt-grand { display:flex; justify-content:space-between; padding:6px 10px; background:#1e293b; color:#fff; font-size:10px; font-weight:900; border-radius:6px; margin-top:auto; }
        .rpt-sigs { display:flex; justify-content:space-between; margin-top:8mm; }
        .rpt-sig { width:35%; }
        .rpt-sig-line { border-bottom:1px solid #94a3b8; height:18px; margin-bottom:3px; }
        .rpt-sig-lbl { font-size:7.5px; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; }
        @media print {
          body { background:#fff; }
          .no-print { display:none !important; }
          .page { margin:0; box-shadow:none; width:100%; min-height:auto; }
          .rpt-class-block { page-break-inside:avoid; }
          @page { size:A4 portrait; margin:12mm 14mm; }
        }
      `}</style>
    </>
  );
}

function FlatTable({ rows, compact }) {
  return (
    <table className="rpt-table" style={{ marginTop: compact ? 0 : '3mm' }}>
      <thead>
        <tr>
          <th>#</th>
          {!compact && <th>Class</th>}
          <th>Student Name</th>
          <th>Roll No</th>
          <th>Contact</th>
          <th>Invoices</th>
          <th>Billed</th>
          <th>Paid</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.student_id}>
            <td>{i + 1}</td>
            {!compact && <td>{r.class_name || '—'}</td>}
            <td style={{ fontWeight:600 }}>{r.full_name}</td>
            <td>{r.roll_number || '—'}</td>
            <td style={{ fontFamily:'monospace', fontSize:'8px' }}>{r.phone || '—'}</td>
            <td style={{ textAlign:'center' }}>{r.invoices}</td>
            <td style={{ textAlign:'right' }}>Rs {parseFloat(r.total_billed||0).toLocaleString('en-PK', {minimumFractionDigits:0})}</td>
            <td style={{ textAlign:'right', color:'#16a34a' }}>Rs {parseFloat(r.total_paid||0).toLocaleString('en-PK', {minimumFractionDigits:0})}</td>
            <td>Rs {parseFloat(r.balance||0).toLocaleString('en-PK', {minimumFractionDigits:0})}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
