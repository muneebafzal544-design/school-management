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
  resetUserPassword,
} = require('../controllers/rbacController');
const { cacheRoute }   = require('../cache/cacheMiddleware');
const asyncHandler     = require('../utils/asyncHandler');

const router = Router();

// All RBAC routes are admin-only (role-based guard stays in place)
router.use(requireRole('admin'));

// NOTE: every handler below is wrapped in asyncHandler. Without it, a thrown
// AppError inside an async controller becomes a rejected promise Express
// never catches — the request just hangs until the platform kills it with a
// timeout instead of returning the actual 4xx (confirmed live: this was
// already happening for existing validation errors here, not just the new
// owner-guard checks — asyncHandler is used everywhere else in the codebase
// for exactly this reason, this router had just never had it applied).
router.get('/permissions', cacheRoute(600), asyncHandler(listPermissions));

// ── Roles ─────────────────────────────────────────────────────────────────────
router.get('/roles',              cacheRoute(300), asyncHandler(listRoles));
router.get('/roles/:id',          cacheRoute(120), asyncHandler(getRole));
router.post('/roles',             asyncHandler(createRole));
router.put('/roles/:id',          asyncHandler(updateRole));
router.delete('/roles/:id',       asyncHandler(deleteRole));
router.put('/roles/:id/permissions', asyncHandler(setRolePermissions));

// ── Users ─────────────────────────────────────────────────────────────────────
router.get   ('/users',                       asyncHandler(listUsers));
router.post  ('/users',                       asyncHandler(createUser));
router.put   ('/users/:userId/role',          asyncHandler(setUserRole));
router.delete('/users/:userId',               asyncHandler(deactivateUser));
router.post  ('/users/:userId/reset-password',asyncHandler(resetUserPassword));
router.get   ('/users/:userId/permissions',   asyncHandler(getUserPermissions));
router.put   ('/users/:userId/permissions',   asyncHandler(setUserPermissions));

// ── Summary dashboard ─────────────────────────────────────────────────────────
router.get('/summary', asyncHandler(getSummary));

module.exports = router;
