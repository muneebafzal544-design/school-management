const express = require('express');
const router  = express.Router();
const {
  getClasses, getClass, getClassStudents, createClass, updateClass, deleteClass,
} = require('../controllers/classController');
const { requireRole }   = require('../middleware/authMiddleware');
const { auditMiddleware } = require('../middleware/auditLog');
const { cacheRoute }    = require('../cache/cacheMiddleware');

router.use(auditMiddleware('class'));

router.get('/',    requireRole('admin', 'teacher'), cacheRoute(300), getClasses);
router.post('/',   requireRole('admin'),            createClass);

router.get('/:id/students', requireRole('admin', 'teacher'), getClassStudents);

router.get('/:id',    requireRole('admin', 'teacher'), getClass);
router.put('/:id',    requireRole('admin'),            updateClass);
router.delete('/:id', requireRole('admin'),            deleteClass);

module.exports = router;
