# Student Lifecycle System

## Overview

The Student Lifecycle module maintains a chronological event history for every student — from admission to graduation. This provides a complete audit trail of significant events in a student's school journey.

---

## What Is a Lifecycle Event?

A lifecycle event is any meaningful milestone or change in a student's school status. Examples:

| Event Type | Trigger | Description |
|------------|---------|-------------|
| `admission` | Student created | Student enrolled in the school |
| `class_change` | Student promoted/transferred | Moved to a new class |
| `status_change` | Student status updated | e.g., Active → Suspended |
| `fee_paid` | Payment recorded | Fee invoice paid |
| `exam_result` | Marks entered | Exam result recorded |
| `attendance_alert` | Attendance drops below threshold | Low attendance warning |
| `discipline` | Discipline record added | Behavioural incident logged |
| `document_upload` | Document uploaded | Certificate, form, etc. |
| `note` | Manual note added | Free-form note by teacher/admin |
| `transfer` | Student transferred | Left school or transferred to branch |
| `graduation` | Academic year rollover | Completed final grade |
| `re_admission` | Soft-deleted student restored | Returned after leaving |

---

## How Events Are Logged

Lifecycle events are logged **fire-and-forget** from controllers — they never block the main operation.

```js
// In studentController.js — after creating a student:
await createStudent(data);
logLifecycleEvent({
  student_id: newStudent.id,
  event_type: 'admission',
  description: `Admitted to ${className}`,
  actor_id: req.user.id,
}).catch(() => {}); // fire-and-forget — never crashes the main flow
```

The `logLifecycleEvent` function in `lifecycleController.js`:
```js
async function logLifecycleEvent({ student_id, event_type, description, actor_id, metadata }) {
  await db.query(
    `INSERT INTO student_lifecycle_events
     (student_id, event_type, description, actor_id, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [student_id, event_type, description, actor_id, JSON.stringify(metadata || {})]
  );
}
```

---

## Database Schema

### `student_lifecycle_events`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | PK |
| student_id | INTEGER | FK → students |
| event_type | VARCHAR(50) | e.g., `admission`, `fee_paid` |
| description | TEXT | Human-readable summary |
| actor_id | INTEGER | FK → users (who triggered the event) |
| metadata | JSONB | Extra data (old/new class, amount, etc.) |
| created_at | TIMESTAMPTZ | When the event occurred |

---

## API Endpoints

### Get Student Timeline

Returns all lifecycle events for a student in chronological order.

```http
GET /api/lifecycle/:studentId
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "event_type": "admission",
      "description": "Admitted to Grade 5 - A",
      "actor_name": "Administrator",
      "created_at": "2024-04-01T09:00:00Z",
      "metadata": {}
    },
    {
      "id": 2,
      "event_type": "fee_paid",
      "description": "Fee payment of PKR 4,500 recorded (July 2024)",
      "actor_name": "Administrator",
      "created_at": "2024-07-15T10:30:00Z",
      "metadata": { "amount": 4500, "receipt_no": "RCP-2024-055" }
    },
    {
      "id": 3,
      "event_type": "note",
      "description": "Parent visited school regarding attendance concerns",
      "actor_name": "Sarah Ahmed",
      "created_at": "2024-07-20T11:00:00Z",
      "metadata": {}
    }
  ]
}
```

### Get Timeline Summary

Returns a count breakdown of event types.

```http
GET /api/lifecycle/:studentId/summary
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "total_events": 15,
    "by_type": {
      "fee_paid": 7,
      "attendance_alert": 2,
      "discipline": 1,
      "note": 3,
      "class_change": 1,
      "admission": 1
    }
  }
}
```

### Add a Manual Note

Admins and teachers can add free-form notes to a student's timeline.

```http
POST /api/lifecycle/:studentId/note
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Parent called regarding upcoming exam preparation. Arranged extra tutoring."
}
```

### Get Recent Events (Admin/Teacher)

Returns recent lifecycle events across all students — useful for the admin dashboard.

```http
GET /api/lifecycle/recent
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "student_id": 5,
      "student_name": "Hamza Raza",
      "class_name": "Grade 5 - A",
      "event_type": "attendance_alert",
      "description": "Attendance dropped below 75% threshold",
      "created_at": "2024-07-20T08:00:00Z"
    }
  ]
}
```

---

## Access Control

| Endpoint | admin | teacher | student | parent |
|----------|:-----:|:-------:|:-------:|:------:|
| GET /lifecycle/:id | ✅ | ✅ | own | own child |
| GET /lifecycle/:id/summary | ✅ | ✅ | own | own child |
| POST /lifecycle/:id/note | ✅ | ✅ | ❌ | ❌ |
| GET /lifecycle/recent | ✅ | ✅ | ❌ | ❌ |

---

## Frontend: Student Lifecycle Page

The **Student Lifecycle** page shows a visual timeline:

```
Apr 2024    ● Admitted to Grade 5 - A
               by Administrator

Jul 2024    ● Fee payment of PKR 4,500 (July 2024)
               by Administrator

Jul 2024    ⚠ Attendance dropped below 75%
               System generated

Jul 2024    📝 Parent visited regarding attendance
               by Sarah Ahmed (Teacher)

[+ Add Note]
```

Each event card shows:
- Event type icon and colour
- Description
- Actor name (who caused it)
- Timestamp

---

## At-Risk Integration

The lifecycle system integrates with the **At-Risk** module. When a student's risk score crosses a threshold, an `attendance_alert` or `risk_flag` lifecycle event is automatically created:

```js
// In riskController.js
if (newRiskScore > RISK_THRESHOLD) {
  logLifecycleEvent({
    student_id,
    event_type: 'risk_flag',
    description: `Risk score reached ${newRiskScore} — flagged for review`,
    actor_id: SYSTEM_USER_ID,
    metadata: { risk_score: newRiskScore, factors: riskFactors },
  }).catch(() => {});
}
```

Admins and teachers can see the risk flag on the lifecycle timeline, making it easy to understand the full context when discussing a student's situation.
