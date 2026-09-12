import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getStudentReportCard, getClassReportCards, downloadStudentReportCardPDF, downloadClassReportCardsPDF } from '../api/exams';
import { useLabels } from '../utils/urduLabels';

const URDU_FONT_LINK   = 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap';
const URDU_FONT_FAMILY = "'Noto Nastaliq Urdu', Arial, serif";

// ── Pakistani grading scale ────────────────────────────────
const GRADE_SCALE = [
  { grade: 'A1', min: 90, max: 100, label: 'Distinction',  color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
  { grade: 'A',  min: 80, max: 89,  label: 'Excellent',    color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
  { grade: 'B',  min: 70, max: 79,  label: 'Very Good',    color: '#7c3aed', bg: '#faf5ff', border: '#c4b5fd' },
  { grade: 'C',  min: 60, max: 69,  label: 'Good',         color: '#0891b2', bg: '#ecfeff', border: '#67e8f9' },
  { grade: 'D',  min: 50, max: 59,  label: 'Pass',         color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  { grade: 'F',  min: 0,  max: 49,  label: 'Fail',         color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
];

function gradeInfo(g) {
  return GRADE_SCALE.find(s => s.grade === g) || { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: '' };
}

function ordinal(n) {
  if (!n) return '—';
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtMonth(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
}

// ── A single report card ───────────────────────────────────
function ReportCard({ summary, subjects, settings, T }) {
  if (!summary) return null;

  const pct        = parseFloat(summary.percentage || 0);
  const gi         = gradeInfo(summary.grade);
  const isPassed   = summary.result_status === 'pass';
  const statusColor = isPassed ? '#15803d' : '#dc2626';
  const passedSubjects = subjects.filter(s => s.subject_status === 'pass').length;
  const failedSubjects = subjects.filter(s => s.subject_status === 'fail').length;
  const barColor   = pct >= 80 ? '#15803d' : pct >= 60 ? '#d97706' : '#dc2626';

  const schoolName = settings?.school_name || 'School Management System';
  const schoolAddr = settings?.school_address || '';
  const schoolPhone = settings?.school_phone || '';
  const schoolEmail = settings?.school_email || '';
  const schoolLogo  = settings?.school_logo  || null;

  return (
    <div className="rc">

      {/* ── Double-border header ── */}
      <div className="rc-outer-border">
        <div className="rc-inner-border">

          {/* School header */}
          <div className="rc-header">
            {schoolLogo && (
              <img src={schoolLogo} alt="logo" className="rc-logo-img" />
            )}
            <div className="rc-school-center">
              <div className="rc-school-name">{schoolName}</div>
              {schoolAddr && <div className="rc-school-addr">{schoolAddr}</div>}
              <div className="rc-school-contact">
                {schoolPhone && <span>Tel: {schoolPhone}</span>}
                {schoolPhone && schoolEmail && <span style={{ margin: '0 6px' }}>|</span>}
                {schoolEmail && <span>{schoolEmail}</span>}
              </div>
              <div className="rc-title-bar">
                <span className="rc-title-text">{T('resultCard', 'RESULT CARD / REPORT OF PROGRESS')}</span>
              </div>
            </div>
            {/* Pass/Fail stamp */}
            <div
              className="rc-stamp"
              style={{ color: statusColor, borderColor: statusColor, background: statusColor + '10' }}
            >
              {isPassed ? `✓ ${T('pass', 'PASS')}` : `✗ ${T('fail', 'FAIL')}`}
            </div>
          </div>

          {/* ── Student info band ── */}
          <div className="rc-info-band">
            <table className="rc-info-table">
              <tbody>
                <tr>
                  <td className="info-lbl">{T('studentName', 'Student Name')}</td>
                  <td className="info-val bold">{summary.full_name}</td>
                  <td className="info-lbl">{T('examName', 'Exam')}</td>
                  <td className="info-val bold">{summary.exam_name}</td>
                </tr>
                <tr>
                  <td className="info-lbl">{T('fatherName', 'Father\'s Name')}</td>
                  <td className="info-val">{summary.father_name || '—'}</td>
                  <td className="info-lbl">{T('class', 'Class')}</td>
                  <td className="info-val">
                    {summary.class_name || summary.grade || '—'}
                    {summary.section ? ` – ${summary.section}` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="info-lbl">{T('rollNumber', 'Roll Number')}</td>
                  <td className="info-val bold">{summary.roll_number || '—'}</td>
                  <td className="info-lbl">{T('academicYear', 'Academic Year')}</td>
                  <td className="info-val">{summary.academic_year || '—'}</td>
                </tr>
                <tr>
                  <td className="info-lbl">{T('term', 'Exam Period')}</td>
                  <td className="info-val">{fmtMonth(summary.start_date)} – {fmtMonth(summary.end_date)}</td>
                  <td className="info-lbl">{T('position', 'Position in Class')}</td>
                  <td className="info-val bold" style={{ color: '#1d4ed8' }}>
                    {summary.position && summary.total_students
                      ? `${ordinal(summary.position)} out of ${summary.total_students}`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Subject-wise marks ── */}
          <table className="rc-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: '30%' }}>{T('subject', 'Subject')}</th>
                <th>{T('totalMarks', 'Max Marks')}</th>
                <th>{T('pass', 'Pass')} Marks</th>
                <th>{T('marksObtained', 'Marks Obtained')}</th>
                <th>{T('percentage', 'Percentage')}</th>
                <th>{T('grade', 'Grade')}</th>
                <th>Remarks</th>
                <th>{T('result', 'Result')}</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => {
                const sgi = gradeInfo(s.subject_grade);
                return (
                  <tr key={i} className={s.subject_status === 'fail' ? 'row-fail' : (i % 2 === 0 ? '' : 'row-alt')}>
                    <td style={{ textAlign: 'left', fontWeight: 600 }}>
                      {s.subject_name}
                      {s.subject_code && (
                        <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 3, fontSize: '7.5px' }}>
                          ({s.subject_code})
                        </span>
                      )}
                    </td>
                    <td>{s.total_marks}</td>
                    <td>{s.passing_marks}</td>
                    <td style={{ fontWeight: 800, fontSize: '10px' }}>{s.obtained_marks}</td>
                    <td>{s.subject_percentage}%</td>
                    <td>
                      <span
                        className="g-badge"
                        style={{ color: sgi.color, background: sgi.bg, borderColor: sgi.border }}
                      >
                        {s.subject_grade}
                      </span>
                    </td>
                    <td style={{ fontSize: '7.5px', color: '#475569' }}>{s.remarks || ''}</td>
                    <td className={s.subject_status === 'pass' ? 'cell-pass' : 'cell-fail'}>
                      {s.subject_status === 'pass' ? `✓ ${T('pass','Pass')}` : `✗ ${T('fail','Fail')}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="row-total">
                <td style={{ textAlign: 'left', fontWeight: 800 }}>{T('totalMarks', 'Grand Total')}</td>
                <td style={{ fontWeight: 800 }}>{summary.total_marks}</td>
                <td>—</td>
                <td style={{ fontWeight: 800, fontSize: '10px' }}>{summary.obtained_marks}</td>
                <td style={{ fontWeight: 800 }}>{pct}%</td>
                <td>
                  <span
                    className="g-badge"
                    style={{ color: gi.color, background: gi.bg, borderColor: gi.border, fontWeight: 900 }}
                  >
                    {summary.grade}
                  </span>
                </td>
                <td style={{ fontSize: '7.5px', color: '#475569' }}>
                  {passedSubjects} passed / {failedSubjects} failed
                </td>
                <td className={isPassed ? 'cell-pass' : 'cell-fail'} style={{ fontWeight: 900 }}>
                  {isPassed ? `✓ ${T('pass','PASS')}` : `✗ ${T('fail','FAIL')}`}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* ── Summary cards row ── */}
          <div className="rc-summary-row">
            <div className="rc-summary-card" style={{ borderColor: '#e2e8f0' }}>
              <div className="rc-summary-label">{T('marksObtained', 'Total Marks')}</div>
              <div className="rc-summary-value">{summary.obtained_marks} / {summary.total_marks}</div>
            </div>
            <div className="rc-summary-card" style={{ borderColor: '#e2e8f0' }}>
              <div className="rc-summary-label">{T('percentage', 'Percentage')}</div>
              <div className="rc-summary-value" style={{ color: barColor }}>{pct}%</div>
            </div>
            <div className="rc-summary-card" style={{ borderColor: gi.border }}>
              <div className="rc-summary-label">{T('grade', 'Grade')}</div>
              <div className="rc-summary-value" style={{ color: gi.color }}>{summary.grade}</div>
              <div className="rc-summary-desc" style={{ color: gi.color }}>{gi.label}</div>
            </div>
            <div className="rc-summary-card" style={{ borderColor: '#e2e8f0' }}>
              <div className="rc-summary-label">{T('position', 'Class Position')}</div>
              <div className="rc-summary-value" style={{ color: '#1d4ed8' }}>
                {summary.position ? ordinal(summary.position) : '—'}
              </div>
              {summary.total_students && (
                <div className="rc-summary-desc">of {summary.total_students} students</div>
              )}
            </div>
            <div className="rc-summary-card" style={{ borderColor: isPassed ? '#86efac' : '#fca5a5' }}>
              <div className="rc-summary-label">{T('result', 'Result')}</div>
              <div className="rc-summary-value" style={{ color: statusColor }}>
                {isPassed ? T('pass', 'PASS') : T('fail', 'FAIL')}
              </div>
              {summary.grade === 'A1' && (
                <div className="rc-summary-desc" style={{ color: '#15803d', fontWeight: 700 }}>★ Distinction</div>
              )}
            </div>
          </div>

          {/* ── Performance bar ── */}
          <div className="rc-bar-wrap">
            <div className="rc-bar-header">
              <span>{T('result', 'Overall Performance')}</span>
              <span style={{ fontWeight: 700, color: barColor }}>{pct}%</span>
            </div>
            <div className="rc-bar-bg">
              <div className="rc-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
            </div>
            {/* Scale markers */}
            <div className="rc-bar-scale">
              {GRADE_SCALE.slice().reverse().map(g => (
                <div key={g.grade} className="rc-scale-item" style={{ color: g.color }}>
                  <div className="rc-scale-marker" style={{ background: g.color }} />
                  <span>{g.grade} ({g.min}%+)</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Grading table ── */}
          <div className="rc-grade-table-wrap">
            <div className="rc-grade-table-title">Grading Scale (Pakistani Education System)</div>
            <table className="rc-grade-table">
              <thead>
                <tr>
                  {GRADE_SCALE.map(g => (
                    <th key={g.grade} style={{ color: g.color, borderColor: g.border }}>
                      {g.grade}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {GRADE_SCALE.map(g => (
                    <td key={g.grade} style={{ background: g.bg, color: g.color, borderColor: g.border }}>
                      {g.min}–{g.max}%
                    </td>
                  ))}
                </tr>
                <tr>
                  {GRADE_SCALE.map(g => (
                    <td key={g.grade} style={{ color: g.color, borderColor: g.border }}>
                      {g.label}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Teacher remarks ── */}
          {subjects.some(s => s.remarks) && (
            <div className="rc-remarks">
              <div className="rc-remarks-title">{T('teacherRemarks', "Teacher's Remarks")}:</div>
              {subjects.filter(s => s.remarks).map((s, i) => (
                <div key={i} className="rc-remark-row">
                  <span style={{ fontWeight: 700 }}>{s.subject_name}:</span> {s.remarks}
                </div>
              ))}
            </div>
          )}

          {/* ── Signature row ── */}
          <div className="rc-sigs">
            <div className="rc-sig">
              <div className="rc-sig-line" />
              <div className="rc-sig-lbl">{T('classTeacher', 'Class Teacher')}</div>
            </div>
            <div className="rc-sig" style={{ textAlign: 'center' }}>
              <div className="rc-sig-line" />
              <div className="rc-sig-lbl">Parent / Guardian</div>
              <div className="rc-sig-note">Signature with date</div>
            </div>
            <div className="rc-sig" style={{ textAlign: 'right' }}>
              <div className="rc-sig-line" />
              <div className="rc-sig-lbl">{T('principalSignature', 'Principal')}</div>
            </div>
          </div>

          <div className="rc-footer">
            <span>{T('issueDate', 'Issued')}: {fmtDate(new Date())}</span>
            <span style={{ fontStyle: 'italic' }}>{T('computerGenerated', 'This is a computer-generated result card.')}</span>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Page wrapper ──────────────────────────────────────────
export default function ReportCardPrintPage() {
  const [params]     = useSearchParams();
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [cards,      setCards]      = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isUrdu,     setIsUrdu]     = useState(false);
  const T = useLabels(isUrdu);

  useEffect(() => {
    if (!isUrdu) return;
    if (document.getElementById('urdu-font-link')) return;
    const link = document.createElement('link');
    link.id   = 'urdu-font-link';
    link.rel  = 'stylesheet';
    link.href = URDU_FONT_LINK;
    document.head.appendChild(link);
  }, [isUrdu]);

  const type      = params.get('type')      || 'single';
  const examId    = params.get('exam_id');
  const studentId = params.get('student_id');
  const classId   = params.get('class_id');

  useEffect(() => {
    async function load() {
      try {
        if (type === 'class') {
          const r = await getClassReportCards(examId, classId);
          const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
          setCards(Array.isArray(list) ? list : []);
        } else {
          const r = await getStudentReportCard(examId, studentId);
          const d = r.data?.data ?? r.data;
          setCards(d?.summary ? [d] : []);
        }
      } catch {
        setError('Failed to load report card data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!loading && cards.length > 0) {
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [loading, cards]);

  const CENTER = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif', fontSize: 14 };
  if (loading) return <div style={CENTER}>Loading report card…</div>;
  if (error)   return <div style={{ ...CENTER, color: '#dc2626' }}>{error}</div>;
  if (cards.length === 0) return <div style={{ ...CENTER, color: '#64748b' }}>No report card data found.</div>;

  const infoLabel = type === 'class'
    ? `${cards.length} Report Card${cards.length !== 1 ? 's' : ''} — ${cards[0]?.summary?.class_name || ''}`
    : cards[0]?.summary?.full_name || 'Report Card';

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      let res;
      if (type === 'class') {
        res = await downloadClassReportCardsPDF(examId, classId);
      } else {
        res = await downloadStudentReportCardPDF(examId, studentId);
      }
      const url  = URL.createObjectURL(res.data);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = type === 'class'
        ? `report-cards-class-${classId}-exam-${examId}.pdf`
        : `report-card_${(cards[0]?.summary?.full_name || 'student').replace(/\s+/g,'_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('PDF generation failed. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <>
      <div className="no-print toolbar">
        <div className="toolbar-info"><strong>{infoLabel}</strong></div>
        <button className="pdf-btn" onClick={handleDownloadPDF} disabled={pdfLoading}>
          {pdfLoading ? '⏳ Generating…' : '⬇ Download PDF'}
        </button>
        <button className="print-btn" onClick={() => window.print()}>🖨 Print</button>
        <button
          className="close-btn"
          onClick={() => setIsUrdu(v => !v)}
          style={{ background: isUrdu ? '#7c3aed' : '#475569', minWidth: 90 }}
        >
          {isUrdu ? 'English' : 'اردو'}
        </button>
        <button className="close-btn" onClick={() => window.close()}>✕ Close</button>
      </div>

      <div style={isUrdu ? { direction: 'rtl', fontFamily: URDU_FONT_FAMILY } : {}}>
        {cards.map((card, i) => (
          <div key={i} className="page">
            <ReportCard
              summary={card.summary}
              subjects={card.subjects || []}
              settings={card.settings || {}}
              T={T}
            />
          </div>
        ))}
      </div>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; background: #e5e7eb; }

        /* ── Toolbar ── */
        .toolbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: #1e293b; color: #e2e8f0;
          padding: 10px 20px; display: flex; align-items: center; gap: 12px;
        }
        .toolbar-info { flex: 1; font-size: 13px; }
        .pdf-btn   { background: #0ea5e9; color: #fff; border: none; border-radius: 8px; padding: 7px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .pdf-btn:disabled { opacity: 0.65; cursor: default; }
        .print-btn { background: #10b981; color: #fff; border: none; border-radius: 8px; padding: 7px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .close-btn { background: #475569; color: #fff; border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px; cursor: pointer; }

        /* ── Page ── */
        .page {
          width: 210mm;
          margin: 56px auto 24px;
          background: #fff;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
          padding: 8mm 10mm;
        }

        /* ── Double-border wrapper ── */
        .rc { }
        .rc-outer-border {
          border: 3px solid #1e293b;
          padding: 3px;
        }
        .rc-inner-border {
          border: 1px solid #1e293b;
          padding: 6mm;
          display: flex;
          flex-direction: column;
          gap: 4mm;
        }

        /* ── Header ── */
        .rc-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding-bottom: 4mm;
          border-bottom: 2px solid #1e293b;
        }
        .rc-logo-img {
          width: 52px; height: 52px; object-fit: contain;
          border: 1px solid #e2e8f0; border-radius: 6px; flex-shrink: 0;
          padding: 2px;
        }
        .rc-school-center { flex: 1; text-align: center; }
        .rc-school-name {
          font-size: 16px; font-weight: 900; color: #0f172a;
          letter-spacing: 0.03em; text-transform: uppercase;
        }
        .rc-school-addr { font-size: 8.5px; color: #475569; margin-top: 2px; }
        .rc-school-contact { font-size: 8px; color: #64748b; margin-top: 1px; }
        .rc-title-bar {
          margin-top: 5px;
          background: #1e293b;
          display: inline-block;
          padding: 3px 18px;
          border-radius: 2px;
        }
        .rc-title-text { color: #fff; font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
        .rc-stamp {
          font-size: 9.5px; font-weight: 900; letter-spacing: 0.08em;
          padding: 6px 10px; border: 2px solid; border-radius: 4px;
          flex-shrink: 0; align-self: center; text-align: center;
          min-width: 58px;
        }

        /* ── Info band ── */
        .rc-info-band {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 4px 8px;
        }
        .rc-info-table { width: 100%; border-collapse: collapse; }
        .rc-info-table td { padding: 2.5px 4px; font-size: 9px; }
        .info-lbl { color: #64748b; width: 85px; white-space: nowrap; }
        .info-val { color: #0f172a; min-width: 100px; }
        .info-val.bold { font-weight: 700; }

        /* ── Subject table ── */
        .rc-table { width: 100%; border-collapse: collapse; font-size: 9px; }
        .rc-table thead tr { background: #1e293b; }
        .rc-table thead th {
          color: #f1f5f9; padding: 5px 5px;
          text-align: center; font-weight: 700;
          font-size: 8px; letter-spacing: 0.04em; text-transform: uppercase;
          border: 1px solid #334155;
        }
        .rc-table td {
          border: 1px solid #e2e8f0; padding: 3.5px 5px;
          text-align: center; color: #1e293b;
          vertical-align: middle;
        }
        .row-alt { background: #f8fafc; }
        .row-fail { background: #fff1f2 !important; }
        .row-total { background: #f1f5f9 !important; border-top: 2px solid #94a3b8; }
        .row-total td { border-top: 1.5px solid #94a3b8; font-size: 9.5px; }
        .cell-pass { color: #15803d; font-weight: 700; font-size: 8px; text-transform: uppercase; }
        .cell-fail { color: #dc2626; font-weight: 700; font-size: 8px; text-transform: uppercase; }

        /* Grade badge */
        .g-badge {
          display: inline-block; font-size: 8.5px; font-weight: 800;
          padding: 2px 5px; border-radius: 3px; border: 1px solid;
          letter-spacing: 0.04em;
        }

        /* ── Summary cards ── */
        .rc-summary-row {
          display: flex; gap: 6px;
        }
        .rc-summary-card {
          flex: 1; border: 1px solid; border-radius: 4px;
          padding: 4px 6px; text-align: center;
        }
        .rc-summary-label { font-size: 7.5px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 2px; }
        .rc-summary-value { font-size: 13px; font-weight: 900; color: #0f172a; }
        .rc-summary-desc  { font-size: 7.5px; color: #64748b; margin-top: 1px; }

        /* ── Progress bar ── */
        .rc-bar-wrap { padding: 2px 0; }
        .rc-bar-header { display: flex; justify-content: space-between; font-size: 8px; color: #64748b; margin-bottom: 3px; font-weight: 600; }
        .rc-bar-bg { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .rc-bar-fill { height: 100%; border-radius: 4px; }
        .rc-bar-scale { display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
        .rc-scale-item { display: flex; align-items: center; gap: 3px; font-size: 7.5px; font-weight: 600; }
        .rc-scale-marker { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

        /* ── Grading table ── */
        .rc-grade-table-wrap {
          border: 1px solid #e2e8f0; padding: 5px 6px;
          background: #f8fafc;
        }
        .rc-grade-table-title { font-size: 8px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .rc-grade-table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
        .rc-grade-table th {
          padding: 3px 6px; text-align: center; font-weight: 800;
          border: 1px solid; font-size: 9px;
        }
        .rc-grade-table td { padding: 2px 6px; text-align: center; border: 1px solid; font-weight: 600; }

        /* ── Remarks ── */
        .rc-remarks {
          border-top: 1px dashed #cbd5e1; padding-top: 4px;
        }
        .rc-remarks-title { font-size: 8.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
        .rc-remark-row { font-size: 8.5px; color: #334155; margin-bottom: 2px; }

        /* ── Signatures ── */
        .rc-sigs { display: flex; justify-content: space-between; padding-top: 6mm; border-top: 1px solid #e2e8f0; }
        .rc-sig { width: 30%; }
        .rc-sig-line { border-bottom: 1px solid #64748b; height: 18px; margin-bottom: 3px; }
        .rc-sig-lbl { font-size: 8.5px; color: #1e293b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
        .rc-sig-note { font-size: 7.5px; color: #94a3b8; margin-top: 1px; }

        /* ── Footer ── */
        .rc-footer {
          display: flex; justify-content: space-between;
          font-size: 7.5px; color: #94a3b8;
          border-top: 1px solid #f1f5f9; padding-top: 3px; margin-top: 2mm;
        }

        /* ── Print ── */
        @media print {
          body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page {
            margin: 0; box-shadow: none;
            padding: 8mm 10mm;
            page-break-after: always;
            width: 100%;
          }
          .page:last-child { page-break-after: avoid; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </>
  );
}
