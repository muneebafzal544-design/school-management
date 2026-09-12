import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getStudents } from '../api/students';
import { useSettings } from '../hooks/useReferenceData';

const CENTER = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif' };

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

const AVATAR_COLORS = [
  ['#4f46e5','#7c3aed'], ['#0891b2','#0e7490'], ['#059669','#047857'],
  ['#dc2626','#b91c1c'], ['#d97706','#b45309'], ['#7c3aed','#6d28d9'],
];
function avatarColor(id) { return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]; }

function qrValue(s) {
  return `STUDENT:${s.admission_number || s.id}|${s.full_name}|${s.class_name || s.grade || ''}|${s.roll_number || ''}`;
}

// ── TEMPLATE 1: Classic ────────────────────────────────────────────────────
function ClassicCard({ s, school }) {
  const [c1, c2] = avatarColor(s.id);
  const bg = `linear-gradient(135deg, ${c1}, ${c2})`;
  return (
    <div className="id-card classic-card">
      <div className="classic-top" style={{ background: bg }}>
        <div className="classic-school">{school.school_name || 'SCHOOL MANAGEMENT SYSTEM'}</div>
        <div className="classic-sub">Student Identity Card</div>
      </div>
      <div className="classic-avatar-wrap">
        {s.photo_url
          ? <img src={s.photo_url} alt={s.full_name} className="classic-avatar-photo" />
          : <div className="classic-avatar" style={{ background: bg }}>{initials(s.full_name)}</div>
        }
      </div>
      <div className="classic-body">
        <div className="classic-name">{s.full_name}</div>
        {s.full_name_urdu && <div className="classic-urdu">{s.full_name_urdu}</div>}
        <div className="classic-badge" style={{ background: c1 + '18', color: c1, border: `1px solid ${c1}44` }}>
          {s.class_name || s.grade || '—'}{s.section ? ` – ${s.section}` : ''}
        </div>
        <div className="classic-bottom-row">
          <div className="info-rows">
            <div className="info-row"><span className="lbl">Father</span><span className="val">{s.father_name || '—'}</span></div>
            <div className="info-row"><span className="lbl">Roll No</span><span className="val bold">{s.roll_number || '—'}</span></div>
            {s.b_form_no   && <div className="info-row"><span className="lbl">B-Form</span><span className="val mono">{s.b_form_no}</span></div>}
            {s.blood_group && <div className="info-row"><span className="lbl">Blood</span><span className="val bold" style={{ color: '#dc2626' }}>{s.blood_group}</span></div>}
            {s.phone       && <div className="info-row"><span className="lbl">Contact</span><span className="val">{s.phone}</span></div>}
          </div>
          <div className="classic-qr">
            <QRCodeSVG value={qrValue(s)} size={38} level="M" bgColor="transparent" fgColor="#1e293b" />
            <div className="qr-adm">ADM-{s.admission_number || s.id}</div>
          </div>
        </div>
      </div>
      <div className="classic-footer" style={{ background: bg }}>
        {school.academic_year || 'Academic Year 2024–25'}
      </div>
    </div>
  );
}

// ── TEMPLATE 2: Lanyard (Horizontal) ──────────────────────────────────────
function LanyardCard({ s, school }) {
  const [c1, c2] = avatarColor(s.id);
  const bg = `linear-gradient(160deg, ${c1}, ${c2})`;
  return (
    <div className="id-card lanyard-card">
      {/* Left color strip */}
      <div className="lanyard-strip" style={{ background: bg }}>
        {s.photo_url
          ? <img src={s.photo_url} alt={s.full_name} className="lanyard-photo" />
          : <div className="lanyard-initials">{initials(s.full_name)}</div>
        }
        <div className="lanyard-class-vert">
          {s.class_name || s.grade || '—'}{s.section ? ` ${s.section}` : ''}
        </div>
      </div>

      {/* Right info */}
      <div className="lanyard-info">
        <div className="lanyard-header">
          <div className="lanyard-school">{school.school_name || 'SCHOOL MANAGEMENT SYSTEM'}</div>
          <div className="lanyard-title">Student ID Card</div>
        </div>
        <div className="lanyard-name">{s.full_name}</div>
        {s.full_name_urdu && <div className="lanyard-urdu">{s.full_name_urdu}</div>}
        <div className="lanyard-rows">
          <div className="lanyard-row">
            <span className="lanyard-lbl">Roll No</span>
            <span className="lanyard-val bold" style={{ color: c1 }}>{s.roll_number || '—'}</span>
          </div>
          <div className="lanyard-row">
            <span className="lanyard-lbl">Father</span>
            <span className="lanyard-val">{s.father_name || '—'}</span>
          </div>
          {s.b_form_no && (
            <div className="lanyard-row">
              <span className="lanyard-lbl">B-Form</span>
              <span className="lanyard-val mono" style={{ fontSize: '6.5px' }}>{s.b_form_no}</span>
            </div>
          )}
          {s.blood_group && (
            <div className="lanyard-row">
              <span className="lanyard-lbl">Blood</span>
              <span className="lanyard-val bold" style={{ color: '#dc2626' }}>{s.blood_group}</span>
            </div>
          )}
        </div>
        <div className="lanyard-footer-row">
          <div className="lanyard-footer-left">
            <div className="lanyard-footer-yr" style={{ color: c1 }}>{school.academic_year || '2024–25'}</div>
            {s.phone && <div className="lanyard-footer-phone">{s.phone}</div>}
          </div>
          <div className="lanyard-qr">
            <QRCodeSVG value={qrValue(s)} size={34} level="M" bgColor="#ffffff" fgColor={c1} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TEMPLATE 3: Academic (Formal) ─────────────────────────────────────────
function AcademicCard({ s, school }) {
  const [c1] = avatarColor(s.id);
  return (
    <div className="id-card academic-card">
      {/* Header */}
      <div className="acad-header">
        <div className="acad-logo-area">
          {school.school_logo
            ? <img src={school.school_logo} alt="logo" className="acad-logo-img" />
            : <div className="acad-logo-fallback">{(school.school_name || 'S').charAt(0)}</div>
          }
        </div>
        <div className="acad-school-info">
          <div className="acad-school-name">{school.school_name || 'SCHOOL MANAGEMENT SYSTEM'}</div>
          {school.school_address && <div className="acad-school-addr">{school.school_address}</div>}
          <div className="acad-card-title">STUDENT IDENTITY CARD</div>
        </div>
      </div>

      {/* Photo + info */}
      <div className="acad-body">
        <div className="acad-photo-col">
          {s.photo_url
            ? <img src={s.photo_url} alt={s.full_name} className="acad-photo" />
            : <div className="acad-initials" style={{ background: `${c1}20`, color: c1, border: `2px solid ${c1}40` }}>
                {initials(s.full_name)}
              </div>
          }
          {s.blood_group && (
            <div className="acad-blood">
              <span className="acad-blood-lbl">Blood</span>
              <span className="acad-blood-val">{s.blood_group}</span>
            </div>
          )}
        </div>
        <div className="acad-data">
          <div className="acad-student-name">{s.full_name}</div>
          {s.full_name_urdu && <div className="acad-urdu">{s.full_name_urdu}</div>}
          <table className="acad-table">
            <tbody>
              <tr><td className="acad-td-lbl">Class</td><td className="acad-td-val">{s.class_name || s.grade || '—'}{s.section ? ` (${s.section})` : ''}</td></tr>
              <tr><td className="acad-td-lbl">Roll No</td><td className="acad-td-val bold-val" style={{ color: c1 }}>{s.roll_number || '—'}</td></tr>
              <tr><td className="acad-td-lbl">Father</td><td className="acad-td-val">{s.father_name || '—'}</td></tr>
              {s.b_form_no  && <tr><td className="acad-td-lbl">B-Form</td><td className="acad-td-val mono-val">{s.b_form_no}</td></tr>}
              {s.phone      && <tr><td className="acad-td-lbl">Contact</td><td className="acad-td-val">{s.phone}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="acad-footer" style={{ background: `${c1}12`, borderTop: `2px solid ${c1}30` }}>
        <div className="acad-footer-left">
          <span className="acad-footer-adm">Adm# {s.admission_number || s.id}</span>
          <span className="acad-footer-yr" style={{ color: c1 }}>{school.academic_year || '2024–25'}</span>
        </div>
        <div className="acad-qr">
          <QRCodeSVG value={qrValue(s)} size={32} level="M" bgColor="transparent" fgColor={c1} />
        </div>
      </div>
    </div>
  );
}

// ── Template meta ──────────────────────────────────────────────────────────
const TEMPLATES = [
  { id: '1', label: 'Classic',  perPage: 8 },
  { id: '2', label: 'Lanyard',  perPage: 6 },
  { id: '3', label: 'Academic', perPage: 8 },
];

function CardComponent({ template, s, school }) {
  if (template === '2') return <LanyardCard s={s} school={school} />;
  if (template === '3') return <AcademicCard s={s} school={school} />;
  return <ClassicCard s={s} school={school} />;
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function StudentIdCardPage() {
  const [params]                    = useSearchParams();
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [students, setStudents]     = useState([]);
  const { data: school = {} }       = useSettings();
  const [template, setTemplate]     = useState(params.get('template') || '1');

  const classId  = params.get('class_id');
  const classNm  = params.get('class_name') || '';
  const idsParam = params.get('ids');

  useEffect(() => {
    async function load() {
      try {
        let query = {};
        if (classId) query.class_id = classId;
        const studRes = await getStudents(query);
        let data = Array.isArray(studRes.data) ? studRes.data : [];
        if (idsParam) {
          const ids = idsParam.split(',').map(Number).filter(Boolean);
          data = data.filter(s => ids.includes(s.id));
        }
        setStudents(data);
      } catch {
        setError('Failed to load students. Please close and try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!loading && students.length > 0) {
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [loading, students]);

  if (loading) return <div style={CENTER}>Loading ID cards…</div>;
  if (error)   return <div style={{ ...CENTER, color: '#dc2626' }}>{error}</div>;
  if (students.length === 0) return <div style={{ ...CENTER, color: '#64748b' }}>No students found.</div>;

  const perPage = TEMPLATES.find(t => t.id === template)?.perPage || 8;
  const pages   = [];
  for (let i = 0; i < students.length; i += perPage) pages.push(students.slice(i, i + perPage));

  const label = classNm ? `ID Cards — ${classNm}` : `ID Cards (${students.length})`;

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="no-print toolbar">
        <div className="toolbar-info"><strong>{label}</strong> — {students.length} card{students.length !== 1 ? 's' : ''}</div>
        <div className="tpl-group">
          <span className="tpl-label">Template:</span>
          {TEMPLATES.map(t => (
            <button key={t.id} className={`tpl-btn ${template === t.id ? 'tpl-active' : ''}`}
              onClick={() => setTemplate(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <button className="print-btn" onClick={() => window.print()}>🖨 Print</button>
        <button className="close-btn" onClick={() => window.close()}>✕ Close</button>
      </div>

      {/* ── Pages ── */}
      {pages.map((group, pi) => (
        <div key={pi} className={`page page-tpl${template}`}>
          <div className={`card-grid grid-tpl${template}`}>
            {group.map(s => <CardComponent key={s.id} template={template} s={s} school={school} />)}
          </div>
        </div>
      ))}

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; background: #f0f0f0; }

        /* ── Toolbar ── */
        .toolbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: #1e293b; color: #e2e8f0;
          padding: 8px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .toolbar-info { flex: 1; font-size: 13px; min-width: 120px; }
        .tpl-group { display: flex; align-items: center; gap: 4px; }
        .tpl-label { font-size: 11px; color: #94a3b8; margin-right: 2px; }
        .tpl-btn {
          background: #334155; color: #cbd5e1; border: 1px solid #475569;
          border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer;
          transition: all 0.15s;
        }
        .tpl-btn:hover { background: #475569; }
        .tpl-btn.tpl-active { background: #3b82f6; color: #fff; border-color: #3b82f6; font-weight: 700; }
        .print-btn { background: #10b981; color: #fff; border: none; border-radius: 8px; padding: 6px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .close-btn { background: #475569; color: #fff; border: none; border-radius: 8px; padding: 6px 12px; font-size: 13px; cursor: pointer; }

        /* ── Page ── */
        .page {
          width: 210mm; min-height: 297mm;
          margin: 56px auto 20px; background: #fff;
          box-shadow: 0 2px 20px rgba(0,0,0,0.12); padding: 10mm;
        }

        /* ── Grids ── */
        .card-grid { width: 100%; display: grid; gap: 5mm; }
        .grid-tpl1, .grid-tpl3 { grid-template-columns: repeat(2, 1fr); }
        .grid-tpl2 { grid-template-columns: repeat(1, 1fr); }

        /* ── Base card ── */
        .id-card {
          border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
          display: flex; flex-direction: column; background: #fff;
          box-shadow: 0 1px 5px rgba(0,0,0,0.08);
        }

        /* ══════════════ TEMPLATE 1: CLASSIC ══════════════ */
        .classic-card { }
        .classic-top { padding: 7px 10px 9px; text-align: center; }
        .classic-school { color: #fff; font-size: 8px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; }
        .classic-sub    { color: rgba(255,255,255,0.75); font-size: 6px; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 1px; }
        .classic-avatar-wrap { display: flex; justify-content: center; margin-top: -14px; z-index: 1; position: relative; }
        .classic-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 13px; font-weight: 900;
          border: 2.5px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        }
        .classic-avatar-photo {
          width: 36px; height: 36px; border-radius: 50%; object-fit: cover;
          border: 2.5px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        }
        .classic-body { padding: 4px 10px 5px; flex: 1; display: flex; flex-direction: column; gap: 3px; align-items: center; }
        .classic-name  { font-size: 10px; font-weight: 900; color: #0f172a; text-align: center; line-height: 1.2; }
        .classic-urdu  { font-size: 10px; color: #475569; text-align: center; direction: rtl; margin-top: 1px; }
        .classic-badge { font-size: 7.5px; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-top: 2px; }
        .classic-bottom-row { width: 100%; display: flex; align-items: flex-end; gap: 4px; margin-top: 3px; }
        .classic-qr { display: flex; flex-direction: column; align-items: center; gap: 1px; flex-shrink: 0; }
        .qr-adm { font-size: 5px; color: #94a3b8; text-align: center; font-family: monospace; margin-top: 1px; }
        .classic-footer { padding: 4px 8px; text-align: center; color: rgba(255,255,255,0.9); font-size: 6.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }

        /* ══════════════ TEMPLATE 2: LANYARD ══════════════ */
        .lanyard-card { flex-direction: row; min-height: 48mm; }
        .lanyard-strip {
          width: 28mm; flex-shrink: 0;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 5px; padding: 8px 4px;
        }
        .lanyard-photo {
          width: 38px; height: 38px; border-radius: 50%; object-fit: cover;
          border: 2px solid rgba(255,255,255,0.8);
          box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        }
        .lanyard-initials {
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(255,255,255,0.25); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 900;
          border: 2px solid rgba(255,255,255,0.6);
        }
        .lanyard-class-vert {
          color: rgba(255,255,255,0.9); font-size: 7px; font-weight: 700;
          text-align: center; word-break: break-word; line-height: 1.2;
        }
        .lanyard-info { flex: 1; padding: 7px 8px; display: flex; flex-direction: column; gap: 3px; }
        .lanyard-header { border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 3px; }
        .lanyard-school { font-size: 7.5px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.2; }
        .lanyard-title  { font-size: 6px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
        .lanyard-name   { font-size: 10px; font-weight: 900; color: #0f172a; line-height: 1.2; }
        .lanyard-urdu   { font-size: 9px; color: #475569; direction: rtl; }
        .lanyard-rows   { display: flex; flex-direction: column; gap: 2px; margin-top: 2px; flex: 1; }
        .lanyard-row    { display: flex; gap: 4px; align-items: baseline; }
        .lanyard-lbl    { font-size: 6.5px; color: #94a3b8; min-width: 36px; flex-shrink: 0; }
        .lanyard-val    { font-size: 7.5px; color: #1e293b; flex: 1; }
        .lanyard-val.bold { font-weight: 700; }
        .lanyard-val.mono { font-family: monospace; }
        .lanyard-footer-row { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 4px; border-top: 1px solid #f1f5f9; }
        .lanyard-footer-left { display: flex; flex-direction: column; gap: 1px; }
        .lanyard-footer-yr { font-size: 7px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; }
        .lanyard-footer-phone { font-size: 6.5px; color: #64748b; }
        .lanyard-qr { flex-shrink: 0; }

        /* ══════════════ TEMPLATE 3: ACADEMIC ══════════════ */
        .academic-card { }
        .acad-header {
          background: #1e293b; color: #fff;
          display: flex; align-items: center; gap: 6px; padding: 6px 8px;
        }
        .acad-logo-area { flex-shrink: 0; }
        .acad-logo-img    { width: 26px; height: 26px; border-radius: 4px; object-fit: contain; }
        .acad-logo-fallback {
          width: 26px; height: 26px; border-radius: 4px;
          background: rgba(255,255,255,0.15); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 900;
        }
        .acad-school-info { flex: 1; }
        .acad-school-name { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.2; }
        .acad-school-addr { font-size: 6px; color: rgba(255,255,255,0.6); margin-top: 1px; }
        .acad-card-title  { font-size: 6px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }
        .acad-body { display: flex; gap: 6px; padding: 6px 8px; flex: 1; }
        .acad-photo-col { display: flex; flex-direction: column; align-items: center; gap: 3px; flex-shrink: 0; }
        .acad-photo {
          width: 40px; height: 48px; object-fit: cover;
          border: 1.5px solid #cbd5e1; border-radius: 4px;
        }
        .acad-initials {
          width: 40px; height: 48px; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 900;
        }
        .acad-blood {
          display: flex; flex-direction: column; align-items: center;
          background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px;
          padding: 1px 4px;
        }
        .acad-blood-lbl { font-size: 5.5px; color: #9ca3af; text-transform: uppercase; }
        .acad-blood-val { font-size: 9px; font-weight: 900; color: #dc2626; line-height: 1; }
        .acad-data { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .acad-student-name { font-size: 10px; font-weight: 900; color: #0f172a; line-height: 1.2; }
        .acad-urdu         { font-size: 9px; color: #475569; direction: rtl; }
        .acad-table { width: 100%; border-collapse: collapse; margin-top: 3px; }
        .acad-td-lbl { font-size: 6.5px; color: #94a3b8; width: 38px; padding: 1px 3px 1px 0; white-space: nowrap; vertical-align: top; }
        .acad-td-val { font-size: 7px; color: #1e293b; padding: 1px 0; vertical-align: top; }
        .bold-val { font-weight: 700; }
        .mono-val { font-family: monospace; font-size: 6.5px; }
        .acad-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding: 4px 8px;
        }
        .acad-footer-left { display: flex; flex-direction: column; gap: 2px; }
        .acad-footer-adm  { font-size: 6px; color: #64748b; }
        .acad-footer-yr   { font-size: 7px; font-weight: 900; }
        .acad-qr { flex-shrink: 0; }

        /* ── Shared info rows (Template 1) ── */
        .info-rows { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .info-row  { display: flex; gap: 4px; align-items: baseline; }
        .lbl { font-size: 7px; color: #94a3b8; min-width: 36px; flex-shrink: 0; }
        .val { font-size: 7.5px; color: #1e293b; flex: 1; }
        .val.bold { font-weight: 700; }
        .val.mono { font-family: monospace; font-size: 7px; }

        /* ── Print ── */
        @media print {
          body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page {
            margin: 0; box-shadow: none;
            page-break-after: always;
            width: 100%; min-height: auto;
            padding: 8mm;
          }
          .page:last-child { page-break-after: avoid; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </>
  );
}
