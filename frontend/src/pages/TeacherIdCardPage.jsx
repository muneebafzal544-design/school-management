import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getTeachers } from '../api/teachers';
import { useSettings } from '../hooks/useReferenceData';

const CENTER = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif' };

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

const AVATAR_COLORS = [
  ['#0f766e','#0d9488'], ['#1d4ed8','#2563eb'], ['#7c3aed','#8b5cf6'],
  ['#be185d','#db2777'], ['#b45309','#d97706'], ['#065f46','#059669'],
];
function avatarColor(id) { return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]; }

function qrValue(t) {
  return `TEACHER:${t.id}|${t.full_name}|${t.subject || ''}|${t.phone || ''}`;
}

function joinYear(dateStr) {
  if (!dateStr) return null;
  const y = new Date(dateStr).getFullYear();
  return isNaN(y) ? null : String(y);
}

// ── TEMPLATE 1: Classic ────────────────────────────────────────────────────
function ClassicCard({ t, school }) {
  const [c1, c2] = avatarColor(t.id);
  const bg = `linear-gradient(135deg, ${c1}, ${c2})`;
  return (
    <div className="id-card classic-card">
      <div className="classic-top" style={{ background: bg }}>
        {school.school_logo
          ? <img src={school.school_logo} alt="logo" className="classic-logo" />
          : null
        }
        <div className="classic-school">{school.school_name || 'SCHOOL MANAGEMENT SYSTEM'}</div>
        <div className="classic-sub">Staff Identity Card</div>
      </div>
      <div className="classic-avatar-wrap">
        {t.photo_url
          ? <img src={t.photo_url} alt={t.full_name} className="classic-avatar-photo" />
          : <div className="classic-avatar" style={{ background: bg }}>{initials(t.full_name)}</div>
        }
      </div>
      <div className="classic-body">
        <div className="classic-name">{t.full_name}</div>
        <div className="classic-badge" style={{ background: c1 + '18', color: c1, border: `1px solid ${c1}44` }}>
          {t.subject || 'Faculty'}
        </div>
        <div className="classic-bottom-row">
          <div className="info-rows">
            {t.qualification && <div className="info-row"><span className="lbl">Qualif.</span><span className="val">{t.qualification}</span></div>}
            {t.phone          && <div className="info-row"><span className="lbl">Contact</span><span className="val">{t.phone}</span></div>}
            {t.email          && <div className="info-row"><span className="lbl">Email</span><span className="val" style={{ fontSize: '6px' }}>{t.email}</span></div>}
            {joinYear(t.join_date) && <div className="info-row"><span className="lbl">Joined</span><span className="val">{joinYear(t.join_date)}</span></div>}
          </div>
          <div className="classic-qr">
            <QRCodeSVG value={qrValue(t)} size={38} level="M" bgColor="transparent" fgColor="#1e293b" />
            <div className="qr-id">ID-{t.id}</div>
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
function LanyardCard({ t, school }) {
  const [c1, c2] = avatarColor(t.id);
  const bg = `linear-gradient(160deg, ${c1}, ${c2})`;
  return (
    <div className="id-card lanyard-card">
      <div className="lanyard-strip" style={{ background: bg }}>
        {t.photo_url
          ? <img src={t.photo_url} alt={t.full_name} className="lanyard-photo" />
          : <div className="lanyard-initials">{initials(t.full_name)}</div>
        }
        <div className="lanyard-dept">{t.subject || 'Faculty'}</div>
      </div>
      <div className="lanyard-info">
        <div className="lanyard-header">
          <div className="lanyard-school">{school.school_name || 'SCHOOL MANAGEMENT SYSTEM'}</div>
          <div className="lanyard-title">Staff ID Card</div>
        </div>
        <div className="lanyard-name">{t.full_name}</div>
        {t.qualification && <div className="lanyard-qual">{t.qualification}</div>}
        <div className="lanyard-rows">
          {t.phone && (
            <div className="lanyard-row">
              <span className="lanyard-lbl">Contact</span>
              <span className="lanyard-val">{t.phone}</span>
            </div>
          )}
          {t.email && (
            <div className="lanyard-row">
              <span className="lanyard-lbl">Email</span>
              <span className="lanyard-val" style={{ fontSize: '6px' }}>{t.email}</span>
            </div>
          )}
          {joinYear(t.join_date) && (
            <div className="lanyard-row">
              <span className="lanyard-lbl">Since</span>
              <span className="lanyard-val bold" style={{ color: c1 }}>{joinYear(t.join_date)}</span>
            </div>
          )}
        </div>
        <div className="lanyard-footer-row">
          <div className="lanyard-footer-left">
            <div className="lanyard-footer-yr" style={{ color: c1 }}>{school.academic_year || '2024–25'}</div>
            <div className="lanyard-footer-id">ID: {t.id}</div>
          </div>
          <div className="lanyard-qr">
            <QRCodeSVG value={qrValue(t)} size={34} level="M" bgColor="#ffffff" fgColor={c1} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TEMPLATE 3: Academic (Formal) ─────────────────────────────────────────
function AcademicCard({ t, school }) {
  const [c1] = avatarColor(t.id);
  return (
    <div className="id-card academic-card">
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
          <div className="acad-card-title">STAFF IDENTITY CARD</div>
        </div>
      </div>

      <div className="acad-body">
        <div className="acad-photo-col">
          {t.photo_url
            ? <img src={t.photo_url} alt={t.full_name} className="acad-photo" />
            : <div className="acad-initials" style={{ background: `${c1}20`, color: c1, border: `2px solid ${c1}40` }}>
                {initials(t.full_name)}
              </div>
          }
          <div className="acad-role-badge" style={{ background: `${c1}15`, color: c1, border: `1px solid ${c1}33` }}>
            {t.gender === 'Female' ? 'Ms.' : 'Mr.'}
          </div>
        </div>
        <div className="acad-data">
          <div className="acad-name">{t.full_name}</div>
          {t.subject && <div className="acad-subject" style={{ color: c1 }}>{t.subject}</div>}
          <table className="acad-table">
            <tbody>
              {t.qualification && <tr><td className="acad-td-lbl">Qualif.</td><td className="acad-td-val">{t.qualification}</td></tr>}
              {t.phone && <tr><td className="acad-td-lbl">Phone</td><td className="acad-td-val">{t.phone}</td></tr>}
              {t.email && <tr><td className="acad-td-lbl">Email</td><td className="acad-td-val" style={{ fontSize: '6px' }}>{t.email}</td></tr>}
              {joinYear(t.join_date) && <tr><td className="acad-td-lbl">Joined</td><td className="acad-td-val bold-val" style={{ color: c1 }}>{joinYear(t.join_date)}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="acad-footer" style={{ background: `${c1}12`, borderTop: `2px solid ${c1}30` }}>
        <div className="acad-footer-left">
          <span className="acad-footer-id">EMP-{t.id}</span>
          <span className="acad-footer-yr" style={{ color: c1 }}>{school.academic_year || '2024–25'}</span>
        </div>
        <div className="acad-qr">
          <QRCodeSVG value={qrValue(t)} size={32} level="M" bgColor="transparent" fgColor={c1} />
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

function CardComponent({ template, t, school }) {
  if (template === '2') return <LanyardCard t={t} school={school} />;
  if (template === '3') return <AcademicCard t={t} school={school} />;
  return <ClassicCard t={t} school={school} />;
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function TeacherIdCardPage() {
  const [params]                    = useSearchParams();
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [teachers, setTeachers]     = useState([]);
  const { data: school = {} }       = useSettings();
  const [template, setTemplate]     = useState(params.get('template') || '1');

  const idsParam = params.get('ids');

  useEffect(() => {
    async function load() {
      try {
        const tchRes = await getTeachers({ status: 'active' });
        let data = Array.isArray(tchRes.data) ? tchRes.data : [];
        if (idsParam) {
          const ids = idsParam.split(',').map(Number).filter(Boolean);
          data = data.filter(t => ids.includes(t.id));
        }
        setTeachers(data);
      } catch {
        setError('Failed to load teachers. Please close and try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!loading && teachers.length > 0) {
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [loading, teachers]);

  if (loading) return <div style={CENTER}>Loading ID cards…</div>;
  if (error)   return <div style={{ ...CENTER, color: '#dc2626' }}>{error}</div>;
  if (teachers.length === 0) return <div style={{ ...CENTER, color: '#64748b' }}>No teachers found.</div>;

  const perPage = TEMPLATES.find(t => t.id === template)?.perPage || 8;
  const pages   = [];
  for (let i = 0; i < teachers.length; i += perPage) pages.push(teachers.slice(i, i + perPage));

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="no-print toolbar">
        <div className="toolbar-info">
          <strong>Staff ID Cards</strong> — {teachers.length} card{teachers.length !== 1 ? 's' : ''}
        </div>
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
            {group.map(t => <CardComponent key={t.id} template={template} t={t} school={school} />)}
          </div>
        </div>
      ))}

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; background: #f0f0f0; }

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
          border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; transition: all 0.15s;
        }
        .tpl-btn:hover { background: #475569; }
        .tpl-btn.tpl-active { background: #3b82f6; color: #fff; border-color: #3b82f6; font-weight: 700; }
        .print-btn { background: #10b981; color: #fff; border: none; border-radius: 8px; padding: 6px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .close-btn { background: #475569; color: #fff; border: none; border-radius: 8px; padding: 6px 12px; font-size: 13px; cursor: pointer; }

        .page {
          width: 210mm; min-height: 297mm;
          margin: 56px auto 20px; background: #fff;
          box-shadow: 0 2px 20px rgba(0,0,0,0.12); padding: 10mm;
        }

        .card-grid { width: 100%; display: grid; gap: 5mm; }
        .grid-tpl1, .grid-tpl3 { grid-template-columns: repeat(2, 1fr); }
        .grid-tpl2 { grid-template-columns: repeat(1, 1fr); }

        .id-card {
          border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
          display: flex; flex-direction: column; background: #fff;
          box-shadow: 0 1px 5px rgba(0,0,0,0.08);
        }

        /* ══════════════ TEMPLATE 1: CLASSIC ══════════════ */
        .classic-top { padding: 7px 10px 9px; text-align: center; position: relative; }
        .classic-logo { width: 18px; height: 18px; object-fit: contain; border-radius: 3px; margin-bottom: 2px; }
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
        .classic-badge { font-size: 7.5px; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-top: 2px; }
        .classic-bottom-row { width: 100%; display: flex; align-items: flex-end; gap: 4px; margin-top: 3px; }
        .classic-qr { display: flex; flex-direction: column; align-items: center; gap: 1px; flex-shrink: 0; }
        .qr-id { font-size: 5px; color: #94a3b8; text-align: center; font-family: monospace; margin-top: 1px; }
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
          border: 2px solid rgba(255,255,255,0.8); box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        }
        .lanyard-initials {
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(255,255,255,0.25); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 900; border: 2px solid rgba(255,255,255,0.6);
        }
        .lanyard-dept { color: rgba(255,255,255,0.9); font-size: 7px; font-weight: 700; text-align: center; word-break: break-word; line-height: 1.2; }
        .lanyard-info { flex: 1; padding: 7px 8px; display: flex; flex-direction: column; gap: 3px; }
        .lanyard-header { border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 3px; }
        .lanyard-school { font-size: 7.5px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.2; }
        .lanyard-title  { font-size: 6px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
        .lanyard-name   { font-size: 10px; font-weight: 900; color: #0f172a; line-height: 1.2; }
        .lanyard-qual   { font-size: 7px; color: #64748b; margin-top: 1px; }
        .lanyard-rows   { display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .lanyard-row    { display: flex; gap: 4px; align-items: baseline; }
        .lanyard-lbl    { font-size: 6.5px; color: #94a3b8; min-width: 36px; flex-shrink: 0; }
        .lanyard-val    { font-size: 7.5px; color: #1e293b; flex: 1; }
        .lanyard-val.bold { font-weight: 700; }
        .lanyard-footer-row { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 4px; border-top: 1px solid #f1f5f9; }
        .lanyard-footer-left { display: flex; flex-direction: column; gap: 1px; }
        .lanyard-footer-yr { font-size: 7px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; }
        .lanyard-footer-id { font-size: 6px; color: #94a3b8; font-family: monospace; }
        .lanyard-qr { flex-shrink: 0; }

        /* ══════════════ TEMPLATE 3: ACADEMIC ══════════════ */
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
        .acad-photo { width: 40px; height: 48px; object-fit: cover; border: 1.5px solid #cbd5e1; border-radius: 4px; }
        .acad-initials {
          width: 40px; height: 48px; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 900;
        }
        .acad-role-badge { font-size: 7px; font-weight: 700; padding: 1px 4px; border-radius: 3px; text-align: center; }
        .acad-data { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .acad-name    { font-size: 10px; font-weight: 900; color: #0f172a; line-height: 1.2; }
        .acad-subject { font-size: 8px; font-weight: 700; margin-top: 1px; }
        .acad-table { width: 100%; border-collapse: collapse; margin-top: 3px; }
        .acad-td-lbl { font-size: 6.5px; color: #94a3b8; width: 38px; padding: 1px 3px 1px 0; white-space: nowrap; vertical-align: top; }
        .acad-td-val { font-size: 7px; color: #1e293b; padding: 1px 0; vertical-align: top; }
        .bold-val { font-weight: 700; }
        .acad-footer {
          display: flex; justify-content: space-between; align-items: center; padding: 4px 8px;
        }
        .acad-footer-left { display: flex; flex-direction: column; gap: 2px; }
        .acad-footer-id { font-size: 6px; color: #64748b; font-family: monospace; }
        .acad-footer-yr { font-size: 7px; font-weight: 900; }
        .acad-qr { flex-shrink: 0; }

        /* ── Shared info rows ── */
        .info-rows { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .info-row  { display: flex; gap: 4px; align-items: baseline; }
        .lbl { font-size: 7px; color: #94a3b8; min-width: 36px; flex-shrink: 0; }
        .val { font-size: 7.5px; color: #1e293b; flex: 1; }
        .val.bold { font-weight: 700; }

        /* ── Print ── */
        @media print {
          body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page { margin: 0; box-shadow: none; page-break-after: always; width: 100%; min-height: auto; padding: 8mm; }
          .page:last-child { page-break-after: avoid; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </>
  );
}
