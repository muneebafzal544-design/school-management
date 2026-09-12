const express = require('express');
const router  = express.Router();
const {
  getVisitors, getStats, createVisitor, exitVisitor, markBadgePrinted, deleteVisitor,
} = require('../controllers/visitorsController');
const { requireRole } = require('../middleware/authMiddleware');

router.get('/',          requireRole('admin', 'teacher'), getVisitors);
router.get('/stats',     requireRole('admin', 'teacher'), getStats);
router.post('/',         requireRole('admin', 'teacher'), createVisitor);
router.patch('/:id/exit',   requireRole('admin', 'teacher'), exitVisitor);
router.patch('/:id/badge',  requireRole('admin', 'teacher'), markBadgePrinted);
router.delete('/:id',    requireRole('admin'),            deleteVisitor);

module.exports = router;
