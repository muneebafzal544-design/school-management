const { Router }      = require('express');
const { requireRole } = require('../middleware/authMiddleware');
const {
  listPermissions,
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  setRolePermissions,
  listUsers,
  setUserRole,
  getUserPermissions,
  setUserPermissions,
  getSummary,
  createUser,
  deactivateUser,
} = require('../controllers/rbacController');
const { cacheRoute } = require('../cache/cacheMiddleware');

const router = Router();

// All RBAC routes are admin-only (role-based guard stays in place)
router.use(requireRole('admin'));

// ── Permissions (read-only — defined in migration) ────────────────────────────
router.get('/permissions', cacheRoute(600), listPermissions);

// ── Roles ─────────────────────────────────────────────────────────────────────
router.get('/roles',              cacheRoute(300), listRoles);
router.get('/roles/:id',          cacheRoute(120), getRole);
router.post('/roles',             createRole);
router.put('/roles/:id',          updateRole);
router.delete('/roles/:id',       deleteRole);
router.put('/roles/:id/permissions', setRolePermissions);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get   ('/users',                       listUsers);
router.post  ('/users',                       createUser);
router.put   ('/users/:userId/role',          setUserRole);
router.delete('/users/:userId',               deactivateUser);
router.get   ('/users/:userId/permissions',   getUserPermissions);
router.put   ('/users/:userId/permissions',   setUserPermissions);

// ── Summary dashboard ─────────────────────────────────────────────────────────
router.get('/summary', getSummary);

module.exports = router;
