import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getStudent } from '../api/students';

const CENTER = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif' };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ordinal(n) {
  if (!n) return '—';
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ── Leaving / Transfer Certificate ── */
function LeavingCertificate({ s, issueDate }) {
  return (
    <div className="cert">
      <div className="cert-header">
        <div className="cert-logo">S</div>
        <div className="cert-school-info">
          <div className="cert-school-name">SCHOOL MANAGEMENT SYSTEM</div>
          <div className="cert-school-address">123 School Road, City — Tel: 0300-0000000</div>
        </div>
      </div>
      <div className="cert-divider" />

      <div className="cert-title">School Leaving Certificate</div>
      <div className="cert-title-sub">Transfer Certificate (TC)</div>
      <div className="cert-serial">Serial No: TC-{String(s.id).padStart(4, '0')}</div>

      <div className="cert-body">
        <p className="cert-para">
          This is to certify that <strong>{s.full_name}</strong>
          {s.full_name_urdu ? ` (${s.full_name_urdu})` : ''},
          {s.gender ? ` ${s.gender},` : ''} son/daughter of{' '}
          <strong>{s.father_name || '—'}</strong>, resident of{' '}
          {s.city || s.address || '—'}, was a student of this institution.
        </p>

        <table className="cert-table">
          <tbody>
            <tr><td className="cert-td-lbl">Date of Birth</td><td className="cert-td-val">{fmtDate(s.date_of_birth)}</td>
                <td className="cert-td-lbl">B-Form / CNIC</td><td className="cert-td-val">{s.b_form_no || '—'}</td></tr>
            <tr><td className="cert-td-lbl">Admission Date</td><td className="cert-td-val">{fmtDate(s.admission_date)}</td>
                <td className="cert-td-lbl">Blood Group</td><td className="cert-td-val">{s.blood_group || '—'}</td></tr>
            <tr><td className="cert-td-lbl">Last Class</td><td className="cert-td-val">{s.class_name || s.grade || '—'}{s.section ? ` – ${s.section}` : ''}</td>
                <td className="cert-td-lbl">Roll Number</td><td className="cert-td-val">{s.roll_number || '—'}</td></tr>
            <tr><td className="cert-td-lbl">Religion</td><td className="cert-td-val">{s.religion || '—'}</td>
                <td className="cert-td-lbl">Nationality</td><td className="cert-td-val">{s.nationality || '—'}</td></tr>
            <tr><td className="cert-td-lbl">Leaving Date</td><td className="cert-td-val">{issueDate}</td>
                <td className="cert-td-lbl">Reason for Leaving</td><td className="cert-td-val">{s.leaving_reason || 'Transfer'}</td></tr>
            <tr><td className="cert-td-lbl">Fee Clearance</td><td className="cert-td-val" style={{ color: '#16a34a', fontWeight: 700 }}>Cleared</td>
                <td className="cert-td-lbl">Conduct</td><td className="cert-td-val">Good</td></tr>
          </tbody>
        </table>

        <p className="cert-para cert-note">
          The above mentioned student has completed all dues and formalities. This certificate is issued on request for
          admission purposes. We wish him/her the best in future endeavours.
        </p>
      </div>

      <div className="cert-issue">Date of Issue: <strong>{issueDate}</strong></div>
      <CertSignatures />
    </div>
  );
}

/* ── Character Certificate ── */
function CharacterCertificate({ s, issueDate }) {
  return (
    <div className="cert">
      <div className="cert-header">
        <div className="cert-logo">S</div>
        <div className="cert-school-info">
          <div className="cert-school-name">SCHOOL MANAGEMENT SYSTEM</div>
          <div className="cert-school-address">123 School Road, City — Tel: 0300-0000000</div>
        </div>
      </div>
      <div className="cert-divider" />

      <div className="cert-title">Character Certificate</div>
      <div className="cert-serial">No: CC-{String(s.id).padStart(4, '0')}</div>

      <div className="cert-body">
        <p className="cert-para" style={{ marginBottom: '6mm' }}>
          This is to certify that <strong>{s.full_name}</strong>
          {s.full_name_urdu ? ` (${s.full_name_urdu})` : ''},
          son/daughter of <strong>{s.father_name || '—'}</strong>,
          bearing B-Form No. <strong>{s.b_form_no || '—'}</strong>,
          was a student of this institution from{' '}
          <strong>{fmtDate(s.admission_date)}</strong>.
          {s.class_name || s.grade
            ? ` He/She studied up to class ${s.class_name || s.grade}${s.section ? ` (${s.section})` : ''}.`
            : ''}
        </p>

        <p className="cert-para" style={{ marginBottom: '6mm' }}>
          During his/her stay at this institution, he/she was found to be a student of{' '}
          <strong>good character and moral conduct</strong>. He/She was regular, punctual, and obedient.
          His/Her behaviour with the teachers and fellow students was{' '}
          <strong>exemplary and commendable</strong>.
        </p>

        <p className="cert-para">
          This certificate is issued on request and to the best of our knowledge and belief, there is nothing on
          record against his/her character. We wish him/her every success in life.
        </p>

        {(s.extra_curricular || s.house_color) && (
          <table className="cert-table" style={{ marginTop: '5mm' }}>
            <tbody>
              {s.extra_curricular && (
                <tr>
                  <td className="cert-td-lbl">Extra-Curricular Activities</td>
                  <td className="cert-td-val" colSpan={3}>{s.extra_curricular}</td>
                </tr>
              )}
              {s.house_color && (
                <tr>
                  <td className="cert-td-lbl">House</td>
                  <td className="cert-td-val">{s.house_color}</td>
                  <td className="cert-td-lbl">Roll Number</td>
                  <td className="cert-td-val">{s.roll_number || '—'}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="cert-issue">Date of Issue: <strong>{issueDate}</strong></div>
      <CertSignatures />
    </div>
  );
}

function CertSignatures() {
  return (
    <div className="cert-sigs">
      <div className="cert-sig">
        <div className="cert-sig-line" />
        <div className="cert-sig-lbl">Class Teacher</div>
      </div>
      <div className="cert-sig">
        <div className="cert-sig-line" />
        <div className="cert-sig-lbl">Parent / Guardian</div>
      </div>
      <div className="cert-sig" style={{ textAlign: 'right' }}>
        <div className="cert-sig-line" />
        <div className="cert-sig-lbl">Principal</div>
      </div>
    </div>
  );
}

export default function CertificatePrintPage() {
  const [params]  = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [student, setStudent] = useState(null);

  const type      = params.get('type') || 'leaving'; // 'leaving' | 'character'
  const studentId = params.get('student_id');
  const issueDate = fmtDate(new Date().toISOString());

  useEffect(() => {
    if (!studentId) { setError('No student specified.'); setLoading(false); return; }
    getStudent(studentId)
      .then(r => {
        const d = r.data?.data ?? r.data;
        setStudent(d || null);
      })
      .catch(() => setError('Failed to load student data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && student) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading, student]);

  if (loading) return <div style={CENTER}>Loading certificate…</div>;
  if (error)   return <div style={{ ...CENTER, color: '#dc2626' }}>{error}</div>;
  if (!student) return <div style={{ ...CENTER, color: '#64748b' }}>Student not found.</div>;

  const title = type === 'character' ? 'Character Certificate' : 'Leaving / Transfer Certificate';

  return (
    <>
      <div className="no-print toolbar">
        <div className="toolbar-info"><strong>{title}</strong> — {student.full_name}</div>
        <button className="print-btn" onClick={() => window.print()}>🖨 Print</button>
        <button className="close-btn" onClick={() => window.close()}>✕ Close</button>
      </div>

      <div className="page">
        {type === 'character'
          ? <CharacterCertificate s={student} issueDate={issueDate} />
          : <LeavingCertificate   s={student} issueDate={issueDate} />
        }
      </div>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, serif; background: #f0f0f0; font-size: 11px; }

        /* ── Toolbar ── */
        .toolbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: #1e293b; color: #e2e8f0;
          padding: 10px 20px; display: flex; align-items: center; gap: 12px;
          font-family: Arial, sans-serif;
        }
        .toolbar-info { flex: 1; font-size: 13px; }
        .print-btn { background: #10b981; color: #fff; border: none; border-radius: 8px; padding: 7px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .close-btn { background: #475569; color: #fff; border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px; cursor: pointer; }

        /* ── Page ── */
        .page {
          width: 210mm; min-height: 297mm;
          margin: 52px auto 24px;
          background: #fff;
          box-shadow: 0 2px 20px rgba(0,0,0,0.12);
          padding: 15mm 18mm;
        }

        /* ── Certificate ── */
        .cert { display: flex; flex-direction: column; }

        .cert-header { display: flex; align-items: center; gap: 14px; margin-bottom: 3mm; }
        .cert-logo {
          width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
          background: #1e293b; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: Arial; font-size: 22px; font-weight: 900;
        }
        .cert-school-name { font-family: Arial; font-size: 15px; font-weight: 900; color: #1e293b; letter-spacing: 0.02em; }
        .cert-school-address { font-family: Arial; font-size: 8.5px; color: #64748b; margin-top: 2px; }

        .cert-divider { border-top: 2.5px solid #1e293b; margin-bottom: 8mm; }

        .cert-title {
          font-size: 20px; font-weight: 900; text-align: center; color: #1e293b;
          text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;
        }
        .cert-title-sub { font-size: 10px; text-align: center; color: #64748b; margin-bottom: 2mm; font-style: italic; }
        .cert-serial { font-size: 9px; text-align: right; color: #94a3b8; margin-bottom: 6mm; font-family: Arial; }

        .cert-body { flex: 1; }

        .cert-para { line-height: 1.9; color: #1e293b; font-size: 11px; margin-bottom: 4mm; text-align: justify; }
        .cert-note { font-style: italic; color: #475569; font-size: 10px; }

        /* Info table */
        .cert-table { width: 100%; border-collapse: collapse; margin: 4mm 0; font-size: 10px; }
        .cert-td-lbl { padding: 4px 10px 4px 0; color: #64748b; font-style: italic; width: 25%; vertical-align: top; }
        .cert-td-val { padding: 4px 10px; color: #0f172a; font-weight: 600; border-bottom: 1px dotted #e2e8f0; width: 25%; vertical-align: top; }

        .cert-issue { margin-top: 8mm; font-size: 10px; color: #475569; }

        /* Signatures */
        .cert-sigs { display: flex; justify-content: space-between; margin-top: 14mm; }
        .cert-sig { width: 28%; }
        .cert-sig-line { border-bottom: 1px solid #94a3b8; height: 20px; margin-bottom: 4px; }
        .cert-sig-lbl { font-family: Arial; font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }

        /* ── Print ── */
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .page { margin: 0; box-shadow: none; width: 100%; min-height: auto; }
          @page { size: A4 portrait; margin: 15mm 18mm; }
        }
      `}</style>
    </>
  );
}
