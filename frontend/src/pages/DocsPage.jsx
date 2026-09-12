import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, Code2, Users, ShieldCheck, Bus, MessageSquare,
  ChevronRight, ChevronDown, Search, ExternalLink, Menu, X,
  GraduationCap, UserCog, Layers, Database, Terminal, Lock,
  Activity, FileText,
} from 'lucide-react';

// ── Docs content ──────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: BookOpen,
    color: '#6366f1',
    pages: [
      {
        id: 'overview',
        label: 'System Overview',
        content: () => (
          <Article title="System Overview">
            <P>The School Management System is a full-stack web application built for Pakistani schools. It covers the complete school lifecycle — admissions, attendance, fees, exams, transport, and communication.</P>
            <H2>Technology Stack</H2>
            <Table
              headers={['Layer', 'Technology']}
              rows={[
                ['Frontend', 'React 19 + Vite + Tailwind CSS v4'],
                ['Backend', 'Node.js + Express 4'],
                ['Database', 'PostgreSQL 14+'],
                ['Real-time', 'Socket.IO v4'],
                ['File Storage', 'Cloudinary'],
                ['Caching', 'Redis (optional)'],
                ['Mobile', 'Expo + React Native'],
              ]}
            />
            <H2>Key Modules</H2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
              {['Student Management', 'Teacher Management', 'Attendance', 'Fee Management', 'Transport & GPS Tracking', 'Exams & Results', 'Homework', 'Timetable', 'Announcements', 'School Assistant (AI Chatbot)', 'Reports & Analytics', 'Audit Logs'].map(m => <li key={m}>{m}</li>)}
            </ul>
            <H2>User Roles</H2>
            <Table
              headers={['Role', 'Description']}
              rows={[
                ['admin', 'Full system access — manages everything'],
                ['teacher', 'Marks attendance, enters marks, assigns homework'],
                ['student', 'Views own data — grades, fees, timetable'],
                ['parent', 'Views child data — attendance, fees, bus tracking'],
              ]}
            />
          </Article>
        ),
      },
      {
        id: 'quickstart',
        label: 'Quick Start',
        content: () => (
          <Article title="Quick Start">
            <H2>1. Login</H2>
            <P>Navigate to the school portal and log in with your credentials. Demo accounts are shown on the login page in development mode.</P>
            <CodeBlock language="text">{`Admin:   admin    / admin123
Teacher: teacher  / teacher123
Student: student  / student123
Parent:  parent   / parent123`}</CodeBlock>
            <H2>2. Your Dashboard</H2>
            <P>After login, you land on your role-specific dashboard showing the most relevant information for you.</P>
            <H2>3. Navigation</H2>
            <P>Use the sidebar on the left to navigate between modules. On mobile, tap the menu icon at the top-left.</P>
            <H2>4. School Assistant</H2>
            <P>Tap the 🤖 button at the bottom-right on any page to open the School Assistant chatbot. Ask it anything about your attendance, fees, timetable, or the school bus.</P>
          </Article>
        ),
      },
    ],
  },
  {
    id: 'user-guides',
    label: 'User Guides',
    icon: Users,
    color: '#0ea5e9',
    pages: [
      {
        id: 'student-guide',
        label: 'Student Guide',
        icon: GraduationCap,
        content: () => (
          <Article title="Student Guide">
            <H2>Dashboard</H2>
            <P>Your dashboard shows attendance summary, fee status, today's timetable, upcoming exams, and pending homework at a glance.</P>
            <H2>Attendance</H2>
            <P>Go to <Kbd>Attendance</Kbd> to see your monthly attendance calendar. Green = Present, Red = Absent, Yellow = Late.</P>
            <H2>Fees</H2>
            <P>Go to <Kbd>Fees</Kbd> to view all invoices. Click any Paid invoice to download a receipt PDF.</P>
            <H2>Timetable</H2>
            <P>Your weekly timetable is under <Kbd>Timetable</Kbd>. Use the Print button for a physical copy.</P>
            <H2>Homework</H2>
            <P>View and submit homework under <Kbd>Homework</Kbd>. Attach a file or type your answer and click Submit.</P>
            <H2>Exams & Results</H2>
            <P>Check exam schedules and view your marks under <Kbd>Exams</Kbd>. Download report cards as PDF.</P>
            <H2>Chatbot Quick Actions</H2>
            <Table
              headers={['Question', 'Example']}
              rows={[
                ['Attendance', '"What is my attendance this month?"'],
                ['Fees', '"Do I have pending fees?"'],
                ['Timetable', '"What class is at 10am?"'],
                ['Homework', '"What homework is due tomorrow?"'],
                ['Exams', '"When is my next exam?"'],
              ]}
            />
          </Article>
        ),
      },
      {
        id: 'teacher-guide',
        label: 'Teacher Guide',
        icon: UserCog,
        content: () => (
          <Article title="Teacher Guide">
            <H2>Marking Attendance</H2>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300 mb-4">
              <li>Go to <Kbd>Attendance</Kbd> → Mark Attendance</li>
              <li>Select your class and verify the date</li>
              <li>Mark each student: P (Present), A (Absent), L (Late), E (Excused)</li>
              <li>Click Submit</li>
            </ol>
            <P>Use <Kbd>Quick Attendance</Kbd> from the dashboard for a faster interface on mobile.</P>
            <H2>Assigning Homework</H2>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300 mb-4">
              <li>Go to <Kbd>Homework</Kbd> → New Assignment</li>
              <li>Select class, subject, title, and due date</li>
              <li>Optionally attach a file</li>
              <li>Click Assign — students see it immediately</li>
            </ol>
            <H2>Entering Exam Marks</H2>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300 mb-4">
              <li>Go to <Kbd>Exams</Kbd> → Enter Marks</li>
              <li>Select the exam and subject</li>
              <li>Enter marks for each student</li>
              <li>Click Save Marks</li>
            </ol>
            <H2>Announcements</H2>
            <P>Create class or school-wide announcements under <Kbd>Announcements</Kbd> → New. Students and parents receive push notifications immediately.</P>
          </Article>
        ),
      },
      {
        id: 'parent-guide',
        label: 'Parent Guide',
        icon: Users,
        content: () => (
          <Article title="Parent Guide">
            <H2>Dashboard</H2>
            <P>Your dashboard shows your child's attendance, fee status, upcoming exams, and bus location. If you have multiple children, use the child selector at the top.</P>
            <H2>Attendance</H2>
            <P>View your child's monthly attendance calendar under <Kbd>Attendance</Kbd>. Contact the teacher if you see unexpected absences.</P>
            <H2>Fees</H2>
            <P>Check outstanding invoices under <Kbd>Fees</Kbd>. Download receipts for paid invoices. Take the challan to the bank for payment.</P>
            <H2>Live Bus Tracking</H2>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300 mb-4">
              <li>Go to <Kbd>Transport</Kbd></li>
              <li>See your child's bus number, route, and driver</li>
              <li>Click <Kbd>Live Track</Kbd> to open the real-time map</li>
              <li>Map updates every ~10 seconds</li>
            </ol>
            <H2>Messaging Teachers</H2>
            <P>Send private messages to teachers under <Kbd>Messages</Kbd>. You can also request a parent-teacher meeting under <Kbd>Meetings</Kbd>.</P>
          </Article>
        ),
      },
    ],
  },
  {
    id: 'admin-guide',
    label: 'Admin Guide',
    icon: ShieldCheck,
    color: '#f59e0b',
    pages: [
      {
        id: 'students-admin',
        label: 'Managing Students',
        content: () => (
          <Article title="Managing Students">
            <H2>Enrolling a Student</H2>
            <P>Go to <Kbd>Students</Kbd> → Add Student. Required fields: Full Name, Class, Gender, Date of Birth, Father Name, Father Phone.</P>
            <P>The system automatically assigns an Admission Number and creates login credentials.</P>
            <H2>Bulk Import</H2>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300 mb-4">
              <li>Go to <Kbd>Students</Kbd> → Import</li>
              <li>Download the CSV template</li>
              <li>Fill in student data (do not change headers)</li>
              <li>Upload and confirm</li>
            </ol>
            <H2>Promoting Students</H2>
            <P>At year-end, go to <Kbd>Students</Kbd> → Promote to move students to the next class in bulk.</P>
            <H2>Resetting Credentials</H2>
            <P>Find the student → click Reset Credentials. Give the new credentials to the student. They will be asked to change their password on first login.</P>
          </Article>
        ),
      },
      {
        id: 'fees-admin',
        label: 'Fee Management',
        content: () => (
          <Article title="Fee Management">
            <H2>Setup Order</H2>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300 mb-4">
              <li>Create <strong>Fee Heads</strong> (Tuition, Library, Transport, etc.)</li>
              <li>Create <strong>Fee Structures</strong> — link heads to classes with monthly amounts</li>
              <li>Each month: run <strong>Generate Monthly Fees</strong></li>
              <li>Record payments as they come in</li>
            </ol>
            <H2>Monthly Fee Generation</H2>
            <P>Go to <Kbd>Fees</Kbd> → Invoices → Generate Monthly. Select month and due date. The system creates invoices for all active students, skipping those who already have one for that month.</P>
            <H2>Recording a Payment</H2>
            <P>Go to <Kbd>Fees</Kbd> → Payments → Record. Search for the student, select the invoice, enter the amount and payment method. A receipt number is generated automatically.</P>
            <H2>Invoice Statuses</H2>
            <Table
              headers={['Status', 'Meaning']}
              rows={[
                ['unpaid', 'Invoice generated, no payment'],
                ['partial', 'Some amount paid, balance remaining'],
                ['paid', 'Fully cleared'],
                ['overdue', 'Due date passed, not fully paid'],
                ['cancelled', 'Admin cancelled the invoice'],
                ['waived', 'Fee waived (concession)'],
              ]}
            />
          </Article>
        ),
      },
      {
        id: 'transport-admin',
        label: 'Transport Setup',
        content: () => (
          <Article title="Transport Setup">
            <H2>Setup Steps</H2>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300 mb-4">
              <li>Add buses under <Kbd>Transport</Kbd> → Buses</li>
              <li>Add drivers under <Kbd>Transport</Kbd> → Drivers</li>
              <li>Create routes with stops under <Kbd>Transport</Kbd> → Routes</li>
              <li>Assign a bus and driver to each route</li>
              <li>Go to each student's profile → Transport tab → assign route and pickup stop</li>
            </ol>
            <P>Once assigned, parents see the live bus location on their dashboard and in the Transport section.</P>
          </Article>
        ),
      },
    ],
  },
  {
    id: 'api',
    label: 'API Reference',
    icon: Code2,
    color: '#10b981',
    pages: [
      {
        id: 'api-overview',
        label: 'Overview',
        content: () => (
          <Article title="API Reference">
            <P>The interactive Swagger API documentation is available at:</P>
            <CodeBlock language="text">http://localhost:5000/api/docs</CodeBlock>
            <P>The raw OpenAPI spec (JSON) is at:</P>
            <CodeBlock language="text">http://localhost:5000/api/docs/spec.json</CodeBlock>
            <H2>Base URLs</H2>
            <Table
              headers={['Environment', 'URL']}
              rows={[
                ['Development', 'http://localhost:5000'],
                ['Production', 'https://studentmanagement-backend.vercel.app'],
              ]}
            />
            <H2>Authentication</H2>
            <P>All protected endpoints require a Bearer JWT token:</P>
            <CodeBlock language="http">{`Authorization: Bearer <access_token>`}</CodeBlock>
            <P>Get a token via POST /api/auth/login. Access tokens expire in 15 minutes; use POST /api/auth/refresh to renew.</P>
            <H2>Response Envelope</H2>
            <CodeBlock language="json">{`// Success
{ "success": true, "data": { ... } }

// List with pagination
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 150 } }

// Error
{ "success": false, "message": "Descriptive error" }`}</CodeBlock>
            <H2>Rate Limits</H2>
            <Table
              headers={['Endpoint', 'Limit']}
              rows={[
                ['POST /auth/login', '20 req / 15 minutes per IP'],
                ['All authenticated routes', '300 req / minute per user'],
                ['Dashboard & analytics', '20 req / minute per user'],
                ['CSV / Excel exports', '3 req / hour per user'],
              ]}
            />
          </Article>
        ),
      },
      {
        id: 'api-auth',
        label: 'Auth Endpoints',
        content: () => (
          <Article title="Auth Endpoints">
            <EndpointCard method="POST" path="/api/auth/login" description="Login and get JWT tokens">
              <CodeBlock language="json">{`// Request
{
  "username": "admin",
  "password": "admin123"
}

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": { "id": 1, "username": "admin", "role": "admin" }
  }
}`}</CodeBlock>
            </EndpointCard>
            <EndpointCard method="POST" path="/api/auth/refresh" description="Exchange refresh token for new access token">
              <CodeBlock language="json">{`// Request
{ "refreshToken": "eyJhbGci..." }

// Response 200
{ "success": true, "data": { "accessToken": "eyJhbGci..." } }`}</CodeBlock>
            </EndpointCard>
            <EndpointCard method="GET" path="/api/auth/me" description="Get current user profile" auth />
            <EndpointCard method="POST" path="/api/auth/logout" description="Invalidate current session" auth />
            <EndpointCard method="PUT" path="/api/auth/change-password" description="Change user password" auth>
              <CodeBlock language="json">{`// Request
{
  "currentPassword": "old_password",
  "newPassword": "NewSecure@123"
}`}</CodeBlock>
            </EndpointCard>
          </Article>
        ),
      },
      {
        id: 'api-students',
        label: 'Student Endpoints',
        content: () => (
          <Article title="Student Endpoints">
            <EndpointCard method="GET" path="/api/students" description="List students (paginated, filterable)" auth roles="admin, teacher">
              <CodeBlock language="text">{`Query params: page, limit, search, class_id, grade, status, gender`}</CodeBlock>
            </EndpointCard>
            <EndpointCard method="POST" path="/api/students" description="Create a new student" auth roles="admin" />
            <EndpointCard method="GET" path="/api/students/:id" description="Get student by ID" auth roles="admin, teacher" />
            <EndpointCard method="PUT" path="/api/students/:id" description="Update student" auth roles="admin" />
            <EndpointCard method="DELETE" path="/api/students/:id" description="Soft-delete student" auth roles="admin" />
            <EndpointCard method="GET" path="/api/students/export" description="Export to CSV/Excel (3/hour)" auth roles="admin, teacher" />
            <EndpointCard method="POST" path="/api/students/import" description="Bulk import from CSV" auth roles="admin" />
            <EndpointCard method="POST" path="/api/students/:id/reset-credentials" description="Reset student login password" auth roles="admin" />
          </Article>
        ),
      },
      {
        id: 'api-fees',
        label: 'Fee Endpoints',
        content: () => (
          <Article title="Fee Endpoints">
            <EndpointCard method="GET" path="/api/fees/dashboard-stats" description="Fee collection KPIs" auth roles="admin, teacher" />
            <EndpointCard method="GET" path="/api/fees/invoices" description="List invoices (filterable by student, class, status, month)" auth />
            <EndpointCard method="POST" path="/api/fees/invoices/generate-monthly" description="Bulk generate monthly invoices" auth roles="admin">
              <CodeBlock language="json">{`{ "month": "2024-08", "due_date": "2024-08-31" }`}</CodeBlock>
            </EndpointCard>
            <EndpointCard method="POST" path="/api/fees/payments" description="Record a fee payment" auth roles="admin">
              <CodeBlock language="json">{`{
  "invoice_id": 100,
  "amount": 4500,
  "payment_date": "2024-07-15",
  "payment_method": "cash"
}`}</CodeBlock>
            </EndpointCard>
            <EndpointCard method="GET" path="/api/fees/reports/outstanding" description="Outstanding balances report" auth roles="admin, teacher" />
            <EndpointCard method="POST" path="/api/fees/send-reminders" description="Send fee reminder emails/SMS" auth roles="admin" />
          </Article>
        ),
      },
    ],
  },
  {
    id: 'developer',
    label: 'Developer Docs',
    icon: Terminal,
    color: '#8b5cf6',
    pages: [
      {
        id: 'dev-setup',
        label: 'Local Setup',
        content: () => (
          <Article title="Local Development Setup">
            <H2>Prerequisites</H2>
            <Table
              headers={['Tool', 'Version']}
              rows={[['Node.js', '18+'], ['PostgreSQL', '14+'], ['npm', '9+'], ['Redis', 'Optional']]}
            />
            <H2>Backend</H2>
            <CodeBlock language="bash">{`cd backend
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

# Create DB and run migrations
psql -U postgres -c "CREATE DATABASE school_db;"
node src/db/migrate.js
node src/db/seed.js     # optional demo data

npm run dev             # starts on :5000`}</CodeBlock>
            <H2>Frontend</H2>
            <CodeBlock language="bash">{`cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000

npm run dev             # starts on :5173`}</CodeBlock>
            <H2>Environment Variables (Backend)</H2>
            <CodeBlock language="env">{`DATABASE_URL=postgresql://postgres:password@localhost:5432/school_db
JWT_SECRET=your_long_random_secret_here
PORT=5000
NODE_ENV=development
REDIS_URL=                    # optional
CLOUDINARY_CLOUD_NAME=        # optional — for photo uploads
EMAIL_HOST=smtp.gmail.com     # optional — for email notifications`}</CodeBlock>
          </Article>
        ),
      },
      {
        id: 'dev-architecture',
        label: 'Architecture',
        content: () => (
          <Article title="System Architecture">
            <H2>Request Lifecycle</H2>
            <CodeBlock language="text">{`Client Request
  → apiLimiter       (rate limit)
  → cors             (origin check)
  → helmet           (security headers)
  → requestId        (X-Request-ID)
  → verifyToken      (JWT → req.user)
  → requirePasswordChanged
  → userLimiter      (per-user throttle)
  → requireRole(...) (RBAC check)
  → auditMiddleware  (async logging)
  → Controller       (DB + business logic)
  → errorHandler     (format errors)`}</CodeBlock>
            <H2>Directory Structure</H2>
            <CodeBlock language="text">{`backend/src/
├── index.js          # Entry: middleware + routes
├── config/swagger.js # OpenAPI spec
├── controllers/      # 67 business logic files
├── routes/           # 67 Express routers
├── middleware/        # JWT, RBAC, audit, upload
├── services/         # chatbot, socket, metrics
├── jobs/             # pg-boss background jobs
├── db/
│   ├── index.js      # Pool + tenant routing
│   ├── migrate.js    # Migration runner
│   └── migrations/   # 86 SQL files`}</CodeBlock>
            <H2>Background Jobs</H2>
            <Table
              headers={['Job', 'Trigger']}
              rows={[
                ['csv-import', 'File upload (student/teacher bulk import)'],
                ['bulk-email', 'Fee reminders (100s of emails)'],
                ['daily-report', 'Cron — midnight'],
                ['late-fee-check', 'Cron — daily'],
              ]}
            />
          </Article>
        ),
      },
      {
        id: 'dev-database',
        label: 'Database Schema',
        icon: Database,
        content: () => (
          <Article title="Database Schema">
            <H2>Key Tables</H2>
            <Table
              headers={['Table', 'Description']}
              rows={[
                ['users', 'Login credentials for all roles'],
                ['students', 'Student records (soft-delete with deleted_at)'],
                ['teachers', 'Teacher records'],
                ['classes', 'Class/section definitions'],
                ['attendance', 'Daily attendance (unique per student per date)'],
                ['fee_invoices', 'Monthly fee invoices per student'],
                ['fee_payments', 'Payments recorded against invoices'],
                ['fee_structures', 'How much each class pays per fee head'],
                ['transport_routes', 'Bus routes with stops (JSONB)'],
                ['vehicle_tracking', 'GPS pings from driver app'],
                ['student_lifecycle_events', 'Full audit trail of student milestones'],
                ['audit_logs', 'Every admin/teacher action logged'],
                ['chatbot_logs', 'All chatbot queries and responses'],
              ]}
            />
            <H2>Important Design Rules</H2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li><strong>Soft deletes:</strong> Students and teachers use <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">deleted_at IS NULL</code> — never physically deleted</li>
              <li><strong>net_amount is computed:</strong> Not a stored column — always calculated as <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">total_amount + fine_amount - discount_amount</code></li>
              <li><strong>Money uses NUMERIC:</strong> All amounts are <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">NUMERIC(10,2)</code> — never FLOAT</li>
              <li><strong>Parameterized queries only:</strong> All SQL uses <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">$1, $2</code> placeholders — no string concatenation</li>
            </ul>
          </Article>
        ),
      },
    ],
  },
  {
    id: 'features',
    label: 'Features',
    icon: Layers,
    color: '#ec4899',
    pages: [
      {
        id: 'feat-chatbot',
        label: 'Chatbot',
        icon: MessageSquare,
        content: () => (
          <Article title="School Assistant (Chatbot)">
            <P>A role-aware AI assistant that answers questions using live database data. Available on every page via the 🤖 button (bottom-right).</P>
            <H2>Supported Intents</H2>
            <Table
              headers={['Intent', 'Example Query', 'Roles']}
              rows={[
                ['attendance', '"What is my attendance?"', 'All'],
                ['fees', '"Do I have pending fees?"', 'All'],
                ['timetable', '"What class is at 10am?"', 'Student, Teacher'],
                ['transport', '"Where is the school bus?"', 'All'],
                ['homework', '"What homework is due?"', 'Student, Teacher'],
                ['announcements', '"Latest notices"', 'All'],
                ['fee_defaulters', '"Show fee defaulters"', 'Admin, Teacher'],
              ]}
            />
            <H2>API</H2>
            <EndpointCard method="POST" path="/api/chatbot/query" description="Send a natural language query" auth>
              <CodeBlock language="json">{`// Request
{ "query": "Do I have any pending fees?" }

// Response
{
  "success": true,
  "data": {
    "intent": "fees",
    "response": "You have 1 unpaid invoice of PKR 4,500 due 31 July 2024."
  }
}`}</CodeBlock>
            </EndpointCard>
          </Article>
        ),
      },
      {
        id: 'feat-transport',
        label: 'Transport & GPS',
        icon: Bus,
        content: () => (
          <Article title="Transport & GPS Tracking">
            <P>Full fleet management with live GPS tracking via Socket.IO.</P>
            <H2>Setup Flow</H2>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300 mb-4">
              <li>Add buses (fleet)</li>
              <li>Add drivers with license details</li>
              <li>Create routes with named stops</li>
              <li>Assign bus + driver to each route</li>
              <li>Assign students to routes with their pickup stop</li>
            </ol>
            <H2>Live Tracking Flow</H2>
            <CodeBlock language="text">{`Driver App → Socket.IO event "bus:location"
  → Server saves to vehicle_tracking table
  → Broadcasts to room "bus:{busId}"
  → Parent app receives update
  → Map marker moves to new position`}</CodeBlock>
            <H2>Key Endpoints</H2>
            <Table
              headers={['Method', 'Path', 'Description']}
              rows={[
                ['GET', '/api/transport/buses', 'List buses with driver + route'],
                ['POST', '/api/transport/routes', 'Create route with stops'],
                ['POST', '/api/transport/assign', 'Assign student to route'],
                ['GET', '/api/tracking/location/:busId', 'Last GPS position'],
              ]}
            />
          </Article>
        ),
      },
      {
        id: 'feat-rbac',
        label: 'Roles & Permissions',
        icon: Lock,
        content: () => (
          <Article title="Roles & Permissions (RBAC)">
            <H2>Built-in Roles</H2>
            <Table
              headers={['Role', 'Access Level']}
              rows={[
                ['admin', 'Full system access'],
                ['teacher', 'Academic ops — attendance, marks, homework'],
                ['student', 'Own data only'],
                ['parent', 'Child data only'],
              ]}
            />
            <H2>How It Works</H2>
            <CodeBlock language="js">{`// Route definition
router.get('/students',
  requireRole('admin', 'teacher'),  // role gate
  getAllStudents                     // controller
);

// Middleware
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}`}</CodeBlock>
            <H2>Data Scoping</H2>
            <P>Beyond role checks, controllers further scope queries. Teachers only see their class students; students only see their own invoices.</P>
          </Article>
        ),
      },
      {
        id: 'feat-lifecycle',
        label: 'Student Lifecycle',
        icon: Activity,
        content: () => (
          <Article title="Student Lifecycle">
            <P>Every significant event in a student's school career is logged to a timeline — from admission to graduation.</P>
            <H2>Event Types</H2>
            <Table
              headers={['Type', 'Trigger']}
              rows={[
                ['admission', 'Student enrolled'],
                ['class_change', 'Promoted or transferred'],
                ['fee_paid', 'Payment recorded'],
                ['attendance_alert', 'Attendance below threshold'],
                ['discipline', 'Discipline record added'],
                ['note', 'Manual note by teacher/admin'],
                ['graduation', 'Year-end rollover'],
              ]}
            />
            <H2>Logging Pattern</H2>
            <CodeBlock language="js">{`// Fire-and-forget — never blocks the main operation
logLifecycleEvent({
  student_id: student.id,
  event_type: 'fee_paid',
  description: \`Payment of PKR \${amount} recorded\`,
  actor_id: req.user.id,
  metadata: { amount, receipt_no },
}).catch(() => {});`}</CodeBlock>
            <H2>API</H2>
            <EndpointCard method="GET" path="/api/lifecycle/:studentId" description="Full chronological timeline" auth />
            <EndpointCard method="GET" path="/api/lifecycle/:studentId/summary" description="Event type counts" auth />
            <EndpointCard method="POST" path="/api/lifecycle/:studentId/note" description="Add a manual note" auth roles="admin, teacher" />
          </Article>
        ),
      },
    ],
  },
];

// ── Shared content components ─────────────────────────────────────────────────
function Article({ title, children }) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        {title}
      </h1>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
function H2({ children }) {
  return <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-2">{children}</h2>;
}
function P({ children }) {
  return <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{children}</p>;
}
function Kbd({ children }) {
  return <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-mono text-slate-700 dark:text-slate-300">{children}</kbd>;
}
function CodeBlock({ language, children }) {
  return (
    <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs overflow-x-auto font-mono leading-relaxed my-3">
      <code>{children}</code>
    </pre>
  );
}
function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 my-3">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            {headers.map(h => (
              <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                  {j === 0 ? <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{cell}</code> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const METHOD_COLORS = {
  GET:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  POST:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  PUT:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  PATCH:  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

function EndpointCard({ method, path, description, auth, roles, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden my-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
      >
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded font-mono shrink-0 ${METHOD_COLORS[method] || 'bg-slate-100 text-slate-700'}`}>{method}</span>
        <code className="text-sm text-slate-700 dark:text-slate-300 font-mono flex-1">{path}</code>
        {auth && <span className="text-[10px] text-slate-400 shrink-0">🔒 JWT</span>}
        {roles && <span className="text-[10px] text-indigo-500 shrink-0">{roles}</span>}
        {children ? (open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />) : null}
      </button>
      {description && (
        <div className="px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/50">
          {description}
        </div>
      )}
      {open && children && (
        <div className="px-4 pb-3 pt-1 bg-slate-50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-700/50">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DocsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState(() => {
    const set = new Set();
    SECTIONS.forEach(s => set.add(s.id));
    return set;
  });
  const contentRef = useRef(null);

  const activeId = searchParams.get('page') || 'overview';

  // Find active page across all sections
  const activePage = SECTIONS.flatMap(s => s.pages).find(p => p.id === activeId)
    || SECTIONS[0].pages[0];

  const navigate = useNavigate();

  const goTo = (pageId) => {
    setSearchParams({ page: pageId });
    setSidebarOpen(false);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // Filter pages by search
  const searchLower = search.toLowerCase();
  const filteredSections = search
    ? SECTIONS.map(s => ({
        ...s,
        pages: s.pages.filter(p => p.label.toLowerCase().includes(searchLower)),
      })).filter(s => s.pages.length > 0)
    : SECTIONS;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/* ── Mobile sidebar overlay ────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-700
        flex flex-col transition-transform duration-300
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" />
            <span className="font-semibold text-slate-800 dark:text-white text-sm">Documentation</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-700/50 shrink-0">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search docs..."
              className="bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none flex-1 min-w-0"
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {filteredSections.map(section => {
            const Icon = section.icon;
            const expanded = expandedSections.has(section.id);
            return (
              <div key={section.id} className="mb-1">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <Icon size={15} style={{ color: section.color }} className="shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1">{section.label}</span>
                  {expanded
                    ? <ChevronDown size={12} className="text-slate-400" />
                    : <ChevronRight size={12} className="text-slate-400" />}
                </button>
                {expanded && (
                  <div className="ml-6 border-l border-slate-100 dark:border-slate-700/50 pl-3">
                    {section.pages.map(page => (
                      <button
                        key={page.id}
                        onClick={() => goTo(page.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors mb-0.5 ${
                          activeId === page.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        {page.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Swagger link */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <a
            href="http://localhost:5000/api/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
          >
            <ExternalLink size={12} />
            Open Swagger UI
          </a>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <main ref={contentRef} className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-500 hover:text-slate-700">
            <Menu size={20} />
          </button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{activePage?.label}</span>
        </div>

        <div className="px-6 py-8 max-w-4xl mx-auto">
          {activePage?.content?.()}
        </div>
      </main>
    </div>
  );
}
