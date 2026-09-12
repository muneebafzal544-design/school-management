const express = require('express');
const router  = express.Router();
const {
  getEvents, getEventById, createEvent, updateEvent, deleteEvent, seedNationalHolidays, seedIslamicHolidays,
} = require('../controllers/eventsController');
const { requireRole }     = require('../middleware/authMiddleware');
const { auditMiddleware } = require('../middleware/auditLog');

router.use(auditMiddleware('event'));

router.get('/',    requireRole('admin', 'teacher', 'student', 'parent'), getEvents);
router.post('/',   requireRole('admin'),                              createEvent);
router.get('/:id', requireRole('admin', 'teacher', 'student', 'parent'), getEventById);
router.put('/:id', requireRole('admin'),                              updateEvent);
router.delete('/:id', requireRole('admin'),                           deleteEvent);
router.post('/seed-national-holidays/:year', requireRole('admin'), seedNationalHolidays);
router.post('/seed-islamic-holidays/:year',  requireRole('admin'), seedIslamicHolidays);

module.exports = router;
