const { sendTemplate } = require('../services/whatsappService');
const { sendBulk, getRecipients } = require('../services/whatsappBulkService');
const db = require('../db');
const AppError = require('../utils/AppError');

// POST /api/whatsapp/send  — single message
async function sendMessage(req, res) {
  const { phone, template, params = [] } = req.body;
  if (!phone || !template) throw new AppError('phone and template are required', 400);
  const result = await sendTemplate(phone, template, params, {
    triggered_by: req.user?.role || 'manual',
  });
  res.json({ success: true, data: result });
}

// POST /api/whatsapp/bulk  — bulk send to class/section/all
async function sendBulkMessage(req, res) {
  const { scope, template, params = [] } = req.body;
  if (!template) throw new AppError('template is required', 400);
  const recipients = await getRecipients(scope || 'all');
  const result = await sendBulk(
    recipients,
    template,
    () => params,
    req.user?.role || 'bulk'
  );
  res.json({ success: true, data: result });
}

// GET /api/whatsapp/logs
async function getLogs(req, res) {
  const { limit = 50, offset = 0, status } = req.query;
  let where = '';
  const vals = [+limit, +offset];
  if (status) { vals.push(status); where = `WHERE status = $${vals.length}`; }
  const { rows } = await db.query(
    `SELECT * FROM whatsapp_logs ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    vals
  );
  res.json({ success: true, data: rows });
}

// GET /api/whatsapp/stats
async function getStats(req, res) {
  const { rows } = await db.query(
    `SELECT status, COUNT(*) AS count
     FROM whatsapp_logs
     WHERE created_at >= NOW() - INTERVAL '30 days'
     GROUP BY status`
  );
  const stats = rows.reduce((acc, r) => { acc[r.status] = +r.count; return acc; }, {});
  res.json({ success: true, data: stats });
}

// POST /api/whatsapp/webhook  — Meta webhook: status updates + incoming messages
async function handleWebhook(req, res) {
  // Acknowledge immediately — Meta requires 200 within 20 seconds
  res.status(200).json({ success: true });

  const body = req.body;
  if (body?.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      // ── Status updates (sent/delivered/read/failed) ────────────────
      for (const status of value.statuses || []) {
        const { id: wamid, status: newStatus, timestamp } = status;
        const ts = new Date(parseInt(timestamp, 10) * 1000);

        await db.query(
          `UPDATE whatsapp_logs
              SET status = $1, updated_at = $2
            WHERE wamid = $3`,
          [newStatus, ts, wamid]
        ).catch(() => {});

        if (newStatus === 'failed') {
          const errCode = status.errors?.[0]?.code ?? null;
          const errMsg  = status.errors?.[0]?.message ?? null;
          await db.query(
            `UPDATE whatsapp_logs
                SET error_code = $1, error_message = $2
              WHERE wamid = $3`,
            [errCode, errMsg, wamid]
          ).catch(() => {});
        }
      }

      // ── Incoming messages (store for reference, no action needed) ──
      for (const msg of value.messages || []) {
        const from = msg.from; // phone number
        const text = msg.type === 'text' ? msg.text?.body : `[${msg.type}]`;
        await db.query(
          `INSERT INTO whatsapp_inbound_messages
              (wamid, from_phone, message_type, body, received_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (wamid) DO NOTHING`,
          [msg.id, from, msg.type, text]
        ).catch(() => {});
      }
    }
  }
}

module.exports = { sendMessage, sendBulkMessage, getLogs, getStats, handleWebhook };
