import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getFullTimetable, getTeacherTimetable, getTimetable, getPeriods } from '../api/timetable';
import { useSettings } from '../hooks/useReferenceData';

const DAYS = [
  { num: 1, label: 'Monday'    },
  { num: 2, label: 'Tuesday'   },
  { num: 3, label: 'Wednesday' },
  { num: 4, label: 'Thursday'  },
  { num: 5, label: 'Friday'    },
  { num: 6, label: 'Saturday'  },
];

function fmt(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function TimetableGrid({ title, subtitle, entries, periods, mode, settings }) {
  const entryMap = {};
  entries.forEach(e => { entryMap[`${e.period_id}_${e.day_of_week}`] = e; });

  return (
    <div className="tt-section">
      <div className="tt-header">
        {settings?.school_logo && (
          <img src={settings.school_logo} alt="logo" style={{ height: 36, width: 36, objectFit: 'contain', borderRadius: 4, marginBottom: 3 }} />
        )}
        <div className="school-name">{settings?.school_name || 'School Management System'}</div>
        {settings?.school_address && <div style={{ fontSize: '7.5px', color: '#64748b', marginBottom: 2 }}>{settings.school_address}</div>}
        <div className="tt-title">{title}</div>
        {subtitle && <div className="tt-sub">{subtitle}</div>}
      </div>

      <table className="tt-table">
        <thead>
          <tr>
            <th className="period-col">Period / Time</th>
            {DAYS.map(d => <th key={d.num}>{d.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {periods.map(p => (
            <tr key={p.id} className={p.is_break ? 'break-row' : ''}>
              <td className="period-cell">
                <div className="period-name">{p.name}</div>
                <div className="period-time">{fmt(p.start_time)} – {fmt(p.end_time)}</div>
              </td>
              {DAYS.map(d => {
                const e = entryMap[`${p.id}_${d.num}`];

                if (p.is_break) {
                  return (
                    <td key={d.num} className="break-cell">Break / Recess</td>
                  );
                }

                return (
                  <td key={d.num} className="slot-cell">
                    {e?.subject ? (
                      <div className="slot-filled">
                        <div className="slot-subject">{e.subject}</div>
                        {mode === 'teacher'
                          ? <div className="slot-meta">{e.class_name}{e.section ? ` – ${e.section}` : ''}</div>
                          : e.teacher_name && <div className="slot-meta">{e.teacher_name.split(' ').slice(0, 2).join(' ')}</div>
                        }
                        {e.room && <div className="slot-room">{e.room}</div>}
                      </div>
                    ) : (
                      <div className="slot-empty" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="tt-footer">
        Printed on {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

export default function TimetablePrintPage() {
  const [params]  = useSearchParams();
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [pages,    setPages]    = useState([]); // [{ title, subtitle, entries, periods, mode }]
  const { data: settings = {} } = useSettings();

  const type         = params.get('type')         || 'class';
  const classId      = params.get('class_id');
  const teacherId    = params.get('teacher_id');
  const academicYear = params.get('academic_year') || '2024-25';
  const className    = params.get('class_name')    || '';
  const teacherName  = params.get('teacher_name')  || '';

  useEffect(() => {
    async function load() {
      try {
        if (type === 'school') {
          const r      = await getFullTimetable(academicYear);
          // data is an object { entries, periods } — interceptor won't unwrap it
          const inner  = r.data?.data ?? r.data;
          const entries  = inner?.entries  || [];
          const periods  = inner?.periods  || [];

          // Group entries by class_id, preserving grade/section order
          const classMap   = {};
          const classOrder = [];
          entries.forEach(e => {
            const key = String(e.class_id);
            if (!classMap[key]) {
              classMap[key] = [];
              classOrder.push({ key, name: e.class_name, grade: e.grade, section: e.section });
            }
            classMap[key].push(e);
          });

          setPages(classOrder.map(c => ({
            title:    c.name,
            subtitle: `${c.grade} – Section ${c.section} · ${academicYear}`,
            entries:  classMap[c.key],
            periods,
            mode:     'class',
          })));

        } else if (type === 'teacher') {
          const [ttRes, perRes] = await Promise.all([
            getTeacherTimetable(teacherId, academicYear),
            getPeriods(),
          ]);
          const entries = Array.isArray(ttRes.data)  ? ttRes.data  : [];
          const periods = Array.isArray(perRes.data) ? perRes.data : [];
          setPages([{
            title:    teacherName || 'Teacher Timetable',
            subtitle: `Teacher Schedule · ${academicYear}`,
            entries,
            periods,
            mode: 'teacher',
          }]);

        } else {
          // class mode
          const [ttRes, perRes] = await Promise.all([
            getTimetable(classId, academicYear),
            getPeriods(),
          ]);
          const entries = Array.isArray(ttRes.data)  ? ttRes.data  : [];
          const periods = Array.isArray(perRes.data) ? perRes.data : [];
          setPages([{
            title:    className || 'Class Timetable',
            subtitle: academicYear,
            entries,
            periods,
            mode: 'class',
          }]);
        }
      } catch {
        setError('Failed to load timetable data. Please close this tab and try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!loading && pages.length > 0) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading, pages]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif', fontSize: 14 }}>
      Loading timetable…
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#dc2626', fontFamily: 'Arial, sans-serif', fontSize: 14 }}>
      {error}
    </div>
  );

  if (pages.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif', fontSize: 14, color: '#64748b' }}>
      No timetable entries found for the selected filters.
    </div>
  );

  const infoLabel = type === 'school'
    ? `Full School · ${pages.length} class${pages.length !== 1 ? 'es' : ''}`
    : type === 'teacher'
      ? `${teacherName} · Teacher Schedule`
      : className;

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div className="no-print toolbar">
        <div className="toolbar-info">
          <strong>{infoLabel}</strong> · {academicYear}
        </div>
        <button className="print-btn" onClick={() => window.print()}>
          🖨 Print
        </button>
        <button className="close-btn" onClick={() => window.close()}>
          ✕ Close
        </button>
      </div>

      {pages.map((pg, i) => (
        <div key={i} className="page">
          <TimetableGrid {...pg} settings={settings} />
        </div>
      ))}

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; background: #f0f0f0; }

        /* ── Toolbar ── */
        .toolbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: #1e293b; color: #e2e8f0;
          padding: 10px 20px; display: flex; align-items: center; gap: 12px;
        }
        .toolbar-info { flex: 1; font-size: 13px; }
        .print-btn {
          background: #10b981; color: #fff; border: none; border-radius: 8px;
          padding: 7px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
        }
        .close-btn {
          background: #475569; color: #fff; border: none; border-radius: 8px;
          padding: 7px 14px; font-size: 13px; cursor: pointer;
        }

        /* ── Page ── */
        .page {
          width: 297mm;
          min-height: 210mm;
          margin: 52px auto 24px;
          background: #fff;
          box-shadow: 0 2px 20px rgba(0,0,0,0.12);
          padding: 8mm 10mm;
        }

        /* ── Section header ── */
        .tt-header {
          text-align: center;
          padding-bottom: 6px;
          border-bottom: 2.5px solid #1e293b;
          margin-bottom: 10px;
        }
        .school-name {
          font-size: 9px; font-weight: 700; color: #64748b;
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        .tt-title {
          font-size: 16px; font-weight: 900; color: #1e293b; margin-top: 3px;
        }
        .tt-sub {
          font-size: 9px; color: #64748b; margin-top: 2px; letter-spacing: 0.04em;
        }

        /* ── Table ── */
        .tt-table {
          width: 100%; border-collapse: collapse;
        }
        .tt-table th {
          background: #1e293b; color: #e2e8f0;
          padding: 5px 6px; font-size: 8.5px;
          text-align: center; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase;
          border: 1px solid #334155;
        }
        .tt-table th.period-col {
          text-align: left; width: 78px;
        }
        .tt-table td {
          border: 1px solid #e2e8f0; vertical-align: top;
        }

        /* ── Period column ── */
        .period-cell {
          padding: 4px 6px; background: #f8fafc; width: 78px;
        }
        .period-name { font-weight: 700; color: #1e293b; font-size: 9px; }
        .period-time { color: #94a3b8; font-size: 7.5px; margin-top: 1px; }

        /* ── Break row ── */
        .break-row td { background: #fefce8; }
        .break-cell {
          text-align: center; color: #92400e;
          font-size: 8px; font-weight: 700;
          padding: 6px 4px; letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* ── Slot cells ── */
        .slot-cell { padding: 3px 4px; min-height: 38px; }
        .slot-subject { font-weight: 800; color: #1e293b; font-size: 9px; }
        .slot-meta    { color: #4338ca; font-size: 7.5px; margin-top: 1.5px; }
        .slot-room    { color: #64748b; font-size: 7px; margin-top: 1px; }
        .slot-empty   { height: 32px; }

        /* ── Footer ── */
        .tt-footer {
          margin-top: 8px;
          font-size: 8px; color: #94a3b8;
          text-align: right; letter-spacing: 0.03em;
        }

        /* ── Print media ── */
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .page {
            margin: 0; box-shadow: none;
            page-break-after: always;
            width: 100%; min-height: auto;
          }
          .page:last-child { page-break-after: avoid; }
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
        }
      `}</style>
    </>
  );
}
