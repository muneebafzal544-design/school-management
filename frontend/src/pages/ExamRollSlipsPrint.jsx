import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft, AlertCircle, Users } from 'lucide-react';
import { getRollSlips } from '../api/exams';
import { useSettings }  from '../hooks/useReferenceData';

// ── Helpers ───────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return 'TBD';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtDay = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-PK', { weekday: 'short' });
};
const fmtTime = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};
const typeLabel = (t) => (t ? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '');

// ── Print styles ──────────────────────────────────────────────
const PRINT_STYLES = `
  @media print {
    body { background: white !important; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    @page { margin: 8mm; size: A4 portrait; }
    .slip-grid { page-break-inside: avoid; }
  }
`;

// ── Single Roll Number Slip ───────────────────────────────────
function RollSlip({ student, exam, settings, slipNumber }) {
  const accent  = '#1e3a5f';
  const borderC = '#cbd5e1';

  const INSTRUCTIONS = [
    'This slip must be presented at the examination hall.',
    'Students must be present 15 minutes before the exam starts.',
    'Mobile phones and electronic devices are strictly prohibited.',
    'No books, notes, or reference material are allowed inside.',
    'Cheating or misconduct will result in immediate cancellation.',
    'Follow the seating plan as assigned — do not change your seat.',
  ];

  return (
    <div className="slip-grid" style={{
      fontFamily: 'Arial, sans-serif',
      fontSize: 10,
      border: `1.5px solid ${borderC}`,
      borderRadius: 6,
      overflow: 'hidden',
      background: 'white',
      pageBreakInside: 'avoid',
    }}>
      {/* Header */}
      <div style={{ background: accent, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {settings?.school_logo ? (
          <img src={settings.school_logo} alt="logo" style={{ height: 38, width: 38, objectFit: 'contain', borderRadius: 4, background: 'white', padding: 2 }} />
        ) : (
          <div style={{ height: 38, width: 38, borderRadius: 4, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 700 }}>
            {(settings?.school_name || 'S')[0]}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '0.3px' }}>
            {settings?.school_name || 'School Management System'}
          </div>
          {settings?.school_address && (
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9, marginTop: 1 }}>{settings.school_address}</div>
          )}
        </div>
        <div style={{ textAlign: 'right', color: 'white' }}>
          <div style={{ fontSize: 8, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Slip No.</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{String(slipNumber).padStart(3, '0')}</div>
        </div>
      </div>

      {/* Title bar */}
      <div style={{ background: '#f1f5f9', padding: '5px 12px', textAlign: 'center', borderBottom: `1px solid ${borderC}` }}>
        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: '1.5px', color: accent, textTransform: 'uppercase' }}>
          Roll Number Slip — Admit Card
        </div>
        <div style={{ fontSize: 9, color: '#64748b', marginTop: 1 }}>
          {exam.exam_name} &nbsp;·&nbsp; {typeLabel(exam.exam_type)} &nbsp;·&nbsp; {exam.academic_year}
        </div>
      </div>

      {/* Student info + photo */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${borderC}` }}>
        <div style={{ flex: 1, padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px' }}>
          {[
            ['Student Name', student.full_name],
            ['Roll Number',  student.roll_number || '—'],
            ["Father's Name", student.father_name || '—'],
            ['Class',        student.class_name],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 11, marginTop: 1 }}>{value}</div>
            </div>
          ))}
          {student.seat && (
            <div style={{ gridColumn: '1 / -1', marginTop: 4, padding: '4px 8px', background: '#eff6ff', borderRadius: 4, border: '1px solid #bfdbfe' }}>
              <span style={{ fontSize: 8, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 700 }}>Seat Assignment &nbsp;—&nbsp; </span>
              <span style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 11 }}>{student.seat.hall_name} · Seat {student.seat.seat_label}</span>
            </div>
          )}
        </div>
        {/* Photo box */}
        <div style={{ width: 70, borderLeft: `1px solid ${borderC}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
          {student.photo_url ? (
            <img src={student.photo_url} alt="student" style={{ width: 60, height: 72, objectFit: 'cover', borderRadius: 3 }} />
          ) : (
            <div style={{ width: 60, height: 72, border: `1.5px dashed ${borderC}`, borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
              <div style={{ fontSize: 20 }}>👤</div>
              <div style={{ fontSize: 7, marginTop: 2, color: '#94a3b8' }}>Photo</div>
            </div>
          )}
        </div>
      </div>

      {/* Exam schedule */}
      <div style={{ borderBottom: `1px solid ${borderC}` }}>
        <div style={{ padding: '4px 12px', background: '#f8fafc', borderBottom: `1px solid ${borderC}`, fontSize: 9, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Examination Schedule
        </div>
        {student.subjects.length === 0 ? (
          <div style={{ padding: '8px 12px', color: '#94a3b8', fontSize: 10, textAlign: 'center' }}>
            No subjects scheduled yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['#', 'Subject', 'Date', 'Day', 'Time', 'Marks'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: h === 'Marks' ? 'right' : 'left', fontSize: 8, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: `1px solid ${borderC}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {student.subjects.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: i < student.subjects.length - 1 ? `1px solid #f1f5f9` : 'none', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '4px 8px', color: '#94a3b8' }}>{i + 1}</td>
                  <td style={{ padding: '4px 8px', fontWeight: 700, color: '#1e293b' }}>
                    {s.subject_name}
                    {s.subject_code && <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>({s.subject_code})</span>}
                  </td>
                  <td style={{ padding: '4px 8px', color: s.exam_date ? '#1e293b' : '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(s.exam_date)}</td>
                  <td style={{ padding: '4px 8px', color: '#64748b' }}>{fmtDay(s.exam_date)}</td>
                  <td style={{ padding: '4px 8px', color: '#475569', whiteSpace: 'nowrap' }}>
                    {s.start_time ? `${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}` : '—'}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>{s.total_marks ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Instructions */}
      <div style={{ padding: '5px 12px', borderBottom: `1px solid ${borderC}` }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>
          Important Instructions
        </div>
        <ol style={{ margin: 0, paddingLeft: 14, color: '#475569' }}>
          {INSTRUCTIONS.map((instr, i) => (
            <li key={i} style={{ fontSize: 8.5, marginBottom: 1.5 }}>{instr}</li>
          ))}
        </ol>
      </div>

      {/* Footer signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px 8px', background: '#f8fafc' }}>
        <div style={{ fontSize: 9, color: '#64748b' }}>
          Issued: {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: 40 }}>
          {['Class Teacher', 'Controller of Exams', 'Principal'].map(label => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ borderTop: `1px solid #94a3b8`, paddingTop: 2, marginTop: 16, minWidth: 90, fontSize: 8.5, color: '#64748b' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ExamRollSlipsPrint() {
  const { examId }         = useParams();
  const [searchParams]     = useSearchParams();
  const classIdFilter      = searchParams.get('class_id') || '';
  const studentIdFilter    = searchParams.get('student_id') || '';

  const [exam,      setExam]      = useState(null);
  const [students,  setStudents]  = useState([]);
  const { data: settings = {} }   = useSettings();
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = PRINT_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const params = {};
    if (classIdFilter) params.class_id = classIdFilter;
    getRollSlips(examId, params)
      .then(rsRes => {
        setExam(rsRes.data?.exam ?? null);
        let stList = rsRes.data?.students ?? [];
        if (studentIdFilter) stList = stList.filter(s => String(s.id) === studentIdFilter);
        setStudents(stList);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load roll slips'))
      .finally(() => setLoading(false));
  }, [examId, classIdFilter, studentIdFilter]);

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

  return (
    <div style={{ minHeight: '100vh', background: '#e2e8f0', padding: '24px 16px' }}>

      {/* ── Toolbar ── */}
      <div className="no-print" style={{ maxWidth: 900, margin: '0 auto 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
        <button onClick={() => window.history.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13, color: '#475569', fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ flex: 1, fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: '#1e293b' }}>Roll Number Slips</span>
          {exam && (
            <span style={{ color: '#94a3b8', marginLeft: 8 }}>
              {exam.exam_name} · {exam.academic_year}
            </span>
          )}
          <span style={{ marginLeft: 8, background: '#f1f5f9', padding: '2px 8px', borderRadius: 12, fontSize: 11, color: '#64748b' }}>
            <Users size={11} style={{ display: 'inline', marginRight: 4 }} />
            {students.length} student{students.length !== 1 ? 's' : ''}
          </span>
        </div>

        <button onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 8, background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          <Printer size={14} /> Print All
        </button>
      </div>

      {/* ── Slips ── */}
      {students.length === 0 ? (
        <div style={{ maxWidth: 900, margin: '0 auto', background: 'white', borderRadius: 12, padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          No active students found for this exam
          {classIdFilter ? ' in the selected class' : ''}.
        </div>
      ) : (
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {students.map((st, i) => (
            <RollSlip
              key={st.id}
              student={st}
              exam={exam}
              settings={settings}
              slipNumber={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
