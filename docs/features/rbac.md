# Role-Based Access Control (RBAC)

## Overview

The system uses JWT-based authentication with role-based access control enforced at the API layer. Every protected endpoint checks the user's role before executing.

---

## Built-In Roles

### `admin`
Full access to everything. Responsible for:
- Creating and managing students, teachers, and staff
- Configuring fee structures and generating invoices
- Recording payments and managing concessions
- Managing transport fleet and routes
- Creating announcements and notifications
- Viewing all reports and audit logs
- System settings and configuration

### `teacher`
Access scoped to academic operations:
- Mark attendance for their assigned classes
- Enter exam marks for their subjects
- Assign and view homework submissions
- View student profiles and fee status (read-only)
- Create announcements for their classes
- Schedule parent-teacher meetings

### `student`
Access to their own data only:
- View personal attendance record
- View own fee invoices and payment history
- View exam results and report cards
- Submit homework
- View timetable, homework, and announcements

### `parent`
Access to their linked child's data:
- View child's attendance
- View child's fee invoices and receipts
- View live bus tracking for child's assigned bus
- View child's exam results and homework
- Message teachers
- View school announcements

---

## How It Works

### Middleware Stack

```js
// Step 1: Verify JWT and attach user to request
app.use(verifyToken);

// Step 2: Force password change if flagged
app.use(requirePasswordChanged);

// Step 3: Per-route role check
router.get('/students', requireRole('admin', 'teacher'), getAllStudents);
//                       └─ Only admin and teacher can call this endpoint
```

### `verifyToken` Middleware

```js
// authMiddleware.js
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // { id, username, role, entity_id, name }
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
```

### `requireRole` Middleware

```js
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
}
```

---

## Role-Endpoint Matrix

| Endpoint | admin | teacher | student | parent |
|----------|:-----:|:-------:|:-------:|:------:|
| **Students** | | | | |
| GET /students | ✅ | ✅ | ❌ | ❌ |
| POST /students | ✅ | ❌ | ❌ | ❌ |
| PUT /students/:id | ✅ | ❌ | ❌ | ❌ |
| DELETE /students/:id | ✅ | ❌ | ❌ | ❌ |
| GET /students/export | ✅ | ✅ | ❌ | ❌ |
| POST /students/import | ✅ | ❌ | ❌ | ❌ |
| **Attendance** | | | | |
| POST /attendance | ✅ | ✅ | ❌ | ❌ |
| GET /attendance/class/:id | ✅ | ✅ | own class | ❌ |
| GET /attendance/monthly | ✅ | ✅ | ❌ | ❌ |
| GET /attendance/export | ✅ | ✅ | ❌ | ❌ |
| **Fees** | | | | |
| GET /fees/invoices | ✅ | ✅ | own | own child |
| POST /fees/invoices | ✅ | ❌ | ❌ | ❌ |
| POST /fees/payments | ✅ | ❌ | ❌ | ❌ |
| DELETE /fees/payments/:id | ✅ | ❌ | ❌ | ❌ |
| GET /fees/reports/* | ✅ | ✅ | ❌ | ❌ |
| POST /fees/send-reminders | ✅ | ❌ | ❌ | ❌ |
| **Teachers** | | | | |
| GET /teachers | ✅ | ✅ | ❌ | ❌ |
| POST /teachers | ✅ | ❌ | ❌ | ❌ |
| PUT /teachers/:id | ✅ | ❌ | ❌ | ❌ |
| **Transport** | | | | |
| GET /transport/* | ✅ | ✅ | ✅ | ✅ |
| POST /transport/* | ✅ | ❌ | ❌ | ❌ |
| GET /tracking/location/:id | ✅ | ✅ | ✅ | ✅ |
| **Announcements** | | | | |
| GET /announcements | ✅ | ✅ | ✅ | ✅ |
| POST /announcements | ✅ | ✅ | ❌ | ❌ |
| DELETE /announcements/:id | ✅ | own | ❌ | ❌ |
| **Chatbot** | | | | |
| POST /chatbot/query | ✅ | ✅ | ✅ | ✅ |
| **Dashboard** | | | | |
| GET /dashboard/stats | ✅ | ✅ | ❌ | ❌ |
| GET /dashboard/teacher | ✅ | ✅ | ❌ | ❌ |
| GET /dashboard/student | ✅ | ❌ | ✅ | ❌ |
| GET /dashboard/parent | ✅ | ❌ | ❌ | ✅ |
| **System** | | | | |
| GET /audit-logs | ✅ | ❌ | ❌ | ❌ |
| GET /settings | ✅ | ❌ | ❌ | ❌ |
| POST /backup | ✅ | ❌ | ❌ | ❌ |

---

## Data Scoping (Beyond Role Checks)

Role checks at the route level are the first gate. Many controllers apply additional **data scoping** at the query level:

### Teacher Scope
Teachers can only see students in their assigned classes:
```js
// In attendanceController.js
if (req.user.role === 'teacher') {
  whereClause += ` AND class_id IN (
    SELECT class_id FROM teacher_classes WHERE teacher_id = $N
  )`;
}
```

### Student/Parent Scope
Students only see their own invoices:
```js
// In feeController.js
if (req.user.role === 'student') {
  where += ' AND fi.student_id = (SELECT entity_id FROM users WHERE id = $N)';
}
if (req.user.role === 'parent') {
  where += ' AND fi.student_id IN (SELECT id FROM students WHERE parent_user_id = $N)';
}
```

---

## Custom Roles (RBAC Module)

Beyond the four built-in roles, admins can create **custom roles** with granular permissions:

1. Go to **Settings** → **Roles**
2. Create a role (e.g., "Accounts Staff")
3. Grant specific permissions:
   - `fees:read`, `fees:write`
   - `students:read`
   - `reports:read`
4. Assign the role to a user

Custom roles are stored in the `rbac_roles` and `rbac_permissions` tables and checked by an extended `requireRole` that also queries the RBAC tables.

---

## JWT Payload

The access token contains:
```json
{
  "id": 1,
  "username": "teacher1",
  "role": "teacher",
  "entity_id": 5,
  "name": "Sarah Ahmed",
  "iat": 1720000000,
  "exp": 1720000900
}
```

`entity_id` links the user to the teachers/students table for data scoping.

---

## Account Lockout

After 5 failed logins within 15 minutes, the account is locked:

```sql
SELECT COUNT(*) FROM login_attempts
WHERE identifier = $1
  AND success = false
  AND attempted_at > NOW() - INTERVAL '15 minutes'
```

An admin can unlock an account by clearing `login_attempts` for that user:
```sql
DELETE FROM login_attempts WHERE identifier = 'username_here';
```
