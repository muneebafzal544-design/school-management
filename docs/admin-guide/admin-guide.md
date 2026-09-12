# Administrator Guide

## Overview

As an **Admin**, you have full access to every module in the system. This guide covers the core administrative workflows you will perform regularly.

---

## 1. Students

### Enrolling a New Student

1. Go to **Students** → **Add Student**
2. Fill in all required fields:

| Field | Required | Notes |
|-------|----------|-------|
| Full Name | ✅ | As on B-Form/Birth Certificate |
| Class | ✅ | Select existing class |
| Gender | ✅ | Male / Female |
| Date of Birth | ✅ | Format: DD/MM/YYYY |
| Father Name | ✅ | |
| Father Phone | ✅ | Pakistani format: +923XXXXXXXXX |
| Father CNIC | ❌ | 13-digit with dashes |
| Address | ❌ | |

3. Click **Save**

The system automatically:
- Assigns an **Admission Number** (ADM-YEAR-NNN)
- Creates **login credentials** for the student
- Logs an admissions **lifecycle event**

### Bulk Importing Students

For admissions at the start of a year:

1. Go to **Students** → **Import**
2. Click **Download Template** to get the correct CSV format
3. Fill in the CSV (do not change column headers)
4. Upload the file — the system shows a preview with any error rows
5. Click **Confirm Import**

### Promoting Students

At the end of the academic year:

1. Go to **Students** → **Promote**
2. Select source class and destination class
3. Preview which students will be promoted
4. Click **Promote** — students move to the new class with their records intact

### Resetting Student Credentials

If a student forgets their login:

1. Go to **Students** → find the student
2. Click **Reset Credentials**
3. Give the new username and temporary password to the student
4. They will be prompted to change the password on first login

---

## 2. Teachers

### Adding a Teacher

1. Go to **Teachers** → **Add Teacher**
2. Fill in name, phone, email, CNIC, designation, and join date
3. Click **Save**

The system creates:
- A teacher account with login credentials
- An empty class and subject assignment (configured separately)

### Assigning Classes to a Teacher

1. Go to **Teachers** → click the teacher's name
2. Click **Assign Classes**
3. Select one or more classes
4. Click **Save**

### Assigning Subjects

1. On the teacher profile, click **Assign Subjects**
2. Select the class first, then the subject
3. Click **Add** — the teacher can now enter marks and homework for this class/subject combo

---

## 3. Fees

### Setting Up Fee Structures

Before generating invoices, define what students pay:

1. Go to **Fees** → **Fee Heads** → **Add Head**
   - Examples: "Tuition Fee", "Library Fee", "Transport Fee"

2. Go to **Fees** → **Fee Structures** → **Add Structure**
   - Link a fee head, class, and monthly amount
   - This is what gets invoiced each month

### Generating Monthly Invoices

1. Go to **Fees** → **Invoices** → **Generate Monthly**
2. Select the **month** and **due date**
3. Click **Generate** — invoices are created for all active students based on their class fee structure
4. The system skips students who already have an invoice for that month

> Run this at the start of every month, ideally on the 1st.

### Recording a Payment

1. Go to **Fees** → **Payments** → **Record Payment**
2. Search for the student by name or admission number
3. Select the invoice
4. Enter the amount, payment method, and transaction reference
5. Click **Save** — a receipt number is generated automatically

### Printing a Receipt

1. Go to **Fees** → **Payments**
2. Find the payment and click **Print Receipt**
3. A printer-ready PDF opens

### Applying Late Fees

1. Go to **Fees** → **Invoices** → **Apply Late Fees**
2. The system adds fine amounts to all overdue invoices based on the configured fine rate
3. Review and confirm

### Fee Concessions

1. Go to **Fees** → **Concessions** → **Add Concession**
2. Select the student, fee head, and discount amount or percentage
3. The discount is applied automatically to future invoices for that student

### Sending Fee Reminders

1. Go to **Fees** → **Send Reminders**
2. Choose the month and channel (email, SMS)
3. Click **Send** — reminders go to all parents with outstanding fees

---

## 4. Transport

### Adding a Bus

1. Go to **Transport** → **Buses** → **Add Bus**
2. Enter bus number, capacity, make, model, and year
3. Click **Save**

### Adding a Driver

1. Go to **Transport** → **Drivers** → **Add Driver**
2. Enter name, phone, CNIC, license number, and license expiry
3. Click **Save**

### Creating a Route

1. Go to **Transport** → **Routes** → **Create Route**
2. Enter route name, stops (comma-separated), morning time, and evening time
3. Assign a bus and driver to this route
4. Click **Save**

### Assigning a Student to a Route

1. Go to **Students** → find the student
2. Click **Transport** tab
3. Select the route and pickup stop
4. Click **Assign**

Parents can now see their child's bus on the live tracking map.

---

## 5. Classes & Subjects

### Creating a Class

1. Go to **Classes** → **Add Class**
2. Enter grade, section, capacity, and optionally a class teacher
3. Click **Save**

### Creating a Subject

1. Go to **Subjects** → **Add Subject**
2. Enter subject name and code (e.g., MATH-5)
3. Link it to a class

---

## 6. Announcements

### Creating an Announcement

1. Go to **Announcements** → **New**
2. Set title, body, target audience, and optionally a specific class
3. Toggle **Pin** to keep it at the top
4. Click **Publish**

All targeted users receive an in-app notification and push notification.

---

## 7. Reports

### Attendance Report

1. Go to **Attendance** → **Monthly Summary**
2. Select class and month
3. View or export per-student attendance data

### Fee Collection Report

1. Go to **Fees** → **Reports** → **Monthly Summary**
2. View total collected, outstanding, and per-class breakdown

### Outstanding Balances

1. Go to **Fees** → **Reports** → **Outstanding**
2. Lists all students with unpaid invoices sorted by amount

### Exam Results

1. Go to **Exams** → **Results**
2. Filter by exam and class
3. Export to Excel for record-keeping

### Daily Financial Report

1. Go to **Fees** → **Reports** → **Daily Report**
2. Select a date range
3. View all payments received in that period

---

## 8. Roles & Permissions (RBAC)

### Default Roles

| Role | Access Level |
|------|-------------|
| admin | Full system access |
| teacher | Attendance, marks, homework, read-only fees |
| student | Own data only |
| parent | Child's data only |

### Creating Custom Roles

1. Go to **Settings** → **Roles**
2. Click **New Role**
3. Set permissions for each module (read / write / none)
4. Assign the role to a user

---

## 9. Academic Year Rollover

At the end of the academic year:

1. Go to **Rollover Wizard**
2. Review promoted/graduated student counts
3. Archive current year data
4. Reset attendance and fee records for the new year
5. Click **Proceed** — the system transitions all classes to the next academic year

> **Always take a database backup before running rollover.**

---

## 10. Audit Logs

Every action in the system is logged:

1. Go to **Audit Logs**
2. Filter by user, action type, or date range
3. Each entry shows who did what and when, with old/new values for changes

---

## 11. System Settings

### School Profile

1. Go to **Settings** → **School Profile**
2. Update school name, address, logo, and contact details

### Grading System

1. Go to **Settings** → **Grades**
2. Define grade thresholds (e.g., A+ = 90–100, A = 80–89)

### Fee Configuration

1. Go to **Settings** → **Fees**
2. Set the late fee rate and grace period

### WhatsApp Integration

1. Go to **Settings** → **WhatsApp**
2. Enter your WhatsApp Business API credentials
3. Configure message templates for fee reminders and announcements

---

## 12. Backup & Restore

### Creating a Backup

1. Go to **Settings** → **Backup**
2. Click **Create Backup** — a compressed SQL dump is generated
3. Click **Download** to save the backup file

### Restoring from Backup

> ⚠️ Restoring overwrites all current data. Only do this in emergencies.

1. Go to **Settings** → **Backup** → **Restore**
2. Upload the backup file
3. Type CONFIRM to proceed

---

## Security Best Practices

- Change the default `admin` password immediately after first login
- Enable **two-factor authentication** if available
- Review **Audit Logs** weekly for unusual activity
- Revoke sessions for users who leave the school
- Back up the database at least weekly
- Do not share admin credentials with anyone
