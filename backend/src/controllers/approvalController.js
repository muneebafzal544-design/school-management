/**
 * approvalController.js — Parent approval workflow
 *
 * Supports two workflow types:
 *   grade_publication — ask parents to acknowledge/approve results being published
 *   student_promotion — ask parents to consent before promoting their child
 *
 * Flow:
 *   Admin creates a batch → records per student/parent created → WhatsApp/in-app notifications sent
 *   Parent approves or rejects via /api/approvals/:id/respond
 *   Admin monitors via /api/approvals?batch_ref=xxx
 */

const db       = require('../db');
const AppError = require('../utils/AppError');
const { sendTemplate } = require('../services/whatsappService');

// ── Create a workflow batch ────────────────────────────────────────────────────
// Admin POSTs once for a class/exam. We fan out one row per student w/ a parent.
async function createWorkflow(req, res) {
  const { workflow_type, reference_id, reference_name, class_id, student_ids, expires_days = 7 } = req.body;

  if (!workflow_type || !reference_name) {
    throw new AppError('workflow_type and reference_name are required', 400);
  }

  const batch_ref   = `${workflow_type}-${Date.now()}`;
  const expires_at  = new Date(Date.now() + expires_days * 24 * 3600 * 1000);
  const requested_by = req.user.id;

  // Resolve the student list
  let studentQuery;
  if (student_ids?.length) {
    studentQuery = await db.query(
      `SELECT s.id AS student_id, s.name, s.parent_user_id, s.parent_phone,
              u.phone AS parent_user_phone, c.id AS class_id
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN users u ON u.id = s.parent_user_id
       WHERE s.id = ANY($1) AND s.is_deleted = false`,
      [student_ids]
    );
  } else if (class_id) {
    studentQuery = await db.query(
      `SELECT s.id AS student_id, s.name, s.parent_user_id, s.parent_phone,
              u.phone AS parent_user_phone, c.id AS class_id
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN users u ON u.id = s.parent_user_id
       WHERE s.class_id = $1 AND s.is_deleted = false AND s.status = 'active'`,
      [class_id]
    );
  } else {
    throw new AppError('Provide class_id or student_ids', 400);
  }

  const students = studentQuery.rows;
  if (!students.length) throw new AppError('No eligible students found', 404);

  // Insert one row per student (skip students without a parent link)
  const created = [];
  for (const s of students) {
    if (!s.parent_user_id) continue;

    const { rows: [row] } = await db.query(
      `INSERT INTO approval_workflows
         (workflow_type, batch_ref, reference_id, reference_name, class_id, student_id,
          parent_user_id, requested_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [workflow_type, batch_ref, reference_id || null, reference_name,
       s.class_id || class_id || null, s.student_id,
       s.parent_user_id, requested_by, expires_at]
    );
    created.push(row.id);

    // In-app notification to parent
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1,$2,$3,'info')`,
      [s.parent_user_id,
       workflow_type === 'grade_publication' ? 'Grade Publication Approval' : 'Student Promotion Consent',
       `Action required for ${s.name}: ${reference_name}. Please review and respond.`]
    ).catch(() => {});

    // WhatsApp notification (fire-and-forget)
    const phone = s.parent_phone || s.parent_user_phone;
    if (phone) {
      sendTemplate(phone, 'approval_request',
        [s.name, reference_name,
         workflow_type === 'grade_publication' ? 'grade publication' : 'promotion'],
        { student_id: s.student_id, triggered_by: 'approval_workflow' }
      ).catch(() => {});
    }
  }

  res.status(201).json({
    success: true,
    data: { batch_ref, created_count: created.length, ids: created },
    message: `Approval requests sent to ${created.length} parent(s)`,
  });
}

// ── List workflows (admin) ─────────────────────────────────────────────────────
async function getWorkflows(req, res) {
  const { batch_ref, workflow_type, class_id, status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  const conditions = [];
  const vals = [];

  if (batch_ref)     { vals.push(batch_ref);     conditions.push(`aw.batch_ref = $${vals.length}`); }
  if (workflow_type) { vals.push(workflow_type);  conditions.push(`aw.workflow_type = $${vals.length}`); }
  if (class_id)      { vals.push(+class_id);      conditions.push(`aw.class_id = $${vals.length}`); }
  if (status)        { vals.push(status);          conditions.push(`aw.status = $${vals.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT aw.*,
            s.name AS student_name, s.roll_number,
            c.name AS class_name,
            u.name AS parent_name, u.phone AS parent_phone,
            ru.name AS requested_by_name
     FROM approval_workflows aw
     LEFT JOIN students s ON s.id = aw.student_id
     LEFT JOIN classes c  ON c.id = aw.class_id
     LEFT JOIN users u    ON u.id = aw.parent_user_id
     LEFT JOIN users ru   ON ru.id = aw.requested_by
     ${where}
     ORDER BY aw.created_at DESC
     LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
    [...vals, +limit, +offset]
  );

  const { rows: [{ total }] } = await db.query(
    `SELECT COUNT(*) AS total FROM approval_workflows aw ${where}`, vals
  );

  res.json({ success: true, data: rows, total: +total });
}

// ── Parent: list my pending approvals ─────────────────────────────────────────
async function getMyApprovals(req, res) {
  const { rows } = await db.query(
    `SELECT aw.*,
            s.name AS student_name, s.roll_number,
            c.name AS class_name,
            ru.name AS requested_by_name
     FROM approval_workflows aw
     LEFT JOIN students s ON s.id = aw.student_id
     LEFT JOIN classes c  ON c.id = aw.class_id
     LEFT JOIN users ru   ON ru.id = aw.requested_by
     WHERE aw.parent_user_id = $1
       AND aw.status IN ('pending','approved','rejected')
     ORDER BY aw.created_at DESC
     LIMIT 50`,
    [req.user.id]
  );
  res.json({ success: true, data: rows });
}

// ── Parent: respond (approve / reject) ────────────────────────────────────────
async function respondWorkflow(req, res) {
  const { id }    = req.params;
  const { status, remarks } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    throw new AppError('status must be approved or rejected', 400);
  }

  const { rows: [aw] } = await db.query(
    `SELECT * FROM approval_workflows WHERE id = $1`, [id]
  );
  if (!aw) throw new AppError('Approval request not found', 404);

  // Parent can only respond to their own records
  if (req.user.role === 'parent' && aw.parent_user_id !== req.user.id) {
    throw new AppError('Not authorised', 403);
  }
  if (aw.status !== 'pending') {
    throw new AppError(`Already ${aw.status} — cannot change`, 409);
  }
  if (aw.expires_at && new Date() > new Date(aw.expires_at)) {
    throw new AppError('This approval request has expired', 410);
  }

  await db.query(
    `UPDATE approval_workflows
     SET status=$1, remarks=$2, responded_at=NOW()
     WHERE id=$3`,
    [status, remarks || null, id]
  );

  res.json({ success: true, message: `Approval ${status}` });
}

// ── Admin: cancel a batch ──────────────────────────────────────────────────────
async function cancelBatch(req, res) {
  const { batch_ref } = req.params;

  const { rowCount } = await db.query(
    `UPDATE approval_workflows SET status='cancelled' WHERE batch_ref=$1 AND status='pending'`,
    [batch_ref]
  );
  res.json({ success: true, message: `${rowCount} pending request(s) cancelled` });
}

// ── Admin: batch summary ───────────────────────────────────────────────────────
async function getBatchSummary(req, res) {
  const { batch_ref } = req.params;

  const { rows } = await db.query(
    `SELECT
       COUNT(*)                               FILTER (WHERE status = 'pending')   AS pending,
       COUNT(*)                               FILTER (WHERE status = 'approved')  AS approved,
       COUNT(*)                               FILTER (WHERE status = 'rejected')  AS rejected,
       COUNT(*)                               FILTER (WHERE status = 'expired')   AS expired,
       COUNT(*)                               FILTER (WHERE status = 'cancelled') AS cancelled,
       COUNT(*)                                                                    AS total,
       MAX(reference_name)                                                         AS reference_name,
       MAX(workflow_type)                                                          AS workflow_type,
       MAX(created_at)                                                             AS created_at
     FROM approval_workflows WHERE batch_ref = $1`,
    [batch_ref]
  );
  res.json({ success: true, data: rows[0] });
}

module.exports = {
  createWorkflow,
  getWorkflows,
  getMyApprovals,
  respondWorkflow,
  cancelBatch,
  getBatchSummary,
};
