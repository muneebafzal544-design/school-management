import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPaper } from '../api/papers';
import { useSettings } from '../hooks/useReferenceData';

/* ── Roman numerals for short questions ─────────────────────── */
const ROMAN = ['i','ii','iii','iv','v','vi','vii','viii','ix','x',
               'xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx'];

/* ── Format duration ─────────────────────────────────────────── */
function fmtDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} Hour${h !== 1 ? 's' : ''}`;
  return `${h} Hr ${m} Min`;
}

/* ── Format date nicely ──────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '_______________';
  return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function PaperPrintPage() {
  const { id } = useParams();
  const [paper,    setPaper]    = useState(null);
  const { data: settingsRaw = {} } = useSettings();
  const settings = Array.isArray(settingsRaw) ? Object.fromEntries(settingsRaw.map(r => [r.key, r.value])) : settingsRaw;
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    getPaper(id)
      .then(pRes => setPaper(pRes.data?.data ?? pRes.data))
      .catch(() => setError('Failed to load paper.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && paper) {
      document.title = `${paper.subject || 'Exam'} Paper — ${paper.class_name || ''}`;
    }
  }, [loading, paper]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-slate-500 text-sm">Loading paper…</div>
  );
  if (error || !paper) return (
    <div className="flex items-center justify-center min-h-screen text-red-500 text-sm">{error || 'Paper not found'}</div>
  );

  const schoolName = paper.school_name_override || settings.school_name || 'SCHOOL NAME';
  const schoolAddr = settings.school_address || '';
  const schoolPhone = settings.school_phone || '';
  const logo = settings.logo_url || null;

  const mcqSec   = paper.sections?.find(s => s.section_type === 'mcq');
  const shortSec = paper.sections?.find(s => s.section_type === 'short');
  const longSec  = paper.sections?.find(s => s.section_type === 'long');

  const mcqMarks   = mcqSec?.questions?.reduce((a, q) => a + Number(q.marks || 0), 0) || 0;
  const shortMarks = shortSec?.questions?.reduce((a, q) => a + Number(q.marks || 0), 0) || 0;
  const longMarks  = longSec?.questions?.reduce((a, q) => {
    if (q.sub_parts?.length) return a + q.sub_parts.reduce((s, p) => s + Number(p.marks || 0), 0);
    return a + Number(q.marks || 0);
  }, 0) || 0;
  const computedTotal = mcqMarks + shortMarks + longMarks;
  const grandTotal = paper.total_marks || computedTotal;
  const totalMismatch = computedTotal > 0 && computedTotal !== Number(paper.total_marks);

  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @page { size: A4; margin: 15mm 18mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        body { font-family: 'Times New Roman', Times, serif; background: #fff; color: #000; }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Toolbar (screen only) ── */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 flex items-center gap-3 px-6 py-3 shadow-sm">
        <span className="text-sm font-semibold text-slate-700 flex-1">{paper.title}</span>
        <button onClick={() => window.print()}
          className="px-5 py-2 rounded-lg text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          🖨 Print Paper
        </button>
        <button onClick={() => window.close()}
          className="px-4 py-2 rounded-lg text-sm text-slate-500 border border-slate-200 hover:bg-slate-50">
          Close
        </button>
      </div>

      {/* ── Computed total mismatch warning (screen only) ── */}
      {totalMismatch && (
        <div className="no-print fixed top-14 left-0 right-0 z-40 bg-amber-50 border-b border-amber-300 flex items-center gap-3 px-6 py-2 text-sm text-amber-800">
          <span className="text-base">⚠️</span>
          <span>
            <strong>Total marks mismatch:</strong> Question totals add up to <strong>{computedTotal}</strong>,
            but paper header says <strong>{paper.total_marks}</strong>.
            Go back to Paper Creator to fix before printing.
          </span>
        </div>
      )}

      {/* ── Paper body ── */}
      <div className={`no-print ${totalMismatch ? 'mt-24' : 'mt-16'}`} />
      <div style={{ maxWidth: '210mm', margin: '0 auto', padding: '10mm 15mm', background: '#fff' }}>

        {/* ══ HEADER ══════════════════════════════════════════════════ */}
        <div style={{ borderBottom: '3px double #000', paddingBottom: '8px', marginBottom: '10px', textAlign: 'center' }}>
          {logo && (
            <img src={logo} alt="Logo" style={{ height: '60px', marginBottom: '4px' }} />
          )}
          <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {schoolName}
          </div>
          {(schoolAddr || schoolPhone) && (
            <div style={{ fontSize: '11px', marginTop: '2px', color: '#333' }}>
              {schoolAddr}{schoolAddr && schoolPhone ? '  |  ' : ''}{schoolPhone && `Ph: ${schoolPhone}`}
            </div>
          )}
        </div>

        {/* ── Exam title ── */}
        <div style={{ textAlign: 'center', margin: '8px 0 10px' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {paper.title}
          </div>
          {paper.academic_year && (
            <div style={{ fontSize: '12px', marginTop: '2px' }}>Academic Year: {paper.academic_year}</div>
          )}
        </div>

        {/* ── Info row ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '10px' }}>
          <tbody>
            <tr>
              <InfoCell label="Subject" value={paper.subject || '_______________'} />
              <InfoCell label="Class" value={paper.class_name || '_______________'} />
              <InfoCell label="Total Marks" value={grandTotal} bold />
              <InfoCell label="Time Allowed" value={fmtDuration(paper.duration_mins)} bold />
            </tr>
            <tr>
              <InfoCell label="Date" value={fmtDate(paper.paper_date)} colSpan={2} />
              <td colSpan={2} style={{ padding: '5px 8px', fontSize: '12px', borderLeft: '1px solid #000' }}>
                <strong>Roll No:</strong> <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '120px' }}>&nbsp;</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Student name line ── */}
        <div style={{ display: 'flex', gap: '30px', marginBottom: '8px', fontSize: '12px' }}>
          <div style={{ flex: 2 }}>
            <strong>Student Name:</strong>
            <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '280px', marginLeft: '6px' }}>&nbsp;</span>
          </div>
          <div style={{ flex: 1 }}>
            <strong>Section:</strong>
            <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '80px', marginLeft: '6px' }}>&nbsp;</span>
          </div>
        </div>

        {/* ── General instructions ── */}
        {paper.instructions && (
          <div style={{ border: '1px solid #000', padding: '5px 8px', marginBottom: '10px', fontSize: '11.5px' }}>
            <strong>General Instructions:</strong> {paper.instructions}
          </div>
        )}

        <div style={{ borderTop: '2px solid #000', marginBottom: '14px' }} />

        {/* ══ SECTION A: MCQs ════════════════════════════════════════ */}
        {mcqSec && (
          <div style={{ marginBottom: '18px' }}>
            <SectionHeader
              qNum="Q.1"
              title={mcqSec.title}
              marks={mcqMarks}
              instructions={mcqSec.instructions}
            />
            {mcqSec.questions?.length === 0 && (
              <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', margin: '8px 0' }}>No questions added yet.</div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {mcqSec.questions?.map((q, qi) => {
                  const opts = q.options || [
                    { label: 'A', text: '' }, { label: 'B', text: '' },
                    { label: 'C', text: '' }, { label: 'D', text: '' },
                  ];
                  return (
                    <tr key={q.id} style={{ verticalAlign: 'top' }}>
                      <td style={{ width: '24px', fontSize: '12px', paddingTop: '5px', paddingRight: '4px', whiteSpace: 'nowrap' }}>
                        {qi + 1}.
                      </td>
                      <td style={{ fontSize: '12px', padding: '4px 0 8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{q.question_text}</span>
                          <span style={{ fontWeight: 'bold', marginLeft: '8px', whiteSpace: 'nowrap' }}>({q.marks})</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '2px 10px', marginTop: '4px' }}>
                          {opts.map(o => (
                            <span key={o.label} style={{ fontSize: '11.5px' }}>
                              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '1px solid #000', borderRadius: '50%', textAlign: 'center', lineHeight: '12px', fontSize: '9px', marginRight: '3px' }}>{o.label}</span>
                              {o.text || `Option ${o.label}`}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ borderTop: '1.5px solid #000', marginBottom: '14px' }} />

        {/* ══ SECTION B: SHORT QUESTIONS ═════════════════════════════ */}
        {shortSec && (
          <div style={{ marginBottom: '18px' }}>
            <SectionHeader
              qNum="Q.2"
              title={shortSec.title}
              marks={shortMarks}
              instructions={shortSec.instructions}
            />
            {shortSec.questions?.length === 0 && (
              <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', margin: '8px 0' }}>No questions added yet.</div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {shortSec.questions?.map((q, qi) => (
                  <tr key={q.id} style={{ verticalAlign: 'top' }}>
                    <td style={{ width: '28px', fontSize: '12px', paddingTop: '4px', paddingRight: '4px', whiteSpace: 'nowrap' }}>
                      {ROMAN[qi] || (qi + 1)}.
                    </td>
                    <td style={{ fontSize: '12px', padding: '3px 0 6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{q.question_text}</span>
                        <span style={{ fontWeight: 'bold', marginLeft: '8px', whiteSpace: 'nowrap' }}>({q.marks})</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ borderTop: '1.5px solid #000', marginBottom: '14px' }} />

        {/* ══ SECTION C: LONG QUESTIONS ══════════════════════════════ */}
        {longSec && (
          <div style={{ marginBottom: '20px' }}>
            <SectionHeader
              qNum="Q.3"
              title={longSec.title}
              marks={longMarks}
              instructions={longSec.instructions}
            />
            {longSec.questions?.length === 0 && (
              <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', margin: '8px 0' }}>No questions added yet.</div>
            )}
            {longSec.questions?.map((q, qi) => {
              const qNum = qi + 3; // Q.3, Q.4, Q.5 ...
              const hasSubs = q.sub_parts?.length > 0;
              const qMarks = hasSubs
                ? q.sub_parts.reduce((s, p) => s + Number(p.marks || 0), 0)
                : Number(q.marks || 0);

              return (
                <div key={q.id} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <strong>Q.{qNum}</strong>
                    <span style={{ fontWeight: 'bold' }}>({qMarks})</span>
                  </div>
                  {q.question_text && (
                    <div style={{ fontSize: '12px', marginLeft: '24px', marginBottom: '4px' }}>{q.question_text}</div>
                  )}
                  {hasSubs && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginLeft: '24px' }}>
                      <tbody>
                        {q.sub_parts.map((sp, si) => (
                          <tr key={si} style={{ verticalAlign: 'top' }}>
                            <td style={{ width: '22px', fontSize: '12px', paddingTop: '3px' }}>
                              ({sp.label || String.fromCharCode(97 + si)})
                            </td>
                            <td style={{ fontSize: '12px', padding: '2px 0 5px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{sp.text}</span>
                                <span style={{ fontWeight: 'bold', marginLeft: '8px', whiteSpace: 'nowrap' }}>({sp.marks})</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ FOOTER ══════════════════════════════════════════════════ */}
        <div style={{ borderTop: '2px solid #000', paddingTop: '8px', textAlign: 'center', marginTop: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '2px' }}>*** END OF PAPER ***</div>
          {paper.note && (
            <div style={{ fontSize: '11px', marginTop: '4px', fontStyle: 'italic' }}>{paper.note}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '11px', color: '#555' }}>
            <span>{schoolName}</span>
            <span>Total Marks: {grandTotal}</span>
            <span>Time: {fmtDuration(paper.duration_mins)}</span>
          </div>
        </div>

      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */
function InfoCell({ label, value, bold, colSpan = 1 }) {
  return (
    <td colSpan={colSpan} style={{
      padding: '5px 8px', fontSize: '12px',
      borderRight: '1px solid #000', borderBottom: '1px solid #000',
    }}>
      <strong>{label}:</strong>{' '}
      <span style={bold ? { fontWeight: 'bold' } : {}}>{value}</span>
    </td>
  );
}

function SectionHeader({ qNum, title, marks, instructions }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          <span style={{ marginRight: '8px' }}>{qNum}</span>
          {title}
        </div>
        {marks > 0 && (
          <div style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '12px' }}>
            (Total Marks: {marks})
          </div>
        )}
      </div>
      {instructions && (
        <div style={{ fontSize: '11.5px', fontStyle: 'italic', marginTop: '2px', marginLeft: '28px' }}>
          Note: {instructions}
        </div>
      )}
    </div>
  );
}
