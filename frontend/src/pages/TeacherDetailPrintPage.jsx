import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getTeacher, getTeacherCredentials } from '../api/teachers';
import { useSettings } from '../hooks/useReferenceData';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ width: 140, flexShrink: 0, fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 500, flex: 1 }}>{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ background: '#f8fafc', padding: '8px 14px', borderBottom: '1px solid #e2e8f0' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      </div>
      <div style={{ padding: '6px 14px' }}>{children}</div>
    </div>
  );
}

export default function TeacherDetailPrintPage() {
  const { id }              = useParams();
  const [searchParams]      = useSearchParams();
  const showCreds           = searchParams.get('creds') === '1';

  const [teacher,   setTeacher]    = useState(null);
  const [creds,     setCreds]      = useState(null);
  const { data: school = {} }      = useSettings();
  const [loading,   setLoading]    = useState(true);

  useEffect(() => {
    const loadPage = async () => {
      try {
        const tRes = await getTeacher(id);
        setTeacher(tRes.data?.data ?? tRes.data);
      } catch {
        setLoading(false);
        return; // teacher not found — render null branch
      }
      // credentials fetch is not fatal
      const cRes = showCreds ? await getTeacherCredentials(id).catch(() => null) : null;
      if (cRes) setCreds(cRes.data?.data ?? null);
      setLoading(false);
    };
    loadPage();
  }, [id, showCreds]);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8', fontSize: 14 }}>Loading…</div>;
  }
  if (!teacher) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#ef4444', fontSize: 14 }}>Teacher not found.</div>;
  }

  const t        = teacher;
  const initials = (t.full_name || 'T').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  const STATUS_COLOR = { active: '#15803d', inactive: '#dc2626', on_leave: '#d97706' };

  // Derive credentials from teacher data (same formula used in backend)
  const derivedBase     = (t.full_name || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 5).padEnd(3, 'x');
  const derivedUsername = `tch_${derivedBase}${t.id}`;
  const derivedPassword = `Tch@${t.id}`;
  const passwordChanged = creds && creds.must_change_password === false;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 10mm 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; }
      `}</style>

      {/* Screen controls */}
      <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={() => window.history.back()} style={{ fontSize: 13, color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', background: '#fff' }}>
          ← Back
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {!showCreds && (
            <button
              onClick={() => window.location.href = `?creds=1`}
              style={{ fontSize: 13, color: '#fff', background: '#f59e0b', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}
            >
              + Include Credentials
            </button>
          )}
          {showCreds && (
            <button
              onClick={() => window.location.href = window.location.pathname}
              style={{ fontSize: 13, color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', background: '#fff' }}
            >
              Hide Credentials
            </button>
          )}
          <button
            onClick={() => window.print()}
            style={{ fontSize: 13, color: '#fff', background: '#2563eb', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}
          >
            🖨 Print
          </button>
        </div>
      </div>

      {/* Print body */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 16px 32px', background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

          {/* ── Document Header ── */}
          <div style={{ background: 'linear-gradient(135deg, #047857, #059669, #0d9488)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff' }}>
                {(school.school_name || 'S')[0]}
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{school.school_name || 'School Management System'}</div>
                {school.address && <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{school.address}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teacher Profile</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }}>
                Printed: {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div style={{ padding: 20 }}>

            {/* ── Teacher Hero Card ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: '16px 20px', marginBottom: 16 }}>
              {t.photo_url ? (
                <img src={t.photo_url} alt={t.full_name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '3px solid #e2e8f0', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: 12, background: 'linear-gradient(135deg, #059669, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff', flexShrink: 0, border: '3px solid #e2e8f0' }}>
                  {initials}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>{t.full_name}</div>
                {t.subject && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginTop: 3 }}>{t.subject}</div>
                )}
                {t.qualification && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{t.qualification}</div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: `${STATUS_COLOR[t.status] || '#64748b'}18`, color: STATUS_COLOR[t.status] || '#64748b', border: `1px solid ${STATUS_COLOR[t.status] || '#64748b'}40`, textTransform: 'capitalize' }}>
                    {t.status === 'on_leave' ? 'On Leave' : t.status || 'active'}
                  </span>
                  {t.gender && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                      {t.gender}
                    </span>
                  )}
                  {t.assigned_grades?.length > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                      Grades: {t.assigned_grades.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Two column layout ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

              <Section title="Personal Details">
                <Row label="Date of Birth"  value={fmtDate(t.date_of_birth)} />
                <Row label="Gender"         value={t.gender} />
                <Row label="Address"        value={t.address} />
              </Section>

              <Section title="Professional Details">
                <Row label="Subject"        value={t.subject} />
                <Row label="Qualification"  value={t.qualification} />
                <Row label="Joined"         value={fmtDate(t.join_date)} />
                <Row label="Status"         value={t.status === 'on_leave' ? 'On Leave' : t.status} />
              </Section>

              <Section title="Contact Information">
                <Row label="Email"          value={t.email} />
                <Row label="Phone"          value={t.phone} />
              </Section>

              {t.assigned_grades?.length > 0 && (
                <Section title="Assigned Grades">
                  <div style={{ padding: '6px 0', fontSize: 12, color: '#1e293b' }}>
                    {t.assigned_grades.join(', ')}
                  </div>
                </Section>
              )}
            </div>

            {/* ── Login Credentials ── */}
            {showCreds && (
              <div style={{ marginTop: 12, border: '2px dashed #f59e0b', borderRadius: 10, background: '#fffbeb', padding: '14px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  🔐 Portal Login Credentials — Confidential
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>USERNAME</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#1e293b', background: '#fff', border: '1px solid #fcd34d', borderRadius: 6, padding: '6px 10px', letterSpacing: '0.05em' }}>
                      {creds?.username || derivedUsername}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                      {passwordChanged ? 'INITIAL PASSWORD (changed)' : 'PASSWORD'}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: passwordChanged ? '#94a3b8' : '#1e293b', background: '#fff', border: '1px solid #fcd34d', borderRadius: 6, padding: '6px 10px', letterSpacing: '0.05em', textDecoration: passwordChanged ? 'line-through' : 'none' }}>
                      {derivedPassword}
                    </div>
                    {passwordChanged && (
                      <div style={{ fontSize: 10, color: '#b45309', marginTop: 3 }}>
                        Teacher has changed their password. Use Reset Password to issue a new one.
                      </div>
                    )}
                  </div>
                </div>
                {creds?.last_login_at && (
                  <div style={{ fontSize: 10, color: '#92400e', marginTop: 6 }}>
                    Last login: {new Date(creds.last_login_at).toLocaleDateString('en-PK')}
                  </div>
                )}
                <p style={{ fontSize: 10, color: '#b45309', marginTop: 8 }}>
                  ⚠ Ask the teacher to change their password after first login. Keep this document confidential.
                </p>
              </div>
            )}

            {/* ── Signature / Office use ── */}
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {['Teacher Signature', 'Principal Signature', 'Office Stamp'].map(lbl => (
                <div key={lbl} style={{ textAlign: 'center', paddingTop: 40, borderTop: '1px solid #cbd5e1', fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                  {lbl}
                </div>
              ))}
            </div>

          </div>

          {/* Footer */}
          <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>Teacher ID: TCH-{String(t.id).padStart(5, '0')}</span>
            <span style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>Computer-generated document. No signature required unless stamped.</span>
          </div>
        </div>
      </div>
    </>
  );
}
