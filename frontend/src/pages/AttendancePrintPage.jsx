import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAttendanceRegister } from '../api/attendance';

// ── Helpers ──────────────────────────────────────────────────
const STATUS_SHORT = { present: 'P', absent: 'A', late: 'L', excused: 'E' };
const STATUS_COLOR = {
  present: '#15803d',
  absent:  '#dc2626',
  late:    '#d97706',
  excused: '#1d4ed8',
};
const STATUS_BG = {
  present: '#f0fdf4',
  absent:  '#fef2f2',
  late:    '#fffbeb',
  excused: '#eff6ff',
};

function dayOfWeek(dateStr) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return days[new Date(dateStr).getDay()];
}

function isWeekend(dateStr) {
  const day = new Date(dateStr).getDay();
  return day === 0; // Sunday (Pakistan — Friday is half day, Sunday is off)
}

function fmtMonth(month) {
  if (!month) return '';
  const [y, m] = month.split('-');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function pctColor(pct) {
  if (pct === null || pct === undefined) return '#94a3b8';
  if (pct >= 90) return '#15803d';
  if (pct >= 75) return '#d97706';
  return '#dc2626';
}

const CENTER = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', fontFamily: 'Arial, sans-serif', fontSize: 14,
};

export default function AttendancePrintPage() {
  const [params]  = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [data,    setData]    = useState(null);

  const classId = params.get('class_id');
  const month   = params.get('month');

  useEffect(() => {
    if (!classId || !month) { setError('class_id and month are required.'); setLoading(false); return; }
    getAttendanceRegister(classId, month)
      .then(r => setData(r.data?.data ?? r.data))
      .catch(() => setError('Failed to load attendance register.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && data) {
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [loading, data]);

  if (loading) return <div style={CENTER}>Loading attendance register…</div>;
  if (error)   return <div style={{ ...CENTER, color: '#dc2626' }}>{error}</div>;
  if (!data)   return <div style={{ ...CENTER, color: '#64748b' }}>No data found.</div>;

  const { class: cls, students, allDays, markedDays, attendance, settings, working_days } = data;
  const schoolName = settings?.school_name || 'School Management System';
  const schoolAddr = settings?.school_address || '';
  const schoolLogo = settings?.school_logo || null;

  // Summary stats
  const totalPresent  = students.reduce((s, st) => s + (st.present  || 0), 0);
  const totalAbsent   = students.reduce((s, st) => s + (st.absent   || 0), 0);
  const totalLate     = students.reduce((s, st) => s + (st.late     || 0), 0);
  const totalExcused  = students.reduce((s, st) => s + (st.excused  || 0), 0);

  return (
    <>
      {/* Toolbar */}
      <div className="no-print toolbar">
        <div className="toolbar-info">
          <strong>Attendance Register</strong>
          <span style={{ marginLeft: 10, color: '#94a3b8' }}>
            {cls.name} — {fmtMonth(data.month)} — {students.length} students
          </span>
        </div>
        <button className="print-btn" onClick={() => window.print()}>🖨 Print Register</button>
        <button className="close-btn" onClick={() => window.close()}>✕ Close</button>
      </div>

      {/* Page */}
      <div className="page">

        {/* ── School header ── */}
        <div className="hdr">
          {schoolLogo && (
            <img src={schoolLogo} alt="logo" className="hdr-logo" />
          )}
          <div className="hdr-center">
            <div className="hdr-school">{schoolName}</div>
            {schoolAddr && <div className="hdr-addr">{schoolAddr}</div>}
            {settings?.school_phone && <div className="hdr-addr">Tel: {settings.school_phone}</div>}
            <div className="hdr-title-bar">
              <span className="hdr-title">MONTHLY ATTENDANCE REGISTER</span>
            </div>
          </div>
        </div>

        {/* ── Register meta ── */}
        <div className="meta-band">
          <div className="meta-item">
            <span className="meta-lbl">Class</span>
            <span className="meta-val">{cls.name}{cls.section ? ` – ${cls.section}` : ''}</span>
          </div>
          <div className="meta-item">
            <span className="meta-lbl">Month</span>
            <span className="meta-val">{fmtMonth(data.month)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-lbl">Class Teacher</span>
            <span className="meta-val">{cls.teacher_name || '—'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-lbl">Total Students</span>
            <span className="meta-val">{students.length}</span>
          </div>
          <div className="meta-item">
            <span className="meta-lbl">Working Days</span>
            <span className="meta-val">{working_days}</span>
          </div>
        </div>

        {/* ── Attendance grid ── */}
        <div className="table-scroll">
          <table className="reg-table">
            <thead>
              {/* Day-of-week row */}
              <tr className="dow-row">
                <th className="th-no">No.</th>
                <th className="th-name">Student Name</th>
                <th className="th-roll">Roll#</th>
                {allDays.map(d => (
                  <th
                    key={d}
                    className={`th-day ${isWeekend(d) ? 'weekend' : ''} ${markedDays.includes(d) ? 'marked-day' : ''}`}
                  >
                    {dayOfWeek(d).charAt(0)}
                  </th>
                ))}
                <th className="th-sum" style={{ color: STATUS_COLOR.present }}>P</th>
                <th className="th-sum" style={{ color: STATUS_COLOR.absent }}>A</th>
                <th className="th-sum" style={{ color: STATUS_COLOR.late }}>L</th>
                <th className="th-sum" style={{ color: STATUS_COLOR.excused }}>E</th>
                <th className="th-pct">%</th>
              </tr>
              {/* Date number row */}
              <tr className="date-row">
                <th className="th-no" />
                <th className="th-name" />
                <th className="th-roll" />
                {allDays.map(d => (
                  <th
                    key={d}
                    className={`th-day ${isWeekend(d) ? 'weekend' : ''} ${markedDays.includes(d) ? 'marked-day' : ''}`}
                  >
                    {parseInt(d.slice(8), 10)}
                  </th>
                ))}
                <th className="th-sum" />
                <th className="th-sum" />
                <th className="th-sum" />
                <th className="th-sum" />
                <th className="th-pct" />
              </tr>
            </thead>

            <tbody>
              {students.map((st, idx) => {
                const dayMap = attendance[st.id] || {};
                return (
                  <tr key={st.id} className={idx % 2 === 0 ? '' : 'row-alt'}>
                    <td className="td-no">{idx + 1}</td>
                    <td className="td-name">{st.full_name}</td>
                    <td className="td-roll">{st.roll_number || '—'}</td>
                    {allDays.map(d => {
                      const status = dayMap[d];
                      const isMarked = markedDays.includes(d);
                      return (
                        <td
                          key={d}
                          className={`td-day ${isWeekend(d) ? 'weekend' : ''}`}
                          style={status ? {
                            color: STATUS_COLOR[status],
                            background: STATUS_BG[status],
                            fontWeight: 800,
                          } : isMarked ? { color: '#dc2626', background: '#fef2f2', fontWeight: 800 } : {}}
                        >
                          {status
                            ? STATUS_SHORT[status]
                            : isMarked ? 'A' : ''}
                        </td>
                      );
                    })}
                    <td className="td-sum" style={{ color: STATUS_COLOR.present, fontWeight: 700 }}>{st.present}</td>
                    <td className="td-sum" style={{ color: STATUS_COLOR.absent,  fontWeight: 700 }}>{st.absent}</td>
                    <td className="td-sum" style={{ color: STATUS_COLOR.late,    fontWeight: 700 }}>{st.late}</td>
                    <td className="td-sum" style={{ color: STATUS_COLOR.excused, fontWeight: 700 }}>{st.excused}</td>
                    <td className="td-pct" style={{ color: pctColor(st.pct), fontWeight: 700 }}>
                      {st.pct !== null ? `${st.pct}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals footer */}
            <tfoot>
              <tr className="foot-row">
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 800, paddingRight: 6, fontSize: '8px' }}>
                  Daily Total →
                </td>
                {allDays.map(d => {
                  if (!markedDays.includes(d)) return <td key={d} className="td-day weekend" />;
                  const dayStudents = students.filter(st => (attendance[st.id] || {})[d]);
                  const p = dayStudents.filter(st => (attendance[st.id] || {})[d] === 'present').length;
                  const a = students.length - dayStudents.filter(st => (attendance[st.id] || {})[d] !== 'absent').length;
                  return (
                    <td key={d} className="td-day" style={{ fontSize: '7px', color: '#475569', background: '#f8fafc' }}>
                      {p}
                    </td>
                  );
                })}
                <td className="td-sum" style={{ color: STATUS_COLOR.present, fontWeight: 800 }}>{totalPresent}</td>
                <td className="td-sum" style={{ color: STATUS_COLOR.absent,  fontWeight: 800 }}>{totalAbsent}</td>
                <td className="td-sum" style={{ color: STATUS_COLOR.late,    fontWeight: 800 }}>{totalLate}</td>
                <td className="td-sum" style={{ color: STATUS_COLOR.excused, fontWeight: 800 }}>{totalExcused}</td>
                <td className="td-pct" />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Legend ── */}
        <div className="legend">
          {Object.entries(STATUS_SHORT).map(([k, v]) => (
            <div key={k} className="legend-item">
              <span
                className="legend-badge"
                style={{ color: STATUS_COLOR[k], background: STATUS_BG[k], border: `1px solid ${STATUS_COLOR[k]}44` }}
              >
                {v}
              </span>
              <span className="legend-lbl" style={{ textTransform: 'capitalize' }}>{k}</span>
            </div>
          ))}
          <div className="legend-item">
            <span className="legend-badge" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              —
            </span>
            <span className="legend-lbl">No School / Holiday</span>
          </div>
        </div>

        {/* ── Summary stats ── */}
        <div className="stats-row">
          <div className="stat-box" style={{ borderColor: STATUS_COLOR.present + '66' }}>
            <div className="stat-num" style={{ color: STATUS_COLOR.present }}>{totalPresent}</div>
            <div className="stat-lbl">Total Present</div>
          </div>
          <div className="stat-box" style={{ borderColor: STATUS_COLOR.absent + '66' }}>
            <div className="stat-num" style={{ color: STATUS_COLOR.absent }}>{totalAbsent}</div>
            <div className="stat-lbl">Total Absent</div>
          </div>
          <div className="stat-box" style={{ borderColor: STATUS_COLOR.late + '66' }}>
            <div className="stat-num" style={{ color: STATUS_COLOR.late }}>{totalLate}</div>
            <div className="stat-lbl">Total Late</div>
          </div>
          <div className="stat-box" style={{ borderColor: STATUS_COLOR.excused + '66' }}>
            <div className="stat-num" style={{ color: STATUS_COLOR.excused }}>{totalExcused}</div>
            <div className="stat-lbl">Total Excused</div>
          </div>
          <div className="stat-box" style={{ borderColor: '#94a3b8' }}>
            <div className="stat-num" style={{ color: '#0f172a' }}>{working_days}</div>
            <div className="stat-lbl">Working Days</div>
          </div>
        </div>

        {/* ── Signatures ── */}
        <div className="sigs">
          <div className="sig">
            <div className="sig-line" />
            <div className="sig-lbl">Class Teacher</div>
          </div>
          <div className="sig" style={{ textAlign: 'center' }}>
            <div className="sig-line" />
            <div className="sig-lbl">Verified by (Co-ordinator)</div>
          </div>
          <div className="sig" style={{ textAlign: 'right' }}>
            <div className="sig-line" />
            <div className="sig-lbl">Principal</div>
          </div>
        </div>

        <div className="footer">
          <span>Printed: {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          <span style={{ fontStyle: 'italic' }}>Computer-generated — {schoolName}</span>
        </div>

      </div>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 9px; background: #e5e7eb; }

        /* Toolbar */
        .toolbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: #1e293b; color: #e2e8f0;
          padding: 10px 20px; display: flex; align-items: center; gap: 12px;
        }
        .toolbar-info { flex: 1; font-size: 13px; }
        .print-btn { background: #10b981; color: #fff; border: none; border-radius: 8px; padding: 7px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .close-btn { background: #475569; color: #fff; border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px; cursor: pointer; }

        /* Page */
        .page {
          width: 297mm; min-height: 210mm;
          margin: 52px auto 24px;
          background: #fff;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
          padding: 6mm 8mm;
          display: flex; flex-direction: column; gap: 4mm;
        }

        /* Header */
        .hdr { display: flex; align-items: flex-start; gap: 10px; border-bottom: 2px solid #1e293b; padding-bottom: 4mm; }
        .hdr-logo { width: 50px; height: 50px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 6px; flex-shrink: 0; padding: 2px; }
        .hdr-center { flex: 1; text-align: center; }
        .hdr-school { font-size: 15px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.03em; }
        .hdr-addr { font-size: 8px; color: #475569; margin-top: 1px; }
        .hdr-title-bar { margin-top: 5px; background: #1e293b; display: inline-block; padding: 3px 20px; border-radius: 2px; }
        .hdr-title { color: #fff; font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }

        /* Meta band */
        .meta-band {
          display: flex; gap: 12px; flex-wrap: wrap;
          background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 8px;
        }
        .meta-item { display: flex; gap: 4px; align-items: baseline; }
        .meta-lbl { font-size: 7.5px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .meta-val { font-size: 9px; color: #0f172a; font-weight: 700; }

        /* Table scroll wrapper */
        .table-scroll { overflow-x: auto; }

        /* Register table */
        .reg-table { border-collapse: collapse; font-size: 8px; width: 100%; }

        .dow-row th, .date-row th { background: #1e293b; color: #f1f5f9; padding: 3px 2px; text-align: center; border: 1px solid #334155; font-size: 7.5px; }
        .dow-row .weekend, .date-row .weekend { background: #374151; color: #9ca3af; }
        .dow-row .marked-day, .date-row .marked-day { background: #1e3a5f; }

        .th-no   { min-width: 20px; }
        .th-name { min-width: 100px; text-align: left !important; padding-left: 4px !important; }
        .th-roll { min-width: 30px; }
        .th-day  { min-width: 14px; width: 14px; max-width: 16px; }
        .th-sum  { min-width: 18px; background: #0f172a !important; }
        .th-pct  { min-width: 28px; background: #0f172a !important; }

        .reg-table td { border: 1px solid #e2e8f0; padding: 2.5px 2px; text-align: center; color: #1e293b; vertical-align: middle; }
        .row-alt { background: #f8fafc; }

        .td-no   { font-size: 7.5px; color: #94a3b8; }
        .td-name { text-align: left !important; padding-left: 4px !important; font-weight: 600; font-size: 8px; white-space: nowrap; }
        .td-roll { font-size: 7.5px; }
        .td-day  { font-size: 8px; font-weight: 700; }
        .td-day.weekend { background: #f9fafb; color: #d1d5db; }
        .td-sum  { font-size: 8px; background: #f8fafc; }
        .td-pct  { font-size: 8px; background: #f8fafc; }

        .foot-row td { background: #f1f5f9 !important; border-top: 1.5px solid #94a3b8; font-weight: 700; }

        /* Legend */
        .legend { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 4px; }
        .legend-badge { display: inline-block; width: 18px; height: 14px; border-radius: 3px; text-align: center; line-height: 14px; font-size: 8px; font-weight: 800; }
        .legend-lbl { font-size: 8px; color: #475569; }

        /* Stats */
        .stats-row { display: flex; gap: 8px; }
        .stat-box { flex: 1; border: 1px solid; border-radius: 4px; padding: 4px 6px; text-align: center; }
        .stat-num { font-size: 14px; font-weight: 900; }
        .stat-lbl { font-size: 7.5px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1px; }

        /* Signatures */
        .sigs { display: flex; justify-content: space-between; padding-top: 5mm; border-top: 1px solid #e2e8f0; margin-top: auto; }
        .sig { width: 30%; }
        .sig-line { border-bottom: 1px solid #64748b; height: 16px; margin-bottom: 3px; }
        .sig-lbl { font-size: 8.5px; color: #1e293b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }

        /* Footer */
        .footer { display: flex; justify-content: space-between; font-size: 7.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 2px; }

        /* Print */
        @media print {
          body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page {
            margin: 0; box-shadow: none; padding: 6mm 8mm;
            width: 100%; min-height: auto;
          }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>
    </>
  );
}
