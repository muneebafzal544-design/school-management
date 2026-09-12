const router = require('express').Router();
const ctrl = require('../controllers/whatsappController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { verifyInboundWebhook }     = require('../utils/webhookDispatcher');
const asyncHandler = require('../utils/asyncHandler');

// ── Public Meta webhook endpoints (no auth — verified by signature) ──────────
// GET: Meta calls this to verify the webhook during setup
router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.status(403).json({ success: false, message: 'Verification failed' });
});

// POST: Meta sends message status updates and incoming messages
router.post(
  '/webhook',
  verifyInboundWebhook(process.env.WHATSAPP_APP_SECRET),
  asyncHandler(ctrl.handleWebhook)
);

// ── Protected admin/teacher routes ────────────────────────────────────────────
router.use(verifyToken);
router.use(requireRole('admin', 'teacher'));

router.post('/send',    asyncHandler(ctrl.sendMessage));
router.post('/bulk',    asyncHandler(ctrl.sendBulkMessage));
router.get('/logs',     asyncHandler(ctrl.getLogs));
router.get('/stats',    asyncHandler(ctrl.getStats));

module.exports = router;
