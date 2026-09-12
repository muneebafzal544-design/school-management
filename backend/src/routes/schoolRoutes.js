const router = require('express').Router();
const { createSchool, listSchools, resolveSchool, updateSchool, getSchoolStats, resetSchoolAdmin, seedDemoForSchool, migrateAllSchools } = require('../controllers/schoolController');
const { requireSuperAdmin } = require('../middleware/authMiddleware');

// ── Public ───────────────────────────────────────────────────────────────────
router.get('/resolve', resolveSchool);

// ── Super-admin only ──────────────────────────────────────────────────────────
router.get('/stats',           requireSuperAdmin, getSchoolStats);
router.get('/',                requireSuperAdmin, listSchools);
router.post('/',               requireSuperAdmin, createSchool);
router.post('/migrate-all',    requireSuperAdmin, migrateAllSchools);
router.patch('/:id',           requireSuperAdmin, updateSchool);
router.post('/:id/reset-admin',requireSuperAdmin, resetSchoolAdmin);
router.post('/:id/seed-demo',  requireSuperAdmin, seedDemoForSchool);

module.exports = router;
