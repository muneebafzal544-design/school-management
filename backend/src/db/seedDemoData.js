/**
 * seedDemoData — populates a freshly-provisioned tenant schema with
 * realistic sample data so a 7-day demo school looks alive immediately
 * instead of empty. Called once, right after createSchool()'s own
 * transaction (schema + migrations + admin user) has already committed —
 * see schoolController.js. Not part of that transaction: if this fails,
 * the school still exists (just unseeded), which is far cheaper to retry
 * than rolling back ~111 already-applied migrations.
 *
 * All inserts are batched multi-row statements (no per-row round trips),
 * matching the batching discipline already established in
 * automationService.js / rolloverController.js / feeController.js.
 */

const MALE_FIRST   = ['Ahmed','Ali','Hassan','Hamza','Bilal','Usman','Zain','Faisal','Imran','Kashif','Asad','Salman','Waqas','Umar','Talha','Danish','Fahad','Noman','Rizwan','Shahzad'];
const FEMALE_FIRST  = ['Ayesha','Fatima','Zainab','Sana','Mariam','Hira','Sadia','Nida','Amna','Sara','Rabia','Iqra','Mahnoor','Anum','Kiran','Sobia','Warda','Laiba','Mehak','Komal'];
const LAST_NAMES    = ['Khan','Ahmed','Malik','Butt','Sheikh','Raza','Iqbal','Hussain','Farooq','Chaudhry','Qureshi','Baig','Abbasi','Siddiqui','Awan'];
const DESIGNATIONS  = ['Senior Teacher','Subject Teacher','Head of Department','Coordinator','Assistant Teacher'];
const GRADES        = ['1','2','3','4','5','6','7'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function fullName(gender) { return `${pick(gender === 'female' ? FEMALE_FIRST : MALE_FIRST)} ${pick(LAST_NAMES)}`; }
function pastDate(daysAgo) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString().slice(0, 10); }
function ymOffset(monthsAgo) { const d = new Date(); d.setMonth(d.getMonth() - monthsAgo); return d.toISOString().slice(0, 7); }

/** School days (Mon-Sat) going back from yesterday, skipping Sundays. */
function recentSchoolDays(count) {
  const days = [];
  let cursor = new Date();
  cursor.setDate(cursor.getDate() - 1); // start yesterday, not today
  while (days.length < count) {
    if (cursor.getDay() !== 0) days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
}

/** Build a batched multi-row INSERT. Returns { text, params }. */
function buildInsert(table, columns, rows, { returning } = {}) {
  const params = [];
  const valueGroups = rows.map(row => {
    const placeholders = row.map(v => { params.push(v); return `$${params.length}`; });
    return `(${placeholders.join(',')})`;
  });
  const text = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${valueGroups.join(',')}` +
    (returning ? ` RETURNING ${returning}` : '');
  return { text, params };
}

async function seedDemoData(client, schema) {
  const db = require('./index');
  await db.setSearchPath(client, schema);

  // ── Active academic year (already seeded by migration 011) ─────────────
  const { rows: [ay] } = await client.query(`SELECT label FROM academic_years WHERE is_active = TRUE LIMIT 1`);
  const academicYear = ay?.label || new Date().getFullYear().toString();

  // ── Subjects (already seeded by migration 001) ──────────────────────────
  const { rows: subjects } = await client.query(`SELECT id, name FROM subjects ORDER BY id`);

  // ── Teachers ─────────────────────────────────────────────────────────────
  const TEACHER_COUNT = 10;
  const teacherRows = Array.from({ length: TEACHER_COUNT }, (_, i) => {
    const gender = i % 3 === 0 ? 'male' : 'female';
    return [
      fullName(gender), `teacher${i + 1}@demo.local`, `03${randInt(10, 49)}-${randInt(1000000, 9999999)}`,
      gender, pastDate(randInt(9000, 14000)), pick(['B.Ed','M.Ed','MA Education','MSc']),
      pick(subjects).name, pastDate(randInt(200, 2500)), 'active', pick(DESIGNATIONS), `EMP-D${String(i + 1).padStart(3, '0')}`,
    ];
  });
  const teacherIns = buildInsert(
    'teachers',
    ['full_name', 'email', 'phone', 'gender', 'date_of_birth', 'qualification', 'subject', 'join_date', 'status', 'designation', 'employee_id'],
    teacherRows, { returning: 'id' }
  );
  const { rows: teacherIds } = await client.query(teacherIns.text, teacherIns.params);

  // ── Classes ──────────────────────────────────────────────────────────────
  const classRows = GRADES.map((grade, i) => [
    `Grade ${grade}`, grade, 'A', academicYear, `Room ${100 + i}`, 40, teacherIds[i % teacherIds.length].id, 'active',
  ]);
  const classIns = buildInsert(
    'classes',
    ['name', 'grade', 'section', 'academic_year', 'room_number', 'capacity', 'teacher_id', 'status'],
    classRows, { returning: 'id' }
  );
  const { rows: classIds } = await client.query(classIns.text, classIns.params);

  // ── Teacher ↔ Class assignments (class teacher + 2 subject teachers each) ─
  const tcRows = [];
  classIds.forEach((c, i) => {
    tcRows.push([teacherIds[i % teacherIds.length].id, c.id, pick(subjects).name, 'class_teacher']);
    for (let s = 0; s < 2; s++) {
      tcRows.push([teacherIds[(i + s + 1) % teacherIds.length].id, c.id, pick(subjects).name, 'subject_teacher']);
    }
  });
  const tcIns = buildInsert('teacher_classes', ['teacher_id', 'class_id', 'subject', 'role'], tcRows);
  await client.query(tcIns.text, tcIns.params);

  // ── Students ─────────────────────────────────────────────────────────────
  const STUDENTS_PER_CLASS = 7;
  const studentRows = [];
  classIds.forEach((c, ci) => {
    for (let i = 0; i < STUDENTS_PER_CLASS; i++) {
      const gender = i % 2 === 0 ? 'male' : 'female';
      const n = ci * STUDENTS_PER_CLASS + i + 1;
      studentRows.push([
        c.id, fullName(gender), gender, pastDate(randInt(2500, 4500)),
        `student${n}@demo.local`, `03${randInt(10, 49)}-${randInt(1000000, 9999999)}`,
        GRADES[ci], 'A', String(i + 1), pastDate(randInt(30, 700)),
        `${pick(MALE_FIRST)} ${pick(LAST_NAMES)}`, `03${randInt(10, 49)}-${randInt(1000000, 9999999)}`,
        'active',
      ]);
    }
  });
  const studentIns = buildInsert(
    'students',
    ['class_id', 'full_name', 'gender', 'date_of_birth', 'email', 'phone', 'grade', 'section', 'roll_number', 'admission_date', 'father_name', 'father_phone', 'status'],
    studentRows, { returning: 'id' }
  );
  const { rows: studentIds } = await client.query(studentIns.text, studentIns.params);

  // Admission numbers, same format as migration 029's backfill.
  const thisYear = new Date().getFullYear();
  await client.query(
    `UPDATE students SET admission_number = 'ADM-' || $1::text || '-' || LPAD(id::text, 4, '0') WHERE admission_number IS NULL`,
    [thisYear]
  );

  // ── Periods (one bell schedule) ──────────────────────────────────────────
  const periodDefs = [
    ['1', 'Period 1', '08:00', '08:45'], ['2', 'Period 2', '08:45', '09:30'],
    ['3', 'Period 3', '09:30', '10:15'], ['4', 'Break', '10:15', '10:35'],
    ['5', 'Period 4', '10:35', '11:20'], ['6', 'Period 5', '11:20', '12:05'],
    ['7', 'Period 6', '12:05', '12:50'],
  ];
  const periodRows = periodDefs.map(([no, name, start, end], i) => [i + 1, name, start, end, name === 'Break']);
  const periodIns = buildInsert('periods', ['period_no', 'name', 'start_time', 'end_time', 'is_break'], periodRows, { returning: 'id' });
  const { rows: periodIds } = await client.query(periodIns.text, periodIns.params);
  const teachingPeriods = periodIds.filter((_, i) => periodDefs[i][1] !== 'Break');

  // ── Timetable entries (class × day × teaching period) ────────────────────
  const ttRows = [];
  classIds.forEach((c, ci) => {
    for (let day = 1; day <= 6; day++) {
      teachingPeriods.forEach((p, pi) => {
        const subj = subjects[(ci + day + pi) % subjects.length];
        ttRows.push([c.id, p.id, day, teacherIds[(ci + pi) % teacherIds.length].id, subj.name, `Room ${100 + ci}`, academicYear]);
      });
    }
  });
  const ttIns = buildInsert('timetable_entries', ['class_id', 'period_id', 'day_of_week', 'teacher_id', 'subject', 'room', 'academic_year'], ttRows);
  await client.query(ttIns.text, ttIns.params);

  // ── Attendance (last ~15 school days, mostly present) ────────────────────
  const schoolDays = recentSchoolDays(15);
  const attRows = [];
  for (const date of schoolDays) {
    for (const s of studentIds) {
      const roll = Math.random();
      const status = roll < 0.88 ? 'present' : roll < 0.95 ? 'late' : 'absent';
      attRows.push(['student', s.id, null, null, date, status]);
    }
  }
  const attIns = buildInsert('attendance', ['entity_type', 'entity_id', 'class_id', 'period_id', 'date', 'status'], attRows);
  await client.query(attIns.text, attIns.params);

  // ── Fee structures (Tuition + Computer Fee per class) ────────────────────
  const { rows: feeHeads } = await client.query(`SELECT id, name FROM fee_heads WHERE category = 'monthly' AND name IN ('Tuition Fee','Computer Fee')`);
  const tuitionHead = feeHeads.find(f => f.name === 'Tuition Fee');
  const computerHead = feeHeads.find(f => f.name === 'Computer Fee');
  const fsRows = [];
  classIds.forEach((c, ci) => {
    const gradeNum = parseInt(GRADES[ci], 10);
    if (tuitionHead)  fsRows.push([tuitionHead.id,  c.id, 3000 + gradeNum * 300, academicYear]);
    if (computerHead) fsRows.push([computerHead.id, c.id, 500, academicYear]);
  });
  const fsIns = buildInsert('fee_structures', ['fee_head_id', 'class_id', 'amount', 'academic_year'], fsRows);
  await client.query(fsIns.text, fsIns.params);

  // ── Fee invoices (one monthly invoice per student, last month) + items ──
  const billingMonth = ymOffset(1);
  const classAmount = {};
  classIds.forEach((c, ci) => { classAmount[c.id] = 3000 + parseInt(GRADES[ci], 10) * 300 + 500; });
  const invRows = studentRows.map((row, i) => {
    const classId = row[0];
    return [studentIds[i].id, classId, 'monthly', billingMonth, `${billingMonth}-10`, classAmount[classId], academicYear];
  });
  const invIns = buildInsert(
    'fee_invoices',
    ['student_id', 'class_id', 'invoice_type', 'billing_month', 'due_date', 'total_amount', 'academic_year'],
    invRows, { returning: 'id' }
  );
  const { rows: invoiceIds } = await client.query(invIns.text, invIns.params);

  await client.query(
    `UPDATE fee_invoices SET invoice_no = 'INV-' || $1::text || '-' || LPAD(id::text, 5, '0') WHERE invoice_no IS NULL`,
    [billingMonth.replace('-', '')]
  );

  const itemRows = [];
  invoiceIds.forEach((inv, i) => {
    const classId = studentRows[i][0];
    if (tuitionHead)  itemRows.push([inv.id, tuitionHead.id,  'Tuition Fee',  classAmount[classId] - 500]);
    if (computerHead) itemRows.push([inv.id, computerHead.id, 'Computer Fee', 500]);
  });
  const itemIns = buildInsert('fee_invoice_items', ['invoice_id', 'fee_head_id', 'description', 'amount'], itemRows);
  await client.query(itemIns.text, itemIns.params);

  // ── Fee payments — ~60% of invoices paid in full ─────────────────────────
  const paidInvoices = invoiceIds.filter(() => Math.random() < 0.6);
  if (paidInvoices.length) {
    const payRows = paidInvoices.map((inv, i) => {
      const studentId = studentIds[invoiceIds.indexOf(inv)].id;
      return [inv.id, studentId, classAmount[studentRows[invoiceIds.indexOf(inv)][0]], pastDate(randInt(1, 20)), pick(['cash', 'bank', 'online'])];
    });
    const payIns = buildInsert('fee_payments', ['invoice_id', 'student_id', 'amount', 'payment_date', 'payment_method'], payRows, { returning: 'id' });
    const { rows: paymentIds } = await client.query(payIns.text, payIns.params);

    await client.query(
      `UPDATE fee_payments SET receipt_no = 'REC-' || $1::text || '-' || LPAD(id::text, 5, '0') WHERE receipt_no IS NULL`,
      [billingMonth.replace('-', '')]
    );

    const paidIds = paidInvoices.map(inv => inv.id);
    await client.query(
      `UPDATE fee_invoices SET status = 'paid', paid_amount = total_amount WHERE id = ANY($1::int[])`,
      [paidIds]
    );
  }

  return {
    teachers: teacherIds.length,
    classes: classIds.length,
    students: studentIds.length,
    attendanceDays: schoolDays.length,
    invoices: invoiceIds.length,
    paidInvoices: paidInvoices.length,
  };
}

module.exports = { seedDemoData };
