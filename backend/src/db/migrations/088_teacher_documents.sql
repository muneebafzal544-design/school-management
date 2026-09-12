-- Migration 088: Teacher document generation system
-- Adds salary/designation/employee_id to teachers and creates letter_templates table

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS salary       NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS designation  VARCHAR(120)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS employee_id  VARCHAR(40)   DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teachers_employee_id_uidx
  ON teachers(employee_id) WHERE employee_id IS NOT NULL AND deleted_at IS NULL;

-- ── Letter / Document Templates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS letter_templates (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(200)  NOT NULL,
  doc_type     VARCHAR(60)   NOT NULL DEFAULT 'custom',
  -- doc_type: appointment | experience | salary_certificate | custom
  subject_line VARCHAR(300)  DEFAULT NULL,
  body         TEXT          NOT NULL,
  -- body is HTML with {placeholder} tokens
  -- available tokens: {name} {designation} {employee_id} {salary}
  --   {join_date} {subject} {qualification} {phone} {email}
  --   {school_name} {school_address} {school_phone} {principal_name}
  --   {issue_date} {to_date} {from_date}
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by   INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Seed default templates
INSERT INTO letter_templates (title, doc_type, subject_line, body) VALUES

('Appointment Letter', 'appointment',
 'Appointment Letter – {designation}',
 '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#111;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right;color:#555">{issue_date}</p>
<p><strong>{name}</strong><br/>{phone}<br/>{email}</p>
<p style="margin-top:24px"><strong>Subject: Appointment Letter – {designation}</strong></p>
<p>Dear <strong>{name}</strong>,</p>
<p>We are pleased to appoint you as <strong>{designation}</strong> at <strong>{school_name}</strong> effective <strong>{join_date}</strong>.</p>
<p>Your monthly salary will be <strong>PKR {salary}</strong>. You will be responsible for teaching <strong>{subject}</strong> and any other duties assigned by the management.</p>
<p>This appointment is subject to the school''s service rules and code of conduct.</p>
<p>We look forward to your valuable contribution.</p>
<p style="margin-top:40px">Yours sincerely,</p>
<p style="margin-top:60px"><strong>{principal_name}</strong><br/>Principal<br/>{school_name}</p>
</div>'),

('Experience Letter', 'experience',
 'Experience Letter – {name}',
 '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#111;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right;color:#555">{issue_date}</p>
<p><strong>To Whom It May Concern</strong></p>
<p>This is to certify that <strong>{name}</strong> served as <strong>{designation}</strong> at <strong>{school_name}</strong> from <strong>{from_date}</strong> to <strong>{to_date}</strong>.</p>
<p>During this period, {name} taught <strong>{subject}</strong> and demonstrated professionalism, dedication, and a commitment to student success.</p>
<p>We wish {name} all the best in future endeavours.</p>
<p style="margin-top:40px">Yours sincerely,</p>
<p style="margin-top:60px"><strong>{principal_name}</strong><br/>Principal<br/>{school_name}</p>
</div>'),

('Salary Certificate', 'salary_certificate',
 'Salary Certificate – {name}',
 '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#111;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right;color:#555">{issue_date}</p>
<p><strong>Salary Certificate</strong></p>
<p>This is to certify that <strong>{name}</strong>, designated as <strong>{designation}</strong> (Employee ID: <strong>{employee_id}</strong>), is employed at <strong>{school_name}</strong> since <strong>{join_date}</strong>.</p>
<p>The monthly salary drawn by the said individual is <strong>PKR {salary}</strong> (in words: …), which is paid regularly.</p>
<p>This certificate is issued on the request of the employee for official purposes.</p>
<p style="margin-top:40px">Yours sincerely,</p>
<p style="margin-top:60px"><strong>{principal_name}</strong><br/>Principal<br/>{school_name}</p>
</div>'),

('Custom Letter', 'custom',
 'Letter – {name}',
 '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#111;max-width:700px;margin:auto;padding:40px">
<p style="text-align:right;color:#555">{issue_date}</p>
<p>Dear <strong>{name}</strong>,</p>
<p><!-- Write your custom letter body here --></p>
<p style="margin-top:40px">Yours sincerely,</p>
<p style="margin-top:60px"><strong>{principal_name}</strong><br/>Principal<br/>{school_name}</p>
</div>')

ON CONFLICT DO NOTHING;
