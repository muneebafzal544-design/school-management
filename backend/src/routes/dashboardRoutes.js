const express = require('express');
const router  = express.Router();
const { getStats, getFullDashboard, getTeacherDashboard, getStudentDashboard, getParentDashboard } = require('../controllers/dashboardController');
const { requireRole } = require('../middleware/authMiddleware');
const { cacheRoute }  = require('../cache/cacheMiddleware');

router.get('/stats',   requireRole('admin', 'teacher'), cacheRoute(60),  getStats);
router.get('/full',    requireRole('admin'),             cacheRoute(60),  getFullDashboard);
router.get('/teacher', requireRole('teacher', 'admin'), cacheRoute(60),  getTeacherDashboard);
router.get('/student', requireRole('student', 'admin'), cacheRoute(120), getStudentDashboard);
router.get('/parent',  requireRole('parent',  'admin'), cacheRoute(120), getParentDashboard);

module.exports = router;
