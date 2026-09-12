const { calculateRisk, recalculateAll } = require('../services/riskEngine');
const db = require('../db');
const AppError = require('../utils/AppError');

// GET /api/risk/student/:id
async function getStudentRisk(req, res) {
  const { id } = req.params;
  const risk = await calculateRisk(id);
  res.json({ success: true, data: risk });
}

// GET /api/risk/scores  — all cached scores
async function getAllScores(req, res) {
  const { band, limit = 50, offset = 0 } = req.query;
  const vals = [];
  const conditions = [];
  if (band) { vals.push(band); conditions.push(`srs.band = $${vals.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT srs.*, s.name AS student_name, s.roll_number, c.name AS class_name
     FROM student_risk_scores srs
     JOIN students s ON s.id = srs.student_id
     LEFT JOIN classes c ON c.id = s.class_id
     ${where}
     ORDER BY srs.score DESC
     LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
    [...vals, +limit, +offset]
  );
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM student_risk_scores srs ${where}`, vals
  );
  res.json({ success: true, data: rows, total: +count });
}

// POST /api/risk/recalculate  — recalculate all
async function triggerRecalculate(req, res) {
  const result = await recalculateAll();
  res.json({ success: true, data: result });
}

// GET /api/risk/summary
async function getRiskSummary(req, res) {
  const { rows } = await db.query(
    `SELECT band, COUNT(*) AS count FROM student_risk_scores GROUP BY band`
  );
  const summary = rows.reduce((acc, r) => { acc[r.band] = +r.count; return acc; }, {});
  res.json({ success: true, data: summary });
}

// ── GET /api/risk/interventions/:studentId ────────────────────────────────────
async function getInterventions(req, res) {
  const { rows } = await pool.query(
    `SELECT ri.*, u.name AS created_by_name
     FROM risk_interventions ri
     LEFT JOIN users u ON u.id = ri.created_by
     WHERE ri.student_id = $1
     ORDER BY ri.contact_date DESC, ri.created_at DESC`,
    [req.params.studentId]
  );
  res.json({ success: true, data: rows });
}

// ── POST /api/risk/interventions ──────────────────────────────────────────────
async function addIntervention(req, res) {
  const { student_id, contact_date, method, contacted_by, notes, outcome, follow_up } = req.body;
  if (!student_id || !notes?.trim()) {
    return res.status(400).json({ success: false, message: 'student_id and notes are required' });
  }
  const { rows } = await pool.query(
    `INSERT INTO risk_interventions
       (student_id, contact_date, method, contacted_by, notes, outcome, follow_up, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      student_id,
      contact_date || new Date().toISOString().slice(0, 10),
      method || 'call',
      contacted_by?.trim() || null,
      notes.trim(),
      outcome?.trim() || null,
      follow_up || null,
      req.user?.id || null,
    ]
  );
  res.status(201).json({ success: true, data: rows[0], message: 'Intervention logged' });
}

// ── DELETE /api/risk/interventions/:id ────────────────────────────────────────
async function deleteIntervention(req, res) {
  const { rows } = await pool.query(
    'DELETE FROM risk_interventions WHERE id=$1 RETURNING id', [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Deleted' });
}

module.exports = { getStudentRisk, getAllScores, triggerRecalculate, getRiskSummary, getInterventions, addIntervention, deleteIntervention };
