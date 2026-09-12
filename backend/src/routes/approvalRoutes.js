const router       = require('express').Router();
const ctrl         = require('../controllers/approvalController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken);

router.post('/',                             requireRole('admin'), asyncHandler(ctrl.createWorkflow));
router.get('/',                              requireRole('admin'), asyncHandler(ctrl.getWorkflows));
router.get('/my',                            asyncHandler(ctrl.getMyApprovals));
router.put('/:id/respond',                   asyncHandler(ctrl.respondWorkflow));
router.delete('/batch/:batch_ref',           requireRole('admin'), asyncHandler(ctrl.cancelBatch));
router.get('/batch/:batch_ref/summary',      requireRole('admin'), asyncHandler(ctrl.getBatchSummary));

module.exports = router;
