# Chatbot System

## Overview

The School Assistant is a role-aware natural language interface built into the portal. It answers questions about attendance, fees, timetable, transport, homework, and announcements using live database data.

The chatbot is accessible via the 🤖 floating button on every page.

---

## Architecture

```
User types a question
        │
        ▼
POST /api/chatbot/query
        │
        ▼
chatbotService.js
  ├── detectIntent(query)       — keyword/regex matching
  ├── resolveContext(user)      — determines what data to query based on role
  └── executeQuery(intent, ctx) — runs the appropriate DB query
        │
        ▼
Natural language response string
        │
        ▼
Logged to chatbot_logs table (fire-and-forget)
        │
        ▼
Response returned to client
```

---

## Intent Detection

The chatbot uses **keyword matching** to detect what the user wants:

| Intent | Trigger Keywords |
|--------|-----------------|
| `attendance` | attend, present, absent, late, mark |
| `fees` | fee, payment, pay, invoice, due, pending, balance, owe |
| `timetable` | timetable, schedule, class, period, when |
| `transport` | bus, transport, route, driver, arrive, location, tracking |
| `homework` | homework, assignment, due, submit, pending |
| `announcements` | notice, announce, news, update, event, holiday |
| `general` | anything else |

The first matching intent wins. If no intent is detected, a helpful fallback message is shown.

---

## Role-Aware Context

The chatbot automatically scopes queries based on who is asking:

| Role | What they see |
|------|--------------|
| student | Their own data only (own attendance, own fees, own homework) |
| parent | Their child's data |
| teacher | Their classes' data (e.g., absent students in their classes) |
| admin | School-wide data (all defaulters, all absent students) |

---

## Supported Queries

### Attendance

**Student asks:**
> "What is my attendance this month?"

Response:
> "Your attendance for July 2024: 20 present, 2 absent, 1 late — **87.0%** overall."

**Admin/Teacher asks:**
> "Which students are absent today?"

Response:
> "5 students are absent today in your classes: Ali Hassan (5-A), Sara Malik (5-A), ..."

---

### Fees

**Student/Parent asks:**
> "Do I have any pending fees?"

Response (with pending fees):
> "You have 1 unpaid invoice of **PKR 4,500** (July 2024), due on **31 July 2024**."

Response (no pending fees):
> "Great news! You have no outstanding fees."

**Admin asks:**
> "Show fee defaulters"

Response:
> "There are **12 students** with outstanding fees totalling **PKR 125,000**:
> - Hamza Raza (Grade 5) — PKR 9,500
> - Zara Ahmed (Grade 3) — PKR 7,200
> ..."

---

### Timetable

**Student/Teacher asks:**
> "What class do I have now?"

Response:
> "Your next period is **Mathematics** at 10:00–10:45 AM in room 204."

---

### Transport

**Student/Parent asks:**
> "Where is my bus?"

Response:
> "Your bus **SKL-001** (Route A – Johar Town) is currently **on route**, last seen near **DHA Phase 3** at 8:15 AM. Estimated arrival in ~10 minutes."

**If bus has no GPS data:**
> "Bus SKL-001 location is not available right now. Please contact the school transport office at +923001234567."

---

### Homework

**Student asks:**
> "What homework do I have due?"

Response:
> "You have 2 pending assignments:
> 1. **Mathematics** — Chapter 5 Exercises (Due: 16 July)
> 2. **Science** — Lab report on photosynthesis (Due: 18 July)"

---

### Announcements

**Any role asks:**
> "Latest notices"

Response:
> "📢 **Parent-Teacher Meeting** — PTM scheduled for 20 July from 9 AM to 1 PM. (3 days ago)
> 📢 **School Holiday** — School closed on 14 August for Independence Day."

---

## API

### Endpoint

```http
POST /api/chatbot/query
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body

```json
{
  "query": "Do I have any pending fees?"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "intent": "fees",
    "response": "You have 1 unpaid invoice of PKR 4,500 (July 2024), due on 31 July 2024."
  }
}
```

### Rate Limit

60 requests per minute per authenticated user.

---

## Quick Action Chips

The chatbot UI shows pre-built query chips based on the user's role to help them get started without typing:

**Student chips:**
- 📊 Attendance
- 💰 Fees
- 📚 Timetable
- 🚌 Bus Status
- 📝 Homework
- 📋 Exams
- 📢 Notices

**Parent chips:**
- 📊 Attendance
- 💰 Fees
- 🚌 Bus Status
- 📝 Homework
- 📋 Exams
- 📢 Notices

**Teacher chips:**
- 📋 Absent Today
- 📚 Timetable
- 📝 Homework
- 📢 Notices

**Admin chips:**
- 📋 Absent Today
- 💸 Defaulters
- 📊 Attendance
- 💰 Fees
- 📢 Notices

---

## Logging

Every chatbot interaction is logged to the `chatbot_logs` table:

```sql
INSERT INTO chatbot_logs (user_id, query, intent, response, created_at)
VALUES ($1, $2, $3, $4, NOW())
```

Logging is **fire-and-forget** — it never blocks the response. Logs are useful for:
- Understanding what users actually ask
- Improving intent detection
- Identifying gaps in the chatbot's coverage

Admins can view chatbot logs in **Settings → Chatbot Logs**.

---

## Extending the Chatbot

To add a new intent:

1. **Add keywords** to `detectIntent()` in `chatbotService.js`:
```js
if (/library|book|issue|return/i.test(query)) return 'library';
```

2. **Add a query function**:
```js
async function queryLibrary(userId, role) {
  if (role === 'student') {
    const { rows } = await db.query(
      `SELECT b.title, li.due_date FROM library_issues li
       JOIN library_books b ON b.id = li.book_id
       WHERE li.student_id = (SELECT entity_id FROM users WHERE id = $1)
       AND li.returned_at IS NULL`,
      [userId]
    );
    if (!rows.length) return "You have no books currently issued.";
    return `You have ${rows.length} book(s) issued:\n` +
      rows.map(r => `• ${r.title} (due ${formatDate(r.due_date)})`).join('\n');
  }
}
```

3. **Register the intent** in the main switch statement in `handleChatQuery()`.
