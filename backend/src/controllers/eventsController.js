const pool = require('../db');
const { serverErr } = require('../utils/serverErr');


const getEvents = async (req, res) => {
  try {
    const { academic_year, type, month, is_holiday } = req.query;
    const role = req.user?.role;
    const restrictToPublic = role === 'student' || role === 'parent';

    let q = 'SELECT * FROM events WHERE 1=1';
    const p = [];

    // Students and parents only see events marked visible to parents/public
    if (restrictToPublic) {
      q += ' AND (visible_to_parents = TRUE OR visible_to_parents IS NULL)';
    }

    if (academic_year) { p.push(academic_year); q += ` AND academic_year=$${p.length}`; }
    if (type)          { p.push(type);          q += ` AND type=$${p.length}`; }
    if (is_holiday !== undefined) { p.push(is_holiday === 'true'); q += ` AND is_holiday=$${p.length}`; }
    if (month) {
      const [y, m] = month.split('-');
      const first = `${y}-${m}-01`;
      const last  = new Date(parseInt(y), parseInt(m), 0).toISOString().slice(0, 10);
      p.push(first); q += ` AND start_date >= $${p.length}`;
      p.push(last);  q += ` AND start_date <= $${p.length}`;
    }
    q += ' ORDER BY start_date ASC, created_at ASC';
    const { rows } = await pool.query(q, p);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) { serverErr(res, err); }
};

const getEventById = async (req, res) => {
  try {
    const role = req.user?.role;
    const restrictToPublic = role === 'student' || role === 'parent';
    const extra = restrictToPublic ? ' AND (visible_to_parents = TRUE OR visible_to_parents IS NULL)' : '';
    const { rows } = await pool.query(`SELECT * FROM events WHERE id=$1${extra}`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { serverErr(res, err); }
};

const createEvent = async (req, res) => {
  try {
    const { title, description, start_date, end_date, type, color, is_holiday, academic_year } = req.body;
    if (!title || !start_date) return res.status(400).json({ success: false, message: 'title and start_date required' });
    const { rows } = await pool.query(`
      INSERT INTO events (title, description, start_date, end_date, type, color, is_holiday, academic_year)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [title.trim(), description||null, start_date, end_date||null,
        type||'general', color||'#6366f1', is_holiday||false, academic_year||'2024-25']);
    res.status(201).json({ success: true, data: rows[0], message: 'Event created' });
  } catch (err) { serverErr(res, err); }
};

const updateEvent = async (req, res) => {
  try {
    const { title, description, start_date, end_date, type, color, is_holiday } = req.body;
    const { rows } = await pool.query(`
      UPDATE events SET title=$1, description=$2, start_date=$3, end_date=$4,
        type=$5, color=$6, is_holiday=$7, updated_at=NOW()
      WHERE id=$8 RETURNING *
    `, [title, description||null, start_date, end_date||null,
        type||'general', color||'#6366f1', is_holiday||false, req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: rows[0], message: 'Event updated' });
  } catch (err) { serverErr(res, err); }
};

const deleteEvent = async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM events WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) { serverErr(res, err); }
};

// ── Pakistani Islamic holidays (lunar — approximate Gregorian dates) ─────────
// Dates are based on standard Pakistan holiday declarations. Update annually.
const PAKISTAN_ISLAMIC_HOLIDAYS = {
  2024: [
    { date: '2024-04-10', name: 'Eid ul Fitr (Day 1)',           days: 3, color: '#16a34a' },
    { date: '2024-06-17', name: 'Eid ul Adha (Day 1)',           days: 3, color: '#16a34a' },
    { date: '2024-07-17', name: 'Ashura (Muharram 10)',          days: 2, color: '#7c3aed' },
    { date: '2024-09-15', name: '12 Rabi ul Awwal (Eid Milad)',  days: 1, color: '#f59e0b' },
  ],
  2025: [
    { date: '2025-03-31', name: 'Eid ul Fitr (Day 1)',           days: 3, color: '#16a34a' },
    { date: '2025-06-07', name: 'Eid ul Adha (Day 1)',           days: 3, color: '#16a34a' },
    { date: '2025-07-05', name: 'Ashura (Muharram 10)',          days: 2, color: '#7c3aed' },
    { date: '2025-09-04', name: '12 Rabi ul Awwal (Eid Milad)',  days: 1, color: '#f59e0b' },
  ],
  2026: [
    { date: '2026-03-20', name: 'Eid ul Fitr (Day 1)',           days: 3, color: '#16a34a' },
    { date: '2026-05-27', name: 'Eid ul Adha (Day 1)',           days: 3, color: '#16a34a' },
    { date: '2026-06-24', name: 'Ashura (Muharram 10)',          days: 2, color: '#7c3aed' },
    { date: '2026-08-24', name: '12 Rabi ul Awwal (Eid Milad)',  days: 1, color: '#f59e0b' },
  ],
};

const seedIslamicHolidays = async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (!year || year < 2000 || year > 2100)
      return res.status(400).json({ success: false, message: 'Invalid year' });
    const holidays = PAKISTAN_ISLAMIC_HOLIDAYS[year];
    if (!holidays)
      return res.status(404).json({ success: false, message: `No Islamic holiday data for ${year}. Please add dates manually.` });

    const academicYear = `${year - 1}-${String(year).slice(-2)}`;
    let inserted = 0;
    for (const h of holidays) {
      const startDate = h.date;
      const endDate   = h.days > 1
        ? new Date(new Date(h.date).getTime() + (h.days - 1) * 86400000).toISOString().slice(0, 10)
        : null;
      const { rowCount } = await pool.query(
        `INSERT INTO events (title, start_date, end_date, type, color, is_holiday, academic_year)
         VALUES ($1, $2, $3, 'holiday', $4, TRUE, $5)
         ON CONFLICT DO NOTHING`,
        [`${h.name} (approx.)`, startDate, endDate, h.color, academicYear]
      );
      inserted += rowCount;
    }
    res.json({ success: true, inserted, message: `${inserted} Islamic holiday(s) added for ${year} (approximate dates — verify with official announcement).` });
  } catch (err) { serverErr(res, err); }
};

// ── Pakistani national public holidays (fixed-date) ──────────────────────────
const PAKISTAN_FIXED_HOLIDAYS = [
  { month: 2,  day: 5,  name: 'Kashmir Solidarity Day',              color: '#16a34a' },
  { month: 3,  day: 23, name: 'Pakistan Day',                        color: '#16a34a' },
  { month: 5,  day: 1,  name: 'Labour Day',                          color: '#2563eb' },
  { month: 8,  day: 14, name: 'Independence Day',                    color: '#16a34a' },
  { month: 9,  day: 6,  name: 'Defence Day',                         color: '#dc2626' },
  { month: 9,  day: 11, name: 'Death Anniversary of Quaid-e-Azam',   color: '#64748b' },
  { month: 11, day: 9,  name: 'Allama Iqbal Day',                    color: '#7c3aed' },
  { month: 12, day: 25, name: "Quaid-e-Azam Day / Christmas Day",    color: '#dc2626' },
];

const seedNationalHolidays = async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (!year || year < 2000 || year > 2100) {
      return res.status(400).json({ success: false, message: 'Invalid year' });
    }
    const academicYear = `${year - 1}-${String(year).slice(-2)}`;

    let inserted = 0;
    for (const h of PAKISTAN_FIXED_HOLIDAYS) {
      const date = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
      const { rowCount } = await pool.query(`
        INSERT INTO events (title, start_date, type, color, is_holiday, academic_year)
        VALUES ($1, $2, 'holiday', $3, TRUE, $4)
        ON CONFLICT DO NOTHING
      `, [h.name, date, h.color, academicYear]);
      inserted += rowCount;
    }
    res.json({ success: true, inserted, message: `${inserted} national holiday(s) added for ${year}. Lunar holidays (Eid, Muharram) must be added manually each year.` });
  } catch (err) { serverErr(res, err); }
};

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent, seedNationalHolidays, seedIslamicHolidays };
