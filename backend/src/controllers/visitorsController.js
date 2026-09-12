const pool      = require('../db');
const AppError  = require('../utils/AppError');
const { serverErr } = require('../utils/serverErr');

const PURPOSES  = ['meeting', 'delivery', 'interview', 'pickup', 'maintenance', 'inspection', 'other'];
const ID_TYPES  = ['cnic', 'passport', 'driving_license', 'employee_card', 'other'];

// GET /api/visitors  — ?date=YYYY-MM-DD&on_campus=true&search=
const getVisitors = async (req, res) => {
  try {
    const { date, on_campus, search, limit = 100, offset = 0 } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (date) {
      params.push(date);
      where += ` AND v.entry_time::date = $${params.length}`;
    }
    if (on_campus === 'true') {
      where += ' AND v.exit_time IS NULL';
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (v.name ILIKE $${params.length} OR v.phone ILIKE $${params.length} OR v.id_number ILIKE $${params.length})`;
    }

    params.push(parseInt(limit, 10));
    params.push(parseInt(offset, 10));

    const { rows } = await pool.query(
      `SELECT v.*,
              t.full_name AS host_teacher_name,
              EXTRACT(EPOCH FROM (COALESCE(v.exit_time, NOW()) - v.entry_time))/60 AS duration_minutes
       FROM visitors v
       LEFT JOIN teachers t ON t.id = v.host_teacher_id
       ${where}
       ORDER BY v.entry_time DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Count
    const countParams = params.slice(0, params.length - 2);
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM visitors v ${where}`, countParams
    );

    res.json({ success: true, data: rows, total: parseInt(countRows[0].count, 10) });
  } catch (err) { serverErr(res, err); }
};

// GET /api/visitors/stats
const getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE entry_time::date = $1)                           AS today_total,
         COUNT(*) FILTER (WHERE exit_time IS NULL)                               AS on_campus_now,
         COUNT(*) FILTER (WHERE entry_time::date = $1 AND exit_time IS NOT NULL) AS checked_out_today,
         ROUND(AVG(EXTRACT(EPOCH FROM (exit_time - entry_time))/60) FILTER (WHERE exit_time IS NOT NULL AND entry_time::date = $1)) AS avg_duration_min
       FROM visitors`,
      [today]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) { serverErr(res, err); }
};

// POST /api/visitors
const createVisitor = async (req, res) => {
  try {
    const { name, phone, id_type = 'cnic', id_number, purpose = 'meeting', host_name, host_teacher_id, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Visitor name is required' });
    if (!PURPOSES.includes(purpose)) return res.status(400).json({ success: false, message: 'Invalid purpose' });

    const { rows } = await pool.query(
      `INSERT INTO visitors (name, phone, id_type, id_number, purpose, host_name, host_teacher_id, notes, logged_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        name.trim(), phone || null, id_type, id_number || null,
        purpose, host_name || null,
        host_teacher_id ? parseInt(host_teacher_id, 10) : null,
        notes || null, req.user?.id || null,
      ]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { serverErr(res, err); }
};

// PATCH /api/visitors/:id/exit
const exitVisitor = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE visitors SET exit_time = NOW() WHERE id = $1 AND exit_time IS NULL RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Visitor not found or already checked out' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { serverErr(res, err); }
};

// PATCH /api/visitors/:id/badge
const markBadgePrinted = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE visitors SET badge_printed = TRUE WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Visitor not found' });
    res.json({ success: true });
  } catch (err) { serverErr(res, err); }
};

// DELETE /api/visitors/:id
const deleteVisitor = async (req, res) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM visitors WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, message: 'Visitor not found' });
    res.json({ success: true });
  } catch (err) { serverErr(res, err); }
};

module.exports = { getVisitors, getStats, createVisitor, exitVisitor, markBadgePrinted, deleteVisitor };
