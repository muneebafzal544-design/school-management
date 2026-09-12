import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft, AlertCircle } from 'lucide-react';
import { getDateSheet } from '../api/exams';
import { useSettings }  from '../hooks/useReferenceData';

// ── Helpers ───────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtTime = (t) => {
  if (!t) return '—';
  // t is "HH:MM" or "HH:MM:SS"
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const typeLabel = (t) => t ? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

const fmtHijri = (d) => {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(d));
  } catch { return '—'; }
};

// ── Print styles ──────────────────────────────────────────────
const PRINT_STYLES = `
  @media print {
    body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    @page { margin: 12mm; size: A4 portrait; }
    table { page-break-inside: auto; }
    tr    { page-break-inside: avoid; }
  }
`;

// ── Per-class date sheet ──────────────────────────────────────
function ClassDateSheet({ className, rows, exam, settings }) {
  const accent = '#1e3a5f';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, marginBottom: 32, background: 'white' }}>

      {/* School header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        {settings?.school_logo && (
          <img src={settings.school_logo} alt="logo"
            style={{ height: 52, width: 52, objectFit: 'contain', borderRadius: 6, border: '1px solid #e2e8f0' }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: accent }}>{settings?.school_name || 'School'}</div>
          {settings?.school_address && (
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{settings.school_address}</div>
          )}
          {(settings?.school_phone || settings?.school_email) && (
            <div style={{ fontSize: 10, color: '#64748b' }}>
              {settings.school_phone}{settings.school_phone && settings.school_email ? ' · ' : ''}{settings.school_email}
            </div>
          )}
        </div>
      </div>

      {/* Title bar */}
      <div style={{ background: accent, color: 'white', padding: '7px 14px', borderRadius: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.3px' }}>DATE SHEET</div>
          <div style={{ fontSize: 10, opacity: 0.85, marginTop: 1 }}>
            {exam.exam_name} · {typeLabel(exam.exam_type)} · {exam.academic_year}
          </div>
        </div>
        {className && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, opacity: 0.8 }}>Class</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{className}</div>
          </div>
        )}
      </div>

      {/* Exam window */}
      {(exam.start_date || exam.end_date) && (
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, padding: '4px 8px', background: '#f8fafc', borderRadius: 4, border: '1px solid #e2e8f0', display: 'inline-block' }}>
          Exam Period: <strong>{fmtDate(exam.start_date)}</strong> – <strong>{fmtDate(exam.end_date)}</strong>
        </div>
      )}

      {/* Schedule table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            {['#', 'Date (Gregorian)', 'Hijri Date', 'Day', 'Subject', 'Time', 'Duration', 'Total Marks', 'Venue'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', fontWeight: 700, color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const hasDate = !!row.exam_date;
            const duration = (row.start_time && row.end_time) ? (() => {
              const [sh, sm] = row.start_time.split(':').map(Number);
              const [eh, em] = row.end_time.split(':').map(Number);
              const mins = (eh * 60 + em) - (sh * 60 + sm);
              if (mins <= 0) return '—';
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
            })() : '—';

            const dayName = hasDate
              ? new Date(row.exam_date).toLocaleDateString('en-PK', { weekday: 'long' })
              : '—';

            return (
              <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '7px 10px', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                <td style={{ padding: '7px 10px', fontWeight: hasDate ? 700 : 400, color: hasDate ? '#1e293b' : '#94a3b8', whiteSpace: 'nowrap' }}>
                  {hasDate ? fmtDate(row.exam_date) : 'TBD'}
                </td>
                <td style={{ padding: '7px 10px', color: '#7c3aed', whiteSpace: 'nowrap', fontSize: 10 }}>
                  {hasDate ? fmtHijri(row.exam_date) : '—'}
                </td>
                <td style={{ padding: '7px 10px', color: '#475569', whiteSpace: 'nowrap' }}>{dayName}</td>
                <td style={{ padding: '7px 10px', fontWeight: 700, color: '#1e293b' }}>
                  {row.subject_name}
                  {row.subject_code && <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 5 }}>({row.subject_code})</span>}
                </td>
                <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', color: '#475569' }}>
                  {row.start_time ? `${fmtTime(row.start_time)} – ${fmtTime(row.end_time)}` : '—'}
                </td>
                <td style={{ padding: '7px 10px', color: '#475569' }}>{duration}</td>
                <td style={{ padding: '7px 10px', fontWeight: 600, color: '#1e293b', textAlign: 'right' }}>
                  {row.total_marks ?? '—'}
                </td>
                <td style={{ padding: '7px 10px', color: '#64748b' }}>{row.venue || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, fontSize: 10, color: '#94a3b8' }}>
        <div>Printed: {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        <div style={{ display: 'flex', gap: 48 }}>
          {['Class Teacher', 'Principal'].map(label => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 2, marginTop: 20, minWidth: 110 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ExamDateSheetPrint() {
  const { examId }         = useParams();
  const [searchParams]     = useSearchParams();
  const classIdFilter      = searchParams.get('class_id') || '';

  const [exam,     setExam]     = useState(null);
  const [rows,     setRows]     = useState([]);
  const { data: settings = {} } = useSettings();
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Inject print styles once
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = PRINT_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const params = classIdFilter ? { class_id: classIdFilter } : {};
    getDateSheet(examId, params)
      .then(dsRes => {
        setExam(dsRes.data?.exam ?? null);
        setRows(dsRes.data?.rows ?? []);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load date sheet'))
      .finally(() => setLoading(false));
  }, [examId, classIdFilter]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '4px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center', color: '#dc2626' }}>
        <AlertCircle size={40} style={{ margin: '0 auto 8px' }} />
        <p style={{ fontWeight: 600 }}>{error}</p>
      </div>
    </div>
  );

  // Group rows by class for multi-class print (when no class filter applied)
  const grouped = rows.reduce((acc, row) => {
    const key = row.class_id;
    if (!acc[key]) acc[key] = { class_name: row.class_name, rows: [] };
    acc[key].rows.push(row);
    return acc;
  }, {});

  const groups = Object.values(grouped);

  return (
    <div style={{ minHeight: '100vh', background: '#e2e8f0', padding: '24px 16px' }}>

      {/* ── Toolbar (hidden on print) ── */}
      <div className="no-print" style={{ maxWidth: 860, margin: '0 auto 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
        <button onClick={() => window.history.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13, color: '#475569', fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ flex: 1, fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: '#1e293b' }}>Date Sheet</span>
          {exam && (
            <span style={{ color: '#94a3b8', marginLeft: 8 }}>
              {exam.exam_name} · {exam.academic_year}
              {classIdFilter && groups[0] ? ` · ${groups[0].class_name}` : ` · ${groups.length} class${groups.length !== 1 ? 'es' : ''}`}
            </span>
          )}
        </div>

        <button onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 8, background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          <Printer size={14} /> Print
        </button>
      </div>

      {/* ── Date sheet(s) ── */}
      {groups.length === 0 ? (
        <div style={{ maxWidth: 860, margin: '0 auto', background: 'white', borderRadius: 12, padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          No scheduled subjects found for this exam.
        </div>
      ) : (
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groups.map((g, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <ClassDateSheet
                className={classIdFilter ? null : g.class_name}
                rows={g.rows}
                exam={exam}
                settings={settings}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
