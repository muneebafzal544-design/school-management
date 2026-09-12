import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getStudent, getStudentCredentials } from '../api/students';


function Row({ label, value }) {
  if (!value) return null;
  return (
    <tr>
      <td className="label">{label}</td>
      <td className="value">{value}</td>
    </tr>
  );
}

function Section({ title, children }) {
  return (
    <div className="section">
      <div className="section-title">{title}</div>
      <table className="info-table">{children}</table>
    </div>
  );
}

export default function StudentDetailPrintPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const showCreds = params.get('creds') === '1';

  const [student, setStudent] = useState(null);
  const [creds,   setCreds]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [r, cr] = await Promise.all([
          getStudent(id),
          showCreds ? getStudentCredentials(id) : Promise.resolve(null),
        ]);
        setStudent(r.data?.data ?? r.data);
        if (cr) setCreds(cr.data);
      } catch (e) {
        setError(e.displayMessage || 'Failed to load student');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, showCreds]);

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'Arial' }}>Loading…</div>;
  if (error)   return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'Arial',color:'red' }}>{error}</div>;
  if (!student) return null;

  const s = student;
  const age = s.date_of_birth
    ? Math.floor((Date.now() - new Date(s.date_of_birth)) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; }

        .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm; }

        /* Header */
        .header { display: flex; align-items: center; gap: 16px; padding-bottom: 14px; border-bottom: 3px solid #6366f1; margin-bottom: 16px; }
        .school-logo { width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg,#6366f1,#8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; font-weight: 900; flex-shrink: 0; }
        .school-info { flex: 1; }
        .school-name { font-size: 20px; font-weight: 800; color: #1e293b; }
        .school-sub  { font-size: 11px; color: #64748b; margin-top: 2px; }
        .doc-title   { text-align: right; }
        .doc-title h2 { font-size: 16px; font-weight: 800; color: #6366f1; }
        .doc-title p  { font-size: 10px; color: #94a3b8; margin-top: 2px; }

        /* Student card */
        .student-card { display: flex; align-items: center; gap: 20px; background: linear-gradient(135deg,#f8faff,#eff2ff); border: 1px solid #c7d2fe; border-radius: 14px; padding: 16px; margin-bottom: 18px; }
        .student-photo { width: 90px; height: 90px; border-radius: 12px; object-fit: cover; border: 3px solid #6366f1; flex-shrink: 0; }
        .student-initials { width: 90px; height: 90px; border-radius: 12px; background: linear-gradient(135deg,#6366f1,#8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: 900; flex-shrink: 0; }
        .student-main-name { font-size: 22px; font-weight: 800; color: #1e293b; }
        .student-main-urdu { font-size: 16px; color: #4f46e5; margin-top: 2px; direction: rtl; }
        .student-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .tag { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }
        .tag-blue   { background: #dbeafe; color: #1d4ed8; }
        .tag-green  { background: #d1fae5; color: #065f46; }
        .tag-purple { background: #ede9fe; color: #5b21b6; }
        .tag-red    { background: #fee2e2; color: #991b1b; }
        .tag-amber  { background: #fef3c7; color: #92400e; }

        /* Sections */
        .sections-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; page-break-inside: avoid; }
        .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #6366f1; margin-bottom: 8px; }
        .info-table { width: 100%; border-collapse: collapse; }
        .info-table .label { font-size: 10px; color: #64748b; font-weight: 600; width: 45%; padding: 2px 0; vertical-align: top; }
        .info-table .value { font-size: 10px; color: #1e293b; font-weight: 500; padding: 2px 0; word-break: break-word; }

        /* Credentials box */
        .creds-box { background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 14px; margin-top: 16px; }
        .creds-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #166534; margin-bottom: 10px; }
        .creds-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
        .creds-label { font-size: 10px; color: #15803d; font-weight: 700; width: 80px; flex-shrink: 0; }
        .creds-value { font-size: 14px; font-family: 'Courier New', monospace; font-weight: 800; color: #1e293b; background: white; border: 1px solid #bbf7d0; border-radius: 6px; padding: 3px 10px; }
        .creds-note { font-size: 10px; color: #166534; margin-top: 8px; opacity: 0.8; }

        /* Footer */
        .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .footer-left { font-size: 9px; color: #94a3b8; }
        .sig-line { display: flex; align-items: flex-end; gap: 6px; }
        .sig-line-label { font-size: 9px; color: #64748b; border-top: 1px solid #94a3b8; padding-top: 3px; width: 120px; text-align: center; }

        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { padding: 12mm; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Screen controls (hidden on print) */}
      <div className="no-print" style={{ position:'fixed',top:0,left:0,right:0,zIndex:999,background:'#fff',borderBottom:'1px solid #e2e8f0',padding:'8px 16px',display:'flex',alignItems:'center',gap:8 }}>
        <button onClick={() => window.history.back()}
          style={{ background:'#f1f5f9',color:'#475569',border:'1px solid #e2e8f0',borderRadius:8,padding:'6px 12px',fontWeight:600,fontSize:12,cursor:'pointer' }}>
          ← Back
        </button>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {showCreds ? (
            <button onClick={() => window.location.href = window.location.pathname}
              style={{ background:'#f1f5f9',color:'#64748b',border:'1px solid #e2e8f0',borderRadius:8,padding:'6px 12px',fontWeight:600,fontSize:12,cursor:'pointer' }}>
              Hide Credentials
            </button>
          ) : (
            <button onClick={() => window.location.href = `?creds=1`}
              style={{ background:'#fef3c7',color:'#92400e',border:'1px solid #fcd34d',borderRadius:8,padding:'6px 12px',fontWeight:700,fontSize:12,cursor:'pointer' }}>
              🔐 Include Credentials
            </button>
          )}
          <button onClick={() => window.print()}
            style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',borderRadius:8,padding:'6px 16px',fontWeight:700,fontSize:12,cursor:'pointer' }}>
            🖨 Print
          </button>
        </div>
      </div>

      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="school-logo">S</div>
          <div className="school-info">
            <div className="school-name">School Management System</div>
            <div className="school-sub">Student Profile Document</div>
          </div>
          <div className="doc-title">
            <h2>Student Profile</h2>
            <p>Printed: {new Date().toLocaleDateString('en-PK', { year:'numeric',month:'long',day:'numeric' })}</p>
          </div>
        </div>

        {/* Student card */}
        <div className="student-card">
          {s.photo_url
            ? <img src={s.photo_url} alt={s.full_name} className="student-photo" />
            : <div className="student-initials">{s.full_name?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}</div>
          }
          <div>
            <div className="student-main-name">{s.full_name}</div>
            {s.full_name_urdu && <div className="student-main-urdu">{s.full_name_urdu}</div>}
            <div className="student-tags">
              {s.class_name && <span className="tag tag-blue">{s.class_name}{s.section ? ` – ${s.section}` : ''}</span>}
              {s.roll_number && <span className="tag tag-purple">Roll# {s.roll_number}</span>}
              {s.blood_group && <span className="tag tag-red">Blood: {s.blood_group}</span>}
              {s.gender && <span className="tag tag-amber">{s.gender}</span>}
              <span className={`tag ${s.status==='active' ? 'tag-green' : 'tag-amber'}`}>{s.status || 'active'}</span>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="sections-grid">

          <Section title="Personal Information">
            <Row label="Date of Birth"  value={s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-PK') + (age ? ` (${age} yrs)` : '') : null} />
            <Row label="Place of Birth"  value={s.place_of_birth} />
            <Row label="Religion"        value={s.religion} />
            <Row label="Nationality"     value={s.nationality} />
            <Row label="B-Form / CNIC"   value={s.b_form_no} />
            <Row label="Blood Group"     value={s.blood_group} />
          </Section>

          <Section title="Academic Information">
            <Row label="Class"           value={s.class_name} />
            <Row label="Grade"           value={s.grade} />
            <Row label="Section"         value={s.section} />
            <Row label="Roll Number"     value={s.roll_number} />
            <Row label="Admission Date"  value={s.admission_date ? new Date(s.admission_date).toLocaleDateString('en-PK') : null} />
            <Row label="Status"          value={s.status} />
            <Row label="Previous School" value={s.previous_school} />
            <Row label="Previous Class"  value={s.previous_class} />
            <Row label="Previous Marks"  value={s.previous_marks} />
          </Section>

          <Section title="Contact & Address">
            <Row label="Phone"           value={s.phone} />
            <Row label="Email"           value={s.email} />
            <Row label="Emergency"       value={s.emergency_contact} />
            <Row label="Address"         value={s.address} />
            <Row label="City"            value={s.city} />
            <Row label="Province"        value={s.province} />
            <Row label="Postal Code"     value={s.postal_code} />
          </Section>

          <Section title="Father's Information">
            <Row label="Name"            value={s.father_name} />
            <Row label="CNIC"            value={s.father_cnic} />
            <Row label="Phone"           value={s.father_phone} />
            <Row label="Email"           value={s.father_email} />
            <Row label="Occupation"      value={s.father_occupation} />
            <Row label="Education"       value={s.father_education} />
          </Section>

          <Section title="Mother's Information">
            <Row label="Name"            value={s.mother_name} />
            <Row label="CNIC"            value={s.mother_cnic} />
            <Row label="Phone"           value={s.mother_phone} />
            <Row label="Occupation"      value={s.mother_occupation} />
          </Section>

          {(s.guardian_name || s.guardian_phone) && (
            <Section title="Guardian Information">
              <Row label="Name"          value={s.guardian_name} />
              <Row label="Relation"      value={s.guardian_relation} />
              <Row label="Phone"         value={s.guardian_phone} />
              <Row label="CNIC"          value={s.guardian_cnic} />
            </Section>
          )}

          {(s.medical_condition || s.allergies || s.disability) && (
            <Section title="Medical Information">
              <Row label="Conditions"    value={s.medical_condition} />
              <Row label="Allergies"     value={s.allergies} />
              <Row label="Disability"    value={s.disability} />
            </Section>
          )}

          <Section title="School Services & Extras">
            <Row label="Transport"       value={s.transport_required ? `Yes — ${s.transport_route || 'route TBD'}` : 'No'} />
            <Row label="Hostel"          value={s.hostel_required ? 'Yes' : 'No'} />
            <Row label="Siblings"        value={s.siblings_in_school} />
            <Row label="Activities"      value={s.extra_curricular} />
            <Row label="House Color"     value={s.house_color} />
          </Section>

        </div>

        {/* Credentials */}
        {showCreds && (
          <div className="creds-box">
            <div className="creds-title">🔐 Student Portal Login Credentials — Confidential</div>
            {creds?.data ? (
              <>
                <div className="creds-row">
                  <span className="creds-label">Username</span>
                  <span className="creds-value">{creds.data.username}</span>
                </div>
                <div className="creds-row">
                  <span className="creds-label">Password</span>
                  <span className="creds-value">
                    {creds.data.must_change_password
                      ? `Stu@${creds.student_id || s.id}`
                      : '(changed by student — reset to get a new one)'}
                  </span>
                </div>
                {creds.data.last_login_at && (
                  <div className="creds-row">
                    <span className="creds-label">Last Login</span>
                    <span className="creds-value">{new Date(creds.data.last_login_at).toLocaleDateString('en-PK')}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="creds-row">
                <span className="creds-label">Status</span>
                <span className="creds-value">Portal account not set up yet. Create student account from Students page.</span>
              </div>
            )}
            <div className="creds-note">
              Login at the SchoolMS portal · Student must change default password after first login · Keep this document confidential
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <div className="footer-left">
            <div>Student ID: #{s.id} · Generated: {new Date().toLocaleString('en-PK')}</div>
            <div style={{marginTop:2}}>This is an official document issued by the school administration.</div>
          </div>
          <div style={{ display:'flex', gap:24 }}>
            <div className="sig-line"><div className="sig-line-label">Class Teacher</div></div>
            <div className="sig-line"><div className="sig-line-label">Principal</div></div>
          </div>
        </div>
      </div>
    </>
  );
}
