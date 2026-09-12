const pool = require('../db');
const { serverErr } = require('../utils/serverErr');


// GET /medical/student/:id
const getStudentMedical = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: studentRows } = await pool.query(
      `SELECT id, full_name, roll_number, admission_number, blood_group, allergies,
              medical_condition, disability, gender, date_of_birth
       FROM students WHERE id=$1 AND deleted_at IS NULL`,
      [id],
    );
    if (!studentRows[0]) return res.status(404).json({ success: false, message: 'Student not found' });

    const { rows: vaccinations } = await pool.query(
      `SELECT * FROM student_vaccinations WHERE student_id=$1 ORDER BY date_given DESC`,
      [id],
    );

    const { rows: visits } = await pool.query(
      `SELECT * FROM student_medical_visits WHERE student_id=$1 ORDER BY visit_date DESC`,
      [id],
    );

    res.json({
      success: true,
      data: {
        ...studentRows[0],
        vaccinations,
        medical_visits: visits,
      },
    });
  } catch (err) { serverErr(res, err); }
};

// POST /medical/student/:id/vaccinations
const addVaccination = async (req, res) => {
  try {
    const { id } = req.params;
    const { vaccine_name, dose_number, date_given, given_by, next_due_date, notes } = req.body;

    if (!vaccine_name || !date_given) {
      return res.status(400).json({ success: false, message: 'vaccine_name and date_given are required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO student_vaccinations (student_id, vaccine_name, dose_number, date_given, given_by, next_due_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, vaccine_name, dose_number || 1, date_given, given_by || null, next_due_date || null, notes || null],
    );

    res.status(201).json({ success: true, data: rows[0], message: 'Vaccination record added' });
  } catch (err) { serverErr(res, err); }
};

// DELETE /medical/vaccinations/:id
const deleteVaccination = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM student_vaccinations WHERE id=$1 RETURNING *', [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Vaccination record deleted', data: rows[0] });
  } catch (err) { serverErr(res, err); }
};

// POST /medical/student/:id/visits
const addMedicalVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { visit_date, complaint, action_taken, referred_to, recorded_by,
            leave_from_date, leave_to_date, has_certificate } = req.body;

    if (!complaint) {
      return res.status(400).json({ success: false, message: 'complaint is required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO student_medical_visits
         (student_id, visit_date, complaint, action_taken, referred_to, recorded_by,
          leave_from_date, leave_to_date, has_certificate)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, visit_date || null, complaint, action_taken || null, referred_to || null,
       recorded_by || null, leave_from_date || null, leave_to_date || null,
       has_certificate === true || has_certificate === 'true'],
    );

    let excused = 0;
    if (leave_from_date && leave_to_date) {
      const { rowCount } = await pool.query(
        `UPDATE attendance
            SET status = 'excused',
                remarks = COALESCE(remarks || ' | ', '') || 'Medical leave — certificate on file',
                updated_at = NOW()
          WHERE student_id = $1
            AND date BETWEEN $2 AND $3
            AND status = 'absent'`,
        [id, leave_from_date, leave_to_date],
      );
      excused = rowCount;
    }

    res.status(201).json({
      success: true,
      data: rows[0],
      excused_days: excused,
      message: excused > 0
        ? `Medical visit recorded. ${excused} absent day(s) automatically excused.`
        : 'Medical visit recorded',
    });
  } catch (err) { serverErr(res, err); }
};

// DELETE /medical/visits/:id
const deleteMedicalVisit = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM student_medical_visits WHERE id=$1 RETURNING *', [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Medical visit deleted', data: rows[0] });
  } catch (err) { serverErr(res, err); }
};

// GET /medical/summary?class_id
const getMedicalSummaryList = async (req, res) => {
  try {
    const { class_id } = req.query;
    let q = `
      SELECT s.id, s.full_name, s.roll_number, s.admission_number,
             s.blood_group, s.allergies, s.medical_condition, s.disability,
             s.gender, c.name AS class_name
      FROM students s
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.deleted_at IS NULL AND s.status='active'
    `;
    const p = [];
    if (class_id) { p.push(class_id); q += ` AND s.class_id=$${p.length}`; }
    q += ' ORDER BY c.name, s.roll_number NULLS LAST, s.full_name';
    const { rows } = await pool.query(q, p);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) { serverErr(res, err); }
};

module.exports = {
  getStudentMedical,
  addVaccination,
  deleteVaccination,
  addMedicalVisit,
  deleteMedicalVisit,
  getMedicalSummaryList,
};
