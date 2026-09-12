const router = require('express').Router();
const ctrl = require('../controllers/riskController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken);

router.get('/scores',       requireRole('admin', 'teacher'), asyncHandler(ctrl.getAllScores));
router.get('/summary',      requireRole('admin', 'teacher'), asyncHandler(ctrl.getRiskSummary));
router.get('/student/:id',  asyncHandler(ctrl.getStudentRisk));
router.post('/recalculate', requireRole('admin'),            asyncHandler(ctrl.triggerRecalculate));

// Interventions
router.get('/interventions/:studentId', requireRole('admin', 'teacher'), asyncHandler(ctrl.getInterventions));
router.post('/interventions',           requireRole('admin', 'teacher'), asyncHandler(ctrl.addIntervention));
router.delete('/interventions/:id',     requireRole('admin'),            asyncHandler(ctrl.deleteIntervention));

module.exports = router;
