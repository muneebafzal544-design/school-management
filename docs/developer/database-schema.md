# Database Schema Reference

The system uses **PostgreSQL** with 86 migration files creating the full schema. All tables use `id SERIAL PRIMARY KEY` unless noted.

---

## Core Tables

### `users`
Login credentials for all roles.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| username | VARCHAR(100) | Unique |
| password | VARCHAR(255) | bcrypt hash |
| role | VARCHAR(20) | `admin`, `teacher`, `student`, `parent` |
| entity_id | INTEGER | FK to students/teachers table for that role |
| name | VARCHAR(200) | Display name |
| email | VARCHAR(200) | Optional |
| must_change_password | BOOLEAN | Forces password change on next login |
| created_at | TIMESTAMPTZ | |

### `user_sessions`
Active refresh tokens (one row per login session).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | INTEGER | FK → users |
| refresh_token | TEXT | Hashed |
| ip_address | VARCHAR | Client IP |
| user_agent | TEXT | Browser/device |
| expires_at | TIMESTAMPTZ | 7 days from creation |
| created_at | TIMESTAMPTZ | |

### `login_attempts`
Tracks failed logins for account lockout.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| identifier | VARCHAR | username or IP |
| attempted_at | TIMESTAMPTZ | |
| success | BOOLEAN | |

---

## Academic Tables

### `students`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| admission_no | VARCHAR(50) | Unique, auto-generated |
| full_name | VARCHAR(200) | |
| class_id | INTEGER | FK → classes |
| gender | VARCHAR(10) | `male` / `female` |
| date_of_birth | DATE | |
| father_name | VARCHAR(200) | |
| father_phone | VARCHAR(20) | |
| father_cnic | VARCHAR(20) | |
| mother_name | VARCHAR(200) | |
| address | TEXT | |
| photo_url | TEXT | Cloudinary URL |
| status | VARCHAR(20) | `active`, `inactive`, `suspended`, `graduated`, `transferred` |
| deleted_at | TIMESTAMPTZ | NULL = active; soft-delete pattern |
| created_at | TIMESTAMPTZ | |

### `classes`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| name | VARCHAR(100) | e.g., "Grade 5 - A" |
| grade | VARCHAR(20) | e.g., "5" |
| section | VARCHAR(10) | e.g., "A" |
| capacity | INTEGER | Max students |
| class_teacher_id | INTEGER | FK → teachers (nullable) |
| created_at | TIMESTAMPTZ | |

### `teachers`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| full_name | VARCHAR(200) | |
| phone | VARCHAR(20) | |
| email | VARCHAR(200) | |
| cnic | VARCHAR(20) | |
| designation | VARCHAR(100) | |
| join_date | DATE | |
| status | VARCHAR(20) | `active`, `inactive`, `on_leave` |
| photo_url | TEXT | |
| deleted_at | TIMESTAMPTZ | Soft delete |
| created_at | TIMESTAMPTZ | |

### `teacher_classes`
Many-to-many: teachers assigned to classes.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| teacher_id | INTEGER | FK → teachers |
| class_id | INTEGER | FK → classes |

### `subjects`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| name | VARCHAR(100) | e.g., "Mathematics" |
| code | VARCHAR(20) | e.g., "MATH-5" |
| class_id | INTEGER | FK → classes |

### `teacher_subject_assignments`
Which teacher teaches which subject in which class.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| teacher_id | INTEGER | FK → teachers |
| class_id | INTEGER | FK → classes |
| subject_id | INTEGER | FK → subjects |

---

## Attendance

### `attendance`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| student_id | INTEGER | FK → students |
| class_id | INTEGER | FK → classes |
| date | DATE | |
| status | VARCHAR(20) | `present`, `absent`, `late`, `excused`, `leave` |
| remarks | TEXT | Optional |
| recorded_by | INTEGER | FK → users |
| created_at | TIMESTAMPTZ | |

**Unique constraint:** `(student_id, date)` — one record per student per day.

### `late_arrivals`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| student_id | INTEGER | FK → students |
| date | DATE | |
| arrival_time | TIME | |
| reason | TEXT | |
| recorded_by | INTEGER | FK → users |

---

## Fee Tables

### `fee_heads`
Types of fees (e.g., Tuition, Transport, Library).

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| name | VARCHAR(100) | e.g., "Tuition Fee" |
| description | TEXT | |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### `fee_structures`
How much each class pays per fee head per month.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| class_id | INTEGER | FK → classes |
| fee_head_id | INTEGER | FK → fee_heads |
| amount | NUMERIC(10,2) | Monthly amount |
| academic_year | VARCHAR(20) | e.g., "2024-25" |

### `fee_invoices`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| student_id | INTEGER | FK → students |
| class_id | INTEGER | FK → classes |
| month | VARCHAR(7) | Format: YYYY-MM |
| issue_date | DATE | |
| due_date | DATE | |
| total_amount | NUMERIC(10,2) | Sum of all fee items |
| fine_amount | NUMERIC(10,2) | Late fee applied |
| discount_amount | NUMERIC(10,2) | Concession applied |
| paid_amount | NUMERIC(10,2) | Total received |
| status | VARCHAR(20) | `unpaid`, `paid`, `partial`, `overdue`, `cancelled`, `waived` |
| remarks | TEXT | |
| created_by | INTEGER | FK → users |
| created_at | TIMESTAMPTZ | |

> **Note:** `net_amount` is not stored — it is computed on SELECT as `total_amount + fine_amount - discount_amount`.

### `fee_invoice_items`
Line items on each invoice.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| invoice_id | INTEGER | FK → fee_invoices |
| fee_head_id | INTEGER | FK → fee_heads |
| description | VARCHAR(200) | |
| amount | NUMERIC(10,2) | |

### `fee_payments`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| invoice_id | INTEGER | FK → fee_invoices |
| student_id | INTEGER | FK → students |
| amount | NUMERIC(10,2) | Amount received |
| payment_date | DATE | |
| payment_method | VARCHAR(30) | `cash`, `bank_transfer`, `cheque`, `online` |
| transaction_ref | VARCHAR(100) | Bank ref / cheque number |
| receipt_no | VARCHAR(50) | Auto-generated unique receipt |
| remarks | TEXT | |
| received_by | INTEGER | FK → users |
| voided_at | TIMESTAMPTZ | NULL = valid |
| created_at | TIMESTAMPTZ | |

### `fee_concessions`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| student_id | INTEGER | FK → students |
| fee_head_id | INTEGER | FK → fee_heads |
| discount_type | VARCHAR(20) | `fixed` or `percentage` |
| discount_value | NUMERIC(10,2) | Amount or % |
| reason | TEXT | |
| valid_from | DATE | |
| valid_to | DATE | Nullable = indefinite |
| created_by | INTEGER | FK → users |

---

## Transport Tables

### `buses`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| bus_number | VARCHAR(50) | Unique |
| capacity | INTEGER | |
| make | VARCHAR(50) | e.g., "Toyota" |
| model | VARCHAR(50) | e.g., "Coaster" |
| year | INTEGER | |
| status | VARCHAR(20) | `active`, `inactive`, `maintenance` |

### `drivers`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| full_name | VARCHAR(200) | |
| phone | VARCHAR(20) | |
| cnic | VARCHAR(20) | |
| license_no | VARCHAR(50) | |
| license_expiry | DATE | |
| status | VARCHAR(20) | `active`, `inactive` |

### `transport_routes`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| name | VARCHAR(100) | e.g., "Route A – Johar Town" |
| stops | JSONB | Array of stop names |
| morning_departure | TIME | |
| evening_departure | TIME | |
| bus_id | INTEGER | FK → buses (nullable) |
| driver_id | INTEGER | FK → drivers (nullable) |

### `bus_route_assignments`
Students assigned to a route.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| student_id | INTEGER | FK → students |
| route_id | INTEGER | FK → transport_routes |
| pickup_stop | VARCHAR(100) | |
| is_active | BOOLEAN | |

### `vehicle_tracking`
GPS pings from driver apps.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| bus_id | INTEGER | FK → buses |
| lat | NUMERIC(10,7) | Latitude |
| lng | NUMERIC(10,7) | Longitude |
| speed | NUMERIC(5,1) | km/h |
| heading | NUMERIC(5,1) | Degrees |
| timestamp | TIMESTAMPTZ | |

---

## Exam Tables

### `exams`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| name | VARCHAR(200) | e.g., "First Term Exam 2024" |
| class_id | INTEGER | FK → classes |
| academic_year | VARCHAR(20) | |
| start_date | DATE | |
| end_date | DATE | |
| status | VARCHAR(20) | `upcoming`, `ongoing`, `completed` |

### `exam_subjects`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| exam_id | INTEGER | FK → exams |
| subject_id | INTEGER | FK → subjects |
| date | DATE | Exam date for this subject |
| start_time | TIME | |
| max_marks | INTEGER | |
| passing_marks | INTEGER | |

### `student_marks`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| student_id | INTEGER | FK → students |
| exam_subject_id | INTEGER | FK → exam_subjects |
| marks_obtained | NUMERIC(6,2) | |
| grade | VARCHAR(5) | Computed from grades config |
| remarks | TEXT | |
| entered_by | INTEGER | FK → users |

---

## Communication Tables

### `announcements`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| title | VARCHAR(300) | |
| body | TEXT | |
| target_role | VARCHAR(20) | `all`, `student`, `teacher`, `parent` |
| class_id | INTEGER | FK → classes (nullable = all) |
| is_pinned | BOOLEAN | |
| created_by | INTEGER | FK → users |
| created_at | TIMESTAMPTZ | |

### `notifications`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| user_id | INTEGER | FK → users |
| title | VARCHAR(200) | |
| body | TEXT | |
| type | VARCHAR(50) | `fee`, `attendance`, `announcement`, `homework` |
| is_read | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### `chatbot_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| user_id | INTEGER | FK → users |
| query | TEXT | User's message |
| intent | VARCHAR(50) | Detected intent |
| response | TEXT | Bot's reply |
| created_at | TIMESTAMPTZ | |

---

## Audit Table

### `audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| user_id | INTEGER | FK → users |
| action | VARCHAR(50) | `CREATE`, `UPDATE`, `DELETE` |
| entity_type | VARCHAR(50) | `student`, `fee`, `teacher`, etc. |
| entity_id | INTEGER | ID of affected record |
| old_values | JSONB | State before change |
| new_values | JSONB | State after change |
| ip_address | VARCHAR | |
| request_id | VARCHAR | X-Request-ID header value |
| created_at | TIMESTAMPTZ | |

---

## Key Relationships Diagram

```
students ──────────── classes ──────── teachers
    │                    │                │
    │              teacher_classes        │
    │                    │         teacher_subject_assignments
    │                    │                │
    ├── attendance        └── subjects ───┘
    ├── fee_invoices ──── fee_invoice_items ── fee_heads
    │       └── fee_payments               └── fee_structures
    ├── student_marks ── exam_subjects ── exams
    ├── homework_submissions ── homework
    └── bus_route_assignments ── transport_routes ── buses
                                                       └── vehicle_tracking
```

---

## Important Design Decisions

1. **Soft deletes**: Students and teachers use `deleted_at IS NULL` pattern — records are never physically deleted, preserving historical data.

2. **`net_amount` is computed, not stored**: Fee invoices don't have a `net_amount` column. It's always calculated as `total_amount + fine_amount - discount_amount` in SELECT queries.

3. **Monthly invoice uniqueness**: There is a unique constraint on `(student_id, month)` in `fee_invoices` to prevent duplicate monthly invoices.

4. **JSONB for flexible data**: Bus route stops and settings are stored as JSONB for flexibility without schema changes.

5. **Numeric precision**: All money values use `NUMERIC(10,2)` — never FLOAT — to avoid floating-point rounding errors.
